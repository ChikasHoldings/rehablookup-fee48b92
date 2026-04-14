import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOG = "[ROLE-DIGEST]";
const DASHBOARD_URL = "https://rehablookup.com";

// ─── Types ───────────────────────────────────────────────────────────────────
interface AdminUser {
  user_id: string;
  email: string;
  first_name: string | null;
  display_name: string | null;
  admin_role: string | null;
  email_digest_frequency: string | null;
  assigned_advisor_id?: string;
}

type DigestPeriod = "daily" | "weekly" | "monthly";

// ─── Email Template Helpers ──────────────────────────────────────────────────
const BRAND = {
  primary: "#1B365D",
  accent: "#0EA5E9",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  text: "#1E293B",
  muted: "#64748B",
  border: "#E2E8F0",
};

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    super_admin: "Super Admin",
    manager: "Manager",
    placement_advisor: "Placement Advisor",
    customer_rep: "Customer Rep",
  };
  return map[role] || role;
}

function roleColor(role: string): string {
  const map: Record<string, string> = {
    super_admin: "#7C3AED",
    manager: "#2563EB",
    placement_advisor: "#059669",
    customer_rep: "#D97706",
  };
  return map[role] || BRAND.primary;
}

function periodLabel(period: DigestPeriod): string {
  return period === "daily" ? "Daily" : period === "weekly" ? "Weekly" : "Monthly";
}

function statCard(value: string | number, label: string, color?: string): string {
  return `
    <td style="padding:6px;">
      <div style="background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:bold;color:${color || BRAND.primary};">${value}</div>
        <div style="font-size:12px;color:${BRAND.muted};margin-top:4px;">${label}</div>
      </div>
    </td>`;
}

function sectionTitle(title: string): string {
  return `<tr><td style="padding:20px 0 8px;font-size:15px;font-weight:600;color:${BRAND.primary};border-bottom:2px solid ${BRAND.border};">${title}</td></tr>`;
}

function actionItem(text: string, link?: string): string {
  const linkHtml = link ? ` <a href="${link}" style="color:${BRAND.accent};text-decoration:none;">→ View</a>` : "";
  return `<li style="margin-bottom:6px;font-size:13px;color:${BRAND.text};">${text}${linkHtml}</li>`;
}

function wrapEmail(role: string, period: DigestPeriod, dateRange: string, name: string, bodyHtml: string): string {
  const color = roleColor(role);
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${roleLabel(role)} ${periodLabel(period)} Digest</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:20px 0;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:${BRAND.primary};border-radius:10px 10px 0 0;padding:28px 30px;text-align:center;">
    <div style="display:inline-block;background:${color};color:#fff;font-size:11px;font-weight:600;padding:3px 10px;border-radius:12px;margin-bottom:10px;letter-spacing:0.5px;">${roleLabel(role).toUpperCase()}</div>
    <h1 style="margin:8px 0 0;font-size:22px;color:#fff;">${periodLabel(period)} Digest</h1>
    <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.8);">${dateRange}</p>
  </td></tr>
  <tr><td style="background:${BRAND.card};padding:24px 30px;">
    <p style="margin:0 0 20px;font-size:14px;color:${BRAND.text};">Hi ${name || "there"},</p>
    ${bodyHtml}
  </td></tr>
  <tr><td style="background:${BRAND.bg};border-radius:0 0 10px 10px;padding:20px 30px;text-align:center;">
    <p style="margin:0;font-size:11px;color:${BRAND.muted};">This is an automated ${periodLabel(period).toLowerCase()} digest from RehabLookup.<br>Manage preferences in <a href="${DASHBOARD_URL}/admin/settings" style="color:${BRAND.accent};">Admin Settings</a>.</p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

