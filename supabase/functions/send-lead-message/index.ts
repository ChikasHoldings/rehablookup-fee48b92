// send-lead-message — append a message to a direct lead's two-way thread.
//
// All sends route through here (lead_messages has no client write policy)
// so we can enforce, in one place:
//   • Provider sender: must OWN or be an active team member of the lead's
//     facility AND that facility must be active Pro (messaging is a Pro
//     feature). Non-Pro / non-member → 403.
//   • Seeker sender: caller's auth email must match the lead's email.
//   • Anyone else → 403.
// After persisting, nudge the OTHER party: in-app notification always,
// SMS only when the recipient has consented (TCPA), reusing the shared
// helpers. Provider SMS goes through send-sms-notification (provider prefs);
// seeker SMS through the twilio-sms helper gated on verified + opt-in.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { sendSms } from "../_shared/twilio-sms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Use POST" });

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader) return json(401, { error: "Unauthorized" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json(401, { error: "Invalid session" });

    let payload: { leadId?: unknown; body?: unknown };
    try { payload = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }

    const leadId = payload.leadId;
    const body = typeof payload.body === "string" ? payload.body.trim() : "";
    if (typeof leadId !== "string" || !UUID_RE.test(leadId)) {
      return json(400, { error: "Valid leadId is required" });
    }
    if (!body || body.length > 4000) {
      return json(400, { error: "Message must be 1–4000 characters" });
    }

    const { data: lead, error: leadErr } = await admin
      .from("leads")
      .select("id, facility_id, email, name")
      .eq("id", leadId)
      .maybeSingle();
    if (leadErr) return json(500, { error: "Lead lookup failed" });
    if (!lead) return json(404, { error: "Lead not found" });

    const { data: facility } = await admin
      .from("facilities")
      .select("id, name, user_id")
      .eq("id", lead.facility_id)
      .maybeSingle();

    // ── Authorize the sender ──
    let senderType: "provider" | "seeker" | null = null;

    // Provider path: owner or active team member, AND facility is Pro.
    let isProviderMember = !!facility && facility.user_id === user.id;
    if (!isProviderMember && lead.facility_id) {
      const { data: teamRow } = await admin
        .from("facility_team_members")
        .select("user_id")
        .eq("facility_id", lead.facility_id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      isProviderMember = !!teamRow;
    }
    if (isProviderMember) {
      const { data: sub } = await admin
        .from("facility_subscriptions")
        .select("status, tier")
        .eq("facility_id", lead.facility_id)
        .eq("status", "active")
        .maybeSingle();
      const isPro = sub?.status === "active" && sub?.tier === "pro";
      if (!isPro) return json(403, { error: "Messaging is a Pro feature", code: "pro_required" });
      senderType = "provider";
    }

    // Seeker path: auth email matches the lead's email.
    if (!senderType) {
      const callerEmail = (user.email || "").toLowerCase();
      if (lead.email && callerEmail && callerEmail === String(lead.email).toLowerCase()) {
        senderType = "seeker";
      }
    }

    if (!senderType) return json(403, { error: "Forbidden" });

    // ── Persist ──
    const { data: msg, error: insErr } = await admin
      .from("lead_messages")
      .insert({ lead_id: leadId, sender_type: senderType, sender_id: user.id, body })
      .select("id, created_at")
      .single();
    if (insErr || !msg) return json(500, { error: "Failed to send message" });

    const preview = body.length > 140 ? body.slice(0, 137) + "..." : body;
    const facilityName = facility?.name || "A treatment center";

    // ── Nudge the other party (best-effort; never fail the send) ──
    if (senderType === "provider") {
      // Resolve the seeker's account from the lead email.
      let seekerId: string | null = null;
      try {
        // deno-lint-ignore no-explicit-any
        const { data: users } = await (admin.auth.admin as any).listUsers({
          filter: `email.eq.${String(lead.email).toLowerCase()}`,
          perPage: 1,
        });
        seekerId = (users?.users ?? [])[0]?.id ?? null;
      } catch (_e) { /* guest lead — no account */ }

      if (seekerId) {
        try {
          await admin.from("seeker_notifications").insert({
            user_id: seekerId,
            type: "lead_message",
            title: `New message from ${facilityName}`,
            message: preview,
            link: "/account/requests",
            metadata: { lead_id: leadId },
          });
        } catch (_e) { /* non-fatal */ }

        // SMS only with verified phone + explicit opt-in (TCPA).
        try {
          const { data: sp } = await admin
            .from("seeker_profiles")
            .select("phone, phone_verified, sms_opted_in_at, sms_opted_out_at")
            .eq("user_id", seekerId)
            .maybeSingle();
          const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
          const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
          const twilioFrom = Deno.env.get("TWILIO_PHONE_NUMBER");
          const verified = sp?.phone_verified === true && !!sp?.phone;
          const consented = !!sp?.sms_opted_in_at && !sp?.sms_opted_out_at;
          if (twilioSid && twilioToken && twilioFrom && verified && consented) {
            await sendSms(
              admin,
              { accountSid: twilioSid, authToken: twilioToken, fromNumber: twilioFrom },
              {
                to: sp!.phone as string,
                body: `RehabLookup: New message from ${facilityName}. Reply at rehablookup.com/account/requests. Reply STOP to opt out.`,
                userId: seekerId,
                notificationType: "lead_message",
              },
            );
          }
        } catch (_e) { /* non-fatal */ }
      }
    } else {
      // Seeker → provider.
      if (facility?.user_id) {
        try {
          await admin.from("provider_notifications").insert({
            user_id: facility.user_id,
            facility_id: facility.id,
            type: "lead_message",
            title: `New message from ${lead.name || "a client"}`,
            message: preview,
            metadata: { lead_id: leadId, link: `/provider/inquiries?lead=${leadId}` },
            read: false,
          });
        } catch (_e) { /* non-fatal */ }

        // Provider SMS via send-sms-notification (respects provider prefs/consent).
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-sms-notification`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({
              userId: facility.user_id,
              notificationType: "general",
              data: { customMessage: `RehabLookup: New message from ${lead.name || "a client"} on your inquiry. Log in to reply.` },
            }),
          });
        } catch (_e) { /* non-fatal */ }
      }
    }

    return json(200, { success: true, messageId: msg.id, createdAt: msg.created_at });
  } catch (err) {
    console.error("[send-lead-message] error", err);
    return json(500, { error: "Internal server error" });
  }
});
