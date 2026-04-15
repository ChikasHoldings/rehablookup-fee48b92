import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const VERSION = "2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const logStep = (requestId: string, step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  console.log(`[CHARGE-PLACEMENT-FEE] [${VERSION}] [${requestId}] [${timestamp}] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

// Default placement fee structure
const DEFAULT_FEES = {
  domestic: 100000,      // $1,000
  international: 300000, // $3,000
};
const DEFAULT_PRO_DISCOUNT = 20;

const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

Deno.serve(async (req) => {
  const requestId = generateRequestId();

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    logStep(requestId, "Function started", { version: VERSION });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error("Supabase configuration missing");
    }

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const isServiceRoleCall = token === supabaseServiceKey;
    let actorId: string | null = null;

    if (isServiceRoleCall) {
      logStep(requestId, "Service-role authentication (server-to-server call)");
    } else {
      const anonClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: userData, error: userError } = await anonClient.auth.getUser(token);
      if (userError || !userData.user) throw new Error("Authentication failed");

      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userData.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!adminRole) {
        throw new Error("Only administrators can charge placement fees");
      }

      actorId = userData.user.id;
      logStep(requestId, "Admin authenticated", { adminId: actorId });
    }

    const { inquiryId, facilityId, feeType, adminInitiated, isInternational } = await req.json();

    if (!inquiryId || !facilityId) {
      throw new Error("Inquiry ID and Facility ID are required");
    }
    if (!isValidUUID(inquiryId)) throw new Error("Invalid inquiry ID format");
    if (!isValidUUID(facilityId)) throw new Error("Invalid facility ID format");

    logStep(requestId, "Processing placement fee", { inquiryId, facilityId, feeType, adminInitiated, isInternational });

    // ── 1. Load inquiry ──
    const { data: inquiry, error: inquiryError } = await supabase
      .from('concierge_inquiries')
      .select('id, status, placement_confirmed, placed_facility_id, payment_amount_cents, provider_fee_cents, provider_fee_status, provider_fee_type, provider_invoice_id, assigned_advisor_id')
      .eq('id', inquiryId)
      .single();

    if (inquiryError || !inquiry) throw new Error("Inquiry not found");

    // Idempotency: already paid
    if (inquiry.provider_fee_status === 'paid') {
      logStep(requestId, "Fee already paid — idempotent return", { inquiryId });
      return new Response(
        JSON.stringify({ success: true, charged: true, alreadyPaid: true, amountCents: inquiry.provider_fee_cents, requestId, _version: VERSION }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // For admin-initiated charges, update placement status
    if (adminInitiated) {
      logStep(requestId, "Admin-initiated charge, ensuring placement is confirmed");

      // Only confirm placement if not already confirmed
      if (!inquiry.placement_confirmed) {
        // Walk through intermediate statuses to reach 'admitted' first
        const walkToAdmitted = async () => {
          const PATH_TO_ADMITTED: Record<string, string[]> = {
            providers_accepted:     ["presented_to_seeker", "seeker_selected", "admission_in_progress", "admitted"],
            presented_to_seeker:    ["seeker_selected", "admission_in_progress", "admitted"],
            seeker_selected:        ["admission_in_progress", "admitted"],
            admission_in_progress:  ["admitted"],
          };

          const transitionPath = PATH_TO_ADMITTED[inquiry.status];
          if (!transitionPath && inquiry.status !== "admitted" && inquiry.status !== "billed") {
            throw new Error(`Cannot charge fee: case is in '${inquiry.status}' status. Must be at least 'providers_accepted'.`);
          }

          if (transitionPath) {
            let currentStatus = inquiry.status;
            for (const nextStatus of transitionPath) {
              const stepUpdate: Record<string, unknown> = { status: nextStatus };
              if (nextStatus === "admitted") {
                stepUpdate.placed_facility_id = facilityId;
                stepUpdate.placement_confirmed = true;
                stepUpdate.placement_confirmed_at = new Date().toISOString();
                stepUpdate.admission_status = "admitted";
                stepUpdate.admission_substatus = "admitted";
              }
              const { data: updated, error: stepError } = await supabase
                .from("concierge_inquiries")
                .update(stepUpdate)
                .eq("id", inquiryId)
                .eq("status", currentStatus)
                .select("id")
                .maybeSingle();

              if (stepError) throw new Error(`Failed to transition ${currentStatus} → ${nextStatus}: ${stepError.message}`);
              if (!updated) throw new Error(`Status conflict during ${currentStatus} → ${nextStatus}. Please refresh and try again.`);
              logStep(requestId, "Admin-initiated status step", { from: currentStatus, to: nextStatus });
              currentStatus = nextStatus;
            }
          }
        };

        await walkToAdmitted();

        await supabase.from('concierge_case_events').insert({
          inquiry_id: inquiryId,
          event_type: 'admin_confirmed_placement',
          event_data: { facility_id: facilityId },
          actor_id: actorId,
          actor_type: 'admin',
        });
      }
    } else if (!inquiry.placement_confirmed) {
      throw new Error("Placement not confirmed yet");
    }

    // ── 2. Load platform pricing settings from DB ──
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['placement_fee_domestic', 'placement_fee_international', 'pro_discount_percent']);

    let domesticFee = DEFAULT_FEES.domestic;
    let internationalFee = DEFAULT_FEES.international;
    let platformProDiscount = DEFAULT_PRO_DISCOUNT;

    if (settings) {
      for (const s of settings) {
        const val = s.setting_value as Record<string, number>;
        if (s.setting_key === 'placement_fee_domestic') domesticFee = val?.cents ?? DEFAULT_FEES.domestic;
        if (s.setting_key === 'placement_fee_international') internationalFee = val?.cents ?? DEFAULT_FEES.international;
        if (s.setting_key === 'pro_discount_percent') platformProDiscount = val?.value ?? DEFAULT_PRO_DISCOUNT;
      }
    }

    // ── 3. Get facility + Pro subscription ──
    const { data: facility } = await supabase
      .from('facilities')
      .select('id, name, email, user_id')
      .eq('id', facilityId)
      .single();

    if (!facility) throw new Error("Facility not found");

    const { data: proSub } = await supabase
      .from('pro_subscriptions')
      .select('status, unlock_discount_percent')
      .eq('facility_id', facilityId)
      .eq('status', 'active')
      .maybeSingle();

    const hasPro = !!proSub;
    // Use facility-specific discount if set, else platform default
    const discountPercent = hasPro ? (proSub.unlock_discount_percent ?? platformProDiscount) : 0;

    // ── 4. Calculate fee ──
    const isIntl = isInternational === true || (inquiry.payment_amount_cents && inquiry.payment_amount_cents >= 29900);
    const baseFee = isIntl ? internationalFee : domesticFee;
    const feeCents = hasPro ? Math.round(baseFee * (1 - discountPercent / 100)) : baseFee;
    const actualFeeType = isIntl ? 'international_flat_fee' : 'flat_fee';

    logStep(requestId, "Fee calculated", { baseFee, feeCents, feeType: actualFeeType, hasPro, discountPercent });

    // ── 5. Get provider payment method ──
    const { data: paymentMethod } = await supabase
      .from('provider_payment_methods')
      .select('stripe_payment_method_id, stripe_customer_id, is_verified')
      .eq('facility_id', facilityId)
      .eq('is_default', true)
      .maybeSingle();

    // Helper: create invoice record + update inquiry + log event + create advisor earning
    const finalizeInvoice = async (invoiceId: string, status: string, paidAt: string | null, stripePaymentIntentId: string | null) => {
      // Update inquiry with fee info
      await supabase
        .from('concierge_inquiries')
        .update({
          provider_fee_type: actualFeeType,
          provider_fee_cents: feeCents,
          provider_fee_status: status === 'paid' ? 'paid' : 'invoiced',
          provider_invoice_id: invoiceId,
        })
        .eq('id', inquiryId);

      // Log billing event
      await supabase.from('concierge_case_events').insert({
        inquiry_id: inquiryId,
        event_type: status === 'paid' ? 'billing_collected' : 'billing_invoiced',
        event_data: {
          invoice_id: invoiceId,
          amount_cents: feeCents,
          base_fee_cents: baseFee,
          discount_percent: discountPercent,
          fee_type: actualFeeType,
          facility_id: facilityId,
          facility_name: facility.name,
          billing_date: new Date().toISOString(),
          has_pro: hasPro,
          ...(stripePaymentIntentId ? { payment_intent_id: stripePaymentIntentId } : {}),
        },
        actor_id: actorId,
        actor_type: isServiceRoleCall ? 'system' : 'admin',
      });

      // Log to placement_fee_events audit trail
      await supabase.from('placement_fee_events').insert({
        invoice_id: invoiceId,
        inquiry_id: inquiryId,
        facility_id: facilityId,
        event_type: status === 'paid' ? 'charged' : 'created',
        actor_type: isServiceRoleCall ? 'system' : 'admin',
        actor_id: actorId,
        amount_cents: feeCents,
        details: {
          fee_type: actualFeeType,
          has_pro: hasPro,
          discount_percent: discountPercent,
          base_fee_cents: baseFee,
          payment_status: status,
          ...(stripePaymentIntentId ? { payment_intent_id: stripePaymentIntentId } : {}),
        },
      });

      // Auto-transition to 'billed' stage if currently 'admitted'
      if (inquiry.status === 'admitted') {
        await supabase
          .from('concierge_inquiries')
          .update({ status: 'billed', updated_at: new Date().toISOString() })
          .eq('id', inquiryId)
          .eq('status', 'admitted');

        await supabase.from('concierge_case_events').insert({
          inquiry_id: inquiryId,
          event_type: 'status_changed',
          event_data: { from: 'admitted', to: 'billed', via: 'billing_system' },
          actor_type: 'system',
        });
      }

      // ── Auto-create advisor earning ──
      if (inquiry.assigned_advisor_id) {
        try {
          // Get advisor commission rate
          const { data: advisorProfile } = await supabase
            .from('admin_user_profiles')
            .select('commission_rate')
            .eq('user_id', inquiry.assigned_advisor_id)
            .maybeSingle();

          const commissionRate = advisorProfile?.commission_rate ?? 10; // Default 10%
          const commissionCents = Math.round(feeCents * commissionRate / 100);

          // Idempotency: check if earning already exists
          const { data: existingEarning } = await supabase
            .from('advisor_earnings')
            .select('id')
            .eq('inquiry_id', inquiryId)
            .maybeSingle();

          if (!existingEarning) {
            await supabase.from('advisor_earnings').insert({
              advisor_id: inquiry.assigned_advisor_id,
              inquiry_id: inquiryId,
              placement_fee_cents: feeCents,
              commission_rate: commissionRate,
              commission_cents: commissionCents,
              status: status === 'paid' ? 'pending_payout' : 'pending',
            });
            logStep(requestId, "Advisor earning created", { advisorId: inquiry.assigned_advisor_id, commissionCents, commissionRate });
          }
        } catch (earningErr) {
          logStep(requestId, "Warning: Failed to create advisor earning", { error: String(earningErr) });
        }
      }

      // Send notification
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-concierge-notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
          body: JSON.stringify({
            type: status === 'paid' ? 'invoice_paid' : 'invoice_issued',
            inquiryId,
            facilityId,
            invoiceId,
            metadata: { amount_cents: feeCents, fee_type: actualFeeType },
          }),
        });
      } catch (notifError) {
        logStep(requestId, "Warning: Failed to send notification", { error: String(notifError) });
      }
    };

    if (!paymentMethod) {
      // ── No payment method → create pending invoice ──
      logStep(requestId, "No payment method, creating invoice");

      // Idempotency check
      const { data: existingInvoice } = await supabase
        .from('placement_invoices')
        .select('id, status')
        .eq('inquiry_id', inquiryId)
        .eq('facility_id', facilityId)
        .in('status', ['pending', 'paid'])
        .maybeSingle();

      if (existingInvoice) {
        logStep(requestId, "Invoice already exists", { invoiceId: existingInvoice.id, status: existingInvoice.status });
        return new Response(
          JSON.stringify({ success: true, charged: existingInvoice.status === 'paid', invoiceId: existingInvoice.id, amountCents: feeCents, requestId, _version: VERSION }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      const dueAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      const { data: invoice, error: invoiceError } = await supabase
        .from('placement_invoices')
        .insert({
          inquiry_id: inquiryId,
          case_id: inquiryId, // case_id maps to inquiry_id
          facility_id: facilityId,
          amount_cents: feeCents,
          fee_type: actualFeeType,
          discount_percent: discountPercent,
          discount_reason: hasPro ? `Pro subscriber discount (${discountPercent}%)` : null,
          status: 'pending',
          due_at: dueAt,
        })
        .select('id')
        .single();

      if (invoiceError) {
        if (invoiceError.code === '23505') {
          const { data: raceInvoice } = await supabase
            .from('placement_invoices')
            .select('id')
            .eq('inquiry_id', inquiryId)
            .eq('facility_id', facilityId)
            .single();

          if (raceInvoice) {
            return new Response(
              JSON.stringify({ success: true, charged: false, invoiceId: raceInvoice.id, amountCents: feeCents, requestId, _version: VERSION }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
            );
          }
        }
        throw new Error(`Failed to create invoice: ${invoiceError.message}`);
      }

      await finalizeInvoice(invoice.id, 'pending', null, null);

      return new Response(
        JSON.stringify({ success: true, charged: false, invoiceId: invoice.id, amountCents: feeCents, baseFee, discountPercent, requestId, _version: VERSION }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // ── Has payment method → charge directly ──
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let finalCustomerId = paymentMethod.stripe_customer_id;
    if (!finalCustomerId) {
      logStep(requestId, "Customer ID not stored, retrieving from Stripe");
      try {
        const pm = await stripe.paymentMethods.retrieve(paymentMethod.stripe_payment_method_id);
        if (!pm.customer) throw new Error("Payment method not attached to customer. Please update your payment method.");
        finalCustomerId = pm.customer as string;
      } catch (pmError) {
        throw new Error("Unable to process payment. Please update your payment method and try again.");
      }
    }
    if (!finalCustomerId) throw new Error("No valid customer ID found for payment processing");

    const stripeIdempotencyKey = `placement_fee_${inquiryId}_${facilityId}`;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: feeCents,
      currency: 'usd',
      customer: finalCustomerId,
      payment_method: paymentMethod.stripe_payment_method_id,
      off_session: true,
      confirm: true,
      description: `Placement fee for case ${inquiryId.slice(0, 8).toUpperCase()} — ${actualFeeType === 'international_flat_fee' ? 'International' : 'Domestic'}`,
      metadata: {
        inquiry_id: inquiryId,
        facility_id: facilityId,
        fee_type: actualFeeType,
        base_fee_cents: String(baseFee),
        discount_percent: String(discountPercent),
        has_pro: String(hasPro),
      },
    }, {
      idempotencyKey: stripeIdempotencyKey,
    });

    logStep(requestId, "Payment intent created", { paymentIntentId: paymentIntent.id, status: paymentIntent.status });

    const invoiceStatus = paymentIntent.status === 'succeeded' ? 'paid' : 'pending';
    const paidAt = paymentIntent.status === 'succeeded' ? new Date().toISOString() : null;

    const { data: invoice, error: invoiceError } = await supabase
      .from('placement_invoices')
      .insert({
        inquiry_id: inquiryId,
        case_id: inquiryId,
        facility_id: facilityId,
        amount_cents: feeCents,
        fee_type: actualFeeType,
        discount_percent: discountPercent,
        discount_reason: hasPro ? `Pro subscriber discount (${discountPercent}%)` : null,
        status: invoiceStatus,
        stripe_payment_intent_id: paymentIntent.id,
        paid_at: paidAt,
      })
      .select('id')
      .single();

    if (invoiceError) {
      logStep(requestId, "Warning: Invoice record failed", { error: invoiceError.message });
    }

    if (invoice) {
      await finalizeInvoice(invoice.id, invoiceStatus, paidAt, paymentIntent.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        charged: paymentIntent.status === 'succeeded',
        paymentIntentId: paymentIntent.id,
        invoiceId: invoice?.id,
        amountCents: feeCents,
        baseFee,
        discountPercent,
        requestId,
        _version: VERSION,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep(requestId, "ERROR", { message: errorMessage });
    const isClientError = errorMessage.includes("not found") ||
      errorMessage.includes("required") || errorMessage.includes("Invalid") ||
      errorMessage.includes("Only administrators") || errorMessage.includes("not confirmed") ||
      errorMessage.includes("No valid customer");
    return new Response(
      JSON.stringify({ error: errorMessage, requestId, _version: VERSION }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: isClientError ? 400 : 500 }
    );
  }
});
