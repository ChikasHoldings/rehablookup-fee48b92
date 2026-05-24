import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  CreditCard,
  Building2,
  FileEdit,
  Phone,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  ChevronRight,
  X,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProviderData } from "@/hooks/useProviderData";
import { useProviderFacilities } from "@/hooks/useProviderFacilities";
import { useFacilityLimits } from "@/hooks/useFacilityLimits";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { fromLeadsProviderView } from "@/lib/leadsProviderView";
import { toast } from "sonner";
import { format } from "date-fns";
import { LeadStatusBadge, type LeadStatus } from "@/components/provider/leads/LeadStatusBadge";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { LeadDetailDrawer } from "@/components/provider/leads/LeadDetailDrawer";
import { FeaturedAnalyticsWidget } from "@/components/provider/FeaturedAnalyticsWidget";
import { cn } from "@/lib/utils";
import { LeadConversionWidget } from "@/components/provider/LeadConversionWidget";
import { ProBenefitsWidget } from "@/components/provider/ProBenefitsWidget";
import { ProMultiFacilityOverview } from "@/components/provider/ProMultiFacilityOverview";
import { Lead } from "@/components/provider/leads/LeadDetailPanel";
import { ProviderPerformanceFeedback } from "@/components/provider/ProviderPerformanceFeedback";

import { DashboardKPIStrip } from "@/components/provider/DashboardKPIStrip";
import { DashboardLeadFeed } from "@/components/provider/DashboardLeadFeed";
import { DashboardFacilityPerformancePanel } from "@/components/provider/DashboardFacilityPerformancePanel";
import { DashboardMissedLeads } from "@/components/provider/DashboardMissedLeads";

