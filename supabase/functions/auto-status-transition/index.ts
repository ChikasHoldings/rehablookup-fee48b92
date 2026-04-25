import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION = "3.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const logStep = (requestId: string, step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  console.log(`[AUTO-STATUS-TRANSITION] [${VERSION}] [${requestId}] [${timestamp}] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

/**
 * Auto Status Transition v3 — walks through intermediate statuses
 * to satisfy the validate_concierge_status_transition DB trigger.
 *
 * The DB trigger enforces single-step-only transitions, so this function
 * chains multiple updates when a trigger implies skipping stages.
 *
 * Triggers:
 *   admin_viewed:        intake_submitted → intake_reviewed
 *   matches_completed:   advisor_assigned → matching_providers → provider_prequalification
 *   introduction_sent:   → providers_accepted → presented_to_seeker
 *   provider_interested: → providers_accepted → presented_to_seeker → seeker_selected
 */

interface TransitionRequest {
  inquiryId: string;
  trigger: "admin_viewed" | "matches_completed" | "introduction_sent" | "provider_interested";
  actorId?: string;
  /**
   * Granular actor classification used to attribute the resulting case event.
   * Mirror the client `getCaseEventActorType()` taxonomy — never collapse
   * admin actions to the generic "admin" literal. "system" is reserved for
   * background jobs / cron without a real human actor.
   */
  actorType?: "super_admin" | "manager" | "customer_rep" | "advisor" | "provider" | "seeker" | "system";
}

// The canonical forward path (must match the DB trigger exactly)
const FORWARD_PATH = [
  "pending_intake",
  "intake_submitted",
  "intake_reviewed",
  "advisor_assigned",
  "matching_providers",
  "provider_prequalification",
  "providers_accepted",
  "presented_to_seeker",
  "seeker_selected",
  "admission_in_progress",
  "admitted",
  "billed",
  "completed",
];

// Each trigger maps to a target status. We walk from current → target one step at a time.
const TRIGGER_TARGET: Record<string, string> = {
  admin_viewed: "intake_reviewed",
  matches_completed: "provider_prequalification",
  introduction_sent: "presented_to_seeker",
  provider_interested: "seeker_selected",
};

// Only attempt the transition if current status is in one of these
const TRIGGER_VALID_FROM: Record<string, string[]> = {
  admin_viewed: ["intake_submitted", "new"],
  matches_completed: ["advisor_assigned", "matching_providers"],
  introduction_sent: ["matching_providers", "provider_prequalification", "providers_accepted"],
  provider_interested: ["provider_prequalification", "providers_accepted", "presented_to_seeker"],
};

// Extra fields to set based on the final target status
function getTimestampFields(toStatus: string): Record<string, unknown> {
  const now = new Date().toISOString();
  switch (toStatus) {
    case "provider_prequalification":
      return { matched_at: now };
    case "presented_to_seeker":
      return { introductions_sent_at: now };
    default:
      return {};
  }
}

/**
 * Walk from `currentStatus` to `targetStatus` one step at a time.
 * Returns the final status reached and whether any transition was made.
 */
