import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// $4,500 International Facility Fee
const FACILITY_FEE_PRICE_ID = "price_1SwGkc9fxdThyiakGMF0hR0F";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANAGE-INTL-CASE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    // Verify admin user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization required");
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check admin role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: hasAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!hasAdmin) {
      throw new Error("Admin access required");
    }

    const { action, caseId, data } = await req.json();

    logStep("Processing action", { action, caseId, adminId: user.id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    switch (action) {
      case "update_status": {
        const { status, notes } = data;
        
        const { error } = await supabase
          .from("international_placement_cases")
          .update({ 
            status, 
            admin_notes: notes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", caseId);

        if (error) throw error;

        await supabase.from("international_case_events").insert({
          case_id: caseId,
          event_type: "status_updated",
          actor_id: user.id,
          actor_type: "admin",
          event_data: { new_status: status },
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "assign_advisor": {
        const { advisorId } = data;
        
        const { error } = await supabase
          .from("international_placement_cases")
          .update({ 
            assigned_advisor_id: advisorId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", caseId);

        if (error) throw error;

        await supabase.from("international_case_events").insert({
          case_id: caseId,
          event_type: "advisor_assigned",
          actor_id: user.id,
          actor_type: "admin",
          event_data: { advisor_id: advisorId },
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "match_facilities": {
        const { facilityIds } = data;
        
        const { error } = await supabase
          .from("international_placement_cases")
          .update({ 
            matched_facility_ids: facilityIds,
            status: "matched",
            updated_at: new Date().toISOString(),
          })
          .eq("id", caseId);

        if (error) throw error;

        await supabase.from("international_case_events").insert({
          case_id: caseId,
          event_type: "facilities_matched",
          actor_id: user.id,
          actor_type: "admin",
          event_data: { facility_ids: facilityIds },
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "confirm_admission": {
        const { facilityId } = data;
        
        // Get the case and facility info
        const { data: caseData, error: caseError } = await supabase
          .from("international_placement_cases")
          .select("*")
          .eq("id", caseId)
          .single();

        if (caseError || !caseData) throw new Error("Case not found");

        const { data: facility, error: facilityError } = await supabase
          .from("facilities")
          .select("id, user_id, name")
          .eq("id", facilityId)
          .single();

        if (facilityError || !facility) throw new Error("Facility not found");

        // Update case with admission
        const { error: updateError } = await supabase
          .from("international_placement_cases")
          .update({ 
            accepted_facility_id: facilityId,
            admission_confirmed_at: new Date().toISOString(),
            admission_confirmed_by: user.id,
            status: "admitted",
            facility_fee_cents: 450000, // $4,500
            facility_fee_status: "pending",
          })
          .eq("id", caseId);

        if (updateError) throw updateError;

        // Create facility invoice
        const { data: invoice, error: invoiceError } = await supabase
          .from("international_facility_invoices")
          .insert({
            case_id: caseId,
            facility_id: facilityId,
            provider_id: facility.user_id,
            amount_cents: 450000,
            status: "pending",
            issued_by: user.id,
            issued_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (invoiceError) throw invoiceError;

        // Update case with invoice reference
        await supabase
          .from("international_placement_cases")
          .update({ facility_invoice_id: invoice.id })
          .eq("id", caseId);

        await supabase.from("international_case_events").insert({
          case_id: caseId,
          event_type: "admission_confirmed",
          actor_id: user.id,
          actor_type: "admin",
          event_data: { 
            facility_id: facilityId,
            facility_name: facility.name,
            invoice_id: invoice.id,
          },
        });

        return new Response(
          JSON.stringify({ success: true, invoiceId: invoice.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "refund_client_fee": {
        const { refundType } = data; // 'refunded' or 'credited'
        
        const { data: caseData, error: caseError } = await supabase
          .from("international_placement_cases")
          .select("stripe_payment_intent_id, payment_amount_cents, client_email")
          .eq("id", caseId)
          .single();

        if (caseError || !caseData) throw new Error("Case not found");

        if (refundType === "refunded" && caseData.stripe_payment_intent_id) {
          // Process Stripe refund
          const refund = await stripe.refunds.create({
            payment_intent: caseData.stripe_payment_intent_id,
            amount: caseData.payment_amount_cents,
            reason: "requested_by_customer",
          });

          const { error: updateError } = await supabase
            .from("international_placement_cases")
            .update({ 
              refund_type: "refunded",
              refunded_at: new Date().toISOString(),
              refunded_by: user.id,
              payment_status: "refunded",
            })
            .eq("id", caseId);

          if (updateError) throw updateError;

          await supabase.from("international_case_events").insert({
            case_id: caseId,
            event_type: "client_fee_refunded",
            actor_id: user.id,
            actor_type: "admin",
            event_data: { 
              refund_id: refund.id,
              amount_cents: caseData.payment_amount_cents,
            },
          });

          return new Response(
            JSON.stringify({ success: true, refundId: refund.id }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          // Mark as credited (manual process)
          const { error: updateError } = await supabase
            .from("international_placement_cases")
            .update({ 
              refund_type: "credited",
              refunded_at: new Date().toISOString(),
              refunded_by: user.id,
              payment_status: "credited",
            })
            .eq("id", caseId);

          if (updateError) throw updateError;

          await supabase.from("international_case_events").insert({
            case_id: caseId,
            event_type: "client_fee_credited",
            actor_id: user.id,
            actor_type: "admin",
            event_data: { amount_cents: caseData.payment_amount_cents },
          });

          return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      case "charge_facility_invoice": {
        const { invoiceId } = data;
        
        // Get invoice and facility info
        const { data: invoice, error: invoiceError } = await supabase
          .from("international_facility_invoices")
          .select("*, facility:facilities(user_id, name)")
          .eq("id", invoiceId)
          .single();

        if (invoiceError || !invoice) throw new Error("Invoice not found");

        // Get provider's Stripe customer ID
        const { data: provider } = await supabase
          .from("profiles")
          .select("stripe_customer_id")
          .eq("user_id", invoice.provider_id)
          .single();

        if (!provider?.stripe_customer_id) {
          throw new Error("Provider has no payment method on file");
        }

        // Charge the customer
        const paymentIntent = await stripe.paymentIntents.create({
          amount: invoice.amount_cents,
          currency: "usd",
          customer: provider.stripe_customer_id,
          description: `International Placement Fee - Case ${invoice.case_id}`,
          metadata: {
            invoice_id: invoiceId,
            case_id: invoice.case_id,
            facility_id: invoice.facility_id,
          },
          off_session: true,
          confirm: true,
        });

        // Update invoice status
        const { error: updateError } = await supabase
          .from("international_facility_invoices")
          .update({ 
            status: "paid",
            stripe_payment_intent_id: paymentIntent.id,
            paid_at: new Date().toISOString(),
          })
          .eq("id", invoiceId);

        if (updateError) throw updateError;

        // Update case facility fee status
        await supabase
          .from("international_placement_cases")
          .update({ facility_fee_status: "paid" })
          .eq("id", invoice.case_id);

        await supabase.from("international_case_events").insert({
          case_id: invoice.case_id,
          event_type: "facility_fee_charged",
          actor_id: user.id,
          actor_type: "admin",
          event_data: { 
            invoice_id: invoiceId,
            payment_intent_id: paymentIntent.id,
            amount_cents: invoice.amount_cents,
          },
        });

        return new Response(
          JSON.stringify({ success: true, paymentIntentId: paymentIntent.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "waive_facility_invoice": {
        const { invoiceId, reason } = data;
        
        const { data: invoice, error: invoiceError } = await supabase
          .from("international_facility_invoices")
          .select("case_id")
          .eq("id", invoiceId)
          .single();

        if (invoiceError || !invoice) throw new Error("Invoice not found");

        const { error: updateError } = await supabase
          .from("international_facility_invoices")
          .update({ 
            status: "waived",
            waived_at: new Date().toISOString(),
            waived_by: user.id,
            waive_reason: reason,
          })
          .eq("id", invoiceId);

        if (updateError) throw updateError;

        // Update case
        await supabase
          .from("international_placement_cases")
          .update({ facility_fee_status: "waived" })
          .eq("id", invoice.case_id);

        await supabase.from("international_case_events").insert({
          case_id: invoice.case_id,
          event_type: "facility_fee_waived",
          actor_id: user.id,
          actor_type: "admin",
          event_data: { invoice_id: invoiceId, reason },
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
