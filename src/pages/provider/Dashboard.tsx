import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  Building2,
  FileEdit,
  Sparkles,
  ChevronRight,
  ArrowRight,
  Star,
  Megaphone,
  ShieldCheck,
  Search,
  PanelsTopLeft,
  Plus,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProviderData } from "@/hooks/useProviderData";
import { useProviderFacilities } from "@/hooks/useProviderFacilities";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { fromLeadsProviderView } from "@/lib/leadsProviderView";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { useFacilitySubscription } from "@/hooks/useFacilitySubscription";
import { LeadDetailDrawer } from "@/components/provider/leads/LeadDetailDrawer";
import { cn } from "@/lib/utils";
import { Lead } from "@/components/provider/leads/types";
import { VerificationStateCard } from "@/components/provider/VerificationStateCard";
import { DashboardPerformanceCard } from "@/components/provider/DashboardPerformanceCard";
import { DashboardRecentActivity } from "@/components/provider/DashboardRecentActivity";
import { DashboardListingHealthCard } from "@/components/provider/DashboardListingHealthCard";
import { FeaturedAnalyticsWidget } from "@/components/provider/FeaturedAnalyticsWidget";
import { FreeTierValueTeaser } from "@/components/provider/FreeTierValueTeaser";
import { PlanGraceBanner } from "@/components/provider/PlanGraceBanner";
import { getCachedSession } from "@/lib/sessionCache";
import { getListingStatusMeta } from "@/lib/listingStatus";
import {
  FEATURED_DIRECTORY_NOTE,
  PRO_ACTIVE_DESTINATIONS,
  PRO_DIRECTORY_BENEFITS,
  PRO_DIRECTORY_TRUST_NOTE,
} from "@/lib/proDirectoryBenefits";
import { fmtMoneyWhole, TIER_PRICING } from "@/lib/billingPricing";

