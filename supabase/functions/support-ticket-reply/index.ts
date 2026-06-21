// support-ticket-reply
// ────────────────────
// Posts a reply into a support ticket thread. The sender ROLE is derived from
// the JWT (admins post 'admin', everyone else posts 'user') — never trusted from
// the body. Authorization: admins may reply to any ticket; others must be able to
// access the ticket (owner or active facility team member). Flips ticket status
// (admin → waiting_on_user; user → waiting_on_admin, reopening a resolved/closed
// ticket) and alerts the other party in-app + email. Email is an alert only.

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
    const size = Number((a as Attachment).size ?? 0);
    if (!path.startsWith(`${ticketId}/`)) continue;
    if (size > 15 * 1024 * 1024) continue;
    out.push({ path, name: String((a as Attachment).name ?? "file").slice(0, 200), type: String((a as Attachment).type ?? "").slice(0, 120), size });
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
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (!UUID_RE.test(ticketId)) return json(400, { error: "invalid_ticket_id" });
  if (!body || body.length > 8000) return json(400, { error: "invalid_body" });

  const { data: ticket } = await admin.from("support_tickets")
    .select("id, source, sender_user_id, sender_email, sender_name, facility_id, status, subject, category, assigned_to")
    .eq("id", ticketId).maybeSingle();
  if (!ticket) return json(404, { error: "ticket_not_found" });

  // Derive role from the JWT (never the body).
  const { data: adminRole } = await admin.from("user_roles")
    .select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  const isAdmin = !!adminRole;

  let senderRole: "admin" | "user";
  if (isAdmin) {
    senderRole = "admin";
  } else {
    const { data: canAccess } = await admin.rpc("user_can_access_support_ticket", { p_ticket_id: ticketId, p_uid: user.id });
    if (!canAccess) return json(403, { error: "forbidden" });
    senderRole = "user";
  }

  const attachments = sanitizeAttachments(payload.attachments, ticketId);

  const { data: msg, error: mErr } = await admin.from("support_ticket_messages").insert({
    ticket_id: ticketId,
    sender_user_id: user.id,
    sender_role: senderRole,
    body,
    attachments,
  }).select("id, created_at").single();
  if (mErr || !msg) {
    console.error("[support-ticket-reply] message insert failed", mErr);
    return json(500, { error: "reply_failed" });
  }

  const wasClosed = ticket.status === "resolved" || ticket.status === "closed";
  const newStatus = senderRole === "admin" ? "waiting_on_user" : "waiting_on_admin";
  const reopened = senderRole === "user" && wasClosed;
  const now = new Date().toISOString();
  await admin.from("support_tickets").update({
    status: newStatus, last_message_at: now, last_message_role: senderRole, updated_at: now,
  }).eq("id", ticketId);

  const preview = body.length > 140 ? body.slice(0, 137) + "..." : body;
  const subjectLabel = ticket.subject || ticket.category || "your support ticket";

  // ── Notify the OTHER party (best-effort; never fails the reply) ──
  try {
    if (senderRole === "admin") {
      // Notify ticket owner + (for provider tickets) the facility team, except the sender.
      const recipients = new Set<string>();
      if (ticket.sender_user_id) recipients.add(ticket.sender_user_id as string);
      if (ticket.source === "provider_support" && ticket.facility_id) {
        const { data: fac } = await admin.from("facilities").select("user_id").eq("id", ticket.facility_id).maybeSingle();
        if (fac?.user_id) recipients.add(fac.user_id as string);
        const { data: team } = await admin.from("facility_team_members")
          .select("user_id").eq("facility_id", ticket.facility_id).eq("status", "active");
        for (const t of team ?? []) recipients.add((t as { user_id: string }).user_id);
      }
      recipients.delete(user.id);

      const isProvider = ticket.source === "provider_support";
      const link = isProvider ? `/provider/help?ticket=${ticketId}` : `/account/support?ticket=${ticketId}`;
      for (const uid of recipients) {
        if (isProvider) {
          await admin.from("provider_notifications").insert({
            user_id: uid, facility_id: ticket.facility_id, type: "support_reply",
            title: "Support replied to your ticket",
            message: `Re: ${subjectLabel} — ${preview}`,
            metadata: { link, ticket_id: ticketId },
          });
        } else {
          await admin.from("seeker_notifications").insert({
            user_id: uid, type: "support_reply",
            title: "Support replied to your ticket",
            message: `Re: ${subjectLabel} — ${preview}`,
            link, metadata: { ticket_id: ticketId },
          });
        }
      }
      // Email alert to the ticket owner.
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey && ticket.sender_email) {
        const portal = isProvider
          ? `https://rehablookup.com/provider/help?ticket=${ticketId}`
          : `https://rehablookup.com/account/support?ticket=${ticketId}`;
        await sendEmailWithRetry(admin, new Resend(resendKey), {
          from: "RehabLookup Support <no-reply@rehablookup.com>",
          to: [ticket.sender_email as string],
          subject: `Support replied: ${subjectLabel}`,
          html: `<p>Our support team replied to your ticket.</p>
                 <p>"${preview.replace(/</g, "&lt;")}"</p>
                 <p><a href="${portal}">View & reply in the app</a></p>`,
        }, { emailType: "support_admin_reply", idempotencyKey: `support-reply-${msg.id}` });
      }
    } else {
      // User replied → notify assigned admin if set, else all active admins.
      let adminIds: string[] = [];
      if (ticket.assigned_to) {
        adminIds = [ticket.assigned_to as string];
      } else {
        const { data: admins } = await admin.from("admin_user_profiles").select("user_id").eq("status", "active");
        adminIds = (admins ?? []).map((a: { user_id: string }) => a.user_id);
      }
      const rows = adminIds.filter((id) => id !== user.id).map((uid) => ({
        user_id: uid,
        type: reopened ? "support_reopened" : "support_reply",
        title: reopened ? "Ticket reopened by user" : "User replied to a support ticket",
        message: `Re: ${subjectLabel} — ${preview}`,
        link: `/admin/support?ticket=${ticketId}`,
        metadata: { ticket_id: ticketId, reopened },
      }));
      if (rows.length) await admin.from("admin_user_notifications").insert(rows);
    }
  } catch (e) { console.error("[support-ticket-reply] notify failed", e); }

  return json(200, { success: true, messageId: msg.id, status: newStatus, reopened });
});
