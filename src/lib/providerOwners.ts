// Pure derivation + filter/sort helpers for the Admin › Providers › Owners tab.
// Kept UI-free so the account-level rollup logic is unit-testable without
// rendering. Data comes from the admin_list_provider_owners() RPC.

export type OwnerPlanState =
  | "pro" | "grace" | "past_due" | "incomplete" | "canceled" | "free";

export interface ProviderOwnerRow {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string | null;
  email_verified_at: string | null;
  onboarding_completed_at: string | null;
  total_facilities: number;
  live_count: number;
  pending_count: number;
  rejected_count: number;
  suspended_count: number;
  plan_state: OwnerPlanState;
  grace_expires_at: string | null;
  has_stripe_customer: boolean;
  last_facility_update: string | null;
  facility_names: string[] | null;
}

export type OwnerPlanFilter = "all" | OwnerPlanState | "no_billing";
export type OwnerOnboardingFilter = "all" | "complete" | "incomplete";
export type OwnerStatusFilter = "all" | "live" | "pending" | "rejected" | "suspended";
export type OwnerSortKey = "newest" | "most_facilities" | "action_needed" | "plan" | "last_updated";

export const PLAN_SORT_ORDER: Record<OwnerPlanState, number> = {
  pro: 0, grace: 1, past_due: 2, incomplete: 3, canceled: 4, free: 5,
};

/** Human-readable plan labels — shared by the UI badge and the CSV export so
 *  the two never drift. */
export const PLAN_LABELS: Record<OwnerPlanState, string> = {
  pro: "Pro", grace: "Grace", past_due: "Past due",
  incomplete: "Incomplete", canceled: "Canceled", free: "Free",
};

export function ownerName(o: ProviderOwnerRow): string {
  const n = [o.first_name, o.last_name].filter(Boolean).join(" ").trim();
  return n || o.email || "Unnamed provider";
}

/** Admin action is needed when a listing is awaiting/blocked in moderation or
 *  billing is in an unresolved paid-pending state. Onboarding-incomplete is
 *  informational only and deliberately NOT part of this signal. */
export function ownerActionNeeded(o: ProviderOwnerRow): boolean {
  return (
    o.pending_count > 0 ||
    o.rejected_count > 0 ||
    o.suspended_count > 0 ||
    o.plan_state === "past_due" ||
    o.plan_state === "incomplete"
  );
}

export interface OwnerFilterOptions {
  search?: string; // already lowercased/trimmed
  plan?: OwnerPlanFilter;
  onboarding?: OwnerOnboardingFilter;
  status?: OwnerStatusFilter;
  actionOnly?: boolean;
  sort?: OwnerSortKey;
}

export function filterAndSortOwners(
  rows: ProviderOwnerRow[],
  opts: OwnerFilterOptions,
): ProviderOwnerRow[] {
  const { search = "", plan = "all", onboarding = "all", status = "all", actionOnly = false, sort = "newest" } = opts;
  let out = rows;

  if (search) {
    out = out.filter((o) =>
      ownerName(o).toLowerCase().includes(search) ||
      (o.email ?? "").toLowerCase().includes(search) ||
      (o.facility_names ?? []).some((n) => n.toLowerCase().includes(search)),
    );
  }
  if (plan !== "all") {
    out = out.filter((o) =>
      plan === "no_billing"
        ? o.plan_state === "free" && !o.has_stripe_customer
        : o.plan_state === plan,
    );
  }
  if (onboarding !== "all") {
    out = out.filter((o) =>
      onboarding === "complete" ? !!o.onboarding_completed_at : !o.onboarding_completed_at,
    );
  }
  if (status !== "all") {
    out = out.filter((o) =>
      status === "live" ? o.live_count > 0 :
      status === "pending" ? o.pending_count > 0 :
      status === "rejected" ? o.rejected_count > 0 :
      o.suspended_count > 0,
    );
  }
  if (actionOnly) out = out.filter(ownerActionNeeded);

  return [...out].sort((a, b) => {
    switch (sort) {
      case "most_facilities": return b.total_facilities - a.total_facilities;
      case "action_needed": return (ownerActionNeeded(b) ? 1 : 0) - (ownerActionNeeded(a) ? 1 : 0);
      case "plan": return PLAN_SORT_ORDER[a.plan_state] - PLAN_SORT_ORDER[b.plan_state];
      case "last_updated":
        return new Date(b.last_facility_update ?? 0).getTime() - new Date(a.last_facility_update ?? 0).getTime();
      case "newest":
      default:
        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
    }
  });
}

