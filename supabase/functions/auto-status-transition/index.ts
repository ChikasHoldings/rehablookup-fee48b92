import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION = "2.0.0";

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
 * Automatic Status Transition Rules (v2 — aligned with pipeline config):
 *
 * admin_viewed:         intake_submitted → intake_reviewed
 * matches_completed:    advisor_assigned | matching_providers → provider_prequalification
 * introduction_sent:    provider_prequalification | providers_accepted → presented_to_seeker
 *                       (also advances matching_providers → provider_prequalification if still there)
 * provider_interested:  presented_to_seeker → seeker_selected
 *                       (also advances provider_prequalification → providers_accepted if still there)
 *
 * Note: seeker_selected → admitted is handled by confirm-placement or manual advance.
 */

interface TransitionRequest {
  inquiryId: string;
  trigger:
    | "admin_viewed"
    | "matches_completed"
    | "introduction_sent"
    | "provider_interested";
  actorId?: string;
  actorType?: "admin" | "provider" | "seeker" | "system";
}

const TRANSITION_RULES: Record<string, { from: string[]; to: string }> = {
  admin_viewed: {
    from: ["intake_submitted", "new"],
    to: "intake_reviewed",
  },
  matches_completed: {
    from: ["advisor_assigned", "matching_providers", "reviewing", "matching"],
    to: "provider_prequalification",
  },
  introduction_sent: {
    from: [
      "matching_providers",
      "provider_prequalification",
      "providers_accepted",
      // Legacy compat
      "matched",
    ],
    to: "presented_to_seeker",
  },
  provider_interested: {
    from: [
      "provider_prequalification",
      "providers_accepted",
      "presented_to_seeker",
      // Legacy compat
      "matched",
      "introductions_sent",
      "in_contact",
    ],
    to: "seeker_selected",
  },
};

// Extra fields to set based on the target status
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
      logStep(requestId, "ERROR", { message: "inquiryId and trigger are required" });
      return new Response(
        JSON.stringify({ error: "inquiryId and trigger are required", requestId, _version: VERSION }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep(requestId, "Processing transition", { inquiryId, trigger });

    // Fetch current inquiry state
    const { data: inquiry, error: inquiryError } = await supabase
      .from("concierge_inquiries")
      .select("id, status, seeker_confirmed, placement_confirmed")
      .eq("id", inquiryId)
      .single();

    if (inquiryError || !inquiry) {
      throw new Error("Inquiry not found: " + inquiryError?.message);
    }

    const rule = TRANSITION_RULES[trigger];
    let newStatus: string | null = null;
    let transitionMade = false;

    if (rule && rule.from.includes(inquiry.status)) {
      newStatus = rule.to;
    }

    // Apply the status transition if valid
    if (newStatus && newStatus !== inquiry.status) {
      const timestampFields = getTimestampFields(newStatus);
      const updateData: Record<string, unknown> = {
        status: newStatus,
        ...timestampFields,
      };

      // Optimistic lock: only update if status hasn't changed
      const { data: updated, error: updateError } = await supabase
        .from("concierge_inquiries")
        .update(updateData)
        .eq("id", inquiryId)
        .eq("status", inquiry.status)
        .select("id")
        .maybeSingle();

      if (updateError) {
        throw new Error("Failed to update status: " + updateError.message);
      }

      if (updated) {
        // Log the status change event
        await supabase.from("concierge_case_events").insert({
          inquiry_id: inquiryId,
          event_type: "status_changed",
          event_data: {
            from_status: inquiry.status,
            to_status: newStatus,
            trigger,
            auto: true,
          },
          actor_id: actorId || null,
          actor_type: actorType,
        });

        transitionMade = true;
        logStep(requestId, "Status transitioned", { from: inquiry.status, to: newStatus, trigger });
      } else {
        logStep(requestId, "Optimistic lock failed — status changed concurrently", {
          currentStatus: inquiry.status,
          targetStatus: newStatus,
        });
      }
    } else {
      logStep(requestId, "No transition made", {
        currentStatus: inquiry.status,
        trigger,
        reason: newStatus ? "already in target status" : "transition not valid for current status",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        transitionMade,
        previousStatus: inquiry.status,
        newStatus: newStatus || inquiry.status,
        trigger,
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
