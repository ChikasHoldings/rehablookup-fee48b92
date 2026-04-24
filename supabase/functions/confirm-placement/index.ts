import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCaseEventActorType } from "../_shared/case-event-actor.ts";

const VERSION = "3.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const logStep = (requestId: string, step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  console.log(`[CONFIRM-PLACEMENT] [${VERSION}] [${requestId}] [${timestamp}] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const isValidUUID = (str: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

const isValidISODate = (str: string): boolean => {
  if (!str) return true;
  return !isNaN(new Date(str).getTime());
};

/**
 * Structured error so callers (and the smoke test runner) get a stable
 * `{ error: { code, message } }` envelope instead of free-form strings.
 */
class ApiError extends Error {
  constructor(public code: string, message: string, public httpStatus = 400) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * The DB trigger `validate_concierge_status_transition` enforces sequential transitions.
 * To go from e.g. `presented_to_seeker` → `admitted` we must step through each intermediate status.
 * This map defines the canonical path to `admitted`.
 */
const PATH_TO_ADMITTED: Record<string, string[]> = {
  providers_accepted:     ["presented_to_seeker", "seeker_selected", "admission_in_progress", "admitted"],
  presented_to_seeker:    ["seeker_selected", "admission_in_progress", "admitted"],
  seeker_selected:        ["admission_in_progress", "admitted"],
  admission_in_progress:  ["admitted"],
};

Deno.serve(async (req) => {
  const requestId = generateRequestId();

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405, requestId);
  }

  try {
    logStep(requestId, "Function started", { version: VERSION });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new ApiError("SERVER_MISCONFIGURED", "Supabase configuration missing", 500);
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError("MISSING_AUTH_HEADER", "No authorization header", 401, requestId);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return jsonError("AUTH_FAILED", "Authentication failed", 401, requestId);
    }

