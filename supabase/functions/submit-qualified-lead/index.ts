import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import Stripe from "https://esm.sh/stripe@18.5.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan configuration matching check-subscription
const PLAN_CONFIG: Record<string, { product_id: string | null; lead_limit: number }> = {
  basic: { product_id: null, lead_limit: 0 },
  professional: { product_id: "prod_TbalLOPujTIoUe", lead_limit: 25 },
  featured: { product_id: "prod_TbalOeJZA2ZoJl", lead_limit: 75 },
};

interface QualifiedLeadRequest {
  facilityId?: string;
  // Step 1
  whoSeekingHelp: string;
  locationZip: string;
  locationCityState?: string;
  urgency: string;
  // Step 2
  primarySubstance: string[];
  levelOfCare: string;
  dualDiagnosis: string;
  // Step 3
  insuranceType: string;
  insuranceProvider?: string;
  budgetPreference?: string;
  // Step 4
  name: string;
  phone: string;
  email: string;
  preferredContact: string;
  message?: string;
}

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 16);
}

// Check provider's subscription and lead cap
async function checkProviderLeadCap(
  supabase: any,
  facilityUserId: string,
  providerEmail: string
): Promise<{ canReceiveLeads: boolean; reason?: string; leadLimit: number; usedLeads: number }> {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  
  if (!stripeKey) {
    console.error("STRIPE_SECRET_KEY not set - defaulting to basic plan");
    return { canReceiveLeads: false, reason: "Provider on Basic plan (0 leads)", leadLimit: 0, usedLeads: 0 };
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Find Stripe customer by email
    const customers = await stripe.customers.list({ email: providerEmail, limit: 1 });
    
    let leadLimit = PLAN_CONFIG.basic.lead_limit; // Default to 0
    
    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      
      // Check for active subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });
      
      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        const productId = subscription.items.data[0].price.product as string;
        
        // Determine lead limit based on product
        if (productId === PLAN_CONFIG.professional.product_id) {
          leadLimit = PLAN_CONFIG.professional.lead_limit;
        } else if (productId === PLAN_CONFIG.featured.product_id) {
          leadLimit = PLAN_CONFIG.featured.lead_limit;
        }
      }
    }
    
    // If no paid plan, they can't receive leads
    if (leadLimit === 0) {
      return { canReceiveLeads: false, reason: "Provider on Basic plan (0 leads)", leadLimit: 0, usedLeads: 0 };
    }
    
    // Count leads this month for all facilities owned by this provider
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    // Get all facility IDs for this user
    const { data: userFacilities } = await supabase
      .from("facilities")
      .select("id")
      .eq("user_id", facilityUserId);
    
    const facilityIds = (userFacilities as { id: string }[] || []).map(f => f.id);
    
    if (facilityIds.length === 0) {
      return { canReceiveLeads: true, leadLimit, usedLeads: 0 };
    }
    
    // Count qualified leads this month across all provider's facilities
    const { count: monthlyLeadCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .in("facility_id", facilityIds)
      .gte("created_at", startOfMonth.toISOString())
      .eq("email_verified", true); // Only count verified leads
    
    const usedLeads = monthlyLeadCount || 0;
    
    if (usedLeads >= leadLimit) {
      return { 
        canReceiveLeads: false, 
        reason: `Provider has reached monthly lead limit (${usedLeads}/${leadLimit})`,
        leadLimit,
        usedLeads
      };
    }
    
    return { canReceiveLeads: true, leadLimit, usedLeads };
  } catch (error) {
    console.error("Error checking lead cap:", error);
    // On error, allow the lead through but log it
    return { canReceiveLeads: true, leadLimit: 999, usedLeads: 0 };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const leadData: QualifiedLeadRequest = await req.json();

    // Validate required fields
    const requiredFields = ["whoSeekingHelp", "locationZip", "urgency", "levelOfCare", "name", "phone", "email", "preferredContact"];
    for (const field of requiredFields) {
      if (!leadData[field as keyof QualifiedLeadRequest]) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadData.email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate phone format
    const phoneDigits = leadData.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify email was confirmed
    const { data: verificationRecord } = await supabase
      .from("email_verification_codes")
      .select("verified")
      .eq("email", leadData.email.toLowerCase())
      .eq("verified", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!verificationRecord) {
      return new Response(
        JSON.stringify({ error: "Email not verified. Please verify your email first." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get IP hash for rate limiting
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                     req.headers.get("cf-connecting-ip") || 
                     "unknown";
    const ipHash = await hashIP(clientIP);

    // Check for duplicate submissions (same email within 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: duplicateCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("email", leadData.email.toLowerCase())
      .gte("created_at", oneHourAgo);

    if (duplicateCount && duplicateCount > 0) {
      return new Response(
        JSON.stringify({ error: "You've already submitted a request recently. Please wait before submitting again." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Rate limit by IP (max 5 submissions per hour)
    const { count: ipCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", oneHourAgo);

    if (ipCount && ipCount >= 5) {
      return new Response(
        JSON.stringify({ error: "Too many submissions. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // If facility ID provided, verify it exists and is approved
    let facilityEmail: string | null = null;
    let facilityName: string | null = null;
    let facilityUserId: string | null = null;
    let providerEmail: string | null = null;
    
    if (leadData.facilityId) {
      const { data: facility } = await supabase
        .from("facilities")
        .select("id, name, email, status, user_id")
        .eq("id", leadData.facilityId)
        .eq("status", "approved")
        .maybeSingle();

      if (!facility) {
        // If facility not found or not approved, create as unassigned
        leadData.facilityId = undefined;
      } else {
        facilityEmail = facility.email;
        facilityName = facility.name;
        facilityUserId = facility.user_id;
        
        // Get provider's email from their profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", facility.user_id)
          .maybeSingle();
        
        providerEmail = profile?.email || null;
        
        // ============ LEAD CAP ENFORCEMENT ============
        if (providerEmail && facilityUserId) {
          const capCheck = await checkProviderLeadCap(supabase, facilityUserId, providerEmail);
          
          if (!capCheck.canReceiveLeads) {
            console.log(`Lead cap reached for facility ${leadData.facilityId}: ${capCheck.reason}`);
            
            // Return a user-friendly message - don't expose internal details
            return new Response(
              JSON.stringify({ 
                error: "This facility is not currently accepting new inquiries. Please try another facility or contact us directly.",
                code: "FACILITY_UNAVAILABLE"
              }),
              { status: 503, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
          }
          
          console.log(`Lead cap check passed: ${capCheck.usedLeads}/${capCheck.leadLimit} leads used`);
        }
      }
    }

    // Create the lead
    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert({
        facility_id: leadData.facilityId || null,
        name: leadData.name.trim(),
        phone: leadData.phone.trim(),
        email: leadData.email.toLowerCase().trim(),
        preferred_contact: leadData.preferredContact,
        message: leadData.message?.trim() || null,
        ip_hash: ipHash,
        email_verified: true,
        source: "Request Help Page",
        who_seeking_help: leadData.whoSeekingHelp,
        location_zip: leadData.locationZip,
        location_city_state: leadData.locationCityState || null,
        urgency: leadData.urgency,
        primary_substance: leadData.primarySubstance || [],
        level_of_care: leadData.levelOfCare,
        dual_diagnosis: leadData.dualDiagnosis,
        insurance_type: leadData.insuranceType,
        insurance_provider: leadData.insuranceProvider || null,
        budget_preference: leadData.budgetPreference || null,
        status: "new",
        quality_flag: "qualified",
        validation_status: "valid",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert lead:", insertError);
      throw new Error("Failed to submit request");
    }

    console.log(`Qualified lead created: ${lead.id}`);

    // Send email notification to provider if assigned
    if (facilityEmail && facilityName) {
      try {
        await resend.emails.send({
          from: "RehabLookup <onboarding@resend.dev>",
          to: [facilityEmail],
          subject: `New Qualified Lead: ${leadData.name}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f8fb; padding: 40px 20px;">
              <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <h1 style="color: #1B365D; font-size: 24px; margin: 0 0 24px 0;">New Qualified Lead</h1>
                
                <div style="background: #F6F8FB; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                  <p style="margin: 0 0 8px 0;"><strong>Name:</strong> ${leadData.name}</p>
                  <p style="margin: 0 0 8px 0;"><strong>Phone:</strong> ${leadData.phone}</p>
                  <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${leadData.email}</p>
                  <p style="margin: 0 0 8px 0;"><strong>Preferred Contact:</strong> ${leadData.preferredContact}</p>
                  <p style="margin: 0 0 8px 0;"><strong>Location:</strong> ${leadData.locationZip}${leadData.locationCityState ? ` (${leadData.locationCityState})` : ""}</p>
                  <p style="margin: 0 0 8px 0;"><strong>Urgency:</strong> ${leadData.urgency}</p>
                  <p style="margin: 0 0 8px 0;"><strong>Level of Care:</strong> ${leadData.levelOfCare}</p>
                  <p style="margin: 0 0 8px 0;"><strong>Insurance:</strong> ${leadData.insuranceType}</p>
                  ${leadData.message ? `<p style="margin: 0;"><strong>Message:</strong> ${leadData.message}</p>` : ""}
                </div>
                
                <p style="color: #5E6B7A; font-size: 14px;">
                  This lead has been verified via email confirmation. View and respond to this lead in your RehabLookup provider dashboard.
                </p>
              </div>
            </body>
            </html>
          `,
        });
        console.log(`Notification sent to ${facilityEmail}`);
      } catch (emailError) {
        console.error("Failed to send provider notification:", emailError);
        // Don't fail the request if email fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        leadId: lead.id,
        assigned: !!leadData.facilityId 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in submit-qualified-lead:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to submit request" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
