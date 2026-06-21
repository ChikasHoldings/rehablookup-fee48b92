// support-ticket-create
// ──────────────────────
// Authenticated in-app support ticket creation for seekers and providers.
// Creates the ticket + the first thread message (with optional pre-uploaded
// attachments), then alerts admins (in-app + email). Email is an alert only;
// the app is the source of truth. Identity is derived from the JWT — the client
// cannot spoof the sender. Provider tickets are bound to a facility the caller
// is authorized for, enabling facility-team visibility via RLS.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface Attachment { path: string; name: string; type?: string; size?: number }

function sanitizeAttachments(raw: unknown, ticketId: string): Attachment[] {
  if (!Array.isArray(raw)) return [];
  const out: Attachment[] = [];
  for (const a of raw.slice(0, 10)) {
    if (!a || typeof a !== "object") continue;
    const path = String((a as Attachment).path ?? "");
    const name = String((a as Attachment).name ?? "file");
    const size = Number((a as Attachment).size ?? 0);
    // Path must live under this ticket's folder and be <= 15 MB.
    if (!path.startsWith(`${ticketId}/`)) continue;
    if (size > 15 * 1024 * 1024) continue;
    out.push({ path, name: name.slice(0, 200), type: String((a as Attachment).type ?? "").slice(0, 120), size });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader) return json(401, { error: "unauthorized" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return json(401, { error: "unauthorized" });

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let payload: Record<string, unknown>;
  try { payload = await req.json(); } catch { return json(400, { error: "invalid_json" }); }

  const ticketId = String(payload.ticketId ?? "");
  const panel = String(payload.panel ?? "seeker");
  const category = String(payload.category ?? "").trim();
  const subject = typeof payload.subject === "string" ? payload.subject.trim().slice(0, 200) : null;
  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  const facilityId = payload.facilityId ? String(payload.facilityId) : null;

  if (!UUID_RE.test(ticketId)) return json(400, { error: "invalid_ticket_id" });
  if (!category) return json(400, { error: "category_required" });
  if (!message || message.length > 8000) return json(400, { error: "invalid_message" });
  if (panel !== "seeker" && panel !== "provider") return json(400, { error: "invalid_panel" });

  // Collision / hijack guard: never reuse an existing ticket id.
  const { data: existing } = await admin.from("support_tickets").select("id").eq("id", ticketId).maybeSingle();
  if (existing) return json(409, { error: "ticket_exists" });

  let source = "seeker_support";
  let resolvedFacilityId: string | null = null;
  let facilityName: string | null = null;

  if (panel === "provider") {
    if (!facilityId || !UUID_RE.test(facilityId)) return json(400, { error: "facility_required" });
    // Authorize: caller must own or be an active team member of the facility.
    const { data: fac } = await admin.from("facilities").select("id, name, user_id").eq("id", facilityId).maybeSingle();
    if (!fac) return json(404, { error: "facility_not_found" });
    let authorized = fac.user_id === user.id;
    if (!authorized) {
      const { data: team } = await admin.from("facility_team_members")
        .select("user_id").eq("facility_id", facilityId).eq("user_id", user.id).eq("status", "active").maybeSingle();
      authorized = !!team;
    }
    if (!authorized) return json(403, { error: "forbidden_facility" });
    source = "provider_support";
    resolvedFacilityId = facilityId;
    facilityName = fac.name ?? null;
  }

  const attachments = sanitizeAttachments(payload.attachments, ticketId);
  const senderName = (typeof payload.senderName === "string" && payload.senderName.trim())
    ? payload.senderName.trim().slice(0, 200)
    : (facilityName || user.email?.split("@")[0] || "User");
  const senderEmail = user.email ?? "";
  const now = new Date().toISOString();
  const relatedEntityType = typeof payload.relatedEntityType === "string" ? payload.relatedEntityType.slice(0, 60) : null;
  const relatedEntityId = (payload.relatedEntityId && UUID_RE.test(String(payload.relatedEntityId)))
    ? String(payload.relatedEntityId) : null;
  const context = (payload.context && typeof payload.context === "object") ? payload.context : null;

  // 1. Ticket row (message column doubles as the list preview).
  const { error: tErr } = await admin.from("support_tickets").insert({
    id: ticketId,
    source,
    sender_name: senderName,
    sender_email: senderEmail,
    sender_user_id: user.id,
    category: category.slice(0, 80),
    subject,
    message,
    status: "open",
    priority: "normal",
    facility_id: resolvedFacilityId,
    related_entity_type: relatedEntityType,
    related_entity_id: relatedEntityId,
    context,
    last_message_at: now,
    last_message_role: "user",
  });
  if (tErr) {
    console.error("[support-ticket-create] ticket insert failed", tErr);
    return json(500, { error: "ticket_create_failed" });
  }

  // 2. First thread message (the full thread renders from support_ticket_messages).
  const { error: mErr } = await admin.from("support_ticket_messages").insert({
    ticket_id: ticketId,
    sender_user_id: user.id,
    sender_role: "user",
    body: message,
    attachments,
  });
  if (mErr) {
    console.error("[support-ticket-create] first message insert failed", mErr);
    // The ticket exists; surface the partial failure rather than a false success.
    return json(500, { error: "ticket_message_failed", ticketId });
  }

  // 3. Alert admins in-app (best-effort; never blocks ticket creation).
  try {
    const { data: admins } = await admin.from("admin_user_profiles").select("user_id").eq("status", "active");
    const preview = message.length > 140 ? message.slice(0, 137) + "..." : message;
    const rows = (admins ?? []).map((a: { user_id: string }) => ({
      user_id: a.user_id,
      type: "support_ticket",
      title: `New ${source === "provider_support" ? "provider" : "seeker"} support ticket`,
      message: subject ? `${subject} — ${preview}` : preview,
      link: `/admin/support?ticket=${ticketId}`,
      metadata: { ticket_id: ticketId, source },
    }));
    if (rows.length) await admin.from("admin_user_notifications").insert(rows);
  } catch (e) { console.error("[support-ticket-create] admin notify failed", e); }

  // 4. Email alert to the support inbox (best-effort).
  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      const inbox = source === "provider_support" ? "providers@rehablookup.com" : "help@rehablookup.com";
      await sendEmailWithRetry(admin, new Resend(resendKey), {
        from: "RehabLookup Support <no-reply@rehablookup.com>",
        to: [inbox],
        replyTo: senderEmail || undefined,
        subject: `New support ticket: ${subject || category}`,
        html: `<p>A new ${source === "provider_support" ? "provider" : "seeker"} support ticket was opened.</p>
               <p><strong>From:</strong> ${senderName} (${senderEmail})<br/>
               <strong>Category:</strong> ${category}${subject ? `<br/><strong>Subject:</strong> ${subject}` : ""}</p>
               <p>Open it in the admin panel: <a href="https://rehablookup.com/admin/support?ticket=${ticketId}">View ticket</a></p>`,
      }, { emailType: "support_ticket_created", idempotencyKey: `support-new-${ticketId}` });
    }
  } catch (e) { console.error("[support-ticket-create] inbox email failed", e); }

  return json(200, { success: true, ticketId });
});