    // Resolve granular admin role for actor_type attribution.
    const supabaseRoleLookup = createClient(supabaseUrl, supabaseServiceKey);
    const { data: adminProfile } = await supabaseRoleLookup
      .from("admin_user_profiles")
      .select("admin_role")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    const actorType = getCaseEventActorType(adminProfile?.admin_role ?? null);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonError("INVALID_JSON", "Invalid JSON body", 400, requestId);
    }

    const { inquiryId, facilityId, confirmationType, admittedAt, isInternational } = body as {
      inquiryId: string; facilityId: string; confirmationType: string; admittedAt?: string; isInternational?: boolean;
    };

    // Per-field validation so callers (and smoke tests) can pinpoint the missing input.
    if (!inquiryId)        throw new ApiError("MISSING_FIELD_INQUIRY_ID", "inquiryId is required", 400);
    if (!facilityId)       throw new ApiError("MISSING_FIELD_FACILITY_ID", "facilityId is required", 400);
    if (!confirmationType) throw new ApiError("MISSING_FIELD_CONFIRMATION_TYPE", "confirmationType is required", 400);
    if (!isValidUUID(inquiryId))  throw new ApiError("INVALID_INQUIRY_ID", "Invalid inquiryId format", 400);
    if (!isValidUUID(facilityId)) throw new ApiError("INVALID_FACILITY_ID", "Invalid facilityId format", 400);

    const validConfirmationTypes = ["admin", "admin_confirm", "placement_confirm"];
    if (!validConfirmationTypes.includes(confirmationType)) {
      throw new ApiError("INVALID_CONFIRMATION_TYPE", "Invalid confirmationType", 400);
    }
    if (admittedAt && !isValidISODate(admittedAt)) {
      throw new ApiError("INVALID_ADMITTED_AT", "Invalid admitted date format", 400);
    }

    logStep(requestId, "Processing confirmation", { inquiryId, facilityId, confirmationType });

    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Admin-only authorization (check first to fail fast)
    const { data: userRole } = await supabaseService
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!userRole) {
      throw new Error("Only administrators can confirm placements.");
    }

    logStep(requestId, "Admin authorization verified", { adminUserId: userData.user.id });

    // Get the inquiry with optimistic lock on current status
    const { data: inquiry, error: inquiryError } = await supabaseService
      .from("concierge_inquiries")
      .select("id, status, matched_facility_ids, admin_matched_facility_ids, payment_amount_cents, assigned_advisor_id")
      .eq("id", inquiryId)
      .single();

    if (inquiryError || !inquiry) throw new Error("Inquiry not found");

    // Idempotent: already admitted/billed/completed
    const TERMINAL_STATUSES = ["admitted", "billed", "completed"];
    if (TERMINAL_STATUSES.includes(inquiry.status)) {
      logStep(requestId, "Case already in terminal status — idempotent return", { inquiryId, status: inquiry.status });
      return new Response(JSON.stringify({
        success: true, alreadyPlaced: true, status: inquiry.status, requestId, _version: VERSION,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (inquiry.status === "closed") {
      throw new Error("Cannot confirm placement for a closed case");
    }

    // Must be in a confirmable status
    const transitionPath = PATH_TO_ADMITTED[inquiry.status];
    if (!transitionPath) {
      throw new Error(
        `Cannot confirm placement: case is in '${inquiry.status}' status. ` +
        `Must be in one of: ${Object.keys(PATH_TO_ADMITTED).join(", ")}`
      );
    }

    // Verify facility is in matched list
    const matchedFacilityIds = [
      ...(inquiry.matched_facility_ids || []),
      ...(inquiry.admin_matched_facility_ids || []),
    ];
    if (!matchedFacilityIds.includes(facilityId)) {
      throw new Error("Facility not in matched list for this inquiry");
    }

    // ── Step through each intermediate status to satisfy DB trigger ──
    const now = new Date().toISOString();
    let currentStatus = inquiry.status;

    for (const nextStatus of transitionPath) {
      const isAdmitted = nextStatus === "admitted";
      const stepUpdate: Record<string, unknown> = { status: nextStatus };

      // Only set placement fields on the final 'admitted' step
      if (isAdmitted) {
        stepUpdate.placed_facility_id = facilityId;
        stepUpdate.placement_confirmed = true;
        stepUpdate.placement_confirmed_at = admittedAt || now;
        stepUpdate.seeker_confirmed = true;
        stepUpdate.seeker_confirmed_at = now;
        stepUpdate.admission_status = "admitted";
        stepUpdate.admission_substatus = "admitted";
      }

      // Optimistic lock: only update if status still matches
      const { data: updated, error: stepError } = await supabaseService
        .from("concierge_inquiries")
        .update(stepUpdate)
        .eq("id", inquiryId)
        .eq("status", currentStatus)
        .select("id")
        .maybeSingle();

      if (stepError) {
        throw new Error(`Failed to transition ${currentStatus} → ${nextStatus}: ${stepError.message}`);
      }
      if (!updated) {
        throw new Error(
          `Status conflict during ${currentStatus} → ${nextStatus}. ` +
          `Another user may have changed this case. Please refresh and try again.`
        );
      }

      logStep(requestId, "Status step", { from: currentStatus, to: nextStatus });
      currentStatus = nextStatus;
    }

    logStep(requestId, "Case moved to 'admitted'", { facilityId, stepsCompleted: transitionPath.length });

    // Log placement_confirmed event
    await supabaseService.from("concierge_case_events").insert({
      inquiry_id: inquiryId,
      event_type: "placement_confirmed",
      event_data: {
        facility_id: facilityId,
        admitted_at: admittedAt || now,
        confirmed_by: actorType,
        from_status: inquiry.status,
        to_status: "admitted",
        steps: transitionPath.length,
      },
      actor_id: userData.user.id,
      actor_type: actorType,
    });

    // Send notification (best-effort)
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-concierge-notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
        body: JSON.stringify({ type: "placement_complete", inquiryId, facilityId }),
      });
    } catch (notifError) {
      logStep(requestId, "Warning: Failed to send notification", { error: String(notifError) });
    }

    // ── Trigger billing (admitted → billed) ──
    logStep(requestId, "Triggering placement fee charge");
    let chargeSuccess = false;

    try {
      const chargeResponse = await fetch(`${supabaseUrl}/functions/v1/charge-placement-fee`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
        body: JSON.stringify({
          inquiryId,
          facilityId,
          feeType: "flat_fee",
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
        status: "admitted",
        billingTriggered: chargeSuccess,
        requestId,
        _version: VERSION,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    if (error instanceof ApiError) {
      logStep(requestId, "ERROR", { code: error.code, message: error.message, status: error.httpStatus });
      return jsonError(error.code, error.message, error.httpStatus, requestId);
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep(requestId, "ERROR", { message: errorMessage });
    const isClientError = errorMessage.includes("not found") ||
      errorMessage.includes("required") || errorMessage.includes("Invalid") ||
      errorMessage.includes("Cannot") || errorMessage.includes("Only administrators") ||
      errorMessage.includes("not in matched") || errorMessage.includes("conflict");
    const code = isClientError ? "BAD_REQUEST" : "INTERNAL_ERROR";
    return jsonError(code, errorMessage, isClientError ? 400 : 500, requestId);
  }
});

function jsonError(code: string, message: string, status: number, requestId: string): Response {
  return new Response(
    JSON.stringify({
      error: { code, message },
      requestId,
      _version: VERSION,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status },
  );
}
