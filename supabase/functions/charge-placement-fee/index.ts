import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const VERSION = "1.0.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const logStep = (requestId: string, step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  console.log(`[CHARGE-PLACEMENT-FEE] [${VERSION}] [${requestId}] [${timestamp}] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

// Placement fee structure - flat fee only
const PLACEMENT_FEES = {
  domestic: {
    standard: 100000, // $1,000 in cents
    pro: 80000, // $800 in cents (20% off)
  },
  international: {
    standard: 300000, // $3,000 in cents
    pro: 240000, // $2,400 in cents (20% off)
  },
};

// UUID validation
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // POST only
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

    // Authenticate caller - must be admin or service-role (server-to-server)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this is a service-role call (from confirm-placement edge function)
    const isServiceRoleCall = token === supabaseServiceKey;

    if (isServiceRoleCall) {
      logStep(requestId, "Service-role authentication (server-to-server call)");
    } else {
      // User JWT auth - verify admin role
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

      logStep(requestId, "Admin authenticated", { adminId: userData.user.id });
    }

    const { inquiryId, facilityId, feeType, firstMonthCost, adminInitiated, isInternational } = await req.json();
    
    // Validate required fields
    if (!inquiryId || !facilityId) {
      throw new Error("Inquiry ID and Facility ID are required");
    }

    // Strict UUID validation
    if (!isValidUUID(inquiryId)) {
      throw new Error("Invalid inquiry ID format");
    }
    if (!isValidUUID(facilityId)) {
      throw new Error("Invalid facility ID format");
    }

    logStep(requestId, "Processing placement fee", { inquiryId, facilityId, feeType, adminInitiated, isInternational });

    // Verify the inquiry and placement — explicit column list per project guidelines
    const { data: inquiry, error: inquiryError } = await supabase
      .from('concierge_inquiries')
      .select('id, status, placement_confirmed, placed_facility_id, payment_amount_cents, provider_fee_cents, provider_fee_status, provider_fee_type, provider_invoice_id, assigned_advisor_id')
      .eq('id', inquiryId)
      .single();

    if (inquiryError || !inquiry) {
      throw new Error("Inquiry not found");
    }

    // Idempotency guard: if already paid, return success
    if (inquiry.provider_fee_status === 'paid') {
      logStep(requestId, "Fee already paid — idempotent return", { inquiryId });
      return new Response(
        JSON.stringify({
          success: true,
          charged: true,
          alreadyPaid: true,
          amountCents: inquiry.provider_fee_cents,
          message: "Fee already paid",
          requestId,
          _version: VERSION,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // For admin-initiated charges, update the inquiry to mark placement
    if (adminInitiated) {
      logStep(requestId, "Admin-initiated charge, updating placement status");
      const { error: updateError } = await supabase
        .from('concierge_inquiries')
        .update({
          status: 'placed',
          placed_facility_id: facilityId,
          placement_confirmed: true,
          placement_confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', inquiryId);

      if (updateError) {
        logStep(requestId, "Warning: Failed to update inquiry status", { error: updateError.message });
      }

      // Log the event
      await supabase.from('concierge_case_events').insert({
        inquiry_id: inquiryId,
        event_type: 'admin_confirmed_placement',
        event_data: { facility_id: facilityId },
        actor_type: 'admin',
      });
    } else if (!inquiry.placement_confirmed) {
      throw new Error("Placement not confirmed yet");
    }

    // Get facility and check for Pro subscription
    const { data: facility } = await supabase
      .from('facilities')
      .select('id, name, email')
      .eq('id', facilityId)
      .single();

    if (!facility) {
      throw new Error("Facility not found");
    }

    // Check for active Pro subscription
    const { data: proSub } = await supabase
      .from('pro_subscriptions')
      .select('status, unlock_discount_percent')
      .eq('facility_id', facilityId)
      .eq('status', 'active')
      .maybeSingle();

    const hasPro = !!proSub;
    const discountPercent = hasPro ? 20 : 0;

    // Determine if international based on explicit flag or inquiry payment_amount
    const isIntl = isInternational === true || (inquiry.payment_amount_cents && inquiry.payment_amount_cents >= 29900);
    const feeTier = isIntl ? PLACEMENT_FEES.international : PLACEMENT_FEES.domestic;

    // Calculate fee - flat fee only
    const feeCents = hasPro ? feeTier.pro : feeTier.standard;
    const actualFeeType = isIntl ? 'international_flat_fee' : 'flat_fee';

    logStep(requestId, "Fee calculated", { feeCents, feeType: actualFeeType, hasPro, discountPercent });

    // Get provider's default payment method
    const { data: paymentMethod, error: pmError } = await supabase
      .from('provider_payment_methods')
      .select('stripe_payment_method_id, stripe_customer_id, is_verified')
      .eq('facility_id', facilityId)
      .eq('is_default', true)
      .maybeSingle();

    if (pmError || !paymentMethod) {
      // Create invoice instead of charging directly
      logStep(requestId, "No payment method, creating invoice");
      
      // Check for existing pending invoice (idempotency)
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
          JSON.stringify({
            success: true,
            charged: existingInvoice.status === 'paid',
            invoiceId: existingInvoice.id,
            amountCents: feeCents,
            message: existingInvoice.status === 'paid' ? "Already paid" : "Invoice already exists",
            requestId,
            _version: VERSION,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      const dueAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: invoice, error: invoiceError } = await supabase
        .from('placement_invoices')
        .insert({
          inquiry_id: inquiryId,
          facility_id: facilityId,
          amount_cents: feeCents,
          fee_type: actualFeeType,
          discount_percent: discountPercent,
          discount_reason: hasPro ? 'Pro subscriber discount' : null,
          status: 'pending',
          due_at: dueAt,
        })
        .select('id')
        .single();

      if (invoiceError) {
        // Check if this is a unique constraint error (race condition)
        if (invoiceError.code === '23505') {
          logStep(requestId, "Invoice created by concurrent request, fetching existing");
          const { data: raceInvoice } = await supabase
            .from('placement_invoices')
            .select('id')
            .eq('inquiry_id', inquiryId)
            .eq('facility_id', facilityId)
            .single();
          
          if (raceInvoice) {
            return new Response(
              JSON.stringify({
                success: true,
                charged: false,
                invoiceId: raceInvoice.id,
                amountCents: feeCents,
                message: "Invoice exists",
                requestId,
                _version: VERSION,
              }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
              }
            );
          }
        }
        throw new Error(`Failed to create invoice: ${invoiceError.message}`);
      }

      // Update inquiry with fee info
      await supabase
        .from('concierge_inquiries')
        .update({
          provider_fee_type: actualFeeType,
          provider_fee_cents: feeCents,
          provider_fee_status: 'invoiced',
          provider_invoice_id: invoice.id,
        })
        .eq('id', inquiryId);

      // Send invoice_issued notification
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-concierge-notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            type: 'invoice_issued',
            inquiryId,
            facilityId,
            invoiceId: invoice.id,
            metadata: {
              amount_cents: feeCents,
              fee_type: actualFeeType,
              due_at: dueAt,
            },
          }),
        });
        logStep(requestId, "Invoice issued notification sent");
      } catch (notifError) {
        logStep(requestId, "Warning: Failed to send invoice notification", { error: String(notifError) });
      }

      return new Response(
        JSON.stringify({
          success: true,
          charged: false,
          invoiceId: invoice.id,
          amountCents: feeCents,
          message: "Invoice created - payment method required",
          requestId,
          _version: VERSION,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Charge the payment method
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Use stored customer ID for efficiency
    let finalCustomerId = paymentMethod.stripe_customer_id;

    if (!finalCustomerId) {
      // Fallback to retrieving from Stripe if not stored
      logStep(requestId, "Customer ID not stored, retrieving from Stripe");
      try {
        const pm = await stripe.paymentMethods.retrieve(paymentMethod.stripe_payment_method_id);
        if (!pm.customer) {
          logStep(requestId, "ERROR: Payment method not attached to any customer", { 
            paymentMethodId: paymentMethod.stripe_payment_method_id 
          });
          throw new Error("Payment method not attached to customer. Please update your payment method.");
        }
        finalCustomerId = pm.customer as string;
      } catch (pmError) {
        logStep(requestId, "ERROR: Failed to retrieve payment method from Stripe", { 
          error: pmError instanceof Error ? pmError.message : String(pmError) 
        });
        throw new Error("Unable to process payment. Please update your payment method and try again.");
      }
    }

    if (!finalCustomerId) {
      throw new Error("No valid customer ID found for payment processing");
    }

    // Create payment intent with idempotency key to prevent duplicate charges
    const stripeIdempotencyKey = `placement_fee_${inquiryId}_${facilityId}`;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: feeCents,
      currency: 'usd',
      customer: finalCustomerId,
      payment_method: paymentMethod.stripe_payment_method_id,
      off_session: true,
      confirm: true,
      description: `Placement fee for case ${inquiryId.slice(0, 8).toUpperCase()}`,
      metadata: {
        inquiry_id: inquiryId,
        facility_id: facilityId,
        fee_type: actualFeeType,
      },
    }, {
      idempotencyKey: stripeIdempotencyKey,
    });

    logStep(requestId, "Payment intent created", { 
      paymentIntentId: paymentIntent.id, 
      status: paymentIntent.status 
    });

    // Create invoice record
    const { data: invoice, error: invoiceError } = await supabase
      .from('placement_invoices')
      .insert({
        inquiry_id: inquiryId,
        facility_id: facilityId,
        amount_cents: feeCents,
        fee_type: actualFeeType,
        discount_percent: discountPercent,
        discount_reason: hasPro ? 'Pro subscriber discount' : null,
        status: paymentIntent.status === 'succeeded' ? 'paid' : 'pending',
        stripe_payment_intent_id: paymentIntent.id,
        paid_at: paymentIntent.status === 'succeeded' ? new Date().toISOString() : null,
      })
      .select('id')
      .single();

    if (invoiceError) {
      logStep(requestId, "Warning: Invoice record failed", { error: invoiceError.message });
    }

    // Log to audit trail
    await supabase.from('placement_fee_events').insert({
      invoice_id: invoice?.id,
      inquiry_id: inquiryId,
      facility_id: facilityId,
      event_type: paymentIntent.status === 'succeeded' ? 'charged' : 'created',
      actor_type: 'system',
      amount_cents: feeCents,
      details: {
        fee_type: actualFeeType,
        has_pro: hasPro,
        discount_percent: discountPercent,
        payment_intent_id: paymentIntent.id,
        payment_status: paymentIntent.status,
      },
    });
    logStep(requestId, "Audit event logged");

    // Update inquiry
    await supabase
      .from('concierge_inquiries')
      .update({
        provider_fee_type: actualFeeType,
        provider_fee_cents: feeCents,
        provider_fee_status: paymentIntent.status === 'succeeded' ? 'paid' : 'pending',
        provider_invoice_id: invoice?.id,
      })
      .eq('id', inquiryId);

    // Send invoice_paid notification if successful
    if (paymentIntent.status === 'succeeded') {
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-concierge-notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            type: 'invoice_paid',
            inquiryId,
            facilityId,
            invoiceId: invoice?.id,
            metadata: {
              amount_cents: feeCents,
              payment_intent_id: paymentIntent.id,
            },
          }),
        });
        logStep(requestId, "Invoice paid notification sent");
      } catch (notifError) {
        logStep(requestId, "Warning: Failed to send payment notification", { error: String(notifError) });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        charged: paymentIntent.status === 'succeeded',
        paymentIntentId: paymentIntent.id,
        invoiceId: invoice?.id,
        amountCents: feeCents,
        requestId,
        _version: VERSION,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
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
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: isClientError ? 400 : 500,
      }
    );
  }
});