// Compact directory-style metric tile. Hairline border, white bg, no
// shadow lift on hover — just a subtle border accent. Title sits as a
// small uppercase eyebrow above the value; subtitle (if any) drops
// below in 12px muted. iconBg / iconColor are kept as props so each
// metric can hold its accent (emerald for live, amber for pending,
// etc.) without restyling the wrapper.
function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  action,
  isLoading,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  action?: { label: string; href: string };
  isLoading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow">
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </p>
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} aria-hidden />
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="mt-3 h-9 w-20" />
      ) : (
        <p className="mt-2 font-display text-[30px] font-bold leading-none tabular-nums text-slate-900">
          {value}
        </p>
      )}
      {subtitle && (
        <p className="mt-1.5 truncate text-[13px] text-slate-500">{subtitle}</p>
      )}
      {action && (
        <div className="mt-2.5 border-t border-slate-100 pt-2.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-0 text-[13px] font-semibold text-[#1B365D] hover:bg-transparent hover:text-[#142a4a]"
            asChild
          >
            <Link to={action.href}>
              {action.label}
              <ChevronRight className="ml-0.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Section eyebrow. The dashboard answers five separate questions and the
 * previous single undifferentiated card grid made it impossible to tell which
 * question a card belonged to — the Featured add-on, a Pro upsell and the
 * listing-health score all sat side by side. Labelled bands give the page an
 * information hierarchy that survives Free vs Pro and add-on permutations.
 */
function SectionLabel({ children, hint }: { children: string; hint?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pt-1">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {children}
      </h2>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

// Mask name helper (e.g., "John Smith" -> "John S.")
const maskName = (name: string): string => {
  if (!name) return "Verified User";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${firstName} ${lastInitial}.`;
};

export default function ProviderDashboardPage() {
  const queryClient = useQueryClient();
  const { selectedFacility } = useSelectedFacility();
  const facilityId = selectedFacility?.id;
  // Recovery banner: ProviderSignup redirects here with this query param
  // when the auth user + profile were created but the facility row insert
  // failed AND the rollback edge function was unable to clean up. Shown
  // until the user dismisses or actually creates a facility.
  const [searchParams, setSearchParams] = useSearchParams();
  const showSignupRecovery = searchParams.get("signup_facility_failed") === "1";
  const dismissSignupRecovery = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("signup_facility_failed");
    setSearchParams(next, { replace: true });
  };
  
  const { data: providerData, isLoading, isPlaceholderData } = useProviderData(facilityId);
  const { facilities } = useProviderFacilities();
  const { data: subscription } = useFacilitySubscription(facilityId);

  // Pro status for the SELECTED facility. has_active_pro() is SECURITY DEFINER,
  // so it returns the chosen facility's Pro state correctly for the owner AND a
  // team member (who can't read facility_subscriptions directly). The previous
  // useFacilityLimits()/useProStatus() with no facilityId returned the
  // provider's best subscription across ALL facilities, so a multi-facility
  // owner's Free facility was mislabeled "Pro" (showing its leads + hiding the
  // upgrade prompt) whenever they had Pro on a different facility.
  const { data: facilityIsPro = false } = useQuery({
    queryKey: ["facility-has-active-pro", facilityId],
    queryFn: async (): Promise<boolean> => {
      if (!facilityId) return false;
      const { data, error } = await supabase.rpc("has_active_pro", { p_facility_id: facilityId });
      if (error) throw error;
      return data === true;
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  });
  const proStatus = { isPro: facilityIsPro };
  
  const facility = selectedFacility || providerData?.facility;
  const profile = providerData?.profile;
  const userName = profile?.first_name || "";
  const facilityIds = facilities?.map(f => f.id) ?? [];

  // Open (pending/rejected) facility claims for the claim-status banner.
  const { data: openClaims } = useQuery({
    queryKey: ["dashboard-open-claims"],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<{ id: string; status: string }[]> => {
      const session = await getCachedSession();
      if (!session) return [];
      const { data } = await supabase
        .from("facility_claim_requests")
        .select("id, status")
        .eq("claimant_user_id", session.user.id)
        .in("status", ["pending", "rejected"]);
      return data ?? [];
    },
  });
  // True only when we've finished loading AND confirmed no facility exists.
  // Without this guard the "Getting Started — create your first listing"
  // card flashes for ~1s on every initial mount before useProviderData
  // resolves, even for established providers.
  const hasNoFacility = !isLoading && !isPlaceholderData && !facility;

  // Post-onboarding welcome modal moved to ProviderShell (single
  // global mount via <WelcomeModal/>). The Dashboard-local
  // ProviderWelcomeModal was retired 2026-05-20 because it gated on
  // `profile_completion_celebrated` (a per-facility flag) while
  // WelcomeModal gates on `profiles.welcomed_at` (a per-user flag) —
  // both fired on first dashboard load and stacked.

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Round-30 audit recovery: a user who timed out of PlanStep's
  // Pro-confirmation poll (Stripe webhook lag > 30s) lands here with
  // profile.onboarding_completed_at still NULL. If the subscription
  // DID land in the meantime, complete onboarding now so the wizard
  // doesn't re-trap them on next reload.
  useEffect(() => {
    if (!profile) return;
    if (profile.onboarding_completed_at) return;
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) return;
      const { data: sub } = await supabase
        .from("facility_subscriptions")
        .select("tier, status")
        .eq("provider_id", uid)
        .eq("status", "active")
        .eq("tier", "pro")
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (sub?.tier === "pro") {
        try {
          await supabase.rpc("complete_provider_onboarding");
          // Refetch so the rest of the dashboard re-renders with
          // onboarding_completed_at set + Pro benefits visible. The
          // previous version had this comment but the invalidate call
          // was missing — the toast surfaced "Pro is active" but the
          // gated widgets (ProBenefitsWidget, FeaturedAnalyticsWidget)
          // wouldn't appear until the next manual reload.
          await queryClient.invalidateQueries({ queryKey: ["provider-data"] });
          await queryClient.invalidateQueries({ queryKey: ["pro-status"] });
          await queryClient.invalidateQueries({
            queryKey: ["facility-subscription"],
          });
          toast.success("Pro is active — welcome to RehabLookup.");
        } catch (e) {
          console.warn("[Dashboard] post-timeout Pro recovery RPC failed", e);
        }
      }
    })();
    return () => { cancelled = true; };
    // Only react to the onboarding flag flipping — intentionally not depending
    // on the whole profile object or queryClient so this runs once on completion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.onboarding_completed_at]);

  // Fetch recent inquiries from the PII-safe view. Every tier sees the
  // inquiries sent to its own facilities — leads_provider_view is
  // security_invoker over own-facility RLS, which carries no Pro predicate on
  // SELECT. Polled every 30s while the tab is visible (React Query pauses
  // refetchInterval automatically when the tab is hidden).
  const { data: recentLeads = [] } = useQuery({
    queryKey: ["recent-leads", facilityId],
    queryFn: async (): Promise<Lead[]> => {
      if (!facilityId) return [];
      const { data, error } = await fromLeadsProviderView()
        .select("id, facility_id, name, email, phone, status, created_at, urgency, level_of_care, source, location_city_state, location_zip, primary_substance, insurance_type, insurance_provider, message, inquiry_type, who_seeking_help, provider_response_status, provider_responded_at, provider_response_notes, preferred_contact, snooze_until, employment_status, veteran_status, legal_involvement, age_range, gender, co_occurring_conditions, readiness_level, dual_diagnosis, budget_preference, special_needs, redistribution_status, exclusive_until, extended_until, original_facility_id, assignment_status, assignment_reason, assigned_at, quality_flag, shared_with")
        .eq("facility_id", facilityId)
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return (data || []) as Lead[];
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 2,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
    retry: 2,
  });

  // Fetch total leads count via SECURITY DEFINER RPC so counts are accurate regardless of view-level row filtering.
  const { data: totalLeadsCount = 0, isError: totalLeadsErr } = useQuery({
    queryKey: ["total-leads-count", facilityId],
    queryFn: async (): Promise<number> => {
      if (!facilityId) return 0;
      const { data, error } = await supabase.rpc("get_facility_leads_count", { p_facility_id: facilityId });
      if (error) throw error;
      return Number(data?.[0]?.total_count) || 0;
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 2,
    refetchOnMount: true,
  });

  // Server-side count of urgent leads (status=new, created >24h ago, not
  // snoozed). The recent-leads query above only loads the 4 most-recent rows
  // for the dashboard feed, so without this dedicated count a provider with
  // 50+ leads would see "0 need follow-up" while many are stale.
  const { data: urgentLeadsCount = 0, isError: urgentLeadsErr } = useQuery({
    queryKey: ["urgent-leads-count", facilityId],
    queryFn: async (): Promise<number> => {
      if (!facilityId) return 0;
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const nowIso = new Date().toISOString();
      const { count, error } = await fromLeadsProviderView()
        .select("id", { count: "exact", head: true })
        .eq("facility_id", facilityId)
        .eq("status", "new")
        .lte("created_at", cutoff)
        .or(`snooze_until.is.null,snooze_until.lt.${nowIso}`);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 2,
    refetchOnMount: true,
  });

  const { data: servicesCount = 0 } = useQuery({
    queryKey: ["services-count", facilityId],
    queryFn: async (): Promise<number> => {
      if (!facilityId) return 0;
      const { count, error } = await supabase
        .from("facility_services")
        .select("id", { count: "exact", head: true })
        .eq("facility_id", facilityId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: true,
  });

  // Fetch insurance count for profile completion
  const { data: insuranceCount = 0 } = useQuery({
    queryKey: ["insurance-count", facilityId],
    queryFn: async (): Promise<number> => {
      if (!facilityId) return 0;
      const { count, error } = await supabase
        .from("facility_insurance")
        .select("id", { count: "exact", head: true })
        .eq("facility_id", facilityId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: true,
  });

  // Fetch total impressions count from provider_events
  const { data: impressionCount = 0, isError: impressionErr } = useQuery({
    queryKey: ["impression-count", facilityId],
    queryFn: async (): Promise<number> => {
      if (!facilityId) return 0;
      const { count, error } = await supabase
        .from("provider_events")
        .select("id", { count: "exact", head: true })
        .eq("facility_id", facilityId)
        .eq("event_type", "listing_impression")
        .eq("is_internal", false)
        .eq("is_bot", false);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 3,
    refetchOnWindowFocus: true,
  });

  // Auto-refresh impressions via realtime subscription.
  // Per-mount random suffix on the channel name so successive mounts
  // can't collide with an already-subscribed cached channel — same
  // pattern as ConciergeIntroductionResponder + usePendingConciergeCount +
  // useProviderData (the dashboard-crash fix). Without it the second
  // mount of the dashboard throws "cannot add postgres_changes
  // callbacks after subscribe()" and SEORouteBoundary catches it.
  useEffect(() => {
    if (!facilityId) return;
    const channelName = `impressions-live-${facilityId}-${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "provider_events",
          filter: `facility_id=eq.${facilityId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["impression-count", facilityId] });
        }
      )
      .subscribe();
    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        /* channel may already be torn down server-side */
      }
    };
  }, [facilityId, queryClient]);

  // Fetch review count
  const { data: reviewCount = 0, isError: reviewErr } = useQuery({
    queryKey: ["review-count", facilityId],
    queryFn: async (): Promise<number> => {
      if (!facilityId) return 0;
      const { count, error } = await supabase
        .from("facility_reviews")
        .select("id", { count: "exact", head: true })
        .eq("facility_id", facilityId)
        .eq("status", "approved");
      if (error) throw error;
      return count || 0;
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 5,
  });

  // Canonical server-computed completeness. Shares the EXACT query key + shape
  // with DashboardListingHealthCard so the "Profile" KPI and the Listing Health
  // card can never show two different completeness numbers on the same page.
  const { data: completeness } = useQuery({
    queryKey: ["listing-health", facilityId],
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<{ completeness: number } | null> => {
      if (!facilityId) return null;
      const { data, error } = await supabase
        .from("facilities")
        .select("listing_completeness_score")
        .eq("id", facilityId)
        .maybeSingle();
      if (error) throw error;
      return {
        completeness:
          (data as { listing_completeness_score: number | null } | null)
            ?.listing_completeness_score ?? 0,
      };
    },
  });

  // Compute missing fields
  const computeMissingFields = () => {
    if (!providerData?.facility) return [];
    const f = providerData.facility;
    const missing: string[] = [];
    if (!f.description) missing.push("description");
    if (!f.phone) missing.push("phone");
    if (!f.address || !f.city || !f.state || !f.zip_code) missing.push("address");
    if (!f.logo_url) missing.push("logo");
    if (!f.gallery_urls || f.gallery_urls.length === 0) missing.push("photos");
    if (servicesCount === 0) missing.push("services");
    if (insuranceCount === 0) missing.push("insurance");
    return missing.sort();
  };

  // Recent leads polls itself every 30s via refetchInterval (above);
  // when a refetch lands we also invalidate the dependent counts so the
  // dashboard header + KPI strip stay in sync. We can't simply put
  // `refetchInterval` on every count query because each one has its own
  // staleTime / window-focus behavior — coupling them here keeps the
  // wall-clock consistent.
  useEffect(() => {
    if (!facilityId) return;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      queryClient.invalidateQueries({ queryKey: ["total-leads-count", facilityId] });
      queryClient.invalidateQueries({ queryKey: ["urgent-leads-count", facilityId] });
      queryClient.invalidateQueries({ queryKey: ["impression-count", facilityId] });
    }, 60_000);
    return () => clearInterval(interval);
  }, [facilityId, queryClient]);

  // Keep the open lead drawer in sync with refetched data. The drawer holds a
  // snapshot (`selectedLead`); after an in-drawer status/snooze change
  // invalidates ["recent-leads"], re-point the snapshot at the fresh row so the
  // badge/dropdown/snooze panel update immediately instead of showing the old
  // value until the drawer is closed and reopened. (Mirrors Inquiries.tsx.)
  useEffect(() => {
    if (!drawerOpen || !selectedLead) return;
    const fresh = recentLeads.find((l) => l.id === selectedLead.id);
    if (
      fresh &&
      (fresh.status !== selectedLead.status ||
        fresh.snooze_until !== selectedLead.snooze_until)
    ) {
      setSelectedLead(fresh);
    }
  }, [recentLeads, drawerOpen, selectedLead]);

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  };

  const getStatusConfig = (f: { status: string; suspended?: boolean | null }) => {
    // Labels come from the shared getListingStatusMeta so rejected /
    // needs_edits / pending_review each read distinctly (e.g. "Not Approved",
    // "Changes Requested") instead of collapsing to a misleading "Not Listed".
    // This local map only supplies the dashboard's per-tone styling.
    const meta = getListingStatusMeta(f.status, f.suspended);
    const TONE_STYLE = {
      live: { icon: CheckCircle, bgClass: "bg-success/10", textClass: "text-success", dotClass: "bg-success" },
      review: { icon: Clock, bgClass: "bg-warning/10", textClass: "text-warning", dotClass: "bg-warning" },
      attention: { icon: AlertCircle, bgClass: "bg-red-100", textClass: "text-red-700", dotClass: "bg-red-500" },
      paused: { icon: AlertCircle, bgClass: "bg-amber-100", textClass: "text-amber-800", dotClass: "bg-amber-500" },
      draft: { icon: AlertCircle, bgClass: "bg-muted", textClass: "text-muted-foreground", dotClass: "bg-muted-foreground" },
    } as const;
    return { label: meta.label, ...TONE_STYLE[meta.tone] };
  };

  // ---- derived overview values ----
  const totalFacilities = facilities?.length ?? 0;
  const liveCount = facilities?.filter((f) => f.status === "approved" && f.suspended !== true).length ?? 0;
  const pendingCount = facilities?.filter((f) => f.status === "pending").length ?? 0;
  const PROFILE_CHECKS = 7;
  const missingFields = providerData?.facility ? computeMissingFields() : [];
  // Headline % is the canonical server completeness score (same value the
  // Listing Health card shows); the client missing-fields list is only a
  // "quick wins" hint, never the basis for the percentage. Falls back to the
  // client estimate only until the server score has loaded.
  const clientProfilePct = providerData?.facility
    ? Math.max(0, Math.round(((PROFILE_CHECKS - missingFields.length) / PROFILE_CHECKS) * 100))
    : 0;
  const profilePct = completeness?.completeness ?? clientProfilePct;
  // Featured is INDEPENDENT paid advertising. `has_featured` is the Featured
  // add-on flag on facility_subscriptions — it is never derived from Pro, and
  // the Growth band below never gates Featured behind the Pro card.
  const hasFeatured = subscription?.has_featured === true;

  return (
    <div className="min-h-full bg-slate-50">
      {/* Slim header — no large hero. Greeting + plan + public-page link. */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1B365D]/70">
                Dashboard
              </p>
              <h1 className="mt-0.5 truncate text-[22px] font-bold tracking-tight text-slate-900 sm:text-[24px]">
                {profile?.first_name ? `Welcome back, ${profile.first_name}` : "Welcome back"}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {/* Plan STATE, not a CTA. The upgrade CTA lives once, in the Plan
                  band at the bottom of the page — the header used to carry a
                  second one, and the card grid a third. */}
              {proStatus.isPro ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-800">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden /> Pro
                </span>
              ) : (
                <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Free plan
                </span>
              )}
              {facility?.slug && facility.status === "approved" && facility.suspended !== true && (
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <a href={`/center/${facility.slug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    <span className="hidden sm:inline">View public page</span>
                    <span className="sm:hidden">Public</span>
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        {/* Courtesy-period countdown (no-op unless an admin grant is active) */}
        <PlanGraceBanner />

        {/* Pending / rejected claim visibility — a claim-intent signup owns
            zero facilities until approval, so without this the empty state
            pushes them to create a duplicate listing with no mention of the
            claim they already filed (2026-07-03 audit, gap G3). */}
        {openClaims && openClaims.length > 0 && (
          <Card className="border-sky-200 bg-sky-50">
            <CardContent className="flex items-start gap-3 p-4">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-sky-900">
                  {openClaims.some((c) => c.status === "rejected")
                    ? "A facility claim needs your attention"
                    : `Your facility claim${openClaims.length === 1 ? " is" : "s are"} under review`}
                </p>
                <p className="mt-1 text-xs text-sky-800/80">
                  {openClaims.some((c) => c.status === "rejected")
                    ? "One of your claims was not approved — review the reason and next steps."
                    : "We'll notify you as soon as our team finishes verifying your claim."}
                </p>
                <Button asChild size="sm" variant="outline" className="mt-3 border-sky-300 bg-white">
                  <Link to="/provider/claims">View claim status</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signup recovery banner */}
        {showSignupRecovery && (
          <Card className="border-rose-300 bg-rose-50">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-rose-900">
                  Your facility didn't save during signup
                </p>
                <p className="mt-1 text-xs text-rose-800/80">
                  Your account is set up but the facility details weren't saved. Add your
                  facility now to start receiving inquiries. Support has been notified.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button asChild size="sm" className="bg-rose-600 hover:bg-rose-700">
                    <Link to="/provider/add-location">Add facility now</Link>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={dismissSignupRecovery}>
                    Dismiss
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading && !facility ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-3 h-9 w-16" />
                <Skeleton className="mt-2 h-3 w-24" />
              </div>
            ))}
          </div>
        ) : hasNoFacility ? (
          /* Getting started — no facility yet */
          <Card className="border-[#1B365D]/20 bg-[#1B365D]/[0.03]">
            <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1B365D]/10">
                  <Building2 className="h-6 w-6 text-[#1B365D]" aria-hidden />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    List your facility to get started
                  </p>
                  <p className="mt-0.5 max-w-md text-sm text-slate-600">
                    Add your facility to appear in the directory, receive inquiries, and
                    unlock your provider tools. It takes a few minutes.
                  </p>
                </div>
              </div>
              <Button asChild size="lg" className="gap-1.5 bg-[#1B365D] hover:bg-[#142a4a]">
                <Link to="/provider/add-location">
                  Add your facility <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ═══ A. TOP SUMMARY — is my listing live, complete, and getting
                   engagement, and do I owe anyone a reply? ═══ */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <MetricCard
                title="Listings"
                value={totalFacilities}
                subtitle={
                  pendingCount > 0
                    ? `${liveCount} live · ${pendingCount} pending`
                    : totalFacilities > 0
                      ? `${liveCount} live`
                      : "None yet"
                }
                icon={Building2}
                iconBg="bg-[#1B365D]/10"
                iconColor="text-[#1B365D]"
                action={{ label: "Manage listings", href: "/provider/listings" }}
              />
              <MetricCard
                title="Profile"
                value={`${profilePct}%`}
                subtitle={
                  profilePct >= 100
                    ? "Complete"
                    : missingFields.length > 0
                      ? `${missingFields.length} item${missingFields.length !== 1 ? "s" : ""} left`
                      : "Keep it current"
                }
                icon={FileEdit}
                iconBg="bg-violet-100"
                iconColor="text-violet-700"
                action={
                  profilePct < 100
                    ? { label: "Complete profile", href: "/provider/listings" }
                    : undefined
                }
              />
              {/* Inquiries are NOT a paid feature. Every eligible approved
                  facility — Free included — receives inquiries pinned to the
                  facility the seeker selected. The previous "Pro" / "Upgrade
                  to receive" state contradicted the live inquiry contract and
                  is removed; the count is shown for every tier, matching what
                  leads_provider_view actually returns (own-facility RLS, no Pro
                  predicate on SELECT). */}
              <MetricCard
                title="Inquiries"
                value={totalLeadsErr ? "—" : totalLeadsCount}
                subtitle={
                  totalLeadsErr || urgentLeadsErr
                    ? "Couldn't load right now"
                    : urgentLeadsCount > 0
                      ? `${urgentLeadsCount} need follow-up`
                      : "All caught up"
                }
                icon={Users}
                iconBg="bg-emerald-100"
                iconColor="text-emerald-700"
                action={{ label: "View inquiries", href: "/provider/inquiries" }}
              />
              <MetricCard
                title="Search appearances"
                value={impressionErr ? "—" : impressionCount.toLocaleString()}
                subtitle={
                  reviewErr
                    ? "All time"
                    : `All time · ${reviewCount} review${reviewCount === 1 ? "" : "s"}`
                }
                icon={Search}
                iconBg="bg-sky-100"
                iconColor="text-sky-700"
                action={{ label: "View performance", href: "/provider/analytics" }}
              />
            </div>

            {/* ═══ B. PERFORMANCE SNAPSHOT ═══ */}
            <SectionLabel hint="Search appearances → views → contact → inquiries">
              Performance
            </SectionLabel>
            <DashboardPerformanceCard facilityId={facilityId} />

            {/* ═══ C. DIRECTORY MANAGEMENT ═══ */}
            <SectionLabel hint="Keep your listing accurate, complete, and answered">
              Directory
            </SectionLabel>

            {/* Balanced card grid. CSS multi-column (masonry) auto-equalizes
                the two columns' heights so neither side leaves a big empty gap,
                regardless of which cards render. break-inside-avoid keeps each
                card whole; mb-5 supplies the vertical rhythm that space-y can't
                inside a column flow. Single column below lg. */}
            <div className="gap-5 lg:columns-2 [&>*]:mb-5 [&>*]:break-inside-avoid">
              {/* Listing health (completeness + directory-position report) */}
              <DashboardListingHealthCard facilityId={facilityId} />

              {/* Your facilities */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b py-3.5">
                  <CardTitle className="text-sm font-semibold">Your facilities</CardTitle>
                  <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs text-[#1B365D]">
                    <Link to="/provider/add-location">
                      <Plus className="h-3.5 w-3.5" /> Add location
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y divide-slate-100">
                    {(facilities ?? []).map((f) => {
                      const sc = getStatusConfig(f);
                      return (
                        <li key={f.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                            <Building2 className="h-4 w-4 text-slate-500" aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900">{f.name}</p>
                            <p className="truncate text-xs text-slate-500">
                              {[f.city, f.state].filter(Boolean).join(", ") || "Location not set"}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                              sc.bgClass,
                              sc.textClass,
                            )}
                          >
                            <span className={cn("h-1.5 w-1.5 rounded-full", sc.dotClass)} />
                            {sc.label}
                          </span>
                          <Button asChild variant="ghost" size="sm" className="h-8 shrink-0 px-2 text-xs">
                            <Link to={`/provider/listings?edit=${f.id}`}>Manage</Link>
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>

              {/* Missing profile fields — the concrete "what should I improve
                  next?" answer. Free-plan work, no upsell attached. */}
              {missingFields.length > 0 && (
                <Card>
                  <CardHeader className="border-b py-3.5">
                    <CardTitle className="text-sm font-semibold">Finish your profile</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5">
                    <p className="text-xs text-slate-600">
                      {missingFields.length} field{missingFields.length !== 1 ? "s" : ""} still
                      missing from your listing:
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {missingFields.map((m) => (
                        <span
                          key={m}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                          {m}
                        </span>
                      ))}
                    </div>
                    <Button asChild size="sm" className="mt-4 gap-1.5">
                      <Link to="/provider/listings">
                        <FileEdit className="h-3.5 w-3.5" /> Edit listing
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Enhanced Profile — a first-class destination, not a locked
                  teaser. Free facilities can author here before upgrading;
                  Pro controls whether the modules render publicly. */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b py-3.5">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <PanelsTopLeft className="h-4 w-4 text-[#1B365D]" aria-hidden />
                    Enhanced Profile
                  </CardTitle>
                  {proStatus.isPro ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      <CheckCircle className="h-3 w-3" aria-hidden /> Live
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      Draft
                    </span>
                  )}
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  <p className="text-xs leading-relaxed text-slate-600">
                    Programs, amenities, staff, accreditation highlights, video, and virtual
                    tour.{" "}
                    {proStatus.isPro
                      ? "These modules render on your public listing now."
                      : "You can prepare all of it on Free — Pro controls whether it appears on the public listing."}
                  </p>
                  <Button asChild size="sm" variant="outline" className="mt-3 gap-1.5 text-xs">
                    <Link to="/provider/listings/profile">
                      Open Enhanced Profile <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Recent inquiries (any tier) */}
              {recentLeads.length > 0 && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b py-3.5">
                    <CardTitle className="text-sm font-semibold">Recent inquiries</CardTitle>
                    <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs text-[#1B365D]">
                      <Link to="/provider/inquiries">
                        View all <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ul className="divide-y divide-slate-100">
                      {recentLeads.slice(0, 4).map((lead) => (
                        <li key={lead.id}>
                          <button
                            type="button"
                            onClick={() => handleLeadClick(lead)}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 sm:px-5"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                              {(lead.name || "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-900">
                                {maskName(lead.name || "New inquiry")}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {lead.level_of_care || lead.inquiry_type || "Inquiry"}
                                {lead.location_city_state ? ` · ${lead.location_city_state}` : ""}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs text-slate-400">
                              {format(new Date(lead.created_at), "MMM d")}
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Reviews */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b py-3.5">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Star className="h-4 w-4 text-amber-500" aria-hidden />
                    Reviews
                  </CardTitle>
                  <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs text-[#1B365D]">
                    <Link to="/provider/reviews">
                      Manage <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  <p className="font-display text-[26px] font-bold leading-none tabular-nums text-slate-900">
                    {reviewErr ? "—" : reviewCount}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {reviewErr
                      ? "Couldn't load reviews right now."
                      : reviewCount === 0
                        ? "No published reviews yet. Invite past clients from the Reviews page."
                        : `Published review${reviewCount === 1 ? "" : "s"} on your public listing.`}
                  </p>
                </CardContent>
              </Card>

              {/* Verification status — a trust state, never a purchase */}
              {facilityId && <VerificationStateCard facilityId={facilityId} />}

              {/* Demand signal for Free facilities (no upsell attached) */}
              {!proStatus.isPro && facilityId && (
                <FreeTierValueTeaser facilityId={facilityId} />
              )}

              {/* Recent activity (notifications: reviews, inquiries, updates) */}
              <DashboardRecentActivity />
            </div>

            {/* ═══ D. GROWTH — Featured advertising, kept separate from Pro ═══ */}
            <SectionLabel hint="Optional paid exposure, billed separately">Growth</SectionLabel>
            {facilityId && hasFeatured ? (
              <div className="space-y-5">
                <FeaturedAnalyticsWidget facilityId={facilityId} />
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-600">
                    Featured is active on this facility and billed separately from your
                    plan.
                  </p>
                  <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs">
                    <Link to="/provider/marketing">
                      Manage Featured <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1B365D]/8">
                      <Megaphone className="h-4 w-4 text-[#1B365D]" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        Featured advertising
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                        {FEATURED_DIRECTORY_NOTE}
                      </p>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline" className="shrink-0 gap-1.5 text-xs">
                    <Link to="/provider/marketing">
                      Explore Featured <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ═══ E. PLAN — exactly one Pro surface on this page ═══ */}
            <SectionLabel>Plan</SectionLabel>
            {proStatus.isPro ? (
              <Card className="border-amber-200/70">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b py-3.5">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-amber-600" aria-hidden />
                    Pro listing active
                  </CardTitle>
                  <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs text-[#1B365D]">
                    <Link to="/provider/billing">
                      Plan &amp; Billing <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4 p-4 sm:p-5">
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {PRO_DIRECTORY_BENEFITS.map((benefit) => (
                      <li
                        key={benefit.key}
                        className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-2.5"
                      >
                        <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900">
                            {benefit.shortTitle}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                            {benefit.items.join(" · ")}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="grid gap-1.5 border-t border-slate-100 pt-3 sm:grid-cols-4">
                    {PRO_ACTIVE_DESTINATIONS.map((dest) => (
                      <Button
                        key={dest.href}
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-auto flex-col items-start gap-0.5 px-2.5 py-2 text-left"
                      >
                        <Link to={dest.href}>
                          <span className="text-xs font-semibold text-slate-900">{dest.label}</span>
                          <span className="text-[11px] font-normal text-slate-500">
                            {dest.description}
                          </span>
                        </Link>
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-start gap-2 rounded-lg border border-emerald-200/70 bg-emerald-50/50 p-2.5">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden />
                    <p className="text-[11px] leading-relaxed text-emerald-900">
                      {PRO_DIRECTORY_TRUST_NOTE}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* The single Pro upsell. Four outcomes, all real Pro
                 entitlements. No Verified badge, no ranking claim, no inquiry
                 eligibility, no Featured bundling. */
              <Card className="border-amber-200/70">
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 border-b py-3.5">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-amber-600" aria-hidden />
                    Upgrade to Pro
                  </CardTitle>
                  <span className="text-xs font-medium text-slate-500">
                    {fmtMoneyWhole(TIER_PRICING.pro.monthlyCents)}/mo · cancel anytime
                  </span>
                </CardHeader>
                <CardContent className="space-y-4 p-4 sm:p-5">
                  <p className="text-sm text-slate-700">
                    Make your listing easier to evaluate and contact.
                  </p>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {[
                      { label: "Public phone + Call button", detail: "Families reach your admissions line directly" },
                      { label: "Enhanced profile", detail: "Programs, amenities, staff, accreditation highlights" },
                      { label: "Rich media", detail: "Up to 10 photos, video, virtual tour" },
                      { label: "Multi-location management", detail: "Manage up to 5 facility listings" },
                    ].map((row) => (
                      <li
                        key={row.label}
                        className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-2.5"
                      >
                        <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900">{row.label}</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                            {row.detail}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="w-full gap-1.5 bg-[#1B365D] hover:bg-[#142a4a] sm:w-auto">
                    <Link to="/provider/billing?upgrade=pro">
                      See Pro plans <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden />
                    <p className="text-[11px] leading-relaxed text-slate-600">
                      {PRO_DIRECTORY_TRUST_NOTE}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Lead Detail Drawer */}
      <LeadDetailDrawer lead={selectedLead} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
