import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { getCaseEventActorType } from "../_shared/case-event-actor.ts";

 const VERSION = "1.0.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

 const FACILITY_FEE_PRICE_ID = "price_1SxJoI9fxdThyiakeI4gjY6I"; // $3,000 facility fee

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANAGE-INTL-CASE] [${VERSION}] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
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

    // Resolve granular admin role for actor_type attribution
    // (super_admin / manager / customer_rep / advisor — never the legacy "admin" literal).
    const { data: adminProfile } = await supabase
      .from("admin_user_profiles")
      .select("admin_role")
      .eq("user_id", user.id)
      .maybeSingle();
    const actorType = getCaseEventActorType(adminProfile?.admin_role ?? null);

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
          actor_type: actorType,
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
          actor_type: actorType,
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
          actor_type: actorType,
          event_data: { facility_ids: facilityIds },
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "confirm_admission": {
        const { facilityId, clientFeeResolution } = data;
        
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

        logStep("Processing client fee resolution", { clientFeeResolution, paymentIntentId: caseData.stripe_payment_intent_id });

        // Handle client placement fee refund/credit
        let refundId: string | null = null;
        const refundType = clientFeeResolution === "refund" ? "refunded" : "credited";

        if (clientFeeResolution === "refund" && caseData.stripe_payment_intent_id && caseData.payment_status === "paid") {
          // Process Stripe refund of the client's intake fee
          try {
            const refund = await stripe.refunds.create({
              payment_intent: caseData.stripe_payment_intent_id,
              amount: caseData.payment_amount_cents,
              reason: "requested_by_customer",
            });
            refundId = refund.id;
            logStep("Stripe refund processed", { refundId, amount: caseData.payment_amount_cents });
          } catch (refundError) {
            logStep("WARNING: Stripe refund failed", { error: String(refundError) });
            // Continue with admission but note the refund failure
          }
        }

        // Update case with admission and refund info
        const { error: updateError } = await supabase
          .from("international_placement_cases")
          .update({ 
            accepted_facility_id: facilityId,
            admission_confirmed_at: new Date().toISOString(),
            admission_confirmed_by: user.id,
            status: "admitted",
            facility_fee_cents: 300000, // $3,000
            facility_fee_status: "pending",
            // Client fee resolution
            refund_type: refundType,
            refunded_at: new Date().toISOString(),
            refunded_by: user.id,
            payment_status: refundType,
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
            amount_cents: 300000,
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

        // Log admission event
        await supabase.from("international_case_events").insert({
          case_id: caseId,
          event_type: "admission_confirmed",
          actor_id: user.id,
          actor_type: actorType,
          event_data: { 
            facility_id: facilityId,
            facility_name: facility.name,
            invoice_id: invoice.id,
          },
        });

        // Log client fee resolution event
        await supabase.from("international_case_events").insert({
          case_id: caseId,
          event_type: refundType === "refunded" ? "client_fee_refunded" : "client_fee_credited",
          actor_id: user.id,
          actor_type: actorType,
          event_data: { 
            resolution_type: refundType,
            amount_cents: caseData.payment_amount_cents,
            ...(refundId && { stripe_refund_id: refundId }),
          },
        });

        logStep("Admission confirmed with fee resolution", { 
          invoiceId: invoice.id, 
          refundType, 
          refundId 
        });

        return new Response(
          JSON.stringify({ success: true, invoiceId: invoice.id, refundType, refundId }),
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
            actor_type: actorType,
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
            actor_type: actorType,
            event_data: { amount_cents: caseData.payment_amount_cents },
          });

          return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      case "issue_facility_invoice": {
        const { invoiceId } = data;
        
        // Get invoice and facility info
        const { data: dbInvoice, error: invoiceError } = await supabase
          .from("international_facility_invoices")
          .select(`
            *,
            facilities (id, user_id, name, email),
            international_placement_cases (client_name, client_country)
          `)
          .eq("id", invoiceId)
          .single();

        if (invoiceError || !dbInvoice) throw new Error("Invoice not found");

        // Get or create Stripe customer for the facility
        const facilityEmail = dbInvoice.facilities?.email;
        const facilityName = dbInvoice.facilities?.name || "Provider";
        
        if (!facilityEmail) {
          throw new Error("Facility has no email address on file");
        }

        // Check for existing customer
        const customers = await stripe.customers.list({ email: facilityEmail, limit: 1 });
        let customerId: string;
        
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        } else {
          const newCustomer = await stripe.customers.create({
            email: facilityEmail,
            name: facilityName,
            metadata: {
              facility_id: dbInvoice.facility_id,
              provider_id: dbInvoice.provider_id,
            },
          });
          customerId = newCustomer.id;
        }

        const caseName = dbInvoice.international_placement_cases?.client_name || "Client";
        const caseCountry = dbInvoice.international_placement_cases?.client_country || "";

        // Create Stripe Invoice
        const stripeInvoice = await stripe.invoices.create({
          customer: customerId,
          collection_method: "send_invoice",
          days_until_due: 14,
          description: `International Placement Fee - ${caseName} (${caseCountry})`,
          metadata: {
            invoice_id: invoiceId,
            case_id: dbInvoice.case_id,
            facility_id: dbInvoice.facility_id,
            type: "international_placement_fee",
          },
        });

        // Add line item
        await stripe.invoiceItems.create({
          customer: customerId,
          invoice: stripeInvoice.id,
          amount: dbInvoice.amount_cents,
          currency: "usd",
          description: `International Placement Coordination Fee - Case: ${caseName}`,
        });

        // Finalize and send invoice
        const finalizedInvoice = await stripe.invoices.finalizeInvoice(stripeInvoice.id);
        await stripe.invoices.sendInvoice(stripeInvoice.id);

        // Update DB invoice
        const { error: updateError } = await supabase
          .from("international_facility_invoices")
          .update({ 
            status: "sent",
            stripe_invoice_id: finalizedInvoice.id,
            sent_at: new Date().toISOString(),
            sent_by: user.id,
            due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq("id", invoiceId);

        if (updateError) throw updateError;

        // Update case facility fee status
        await supabase
          .from("international_placement_cases")
          .update({ facility_fee_status: "invoiced" })
          .eq("id", dbInvoice.case_id);

        await supabase.from("international_case_events").insert({
          case_id: dbInvoice.case_id,
          event_type: "facility_invoice_sent",
          actor_id: user.id,
          actor_type: actorType,
          event_data: { 
            invoice_id: invoiceId,
            stripe_invoice_id: finalizedInvoice.id,
            amount_cents: dbInvoice.amount_cents,
            hosted_invoice_url: finalizedInvoice.hosted_invoice_url,
          },
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            stripeInvoiceId: finalizedInvoice.id,
            hostedInvoiceUrl: finalizedInvoice.hosted_invoice_url,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "resend_facility_invoice": {
        const { invoiceId } = data;
        
        const { data: dbInvoice, error: invoiceError } = await supabase
          .from("international_facility_invoices")
          .select("case_id, stripe_invoice_id")
          .eq("id", invoiceId)
          .single();

        if (invoiceError || !dbInvoice) throw new Error("Invoice not found");
        if (!dbInvoice.stripe_invoice_id) throw new Error("Invoice has not been issued yet");

        // Resend the invoice via Stripe
        await stripe.invoices.sendInvoice(dbInvoice.stripe_invoice_id);

        // Update sent_at
        await supabase
          .from("international_facility_invoices")
          .update({ sent_at: new Date().toISOString() })
          .eq("id", invoiceId);

        await supabase.from("international_case_events").insert({
          case_id: dbInvoice.case_id,
          event_type: "facility_invoice_resent",
          actor_id: user.id,
          actor_type: actorType,
          event_data: { invoice_id: invoiceId },
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "void_facility_invoice": {
        const { invoiceId, reason } = data;
        
        const { data: dbInvoice, error: invoiceError } = await supabase
          .from("international_facility_invoices")
          .select("case_id, stripe_invoice_id")
          .eq("id", invoiceId)
          .single();

        if (invoiceError || !dbInvoice) throw new Error("Invoice not found");

        // Void in Stripe if exists
        if (dbInvoice.stripe_invoice_id) {
          try {
            await stripe.invoices.voidInvoice(dbInvoice.stripe_invoice_id);
          } catch (e) {
            logStep("Warning: Could not void Stripe invoice", { error: String(e) });
          }
        }

        await supabase
          .from("international_facility_invoices")
          .update({ 
            status: "void",
            waived_at: new Date().toISOString(),
            waived_by: user.id,
            waive_reason: reason || "Voided by admin",
          })
          .eq("id", invoiceId);

        await supabase
          .from("international_placement_cases")
          .update({ facility_fee_status: "void" })
          .eq("id", dbInvoice.case_id);

        await supabase.from("international_case_events").insert({
          case_id: dbInvoice.case_id,
          event_type: "facility_invoice_voided",
          actor_id: user.id,
          actor_type: actorType,
          event_data: { invoice_id: invoiceId, reason },
        });

        return new Response(
          JSON.stringify({ success: true }),
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
          actor_type: actorType,
          event_data: { invoice_id: invoiceId, reason },
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "add_note": {
        const { content } = data;
        
        if (!content || content.trim().length === 0) {
          throw new Error("Note content is required");
        }

        const { data: note, error } = await supabase
          .from("international_case_notes")
          .insert({
            case_id: caseId,
            admin_id: user.id,
            content: content.trim(),
          })
          .select("id, created_at")
          .single();

        if (error) throw error;

        await supabase.from("international_case_events").insert({
          case_id: caseId,
          event_type: "note_added",
          actor_id: user.id,
          actor_type: actorType,
          event_data: { note_id: note.id },
        });

        return new Response(
          JSON.stringify({ success: true, noteId: note.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "invite_facilities": {
        const { facilityIds } = data;
        
        // Get case info
        const { data: caseData, error: caseError } = await supabase
          .from("international_placement_cases")
          .select("client_name, client_country, intake_data")
          .eq("id", caseId)
          .single();

        if (caseError || !caseData) throw new Error("Case not found");

        // Get facility info to get provider IDs
        const { data: facilitiesData, error: facError } = await supabase
          .from("facilities")
          .select("id, user_id, name")
          .in("id", facilityIds);

        if (facError) throw facError;

        // Create match records for each facility
        const matchRecords = facilitiesData?.map(f => ({
          case_id: caseId,
          facility_id: f.id,
          provider_id: f.user_id,
          status: "invited",
          invited_at: new Date().toISOString(),
        })) || [];

        if (matchRecords.length > 0) {
          const { error: matchError } = await supabase
            .from("international_case_facility_matches")
            .upsert(matchRecords, { onConflict: "case_id,facility_id" });

          if (matchError) throw matchError;
        }

        // Update case with matched facilities
        const { error } = await supabase
          .from("international_placement_cases")
          .update({ 
            matched_facility_ids: facilityIds,
            status: "introductions_sent",
            updated_at: new Date().toISOString(),
          })
          .eq("id", caseId);

        if (error) throw error;

        await supabase.from("international_case_events").insert({
          case_id: caseId,
          event_type: "facilities_invited",
          actor_id: user.id,
          actor_type: actorType,
          event_data: { 
            facility_ids: facilityIds,
            facility_names: facilitiesData?.map(f => f.name),
            count: facilityIds.length,
          },
        });

        return new Response(
          JSON.stringify({ success: true, invitedCount: facilityIds.length }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "mark_facility_accepted": {
        const { facilityId } = data;
        
        const { error } = await supabase
          .from("international_placement_cases")
          .update({ 
            accepted_facility_id: facilityId,
            status: "in_contact",
            updated_at: new Date().toISOString(),
          })
          .eq("id", caseId);

        if (error) throw error;

        await supabase.from("international_case_events").insert({
          case_id: caseId,
          event_type: "facility_accepted",
          actor_id: user.id,
          actor_type: actorType,
          event_data: { facility_id: facilityId },
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