// ─── Data Fetching ───────────────────────────────────────────────────────────
// deno-lint-ignore no-explicit-any
async function fetchSuperAdminData(supabase: any, start: string, end: string) {
  const [newProviders, newLeads, unlockedLeads, placements, pendingProviders, flaggedItems, conciergeInquiries, confirmedPlacements] = await Promise.all([
    supabase.from("facilities").select("id", { count: "exact", head: true }).gte("created_at", start).lte("created_at", end),
    supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", start).lte("created_at", end),
    supabase.from("lead_unlocks").select("id", { count: "exact", head: true }).gte("created_at", start).lte("created_at", end),
    supabase.from("concierge_inquiries").select("id", { count: "exact", head: true }).gte("created_at", start).lte("created_at", end),
    supabase.from("facilities").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("flagged_images").select("id", { count: "exact", head: true }).eq("resolved", false),
    supabase.from("concierge_inquiries").select("id", { count: "exact", head: true }).gte("created_at", start).lte("created_at", end),
    supabase.from("concierge_inquiries").select("id", { count: "exact", head: true }).eq("placement_confirmed", true).gte("placement_confirmed_at", start).lte("placement_confirmed_at", end),
  ]);

  // Revenue from lead unlocks
  const { data: unlockRevenue } = await supabase.from("credit_transactions").select("amount_cents").eq("transaction_type", "unlock").gte("created_at", start).lte("created_at", end);
  const totalRevenueCents = (unlockRevenue || []).reduce((sum: number, t: { amount_cents: number }) => sum + Math.abs(t.amount_cents), 0);

  // Profile views (from provider_events — source of truth, excludes impressions)
  const { count: totalViews } = await supabase.from("provider_events").select("id", { count: "exact", head: true }).eq("event_type", "profile_view").gte("created_at", start).lte("created_at", end);

  // System alerts (escalations)
  const { count: openEscalations } = await supabase.from("admin_escalations").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]);

  return {
    newProviders: newProviders.count || 0,
    newLeads: newLeads.count || 0,
    unlockedLeads: unlockedLeads.count || 0,
    totalRevenueCents,
    totalViews: totalViews || 0,
    placements: placements.count || 0,
    confirmedPlacements: confirmedPlacements.count || 0,
    pendingProviders: pendingProviders.count || 0,
    flaggedItems: flaggedItems.count || 0,
    conciergeInquiries: conciergeInquiries.count || 0,
    openEscalations: openEscalations || 0,
  };
}

// deno-lint-ignore no-explicit-any
async function fetchManagerData(supabase: any, start: string, end: string) {
  const [newLeads, unlockedLeads, placements, confirmedPlacements, pendingProviders, openEscalations] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", start).lte("created_at", end),
    supabase.from("lead_unlocks").select("id", { count: "exact", head: true }).gte("created_at", start).lte("created_at", end),
    supabase.from("concierge_inquiries").select("id", { count: "exact", head: true }).gte("created_at", start).lte("created_at", end),
    supabase.from("concierge_inquiries").select("id", { count: "exact", head: true }).eq("placement_confirmed", true).gte("placement_confirmed_at", start).lte("placement_confirmed_at", end),
    supabase.from("facilities").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("admin_escalations").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
  ]);

  // Conversion rate
  const totalLeads = newLeads.count || 0;
  const totalUnlocked = unlockedLeads.count || 0;
  const conversionRate = totalLeads > 0 ? ((totalUnlocked / totalLeads) * 100).toFixed(1) : "0";

  return {
    newLeads: totalLeads,
    unlockedLeads: totalUnlocked,
    conversionRate,
    placements: placements.count || 0,
    confirmedPlacements: confirmedPlacements.count || 0,
    pendingProviders: pendingProviders.count || 0,
    openEscalations: openEscalations || 0,
  };
}

