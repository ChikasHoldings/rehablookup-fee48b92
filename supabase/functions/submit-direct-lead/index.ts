import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_CONFIG: Record<string, { 
  product_ids: string[]; 
  lead_limit: number; 
  exclusivity: 'shared' | 'exclusive';
}> = {
  basic: { product_ids: [], lead_limit: 0, exclusivity: 'exclusive' },
  professional: { 
    product_ids: ["prod_TbalLOPujTIoUe", "prod_Tbyz1bf6iYyzYd"], 
    lead_limit: 100, exclusivity: 'shared' 
  },
  featured: { 
    product_ids: ["prod_TbalOeJZA2ZoJl", "prod_TbyzJVNOQL71NN"], 
    lead_limit: 100, exclusivity: 'exclusive' 
  },
};

interface DirectLeadRequest {
  facilityId: string;
  facilityName: string;
  facilityEmail?: string | null;
  facilityPlan?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message?: string | null;
  urgency?: string;
  seekingFor?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] submit-direct-lead started`);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    // deno-lint-ignore no-explicit-any
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    const body: DirectLeadRequest = await req.json();
    
    if (!body.facilityId || !body.firstName || !body.email || !body.phone) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get facility info
    const { data: facility } = await supabase
      .from("facilities")
      .select("id, name, email, city, state, user_id, suspended, status, lead_limit_override, bonus_leads")
      .eq("id", body.facilityId)
      .maybeSingle();

    if (!facility) {
      return new Response(
        JSON.stringify({ success: false, error: "Facility not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine plan from Stripe
    let planName = "basic";
    let leadLimit = 0;
    let exclusivity: 'shared' | 'exclusive' = "exclusive";

    if (stripeKey && facility.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", facility.user_id)
        .maybeSingle();

      if (profile?.email) {
        try {
          const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
          const customers = await stripe.customers.list({ email: profile.email, limit: 1 });
          
          if (customers.data.length > 0) {
            const subs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: "active", limit: 1 });
            if (subs.data.length > 0) {
              const productId = subs.data[0].items.data[0].price.product as string;
              if (PLAN_CONFIG.featured.product_ids.includes(productId)) {
                planName = "featured";
                leadLimit = PLAN_CONFIG.featured.lead_limit;
                exclusivity = PLAN_CONFIG.featured.exclusivity;
              } else if (PLAN_CONFIG.professional.product_ids.includes(productId)) {
                planName = "professional";
                leadLimit = PLAN_CONFIG.professional.lead_limit;
                exclusivity = PLAN_CONFIG.professional.exclusivity;
              }
            }
          }
        } catch (e) {
          console.log(`[${requestId}] Stripe error:`, e);
        }
      }
    }

    // Apply overrides
    if (facility.lead_limit_override > 0) leadLimit = facility.lead_limit_override;
    if (facility.bonus_leads > 0) leadLimit += facility.bonus_leads;

    // Count used leads
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { count: usedLeads } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("facility_id", body.facilityId)
      .gte("created_at", startOfMonth.toISOString());

    console.log(`[${requestId}] Plan: ${planName}, Used: ${usedLeads}/${leadLimit}, Exclusivity: ${exclusivity}`);

    // Check capacity
    if (planName !== "basic" && (usedLeads || 0) >= leadLimit) {
      return new Response(
        JSON.stringify({ success: false, error: "Provider at capacity", code: "CAPACITY_REACHED" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fullName = `${body.firstName} ${body.lastName}`.trim();
    const now = new Date().toISOString();

    // Create lead
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        name: fullName,
        email: body.email.trim().toLowerCase(),
        phone: body.phone.trim(),
        message: body.message?.trim() || null,
        preferred_contact: "phone",
        facility_id: body.facilityId,
        status: "new",
        source: "direct_profile",
        qualified: true,
        exclusivity,
        urgency: body.urgency || "exploring",
        who_seeking_help: body.seekingFor || "self",
        assigned_at: now,
        assignment_status: "assigned",
        assignment_reason: `Direct submission - ${planName} plan`,
        routing_order: 1,
      })
      .select("id")
      .single();

    if (leadError) {
      console.error(`[${requestId}] Lead creation error:`, leadError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create lead" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Lead created: ${lead.id}`);

    // Log routing
    await supabase.from("lead_routing_logs").insert({
      lead_id: lead.id,
      requested_facility_id: body.facilityId,
      assigned_provider_id: body.facilityId,
      assignment_reason: `Direct profile submission (${planName} - ${exclusivity})`,
      routing_source: "direct_profile",
      plan_tier: planName,
      exclusivity,
      lead_limit: leadLimit,
      used_leads: (usedLeads || 0) + 1,
      subscription_status: planName === "basic" ? "none" : "active",
      lead_deducted_at: now,
    });

    // Forward to submit-qualified-lead for email notifications
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    fetch(`${supabaseUrl}/functions/v1/submit-qualified-lead`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseAnonKey}`,
        "x-forwarded-for": clientIP,
      },
      body: JSON.stringify({
        facilityId: body.facilityId,
        name: fullName,
        email: body.email,
        phone: body.phone,
        message: body.message || "",
        preferredContact: "phone",
        whoSeekingHelp: body.seekingFor || "self",
        locationCityState: `${facility.city}, ${facility.state}`,
        urgency: body.urgency || "exploring",
        source: "direct_profile",
        skipLeadCreation: true,
        existingLeadId: lead.id,
      }),
    }).catch(err => console.warn(`[${requestId}] Email notification error:`, err));

    return new Response(
      JSON.stringify({ success: true, leadId: lead.id, exclusivity, planName }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to submit lead" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
