import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Search, Users, Building2, AlertCircle, RefreshCw, ExternalLink,
  CheckCircle2, Clock, Ban, PauseCircle, CreditCard, Sparkles, ShieldAlert,
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
  filterAndSortOwners,
} from "@/lib/providerOwners";

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

export function OwnersTab() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin-provider-owners"],
    queryFn: async (): Promise<ProviderOwnerRow[]> => {
      const { data, error } = await supabase.rpc("admin_list_provider_owners");
      if (error) throw error;
      return (data ?? []) as unknown as ProviderOwnerRow[];
    },
    refetchOnMount: true,
  });

  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput.trim().toLowerCase(), 300);
  const [plan, setPlan] = useState<PlanFilter>("all");
  const [onboarding, setOnboarding] = useState<OnboardingFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [actionOnly, setActionOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);

  // Any filter/search/sort change returns to page 1.
  useEffect(() => { setPage(1); }, [search, plan, onboarding, status, actionOnly, sort]);

  const filtered = useMemo(
    () => filterAndSortOwners(data ?? [], { search, plan, onboarding, status, actionOnly, sort }),
    [data, search, plan, onboarding, status, actionOnly, sort],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

      {/* Filters */}
      <div className="flex flex-col gap-3">
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
        <div className="flex flex-wrap items-center gap-2">
          <Select value={plan} onValueChange={(v) => setPlan(v as PlanFilter)}>
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
          <Select value={onboarding} onValueChange={(v) => setOnboarding(v as OnboardingFilter)}>
            <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Onboarding" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All onboarding</SelectItem>
              <SelectItem value="complete">Onboarding complete</SelectItem>
              <SelectItem value="incomplete">Onboarding incomplete</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Facility status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any facility status</SelectItem>
              <SelectItem value="live">Has live</SelectItem>
              <SelectItem value="pending">Has pending</SelectItem>
              <SelectItem value="rejected">Has rejected</SelectItem>
              <SelectItem value="suspended">Has suspended</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
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
            onClick={() => setActionOnly((v) => !v)}
            aria-pressed={actionOnly}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Action needed
          </Button>
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
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {pageRows.map((o) => <OwnerCard key={o.user_id} owner={o} />)}
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span>
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            {" "}{filtered.length === 1 ? "owner" : "owners"}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </Button>
              <span className="tabular-nums">Page {page} / {totalPages}</span>
              <Button variant="outline" size="sm" className="h-7" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusChip({ n, label, className }: { n: number; label: string; className: string }) {
  if (!n) return null;
  return <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium", className)}>{n} {label}</span>;
}

function OwnerCard({ owner: o }: { owner: ProviderOwnerRow }) {
  const plan = PLAN_META[o.plan_state];
  const PlanIcon = plan.icon;
  const needs = actionNeeded(o);
  const onboardingIncomplete = !o.onboarding_completed_at;
  const profileHref = `/admin/providers/account/${o.user_id}`;

  return (
    <Card className={cn(needs && "border-amber-300/70")}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link to={profileHref} className="font-semibold text-foreground hover:underline truncate">
                {ownerName(o)}
              </Link>
              <Badge variant="outline" className={cn("gap-1 text-[11px]", plan.className)}>
                <PlanIcon className="h-3 w-3" />{plan.label}
              </Badge>
              {o.plan_state === "grace" && o.grace_expires_at && (
                <span className="text-[11px] text-violet-700 dark:text-violet-400">
                  until {new Date(o.grace_expires_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
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
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild size="sm" className="gap-1.5">
              <Link to={profileHref}>
                <ExternalLink className="h-3.5 w-3.5" /> Open profile
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