import { DashboardPlacementPanel } from "@/components/provider/DashboardPlacementPanel";

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
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-slate-300">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", iconBg)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {title}
          </p>
          {isLoading ? (
            <Skeleton className="mt-0.5 h-6 w-12" />
          ) : (
            <p className="text-xl font-bold leading-tight tabular-nums text-slate-900">{value}</p>
          )}
          {subtitle && (
            <p className="mt-0.5 truncate text-[11px] text-slate-500">{subtitle}</p>
          )}
        </div>
        {action && (
          <Button
            variant="ghost"
            size="sm"
            className="hidden h-7 gap-0.5 px-2 text-[11px] font-medium text-[#1B365D] hover:bg-slate-50 sm:inline-flex"
            asChild
          >
            <Link to={action.href}>
              {action.label}
              <ChevronRight className="ml-0.5 h-3 w-3" />
            </Link>
          </Button>
        )}
      </div>
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
  const { planTier } = useFacilityLimits();
  const proStatus = { isPro: planTier === "pro" };
  
  const facility = selectedFacility || providerData?.facility;
  const profile = providerData?.profile;
  const userName = profile?.first_name || "";
  const facilityIds = facilities?.map(f => f.id) ?? [];
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
  const [profilePromptDismissedFields, setProfilePromptDismissedFields] = useState<string | null>(() => {
    if (!facilityId) return null;
    return localStorage.getItem(`profile-prompt-dismissed-${facilityId}`);
  });

  useEffect(() => {
    if (facilityId) {
      setProfilePromptDismissedFields(localStorage.getItem(`profile-prompt-dismissed-${facilityId}`));
    }
  }, [facilityId]);

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
    // Only react to the profile object identity flipping — don't
    // re-run on every render.
  }, [profile?.onboarding_completed_at]);

  // Fetch recent leads from the PII-safe view. Pro providers see full
  // contact details; Free providers never see leads here (those inquiries
  // route to concierge upstream — see submit-qualified-lead). Polled
  // every 30s while the tab is visible (React Query pauses
  // refetchInterval automatically when the tab is hidden).
  const { data: recentLeads = [], isLoading: leadsLoading } = useQuery({
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
  const { data: totalLeadsCount = 0 } = useQuery({
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
  const { data: urgentLeadsCount = 0 } = useQuery({
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
  const { data: impressionCount = 0 } = useQuery({
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

  // Auto-refresh impressions via realtime subscription
  useEffect(() => {
    if (!facilityId) return;
    const channel = supabase
      .channel(`impressions-live-${facilityId}`)
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
    return () => { supabase.removeChannel(channel); };
  }, [facilityId, queryClient]);

  // Fetch review count
  const { data: reviewCount = 0 } = useQuery({
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

  const handleDismissProfilePrompt = (e: React.MouseEvent, missingFields: string[]) => {
    e.preventDefault();
    e.stopPropagation();
    if (facilityId) {
      const fieldsKey = missingFields.sort().join(",");
      localStorage.setItem(`profile-prompt-dismissed-${facilityId}`, fieldsKey);
      setProfilePromptDismissedFields(fieldsKey);
    }
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
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpi-strip", facilityId] });
    }, 60_000);
    return () => clearInterval(interval);
  }, [facilityId, queryClient]);

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "approved":
        return { 
          label: "Live", 
          icon: CheckCircle, 
          bgClass: "bg-success/10",
          textClass: "text-success",
          dotClass: "bg-success"
        };
      case "pending":
        return { 
          label: "Under Review", 
          icon: Clock, 
          bgClass: "bg-warning/10",
          textClass: "text-warning",
          dotClass: "bg-warning"
        };
      default:
        return { 
          label: "Not Listed", 
          icon: AlertCircle, 
          bgClass: "bg-muted",
          textClass: "text-muted-foreground",
          dotClass: "bg-muted-foreground"
        };
    }
  };

  const statusConfig = facility ? getStatusConfig(facility.status) : getStatusConfig("inactive");
  const StatusIcon = statusConfig.icon;

  // Note: urgent-leads counting moved to the server-side `urgentLeadsCount`
  // query above so the alert reflects ALL stale leads (not just the 4 most
  // recent loaded for the dashboard feed).

  return (
    <div className="min-h-full bg-background">
      {/* Post-onboarding welcome modal is mounted globally in
          ProviderShell (<WelcomeModal/>) — it self-gates on
          profiles.welcomed_at + onboarding_completed_at and is
          plan-aware (Free → "Upgrade to Pro" CTA, Pro → "Add Featured"
          CTA). The older ProviderWelcomeModal that used to render here
          was a duplicate-with-different-gate and is retired. */}

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">

        {/* Signup recovery banner — shown only when ProviderSignup
            redirected here with ?signup_facility_failed=1 AND the
            rollback edge function couldn't clean up automatically.
            Last-resort safety net so the user is never stuck on a
            half-completed account with no on-screen guidance. */}
        {showSignupRecovery && (
          <Card className="mb-4 border-rose-300 bg-rose-50 dark:bg-rose-950/30">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                  Your facility didn't save during signup
                </p>
                <p className="text-xs text-rose-800/80 dark:text-rose-200/80 mt-1">
                  Your account is set up but the facility details from the signup form weren't
                  saved. Add your facility now to start receiving leads. Our support team has
                  also been notified — they'll reach out within one business day if you'd
                  prefer help.
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Button asChild size="sm" variant="default" className="bg-rose-600 hover:bg-rose-700">
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

        {/* Main Grid Layout - No full-width sections */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 md:gap-5">
          
          {/* Left Column - Header & Main Content */}
          <div className="lg:col-span-8 space-y-3 sm:space-y-4 md:space-y-5">
            
            {/* Header Card */}
            <Card>
              <CardContent className="p-4 sm:p-5 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
                  <div className="space-y-1">
                    <p className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-wider">
                      {format(new Date(), "EEEE, MMM d")}
                    </p>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                      {userName ? `Welcome, ${userName}` : "Dashboard"}
                    </h1>
                    {facility && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{facility.name}</span>
                        {facility.status === "approved" && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-1.5 py-0.5 rounded">
                            <span className="h-1.5 w-1.5 rounded-full bg-success" />
                            Live
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2.5">
                    {/* Plan Badge */}
                    {proStatus.isPro ? (
                      <Link
                        to="/provider/billing"
                        className="group relative inline-flex items-center gap-1.5 pl-2.5 pr-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 text-white text-xs font-bold tracking-wide shadow-[0_2px_8px_-2px_rgba(245,158,11,0.4)] hover:shadow-[0_4px_12px_-2px_rgba(245,158,11,0.5)] transition-all overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="h-5 w-5 rounded-md bg-white/20 flex items-center justify-center">
                          <Sparkles className="h-3 w-3" />
                        </div>
                        <span className="relative">PRO</span>
                      </Link>
                    ) : (
                      <Link
                        to="/provider/billing"
                        className="group relative inline-flex items-center gap-2 pl-2.5 pr-3.5 py-2 rounded-xl border border-border/50 bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-xs font-semibold text-muted-foreground hover:text-primary"
                      >
                        <div className="h-5 w-5 rounded-md bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                          <Sparkles className="h-3 w-3 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                        </div>
                        <span>Free</span>
                        <ArrowRight className="h-3 w-3 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>


            {/* Primary KPI Strip */}
            {facilityId && (
              <DashboardKPIStrip
                facilityId={facilityId}
                isPro={proStatus.isPro}
                impressionCount={impressionCount}
                reviewCount={reviewCount}
                totalLeadsCount={totalLeadsCount}
              />
            )}

            {/* Lead Feed */}
            <DashboardLeadFeed
              leads={recentLeads}
              facilityName={facility?.name}
              isLoading={leadsLoading}
              onLeadClick={handleLeadClick}
            />

            {/* Missed Leads — Psychological Trigger */}
            {facilityId && (
              <DashboardMissedLeads facilityId={facilityId} isPro={proStatus.isPro} />
            )}

            {/* Lead Conversion Widget */}
            {facilityIds.length > 0 && (
              <LeadConversionWidget facilityIds={facilityIds} />
            )}

            {/* Facility Performance Panel (Pro-gated) */}
            <DashboardFacilityPerformancePanel isPro={proStatus.isPro} />

            {/* Placement Opportunities Panel */}
            <DashboardPlacementPanel facilityIds={facilityIds} isPro={proStatus.isPro} />

            {/* Multi-Facility Overview (Pro only) */}
            {proStatus?.isPro && facilities && facilities.length > 1 && (
              <ProMultiFacilityOverview facilities={facilities} />
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-4 space-y-3 sm:space-y-4">

            {/* Alerts */}
            <div className="space-y-2.5">
              {/* Inquiries Available */}
              {totalLeadsCount > 0 && (
                <Card className="border-success/30 bg-success/5">
                  <CardContent className="p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-success flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-white tabular-nums">{totalLeadsCount}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          <span className="tabular-nums">{totalLeadsCount}</span> Inquir{totalLeadsCount !== 1 ? 'ies' : 'y'}
                        </p>
                        <p className="text-xs text-muted-foreground">Tap to view full details</p>
                      </div>
                      <Button size="sm" className="h-9 sm:h-8 text-xs bg-success hover:bg-success/90" asChild>
                        <Link to="/provider/inquiries">
                          View
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Urgent Leads Alert — uses the server-side count so providers
                  with more than the 4 most-recent leads still see the real
                  number waiting 24h+. */}
              {urgentLeadsCount > 0 && (
                <Card className="border-l-2 border-l-warning">
                  <CardContent className="p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          <span className="tabular-nums">{urgentLeadsCount}</span> Need Follow-up
                        </p>
                        <p className="text-xs text-muted-foreground">Waiting 24h+</p>
                      </div>
                      <Button size="sm" className="h-9 sm:h-8 text-xs bg-warning hover:bg-warning/90 text-warning-foreground" asChild>
                        <Link to="/provider/inquiries?status=new">
                          <Phone className="h-3.5 w-3.5 mr-1" />
                          Call
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Profile Completion */}
              {providerData?.facility && (() => {
                const missingFields = computeMissingFields();
                if (missingFields.length === 0) return null;
                const currentFieldsKey = missingFields.join(",");
                if (profilePromptDismissedFields === currentFieldsKey) return null;
                
                return (
                  <Card className="border-dashed border-primary/30 bg-primary/5">
                    <CardContent className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <FileEdit className="h-4 w-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">Complete Profile</p>
                          <p className="text-xs text-muted-foreground">{missingFields.length} items missing</p>
                        </div>
                        <Button size="sm" className="h-9 sm:h-8 text-xs" asChild>
                          <Link to="/provider/listings">Add</Link>
                        </Button>
                        <button
                          onClick={(e) => handleDismissProfilePrompt(e, missingFields)}
                          className="p-1.5 hover:bg-muted/50 rounded text-muted-foreground touch-manipulation"
                          aria-label="Dismiss profile completion prompt"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Status Banner */}
              {facility?.status !== "approved" && (
                <Card className={cn("border-l-2", statusConfig.dotClass === 'bg-warning' ? "border-l-warning" : "border-l-muted-foreground")}>
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", statusConfig.bgClass)}>
                      <StatusIcon className={cn("h-4 w-4", statusConfig.textClass)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={cn("text-sm font-medium", statusConfig.textClass)}>{statusConfig.label}</span>
                      {facility?.status === "pending" && (
                        <p className="text-xs text-muted-foreground">Review: 24-48h</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Performance Feedback Loop */}
            {facilityId && <ProviderPerformanceFeedback facilityId={facilityId} />}

            {/* Pro Benefits Widget */}
            <ProBenefitsWidget />

            {/* Quick Actions */}
            <Card>
              <CardHeader className="p-3.5 pb-2.5 border-b">
                <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-2.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <Button variant="ghost" size="sm" className="justify-start h-8 text-xs px-2.5" asChild>
                    <Link to="/provider/listings">
                      <FileEdit className="h-3.5 w-3.5 mr-2" />
                      Listing
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start h-8 text-xs px-2.5" asChild>
                    <Link to="/provider/inquiries">
                      <Users className="h-3.5 w-3.5 mr-2" />
                      Inquiries
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start h-8 text-xs px-2.5" asChild>
                    <Link to="/provider/analytics">
                      <TrendingUp className="h-3.5 w-3.5 mr-2" />
                      Analytics
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start h-8 text-xs px-2.5" asChild>
                    <Link to="/provider/billing">
                      <CreditCard className="h-3.5 w-3.5 mr-2" />
                      Billing
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Featured Analytics Widget - if Pro */}
            {proStatus?.isPro && facility?.id && (
              <FeaturedAnalyticsWidget facilityId={facility.id} />
            )}
          </div>

          {/* Getting Started - No facility (spans both columns) */}
          {hasNoFacility && (
            <div className="lg:col-span-12">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-foreground">Complete your listing</p>
                        <p className="text-sm text-muted-foreground">Add facility info to start receiving leads</p>
                      </div>
                    </div>
                    <Button size="sm" className="h-9 text-sm" asChild>
                      <Link to="/provider/listings">
                        Get Started <ArrowRight className="h-4 w-4 ml-1.5" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Lead Detail Drawer */}
        <LeadDetailDrawer
          lead={selectedLead}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
        />
      </div>
    </div>
  );
}