// ---------------------------------------------------------------------------
// KPI rollup — drives the clickable summary strip at the top of the Owners tab.
// Computed over the FULL owner set (not the filtered page) so the tiles always
// show the true totals; clicking a tile applies the matching filter.
// ---------------------------------------------------------------------------

export interface OwnerSummary {
  total: number;
  pro: number;
  grace: number;
  pastDue: number;
  free: number;
  /** Free plan AND no Stripe customer on file — genuinely never-billed. */
  noBilling: number;
  actionNeeded: number;
}

export function summarizeOwners(rows: ProviderOwnerRow[]): OwnerSummary {
  const s: OwnerSummary = { total: rows.length, pro: 0, grace: 0, pastDue: 0, free: 0, noBilling: 0, actionNeeded: 0 };
  for (const o of rows) {
    if (o.plan_state === "pro") s.pro++;
    else if (o.plan_state === "grace") s.grace++;
    else if (o.plan_state === "past_due") s.pastDue++;
    else if (o.plan_state === "free") s.free++;
    if (o.plan_state === "free" && !o.has_stripe_customer) s.noBilling++;
    if (ownerActionNeeded(o)) s.actionNeeded++;
  }
  return s;
}

// ---------------------------------------------------------------------------
// Risk / action reasons — a single source of truth for WHY an owner is flagged,
// reused by the card's "action needed" tooltip. Empty array ⇒ no action needed.
// ---------------------------------------------------------------------------

export interface OwnerRiskFlag {
  key: string;
  label: string;
  /** Severity bucket so the UI can colour without re-deriving. */
  tone: "warning" | "danger";
}

export function ownerRiskFlags(o: ProviderOwnerRow): OwnerRiskFlag[] {
  const flags: OwnerRiskFlag[] = [];
  if (o.pending_count > 0)
    flags.push({ key: "pending", label: `${o.pending_count} listing${o.pending_count === 1 ? "" : "s"} awaiting review`, tone: "warning" });
  if (o.rejected_count > 0)
    flags.push({ key: "rejected", label: `${o.rejected_count} rejected / needs edits`, tone: "danger" });
  if (o.suspended_count > 0)
    flags.push({ key: "suspended", label: `${o.suspended_count} paused / suspended`, tone: "danger" });
  if (o.plan_state === "past_due")
    flags.push({ key: "past_due", label: "Billing past due", tone: "danger" });
  if (o.plan_state === "incomplete")
    flags.push({ key: "incomplete", label: "Billing incomplete", tone: "warning" });
  return flags;
}

// ---------------------------------------------------------------------------
// CSV export — mirrors the Facilities-tab export so admins have parity. Kept
// here (pure) so the column contract is unit-testable.
// ---------------------------------------------------------------------------

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const OWNER_CSV_HEADERS = [
  "Owner", "Email", "Phone", "Joined", "Email verified", "Onboarding",
  "Plan", "Grace expires", "Total facilities", "Live", "Pending",
  "Rejected", "Paused", "Stripe customer", "Last facility update", "Action needed",
] as const;

export function ownersToCsv(rows: ProviderOwnerRow[]): string {
  const iso = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");
  const lines = rows.map((o) => [
    ownerName(o),
    o.email ?? "",
    o.phone ?? "",
    iso(o.created_at),
    o.email_verified_at ? "Yes" : "No",
    o.onboarding_completed_at ? "Complete" : "Incomplete",
    PLAN_LABELS[o.plan_state],
    iso(o.grace_expires_at),
    o.total_facilities,
    o.live_count,
    o.pending_count,
    o.rejected_count,
    o.suspended_count,
    o.has_stripe_customer ? "Yes" : "No",
    iso(o.last_facility_update),
    ownerActionNeeded(o) ? "Yes" : "No",
  ].map(csvCell).join(","));
  return [OWNER_CSV_HEADERS.join(","), ...lines].join("\n");
}