async function walkTransitions(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  inquiryId: string,
  currentStatus: string,
  targetStatus: string,
  requestId: string,
): Promise<{ finalStatus: string; steps: number; lastError: string | null; lockMissAt: string | null }> {
  const currentIdx = FORWARD_PATH.indexOf(currentStatus);
  const targetIdx = FORWARD_PATH.indexOf(targetStatus);

  if (currentIdx < 0 || targetIdx < 0 || currentIdx >= targetIdx) {
    return { finalStatus: currentStatus, steps: 0, lastError: null, lockMissAt: null };
  }

  let status = currentStatus;
  let steps = 0;
  let lastError: string | null = null;
  let lockMissAt: string | null = null;

  for (let i = currentIdx + 1; i <= targetIdx; i++) {
    const nextStatus = FORWARD_PATH[i];
    const timestampFields = i === targetIdx ? getTimestampFields(targetStatus) : {};

    const { data: updated, error } = await supabase
      .from("concierge_inquiries")
      .update({ status: nextStatus, ...timestampFields })
      .eq("id", inquiryId)
      .eq("status", status) // Optimistic lock
      .select("id")
      .maybeSingle();

    if (error) {
      // Surface DB trigger rejection (e.g. validate_concierge_status_transition)
      // so the caller can log / alert instead of silently returning success.
      lastError = error.message;
      logStep(requestId, "Step failed", { from: status, to: nextStatus, error: error.message });
      break;
    }
    if (!updated) {
      // Optimistic lock miss — another writer changed the status under us.
      // Stop walking (continuing would be unsafe), and surface the conflict.
      lockMissAt = status;
      logStep(requestId, "Optimistic lock failed", { from: status, to: nextStatus });
      break;
    }

    logStep(requestId, "Step succeeded", { from: status, to: nextStatus });
    status = nextStatus;
    steps++;
  }

  return { finalStatus: status, steps, lastError, lockMissAt };
}

Deno.serve(async (req) => {
  const requestId = generateRequestId();

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    logStep(requestId, "Function started", { version: VERSION });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { inquiryId, trigger, actorId, actorType = "system" }: TransitionRequest = await req.json();

    if (!inquiryId || !trigger) {
      return new Response(
        JSON.stringify({ error: "inquiryId and trigger are required", requestId, _version: VERSION }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep(requestId, "Processing", { inquiryId, trigger });

    // Fetch current status
    const { data: inquiry, error: inquiryError } = await supabase
      .from("concierge_inquiries")
      .select("id, status")
      .eq("id", inquiryId)
      .single();

    if (inquiryError || !inquiry) {
      throw new Error("Inquiry not found: " + inquiryError?.message);
    }

    const validFrom = TRIGGER_VALID_FROM[trigger];
    const targetStatus = TRIGGER_TARGET[trigger];

    if (!validFrom || !targetStatus) {
      return new Response(
        JSON.stringify({ success: true, transitionMade: false, reason: "unknown trigger", requestId, _version: VERSION }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if current status is valid for this trigger
    if (!validFrom.includes(inquiry.status)) {
      logStep(requestId, "No transition — status not in valid_from", {
        currentStatus: inquiry.status,
        trigger,
        validFrom,
      });
      return new Response(
        JSON.stringify({
          success: true,
          transitionMade: false,
          previousStatus: inquiry.status,
          newStatus: inquiry.status,
          trigger,
          requestId,
          _version: VERSION,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Walk through intermediate statuses
    const { finalStatus, steps, lastError, lockMissAt } = await walkTransitions(
      supabase,
      inquiryId,
      inquiry.status,
      targetStatus,
      requestId,
    );

    const transitionMade = steps > 0;

    // Log a single summary event for the overall transition
    if (transitionMade) {
      await supabase.from("concierge_case_events").insert({
        inquiry_id: inquiryId,
        event_type: "status_changed",
        event_data: {
          from_status: inquiry.status,
          to_status: finalStatus,
          trigger,
          auto: true,
          steps,
          ...(lastError ? { partial: true, last_error: lastError } : {}),
          ...(lockMissAt ? { partial: true, lock_miss_at: lockMissAt } : {}),
        },
        actor_id: actorId || null,
        actor_type: actorType,
      });
    }

    // Surface partial-walk failures so callers (and admins reviewing logs)
    // can distinguish a clean walk from one that stalled mid-path.
    const reachedTarget = finalStatus === targetStatus;

    return new Response(
      JSON.stringify({
        success: true,
        transitionMade,
        previousStatus: inquiry.status,
        newStatus: finalStatus,
        targetStatus,
        reachedTarget,
        trigger,
        steps,
        ...(lastError ? { error: lastError, partial: true } : {}),
        ...(lockMissAt ? { lockConflictAt: lockMissAt, partial: true } : {}),
        requestId,
        _version: VERSION,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep(requestId, "ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage, requestId, _version: VERSION }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
