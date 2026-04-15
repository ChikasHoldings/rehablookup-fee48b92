import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const VERSION = "2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const logStep = (requestId: string, step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  console.log(`[CONFIRM-PLACEMENT] [${VERSION}] [${requestId}] [${timestamp}] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const isValidISODate = (str: string): boolean => {
  if (!str) return true;
  const date = new Date(str);
  return !isNaN(date.getTime());
};

Deno.serve(async (req) => {
  const requestId = generateRequestId();

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    logStep(requestId, "Function started", { version: VERSION });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header", requestId, _version: VERSION }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Authentication failed", requestId, _version: VERSION }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body", requestId, _version: VERSION }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { inquiryId, facilityId, confirmationType, admittedAt, isInternational } = body as {
      inquiryId: string; facilityId: string; confirmationType: string; admittedAt?: string; isInternational?: boolean;
    };

    if (!inquiryId || !facilityId || !confirmationType) {
      throw new Error("Inquiry ID, Facility ID, and confirmation type are required");
    }
    if (!isValidUUID(inquiryId)) throw new Error("Invalid inquiry ID format");
    if (!isValidUUID(facilityId)) throw new Error("Invalid facility ID format");

    const validConfirmationTypes = ['admin', 'admin_confirm', 'placement_confirm'];
    if (!validConfirmationTypes.includes(confirmationType)) {
      throw new Error("Invalid confirmation type");
    }
    if (admittedAt && !isValidISODate(admittedAt)) {
      throw new Error("Invalid admitted date format");
    }

    logStep(requestId, "Processing confirmation", { inquiryId, facilityId, confirmationType });

    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Get the inquiry
    const { data: inquiry, error: inquiryError } = await supabaseService
      .from('concierge_inquiries')
      .select('id, status, matched_facility_ids, admin_matched_facility_ids, payment_amount_cents, assigned_advisor_id, provider_fee_cents, admission_substatus')
      .eq('id', inquiryId)
      .single();

    if (inquiryError || !inquiry) throw new Error("Inquiry not found");

    // Idempotent: already admitted/billed/completed
    const TERMINAL_STATUSES = ['admitted', 'billed', 'completed', 'placed'];
    if (TERMINAL_STATUSES.includes(inquiry.status)) {
      logStep(requestId, "Case already in terminal status — idempotent return", { inquiryId, status: inquiry.status });
      return new Response(JSON.stringify({
        success: true, alreadyPlaced: true, status: inquiry.status, requestId, _version: VERSION,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (inquiry.status === 'closed') {
      throw new Error("Cannot confirm placement for a closed case");
    }

    // Allowed source statuses for admission confirmation
    const CONFIRMABLE_STATUSES = ['admission_in_progress', 'seeker_selected', 'matched', 'introductions_sent', 'in_contact', 'presented_to_seeker', 'providers_accepted'];
    if (!CONFIRMABLE_STATUSES.includes(inquiry.status)) {
      throw new Error(`Cannot confirm placement: case is in '${inquiry.status}' status. Must be in: ${CONFIRMABLE_STATUSES.join(', ')}`);
    }

    // Verify facility is in matched list
    const matchedFacilityIds = [
      ...(inquiry.matched_facility_ids || []),
      ...(inquiry.admin_matched_facility_ids || []),
    ];
    if (!matchedFacilityIds.includes(facilityId)) {
      throw new Error("Facility not in matched list for this inquiry");
    }

    // Admin-only authorization
    const { data: userRole } = await supabaseService
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!userRole) {
      throw new Error("Only administrators can confirm placements. This ensures RehabLookup coordinates all admissions.");
    }

    logStep(requestId, "Admin authorization verified", { adminUserId: userData.user.id });

    // ── Update inquiry to 'admitted' stage ──
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      placed_facility_id: facilityId,
      placement_confirmed: true,
      placement_confirmed_at: admittedAt || now,
      seeker_confirmed: true,
      seeker_confirmed_at: now,
      status: 'admitted',
      admission_status: 'admitted',
      admission_substatus: 'admitted',
      updated_at: now,
    };

    const { error: updateError } = await supabaseService
      .from('concierge_inquiries')
      .update(updates)
      .eq('id', inquiryId);

    if (updateError) throw new Error(`Failed to update inquiry: ${updateError.message}`);

    logStep(requestId, "Case moved to 'admitted'", { facilityId, admittedAt });

    // Log placement_confirmed event
    await supabaseService.from("concierge_case_events").insert({
      inquiry_id: inquiryId,
      event_type: "placement_confirmed",
      event_data: {
        facility_id: facilityId,
        admitted_at: admittedAt || now,
        confirmed_by: "admin",
        from_status: inquiry.status,
        to_status: "admitted",
      },
      actor_id: userData.user.id,
      actor_type: "admin",
    });

    // Send notification
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-concierge-notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
        body: JSON.stringify({ type: 'placement_complete', inquiryId, facilityId }),
      });
    } catch (notifError) {
      logStep(requestId, "Warning: Failed to send notification", { error: String(notifError) });
    }

    // ── Trigger billing (admitted → billed) ──
    logStep(requestId, "Triggering placement fee charge");
    let chargeSuccess = false;

    try {
      const chargeResponse = await fetch(`${supabaseUrl}/functions/v1/charge-placement-fee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
        body: JSON.stringify({
          inquiryId,
          facilityId,
          feeType: 'flat_fee',
          isInternational: isInternational || false,
        }),
      });

      const chargeResult = await chargeResponse.json();
      chargeSuccess = chargeResponse.ok && chargeResult?.success;
      logStep(requestId, "Charge result", { ok: chargeResponse.ok, charged: chargeResult?.charged, amountCents: chargeResult?.amountCents });

      if (!chargeSuccess) {
        await supabaseService.from("concierge_case_events").insert({
          inquiry_id: inquiryId,
          event_type: "charge_failed",
          event_data: { error: chargeResult?.error || "Unknown charge error", facility_id: facilityId },
          actor_type: "system",
        });
        logStep(requestId, "Charge failed — admin can retry from billing tab");
      }
    } catch (chargeError) {
      logStep(requestId, "Warning: Charge failed", { error: String(chargeError) });
      try {
        await supabaseService.from("concierge_case_events").insert({
          inquiry_id: inquiryId,
          event_type: "charge_failed",
          event_data: { error: String(chargeError), facility_id: facilityId },
          actor_type: "system",
        });
      } catch { /* best-effort */ }
    }

    return new Response(
      JSON.stringify({
        success: true,
        adminConfirmed: true,
        status: 'admitted',
        billingTriggered: chargeSuccess,
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
      errorMessage.includes("Cannot") || errorMessage.includes("Only administrators") ||
      errorMessage.includes("not in matched");
    return new Response(
      JSON.stringify({ error: errorMessage, requestId, _version: VERSION }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: isClientError ? 400 : 500 }
    );
  }
});