// deno-lint-ignore no-explicit-any
async function fetchAdvisorData(supabase: any, advisorUserId: string, start: string, end: string) {
  // Only inquiries assigned to this advisor
  const [assignedNew, assignedActive, followUpsDue, confirmedPlacements] = await Promise.all([
    supabase.from("concierge_inquiries").select("id", { count: "exact", head: true }).eq("assigned_advisor_id", advisorUserId).gte("created_at", start).lte("created_at", end),
    supabase.from("concierge_inquiries").select("id", { count: "exact", head: true }).eq("assigned_advisor_id", advisorUserId).in("status", ["matched", "introduced", "touring", "negotiating"]),
    supabase.from("concierge_inquiries").select("id", { count: "exact", head: true }).eq("assigned_advisor_id", advisorUserId).in("status", ["matched", "introduced"]).lt("updated_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()),
    supabase.from("concierge_inquiries").select("id", { count: "exact", head: true }).eq("assigned_advisor_id", advisorUserId).eq("placement_confirmed", true).gte("placement_confirmed_at", start).lte("placement_confirmed_at", end),
  ]);

  // Matched facilities count
  const { data: matchedInquiries } = await supabase.from("concierge_inquiries").select("matched_facility_ids").eq("assigned_advisor_id", advisorUserId).not("matched_facility_ids", "is", null).gte("matched_at", start).lte("matched_at", end);
  const matchedFacilities = (matchedInquiries || []).reduce((sum: number, i: { matched_facility_ids: string[] | null }) => sum + (i.matched_facility_ids?.length || 0), 0);

  // Unread messages for advisor threads
  const { count: unreadMessages } = await supabase.from("concierge_messages").select("id", { count: "exact", head: true }).eq("sender_type", "seeker").is("read_at", null).gte("created_at", start).lte("created_at", end);

  return {
    newAssigned: assignedNew.count || 0,
    activeCases: assignedActive.count || 0,
    followUpsDue: followUpsDue.count || 0,
    confirmedPlacements: confirmedPlacements.count || 0,
    matchedFacilities,
    unreadMessages: unreadMessages || 0,
  };
}

// deno-lint-ignore no-explicit-any
async function fetchCustomerRepData(supabase: any, start: string, end: string) {
  const [newLeadInquiries, unreadMessages, openEscalations, pendingReviews] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", start).lte("created_at", end).eq("status", "new"),
    supabase.from("concierge_messages").select("id", { count: "exact", head: true }).eq("sender_type", "seeker").is("read_at", null).gte("created_at", start).lte("created_at", end),
    supabase.from("admin_escalations").select("id", { count: "exact", head: true }).in("status", ["open"]).gte("created_at", start).lte("created_at", end),
    supabase.from("facility_reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  // Response time (avg hours for messages read within period)
  const { data: readMessages } = await supabase.from("concierge_messages").select("created_at, read_at").not("read_at", "is", null).gte("created_at", start).lte("created_at", end).limit(200);
  let avgResponseHours = 0;
  if (readMessages && readMessages.length > 0) {
    const totalHours = readMessages.reduce((sum: number, m: { created_at: string; read_at: string }) => {
      const diff = new Date(m.read_at).getTime() - new Date(m.created_at).getTime();
      return sum + diff / (1000 * 60 * 60);
    }, 0);
    avgResponseHours = Math.round((totalHours / readMessages.length) * 10) / 10;
  }

  return {
    newInquiries: newLeadInquiries.count || 0,
    unreadMessages: unreadMessages || 0,
    openEscalations: openEscalations || 0,
    pendingReviews: pendingReviews.count || 0,
    avgResponseHours,
  };
}

// ─── Email Body Generators ──────────────────────────────────────────────────
function buildSuperAdminBody(data: Awaited<ReturnType<typeof fetchSuperAdminData>>, period: DigestPeriod): string {
  const revenue = `$${(data.totalRevenueCents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
  const actions: string[] = [];
  if (data.pendingProviders > 0) actions.push(actionItem(`${data.pendingProviders} provider(s) awaiting approval`, `${DASHBOARD_URL}/admin/providers`));
  if (data.flaggedItems > 0) actions.push(actionItem(`${data.flaggedItems} flagged item(s) need review`, `${DASHBOARD_URL}/admin/moderation`));
  if (data.openEscalations > 0) actions.push(actionItem(`${data.openEscalations} open escalation(s)`, `${DASHBOARD_URL}/admin/escalations`));

  return `
    <p style="font-size:13px;color:${BRAND.muted};margin:0 0 16px;">Full platform visibility for the ${periodLabel(period).toLowerCase()} period.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${statCard(data.totalViews.toLocaleString(), "Profile Views")}
      ${statCard(data.newLeads, "Leads Generated")}
    </tr><tr>
      ${statCard(data.unlockedLeads, "Leads Unlocked")}
      ${statCard(revenue, "Unlock Revenue", BRAND.success)}
    </tr><tr>
      ${statCard(data.conciergeInquiries, "Placement Requests")}
      ${statCard(data.confirmedPlacements, "Confirmed Placements", BRAND.success)}
    </tr><tr>
      ${statCard(data.newProviders, "Provider Signups")}
      ${statCard(data.openEscalations, "System Alerts", data.openEscalations > 0 ? BRAND.error : BRAND.muted)}
    </tr></table>
    ${actions.length > 0 ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${sectionTitle("⚡ Action Items")}
        <tr><td><ul style="margin:12px 0;padding-left:20px;">${actions.join("")}</ul></td></tr>
      </table>` : ""}
    <div style="text-align:center;margin-top:20px;">
      <a href="${DASHBOARD_URL}/admin" style="display:inline-block;background:${BRAND.primary};color:#fff;padding:10px 28px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">Open Admin Dashboard</a>
    </div>`;
}

function buildManagerBody(data: Awaited<ReturnType<typeof fetchManagerData>>, period: DigestPeriod): string {
  const actions: string[] = [];
  if (data.pendingProviders > 0) actions.push(actionItem(`${data.pendingProviders} provider(s) pending review`, `${DASHBOARD_URL}/admin/providers`));
  if (data.openEscalations > 0) actions.push(actionItem(`${data.openEscalations} escalation(s) to address`, `${DASHBOARD_URL}/admin/escalations`));

  return `
    <p style="font-size:13px;color:${BRAND.muted};margin:0 0 16px;">Operational overview for the ${periodLabel(period).toLowerCase()} period.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${statCard(data.newLeads, "Leads Generated")}
      ${statCard(data.unlockedLeads, "Leads Unlocked")}
    </tr><tr>
      ${statCard(`${data.conversionRate}%`, "Conversion Rate", BRAND.accent)}
      ${statCard(data.placements, "Placement Requests")}
    </tr><tr>
      ${statCard(data.confirmedPlacements, "Confirmed Placements", BRAND.success)}
      ${statCard(data.openEscalations, "Open Escalations", data.openEscalations > 0 ? BRAND.warning : BRAND.muted)}
    </tr></table>
    ${actions.length > 0 ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${sectionTitle("⚡ Action Items")}
        <tr><td><ul style="margin:12px 0;padding-left:20px;">${actions.join("")}</ul></td></tr>
      </table>` : ""}
    <div style="text-align:center;margin-top:20px;">
      <a href="${DASHBOARD_URL}/admin" style="display:inline-block;background:${BRAND.primary};color:#fff;padding:10px 28px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">Open Dashboard</a>
    </div>`;
}

function buildAdvisorBody(data: Awaited<ReturnType<typeof fetchAdvisorData>>, period: DigestPeriod): string {
  const actions: string[] = [];
  if (data.newAssigned > 0) actions.push(actionItem(`${data.newAssigned} new placement request(s) assigned to you`, `${DASHBOARD_URL}/admin/concierge`));
  if (data.followUpsDue > 0) actions.push(actionItem(`${data.followUpsDue} case(s) need follow-up (48h+ idle)`, `${DASHBOARD_URL}/admin/concierge`));
  if (data.unreadMessages > 0) actions.push(actionItem(`${data.unreadMessages} unread seeker message(s)`, `${DASHBOARD_URL}/admin/messages`));

  return `
    <p style="font-size:13px;color:${BRAND.muted};margin:0 0 16px;">Your placement workload for the ${periodLabel(period).toLowerCase()} period.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${statCard(data.newAssigned, "New Requests")}
      ${statCard(data.activeCases, "Active Cases")}
    </tr><tr>
      ${statCard(data.followUpsDue, "Follow-ups Due", data.followUpsDue > 0 ? BRAND.warning : BRAND.muted)}
      ${statCard(data.matchedFacilities, "Facilities Matched")}
    </tr><tr>
      ${statCard(data.confirmedPlacements, "Confirmed Placements", BRAND.success)}
      ${statCard(data.unreadMessages, "Unread Messages", data.unreadMessages > 0 ? BRAND.accent : BRAND.muted)}
    </tr></table>
    ${actions.length > 0 ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${sectionTitle("⚡ Action Items")}
        <tr><td><ul style="margin:12px 0;padding-left:20px;">${actions.join("")}</ul></td></tr>
      </table>` : ""}
    <div style="text-align:center;margin-top:20px;">
      <a href="${DASHBOARD_URL}/admin/concierge" style="display:inline-block;background:${BRAND.primary};color:#fff;padding:10px 28px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">View My Cases</a>
    </div>`;
}

function buildCustomerRepBody(data: Awaited<ReturnType<typeof fetchCustomerRepData>>, period: DigestPeriod): string {
  const actions: string[] = [];
  if (data.unreadMessages > 0) actions.push(actionItem(`${data.unreadMessages} message(s) awaiting response`, `${DASHBOARD_URL}/admin/messages`));
  if (data.openEscalations > 0) actions.push(actionItem(`${data.openEscalations} new escalation(s)`, `${DASHBOARD_URL}/admin/escalations`));
  if (data.pendingReviews > 0) actions.push(actionItem(`${data.pendingReviews} review(s) to moderate`, `${DASHBOARD_URL}/admin/reviews`));

  return `
    <p style="font-size:13px;color:${BRAND.muted};margin:0 0 16px;">Your support summary for the ${periodLabel(period).toLowerCase()} period.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${statCard(data.newInquiries, "New Inquiries")}
      ${statCard(data.unreadMessages, "Unread Messages", data.unreadMessages > 0 ? BRAND.warning : BRAND.muted)}
    </tr><tr>
      ${statCard(data.openEscalations, "Escalations", data.openEscalations > 0 ? BRAND.error : BRAND.muted)}
      ${statCard(data.pendingReviews, "Pending Reviews")}
    </tr><tr>
      ${statCard(`${data.avgResponseHours}h`, "Avg Response Time", BRAND.accent)}
      <td style="padding:6px;"></td>
    </tr></table>
    ${actions.length > 0 ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${sectionTitle("⚡ Action Items")}
        <tr><td><ul style="margin:12px 0;padding-left:20px;">${actions.join("")}</ul></td></tr>
      </table>` : ""}
    <div style="text-align:center;margin-top:20px;">
      <a href="${DASHBOARD_URL}/admin/messages" style="display:inline-block;background:${BRAND.primary};color:#fff;padding:10px 28px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">View Messages</a>
    </div>`;
}

// ─── Check if digest has meaningful data ─────────────────────────────────────
function hasData(role: string, data: Record<string, unknown>): boolean {
  const values = Object.values(data).filter(v => typeof v === "number") as number[];
  // If all numeric values are 0, skip sending (no empty digests)
  return values.some(v => v > 0);
}

// ─── Main Handler ────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Accept period override from body (cron sends daily, weekly, monthly via separate jobs)
    let period: DigestPeriod = "daily";
    try {
      const body = await req.json();
      if (body?.period && ["daily", "weekly", "monthly"].includes(body.period)) {
        period = body.period;
      }
    } catch { /* default to daily */ }

    console.log(`${LOG} Starting ${period} role-based digest`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if digest is enabled
    const settingKey = period === "daily" ? "daily_summary_enabled" : period === "weekly" ? "weekly_report_enabled" : "monthly_report_enabled";
    const { data: settingData } = await supabase.from("platform_settings").select("setting_value").eq("setting_key", settingKey).single();
    // Default to enabled if no setting found
    if (settingData && settingData.setting_value === false) {
      console.log(`${LOG} ${period} digest is disabled, skipping`);
      return new Response(JSON.stringify({ success: true, message: `${period} digest disabled` }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Calculate date range
    const now = new Date();
    let start: Date;
    if (period === "daily") {
      start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
    } else if (period === "weekly") {
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else {
      start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
    }
    const startStr = start.toISOString();
    const endStr = now.toISOString();

    const dateRange = period === "daily"
      ? start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
      : `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

    // Get all admin users with their roles
    const { data: adminRoles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    if (!adminRoles?.length) {
      console.log(`${LOG} No admin users found`);
      return new Response(JSON.stringify({ success: true, message: "No admins" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminUserIds = adminRoles.map(r => r.user_id);
    const { data: profiles } = await supabase.from("admin_user_profiles").select("user_id, first_name, display_name, admin_role, email_digest_frequency").in("user_id", adminUserIds);

    // Filter by digest frequency preference
    const matchingFrequency = period === "daily" ? ["daily", null] : period === "weekly" ? ["weekly"] : ["monthly"];
    const eligibleProfiles = (profiles || []).filter(p => {
      const freq = p.email_digest_frequency || "daily";
      if (period === "daily") return freq === "daily";
      if (period === "weekly") return freq === "weekly" || freq === "daily"; // weekly goes to both daily+weekly subscribers
      return true; // monthly goes to everyone
    });

    if (eligibleProfiles.length === 0) {
      console.log(`${LOG} No eligible admins for ${period} digest`);
      return new Response(JSON.stringify({ success: true, message: "No eligible admins" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch emails
    const adminUsers: AdminUser[] = [];
    for (const profile of eligibleProfiles) {
      const { data: userData } = await supabase.auth.admin.getUserById(profile.user_id);
      if (userData?.user?.email) {
        adminUsers.push({
          user_id: profile.user_id,
          email: userData.user.email,
          first_name: profile.first_name,
          display_name: profile.display_name,
          admin_role: profile.admin_role,
          email_digest_frequency: profile.email_digest_frequency,
        });
      }
    }

    if (adminUsers.length === 0) {
      console.log(`${LOG} No admin emails found`);
      return new Response(JSON.stringify({ success: true, message: "No emails" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`${LOG} Processing ${adminUsers.length} admin(s) for ${period} digest`);

    // Pre-fetch role-specific data (cache per role to avoid duplicate queries)
    const dataCache: Record<string, unknown> = {};
    let sentCount = 0;
    let skippedCount = 0;

    for (const admin of adminUsers) {
      const role = admin.admin_role || "customer_rep";
      const name = admin.first_name || admin.display_name || "Admin";

      try {
        let bodyHtml: string;
        let data: Record<string, unknown>;

        if (role === "super_admin") {
          if (!dataCache.super_admin) dataCache.super_admin = await fetchSuperAdminData(supabase, startStr, endStr);
          data = dataCache.super_admin as Record<string, unknown>;
          if (!hasData(role, data)) { skippedCount++; continue; }
          bodyHtml = buildSuperAdminBody(data as Awaited<ReturnType<typeof fetchSuperAdminData>>, period);
        } else if (role === "manager") {
          if (!dataCache.manager) dataCache.manager = await fetchManagerData(supabase, startStr, endStr);
          data = dataCache.manager as Record<string, unknown>;
          if (!hasData(role, data)) { skippedCount++; continue; }
          bodyHtml = buildManagerBody(data as Awaited<ReturnType<typeof fetchManagerData>>, period);
        } else if (role === "placement_advisor") {
          // Advisor data is per-user (assigned cases)
          const advisorData = await fetchAdvisorData(supabase, admin.user_id, startStr, endStr);
          data = advisorData as unknown as Record<string, unknown>;
          if (!hasData(role, data)) { skippedCount++; continue; }
          bodyHtml = buildAdvisorBody(advisorData, period);
        } else {
          // customer_rep or unknown → customer rep digest
          if (!dataCache.customer_rep) dataCache.customer_rep = await fetchCustomerRepData(supabase, startStr, endStr);
          data = dataCache.customer_rep as Record<string, unknown>;
          if (!hasData(role, data)) { skippedCount++; continue; }
          bodyHtml = buildCustomerRepBody(data as Awaited<ReturnType<typeof fetchCustomerRepData>>, period);
        }

        const html = wrapEmail(role, period, dateRange, name, bodyHtml);
        const subject = `${roleLabel(role)} ${periodLabel(period)} Digest – ${dateRange}`;

        await resend.emails.send({
          from: "RehabLookup <no-reply@rehablookup.com>",
          to: [admin.email],
          subject,
          html,
        });

        sentCount++;
        console.log(`${LOG} ✓ Sent ${role} digest to ${admin.email}`);
      } catch (err) {
        console.error(`${LOG} ✗ Failed for ${admin.email}:`, err);
      }
    }

    console.log(`${LOG} Complete: ${sentCount} sent, ${skippedCount} skipped (no data)`);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, skipped: skippedCount, period }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`${LOG} Error:`, msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
