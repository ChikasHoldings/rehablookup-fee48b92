import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search, Users, Building2, AlertCircle, RefreshCw, ExternalLink,
  CheckCircle2, Clock, Ban, PauseCircle, CreditCard, Sparkles, ShieldAlert,
  Download, ListFilter,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  type ProviderOwnerRow,
  type OwnerPlanState,
  type OwnerPlanFilter as PlanFilter,
  type OwnerOnboardingFilter as OnboardingFilter,
  type OwnerStatusFilter as StatusFilter,
  type OwnerSortKey as SortKey,
  ownerName,
  ownerActionNeeded as actionNeeded,
  ownerRiskFlags,
  filterAndSortOwners,
  summarizeOwners,
  ownersToCsv,
} from "@/lib/providerOwners";

export const OWNERS_QUERY_KEY = ["admin-provider-owners"] as const;

const PLAN_META: Record<OwnerPlanState, { label: string; className: string; icon: typeof Sparkles }> = {
  pro: { label: "Pro", className: "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400", icon: Sparkles },
  grace: { label: "Grace", className: "bg-violet-500/10 text-violet-700 border-violet-200 dark:text-violet-400", icon: Clock },
  past_due: { label: "Past due", className: "bg-amber-500/10 text-amber-800 border-amber-200 dark:text-amber-400", icon: CreditCard },
  incomplete: { label: "Incomplete", className: "bg-amber-500/10 text-amber-800 border-amber-200 dark:text-amber-400", icon: CreditCard },
  canceled: { label: "Canceled", className: "bg-slate-500/10 text-slate-600 border-slate-200 dark:text-slate-400", icon: Ban },
  free: { label: "Free", className: "bg-slate-500/10 text-slate-600 border-slate-200 dark:text-slate-400", icon: CreditCard },
};

function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const PAGE_SIZE = 25;
const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

interface OwnersTabProps {
  /** Deep-link into the Facilities tab pre-filtered to this owner's listings. */
  onViewOwnerFacilities: (userId: string, ownerLabel: string) => void;
}

