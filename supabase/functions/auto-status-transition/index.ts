import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION = "1.0.2";

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
 * Automatic Status Transition Rules:
 * 
 * new → reviewing: Automatic when admin views case
 * matching → matched: Automatic when match algorithm completes with results
 * matched → introductions_sent: Automatic when first introduction is sent
 * introductions_sent → in_contact: Automatic when any provider marks "interested"
 * 
 * Note: in_contact → placed is handled by confirm-placement edge function (admin-only)
 */

interface TransitionRequest {
  inquiryId: string;
  trigger: 
    | 'admin_viewed'         // new → reviewing
    | 'matches_completed'    // matching → matched
    | 'introduction_sent'    // matched → introductions_sent
    | 'provider_interested'; // introductions_sent → in_contact
  actorId?: string;
  actorType?: 'admin' | 'provider' | 'seeker' | 'system';
}

const VALID_TRANSITIONS: Record<string, { from: string[]; to: string }> = {
  admin_viewed: { from: ['new'], to: 'reviewing' },
  matches_completed: { from: ['reviewing', 'matching'], to: 'matched' },
  introduction_sent: { from: ['matched'], to: 'introductions_sent' },
  provider_interested: { from: ['matched', 'introductions_sent'], to: 'in_contact' },
};

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

    const { inquiryId, trigger, actorId, actorType = 'system' }: TransitionRequest = await req.json();

    if (!inquiryId || !trigger) {
      throw new Error("inquiryId and trigger are required");
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

    let newStatus: string | null = null;
    let transitionMade = false;

    // Determine the new status based on trigger and current state
    switch (trigger) {
      case 'admin_viewed':
        if (VALID_TRANSITIONS.admin_viewed.from.includes(inquiry.status)) {
          newStatus = VALID_TRANSITIONS.admin_viewed.to;
        }
        break;

      case 'matches_completed':
        if (VALID_TRANSITIONS.matches_completed.from.includes(inquiry.status)) {
          newStatus = VALID_TRANSITIONS.matches_completed.to;
        }
        break;

      case 'introduction_sent':
        if (VALID_TRANSITIONS.introduction_sent.from.includes(inquiry.status)) {
          newStatus = VALID_TRANSITIONS.introduction_sent.to;
        }
        break;

      case 'provider_interested':
        if (VALID_TRANSITIONS.provider_interested.from.includes(inquiry.status)) {
          newStatus = VALID_TRANSITIONS.provider_interested.to;
        }
        break;
    }

    // Apply the status transition if valid
    if (newStatus && newStatus !== inquiry.status) {
      const updateData: Record<string, unknown> = { status: newStatus };
      
      // Add timestamp fields for specific statuses
      if (newStatus === 'matched') {
        updateData.matched_at = new Date().toISOString();
      } else if (newStatus === 'introductions_sent' && !inquiry.status?.includes('introductions')) {
        updateData.introductions_sent_at = new Date().toISOString();
      }
      // Note: 'placed' status is handled by confirm-placement edge function

      const { error: updateError } = await supabase
        .from("concierge_inquiries")
        .update(updateData)
        .eq("id", inquiryId);

      if (updateError) {
        throw new Error("Failed to update status: " + updateError.message);
      }

      // Log the status change event
      await supabase.from("concierge_case_events").insert({
        inquiry_id: inquiryId,
        event_type: "status_changed",
        event_data: { 
          from_status: inquiry.status, 
          to_status: newStatus,
          trigger,
        },
        actor_id: actorId || null,
        actor_type: actorType,
      });

      transitionMade = true;
      logStep(requestId, "Status transitioned", { from: inquiry.status, to: newStatus, trigger });
    } else {
      logStep(requestId, "No transition made", { 
        currentStatus: inquiry.status, 
        trigger,
        reason: newStatus ? "already in target status" : "transition not valid for current status"
      });
    }

    return new Response(JSON.stringify({
      success: true,
      transitionMade,
      previousStatus: inquiry.status,
      newStatus: newStatus || inquiry.status,
      trigger,
      requestId,
      _version: VERSION,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep(requestId, "ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage, requestId, _version: VERSION }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
