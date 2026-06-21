// support-ticket-status
// ─────────────────────
// Admin-only ticket management: status, priority, category, assignment, and
// resolution. Requires the 'admin' role (derived from the JWT). Detects 0-row
// updates (no false success) and alerts the user in-app + email on
// resolve/close/reopen. Email is an alert only.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const STATUSES = ["open", "in_progress", "waiting_on_admin", "waiting_on_user", "resolved", "closed"];
const PRIORITIES = ["low", "normal", "high", "urgent"];
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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
  const { data: adminRole } = await admin.from("user_roles")
    .select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (!adminRole) return json(403, { error: "forbidden" });

  let payload: Record<string, unknown>;
  try { payload = await req.json(); } catch { return json(400, { error: "invalid_json" }); }

  const ticketId = String(payload.ticketId ?? "");
  if (!UUID_RE.test(ticketId)) return json(400, { error: "invalid_ticket_id" });

  const { data: ticket } = await admin.from("support_tickets")
    .select("id, source, sender_user_id, sender_email, facility_id, status, subject, category")
    .eq("id", ticketId).maybeSingle();
  if (!ticket) return json(404, { error: "ticket_not_found" });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  let newStatus: string | null = null;

  if (payload.status !== undefined) {
    newStatus = String(payload.status);
    if (!STATUSES.includes(newStatus)) return json(400, { error: "invalid_status" });
    update.status = newStatus;
    if (newStatus === "resolved" || newStatus === "closed") {
      update.resolved_at = new Date().toISOString();
      update.resolved_by = user.id;
    } else if (ticket.status === "resolved" || ticket.status === "closed") {
      // Reopening — clear resolution stamps.
      update.resolved_at = null;
      update.resolved_by = null;
    }
  }
  if (payload.priority !== undefined) {
    const p = String(payload.priority);
    if (!PRIORITIES.includes(p)) return json(400, { error: "invalid_priority" });
    update.priority = p;
  }
  if (typeof payload.category === "string" && payload.category.trim()) update.category = payload.category.trim().slice(0, 80);
  if (typeof payload.resolutionNotes === "string") update.resolution_notes = payload.resolutionNotes.slice(0, 4000);
  if (payload.assignedTo !== undefined) {
    const a = payload.assignedTo === null ? null : String(payload.assignedTo);
    if (a !== null && !UUID_RE.test(a)) return json(400, { error: "invalid_assignee" });
    update.assigned_to = a;
    update.assigned_at = a ? new Date().toISOString() : null;
    update.assigned_by = a ? user.id : null;
  }

  // 0-row detection → no false success.
  const { data: updated, error: uErr } = await admin.from("support_tickets")
    .update(update).eq("id", ticketId).select("id, status").maybeSingle();
  if (uErr) { console.error("[support-ticket-status] update failed", uErr); return json(500, { error: "update_failed" }); }
  if (!updated) return json(409, { error: "no_row_updated" });

  // Notify the user when the resolution state meaningfully changed.
  const notifyResolve = newStatus === "resolved" || newStatus === "closed";
  const notifyReopen = newStatus !== null && (ticket.status === "resolved" || ticket.status === "closed") && !notifyResolve;
  if (notifyResolve || notifyReopen) {
    try {
      const isProvider = ticket.source === "provider_support";
      const link = isProvider ? `/provider/help?ticket=${ticketId}` : `/account/support?ticket=${ticketId}`;
      const subjectLabel = ticket.subject || ticket.category || "your support ticket";
      const title = notifyResolve ? `Your support ticket was ${newStatus}` : "Your support ticket was reopened";
      const recipients = new Set<string>();
      if (ticket.sender_user_id) recipients.add(ticket.sender_user_id as string);
      if (isProvider && ticket.facility_id) {
        const { data: fac } = await admin.from("facilities").select("user_id").eq("id", ticket.facility_id).maybeSingle();
        if (fac?.user_id) recipients.add(fac.user_id as string);
        const { data: team } = await admin.from("facility_team_members")
          .select("user_id").eq("facility_id", ticket.facility_id).eq("status", "active");
        for (const t of team ?? []) recipients.add((t as { user_id: string }).user_id);
      }
      recipients.delete(user.id);
      for (const uid of recipients) {
        if (isProvider) {
          await admin.from("provider_notifications").insert({
            user_id: uid, facility_id: ticket.facility_id, type: notifyResolve ? "support_resolved" : "support_reopened",
            title, message: `Re: ${subjectLabel}`, metadata: { link, ticket_id: ticketId },
          });
        } else {
          await admin.from("seeker_notifications").insert({
            user_id: uid, type: notifyResolve ? "support_resolved" : "support_reopened",
            title, message: `Re: ${subjectLabel}`, link, metadata: { ticket_id: ticketId },
          });
        }
      }
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey && notifyResolve && ticket.sender_email) {
        const portal = `https://rehablookup.com${link}`;
        await sendEmailWithRetry(admin, new Resend(resendKey), {
          from: "RehabLookup Support <no-reply@rehablookup.com>",
          to: [ticket.sender_email as string],
          subject: `Support ticket ${newStatus}: ${subjectLabel}`,
          html: `<p>Your support ticket has been marked <strong>${newStatus}</strong>.</p>
                 <p>If you still need help, you can reply to reopen it: <a href="${portal}">View ticket</a></p>`,
        }, { emailType: "support_resolved", idempotencyKey: `support-${newStatus}-${ticketId}` });
      }
    } catch (e) { console.error("[support-ticket-status] notify failed", e); }
  }

  return json(200, { success: true, status: updated.status });
});