export function OwnersTab({ onViewOwnerFacilities }: OwnersTabProps) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: OWNERS_QUERY_KEY,
    queryFn: async (): Promise<ProviderOwnerRow[]> => {
      const { data, error } = await supabase.rpc("admin_list_provider_owners");
      if (error) throw error;
      return (data ?? []) as unknown as ProviderOwnerRow[];
    },
    refetchOnMount: true,
  });

  // Keep the owner rollup fresh: facility moderation and subscription changes
  // both alter the aggregate, so invalidate on either. Best-effort realtime —
  // the RPC re-runs on the next render if the channel is unavailable.
  useEffect(() => {
    const suffix = Math.random().toString(36).slice(2, 8);
    const ch = supabase
      .channel(`admin-owners-${suffix}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "facilities" }, () =>
        queryClient.invalidateQueries({ queryKey: OWNERS_QUERY_KEY }))
      .on("postgres_changes", { event: "*", schema: "public", table: "facility_subscriptions" }, () =>
        queryClient.invalidateQueries({ queryKey: OWNERS_QUERY_KEY }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  // -- URL-persisted filter/sort/page state (bookmarkable + shareable) --------
  // Owner-tab params are namespaced (oq/plan/onb/fstat/act/osort/opage) so they
  // never collide with the Facilities-tab params (q/tab/owner) that the parent
  // page owns. The parent's URL writer preserves foreign keys, so both survive.
  const [searchParams, setSearchParams] = useSearchParams();
  const plan = (searchParams.get("plan") ?? "all") as PlanFilter;
  const onboarding = (searchParams.get("onb") ?? "all") as OnboardingFilter;
  const status = (searchParams.get("fstat") ?? "all") as StatusFilter;
  const sort = (searchParams.get("osort") ?? "newest") as SortKey;
  const actionOnly = searchParams.get("act") === "1";
  const page = Math.max(1, parseInt(searchParams.get("opage") ?? "1", 10) || 1);

  // Search has a debounced local mirror for a responsive input; the debounced
  // value is written to the URL (oq) for shareability and drives filtering.
  const [searchInput, setSearchInput] = useState(() => searchParams.get("oq") ?? "");
  const search = useDebounced(searchInput.trim().toLowerCase(), 300);
  useEffect(() => {
    setSearchParams((prev) => {
      const n = new URLSearchParams(prev);
      if (search) n.set("oq", search); else n.delete("oq");
      if ((n.get("oq") ?? "") !== (prev.get("oq") ?? "")) n.delete("opage");
      return n;
    }, { replace: true });
  }, [search, setSearchParams]);

  // A filter change resets to page 1 (deletes opage). `page` itself keeps opage.
  const patchParams = useCallback((mut: (n: URLSearchParams) => void, resetPage = true) => {
    setSearchParams((prev) => {
      const n = new URLSearchParams(prev);
      mut(n);
      if (resetPage) n.delete("opage");
      return n;
    }, { replace: true });
  }, [setSearchParams]);

  const setKey = (key: string, val: string, clearValue: string) =>
    patchParams((n) => { if (!val || val === clearValue) n.delete(key); else n.set(key, val); });

  const clearAllFilters = () => {
    setSearchInput("");
    patchParams((n) => { ["oq", "plan", "onb", "fstat", "act", "osort"].forEach((k) => n.delete(k)); });
  };

  const summary = useMemo(() => summarizeOwners(data ?? []), [data]);
  const filtered = useMemo(
    () => filterAndSortOwners(data ?? [], { search, plan, onboarding, status, actionOnly, sort }),
    [data, search, plan, onboarding, status, actionOnly, sort],
  );

  const hasActiveFilters = !!search || plan !== "all" || onboarding !== "all" || status !== "all" || actionOnly || sort !== "newest";
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const setPage = (p: number) => patchParams((n) => { if (p <= 1) n.delete("opage"); else n.set("opage", String(p)); }, false);

  const handleExport = () => {
    if (!filtered.length) { toast.info("No owners to export"); return; }
    const csv = ownersToCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `provider-owners-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} owner${filtered.length === 1 ? "" : "s"} to CSV`);
  };

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 bg-slate-50/60 dark:bg-slate-900/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Users className="h-5 w-5 text-slate-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Provider owner accounts</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              One row per owner account — the person/organization behind the listings. One owner can manage
              several facilities. Open a profile to manage their identity, plan, billing, claims, and facilities.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* KPI strip — click a tile to filter. Counts reflect ALL owners. */}
      <KpiStrip
        summary={summary}
        loading={isLoading}
        active={{ plan, actionOnly }}
        onPlan={(p) => setKey("plan", p, "all")}
        onActionNeeded={() => setKey("act", actionOnly ? "0" : "1", "0")}
        onAll={clearAllFilters}
      />

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search owner name, email, or facility name…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-9 text-sm"
              type="search"
              autoComplete="off"
              maxLength={128}
              aria-label="Search provider owners"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleExport} disabled={isLoading || !filtered.length}>
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={plan} onValueChange={(v) => setKey("plan", v, "all")}>
            <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Plan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="grace">Grace</SelectItem>
              <SelectItem value="past_due">Past due</SelectItem>
              <SelectItem value="incomplete">Incomplete</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="no_billing">No billing</SelectItem>
            </SelectContent>
          </Select>
          <Select value={onboarding} onValueChange={(v) => setKey("onb", v, "all")}>
            <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Onboarding" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All onboarding</SelectItem>
              <SelectItem value="complete">Onboarding complete</SelectItem>
              <SelectItem value="incomplete">Onboarding incomplete</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setKey("fstat", v, "all")}>
            <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Facility status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any facility status</SelectItem>
              <SelectItem value="live">Has live</SelectItem>
              <SelectItem value="pending">Has pending</SelectItem>
              <SelectItem value="rejected">Has rejected</SelectItem>
              <SelectItem value="suspended">Has suspended</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setKey("osort", v, "newest")}>
            <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest provider</SelectItem>
              <SelectItem value="most_facilities">Most facilities</SelectItem>
              <SelectItem value="action_needed">Action needed first</SelectItem>
              <SelectItem value="plan">Plan</SelectItem>
              <SelectItem value="last_updated">Last updated</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={actionOnly ? "default" : "outline"}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setKey("act", actionOnly ? "0" : "1", "0")}
            aria-pressed={actionOnly}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Action needed
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground" onClick={clearAllFilters}>
              <ListFilter className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="p-4 flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-64" /></div>
              <Skeleton className="h-6 w-16" />
            </CardContent></Card>
          ))}
        </div>
      ) : isError ? (
        <Card><CardContent className="p-8 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <div>
            <p className="font-semibold text-foreground">Couldn't load provider owners</p>
            <p className="text-sm text-muted-foreground mt-0.5">The owner list failed to load. Please retry.</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetch()}>
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} /> Retry
          </Button>
        </CardContent></Card>
      ) : pageRows.length === 0 ? (
        <Card><CardContent className="p-10 flex flex-col items-center gap-2 text-center">
          <Users className="h-8 w-8 text-muted-foreground/50" />
          <p className="font-medium text-foreground">No provider owners match</p>
          <p className="text-sm text-muted-foreground">
            {(data?.length ?? 0) === 0
              ? "No provider owner accounts yet."
              : "Try clearing search or filters."}
          </p>
          {hasActiveFilters && (data?.length ?? 0) > 0 && (
            <Button variant="outline" size="sm" className="mt-1" onClick={clearAllFilters}>Clear filters</Button>
          )}
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {pageRows.map((o) => (
            <OwnerCard key={o.user_id} owner={o} onViewFacilities={onViewOwnerFacilities} />
          ))}
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
          <span>
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            {" "}{filtered.length === 1 ? "owner" : "owners"}
            {dataUpdatedAt ? <span className="hidden sm:inline"> · updated {new Date(dataUpdatedAt).toLocaleTimeString()}</span> : null}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                Previous
              </Button>
              <span className="tabular-nums">Page {safePage} / {totalPages}</span>
              <Button variant="outline" size="sm" className="h-7" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- KPI strip --------------------------------------------------------------

function KpiTile({ label, value, icon: Icon, tone, active, onClick }: {
  label: string; value: number; icon: typeof Sparkles;
  tone: "default" | "pro" | "grace" | "danger" | "warning"; active?: boolean; onClick: () => void;
}) {
  const toneCls: Record<string, string> = {
    default: "text-muted-foreground",
    pro: "text-emerald-600 dark:text-emerald-400",
    grace: "text-violet-600 dark:text-violet-400",
    danger: "text-red-600 dark:text-red-400",
    warning: "text-amber-600 dark:text-amber-400",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!active}
      className={cn(
        "flex flex-1 min-w-[92px] flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-all",
        active ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30" : "border-border hover:bg-muted/50",
      )}
    >
      <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium", toneCls[tone])}>
        <Icon className="h-3.5 w-3.5" />{label}
      </span>
      <span className="text-lg font-semibold tabular-nums text-foreground">{value}</span>
    </button>
  );
}

function KpiStrip({ summary, loading, active, onPlan, onActionNeeded, onAll }: {
  summary: ReturnType<typeof summarizeOwners>;
  loading: boolean;
  active: { plan: PlanFilter; actionOnly: boolean };
  onPlan: (p: PlanFilter) => void;
  onActionNeeded: () => void;
  onAll: () => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-wrap gap-2">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[62px] flex-1 min-w-[92px] rounded-lg" />)}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <KpiTile label="All owners" value={summary.total} icon={Users} tone="default"
        active={active.plan === "all" && !active.actionOnly} onClick={onAll} />
      <KpiTile label="Pro" value={summary.pro} icon={Sparkles} tone="pro"
        active={active.plan === "pro"} onClick={() => onPlan("pro")} />
      <KpiTile label="Grace" value={summary.grace} icon={Clock} tone="grace"
        active={active.plan === "grace"} onClick={() => onPlan("grace")} />
      <KpiTile label="Past due" value={summary.pastDue} icon={CreditCard} tone="danger"
        active={active.plan === "past_due"} onClick={() => onPlan("past_due")} />
      <KpiTile label="No billing" value={summary.noBilling} icon={Ban} tone="default"
        active={active.plan === "no_billing"} onClick={() => onPlan("no_billing")} />
      <KpiTile label="Action needed" value={summary.actionNeeded} icon={ShieldAlert} tone="warning"
        active={active.actionOnly} onClick={onActionNeeded} />
    </div>
  );
}

// --- Owner card -------------------------------------------------------------

function StatusChip({ n, label, className }: { n: number; label: string; className: string }) {
  if (!n) return null;
  return <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium", className)}>{n} {label}</span>;
}

function OwnerCard({ owner: o, onViewFacilities }: {
  owner: ProviderOwnerRow;
  onViewFacilities: (userId: string, ownerLabel: string) => void;
}) {
  const plan = PLAN_META[o.plan_state];
  const PlanIcon = plan.icon;
  const needs = actionNeeded(o);
  const reasons = ownerRiskFlags(o);
  const onboardingIncomplete = !o.onboarding_completed_at;
  const label = ownerName(o);
  const profileHref = `/admin/providers/account/${o.user_id}`;

  return (
    <Card className={cn(needs && "border-amber-300/70")}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link to={profileHref} className="font-semibold text-foreground hover:underline truncate">
                {label}
              </Link>
              <Badge variant="outline" className={cn("gap-1 text-[11px]", plan.className)}>
                <PlanIcon className="h-3 w-3" />{plan.label}
              </Badge>
              {o.plan_state === "grace" && o.grace_expires_at && (
                <span className="text-[11px] text-violet-700 dark:text-violet-400">
                  until {fmtDate(o.grace_expires_at)}
                </span>
              )}
              {needs && (
                <Badge variant="outline" className="gap-1 text-[11px] bg-amber-500/10 text-amber-800 border-amber-200 dark:text-amber-400">
                  <ShieldAlert className="h-3 w-3" /> Action needed
                </Badge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {o.email && <span className="truncate">{o.email}</span>}
              {o.phone && <span>· {o.phone}</span>}
              {o.created_at && <span>· Joined {new Date(o.created_at).toLocaleDateString()}</span>}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                {o.total_facilities} {o.total_facilities === 1 ? "facility" : "facilities"}
              </span>
              <StatusChip n={o.live_count} label="live" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" />
              <StatusChip n={o.pending_count} label="pending" className="bg-amber-500/10 text-amber-800 dark:text-amber-400" />
              <StatusChip n={o.rejected_count} label="rejected" className="bg-red-500/10 text-red-700 dark:text-red-400" />
              <StatusChip n={o.suspended_count} label="paused" className="bg-slate-500/10 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              <span className={cn("inline-flex items-center gap-1", o.email_verified_at ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground")}>
                {o.email_verified_at ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                {o.email_verified_at ? "Email verified" : "Email unverified"}
              </span>
              <span className={cn("inline-flex items-center gap-1", onboardingIncomplete ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>
                {onboardingIncomplete ? <PauseCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                {onboardingIncomplete ? "Onboarding incomplete" : "Onboarded"}
              </span>
              {o.has_stripe_customer && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <CreditCard className="h-3 w-3" /> Stripe customer
                </span>
              )}
              {o.last_facility_update && (
                <span className="text-muted-foreground">· Updated {new Date(o.last_facility_update).toLocaleDateString()}</span>
              )}
            </div>
            {needs && reasons.length > 0 && (
              <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">
                <span className="font-medium">Needs attention:</span> {reasons.map((r) => r.label).join(" · ")}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
            <Button asChild size="sm" className="gap-1.5">
              <Link to={profileHref}>
                <ExternalLink className="h-3.5 w-3.5" /> Open profile
              </Link>
            </Button>
            {o.total_facilities > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => onViewFacilities(o.user_id, label)}
              >
                <Building2 className="h-3.5 w-3.5" /> Facilities
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
