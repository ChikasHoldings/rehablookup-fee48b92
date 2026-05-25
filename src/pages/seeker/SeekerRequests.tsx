import { useState, useEffect, useCallback, useRef } from "react";
import { pluckNonNull } from "@/lib/nullableRows";
import { getFacilityPlaceholder } from "@/lib/facilityPlaceholder";
import { Link, useSearchParams } from "react-router-dom";

// Keep the localStorage "viewed leads" set bounded so it doesn't grow
// without limit across years of usage. 500 most-recent IDs is enough
// to cover any realistic Inbox window.
const MAX_VIEWED_LEAD_IDS = 500;
import { Helmet } from "react-helmet-async";
import {
  Send,
  Clock,
  Building2,
  MapPin,
  Plus,
  FileText,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  Filter,
  ShieldCheck,
  Bookmark,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AuthPrompt } from "@/components/seeker/AuthPrompt";
import { SeekerRequestForm } from "@/components/seeker/SeekerRequestForm";
import { useSeekerSession } from "@/hooks/useSeekerSession";
import { InquiryDetailModal } from "@/components/seeker/InquiryDetailModal";

interface SubmittedRequest {
  id: string;
  facility_id: string;
  facility_name: string;
  facility_slug: string | null;
  facility_city: string;
  facility_state: string;
  facility_logo_url: string | null;
  created_at: string;
  status: string;
  urgency: string | null;
  preferred_contact: string;
  provider_responded_at: string | null;
  provider_response_status: string | null;
}

interface RequestFacilityRow {
  id: string;
  name: string | null;
  slug: string | null;
  city: string | null;
  state: string | null;
  logo_url: string | null;
}

type FilterTab = "all" | "pending" | "responded";

function RequestCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden animate-pulse">
      <div className="p-4 flex gap-4">
        <div className="h-12 w-12 rounded-lg bg-muted shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-3/4 bg-muted rounded" />
          <div className="h-4 w-1/2 bg-muted rounded" />
          <div className="h-4 w-1/3 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}

function getStatusBadge(status: string) {
  switch (status) {
    case "new":
      return <Badge className="bg-primary/10 text-primary border-0 text-xs">Pending Review</Badge>;
    case "contacted":
      return <Badge className="bg-success/10 text-success border-0 text-xs">Facility Responded</Badge>;
    case "in_progress":
      return <Badge className="bg-warning/10 text-warning border-0 text-xs">In Progress</Badge>;
    case "scheduled":
      return <Badge className="bg-accent/10 text-accent-foreground border-0 text-xs">Scheduled</Badge>;
    case "admitted":
      return <Badge className="bg-success/10 text-success border-0 text-xs">Admitted</Badge>;
    case "closed":
      return <Badge className="bg-muted text-muted-foreground border-0 text-xs">Closed</Badge>;
    case "expired":
      return <Badge className="bg-muted text-muted-foreground/70 border-0 text-xs">Expired</Badge>;
    default:
      return <Badge variant="secondary" className="text-xs">Submitted</Badge>;
  }
}

function getUrgencyLabel(urgency: string | null) {
  switch (urgency) {
    case "immediate": return "Urgent";
    case "within-week": return "Within a week";
    case "flexible": return "Flexible";
    default: return null;
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
  if (diffDays < 7) return `${Math.floor(diffDays)}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatFullDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function RequestCard({ request, onClick, isNew }: { request: SubmittedRequest; onClick: () => void; isNew: boolean }) {
  const [logoError, setLogoError] = useState(false);
  const hasLogo = request.facility_logo_url && !logoError;
  const hasProviderResponse = !!request.provider_responded_at || request.provider_response_status === "responded";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full text-left rounded-xl border bg-card shadow-sm hover:shadow-md hover:border-primary/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isNew ? "border-primary/40 ring-1 ring-primary/20" : "border-border"
      }`}
    >
      <div className="p-4 flex gap-3 sm:gap-4">
        {/* Unread dot */}
        <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-lg overflow-hidden bg-muted shrink-0">
          {hasLogo ? (
            <img
              src={request.facility_logo_url!}
              alt={`${request.facility_name} logo`}
              className="h-full w-full object-contain p-1 bg-white"
              onError={() => setLogoError(true)}
            />
          ) : (
            <img
              src={getFacilityPlaceholder({ id: request.facility_id })}
              alt={`${request.facility_name} placeholder`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          )}
          {isNew && (
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              <span className={`font-semibold line-clamp-1 group-hover:text-primary transition-colors ${isNew ? "text-foreground" : "text-foreground"}`}>
                {request.facility_name}
              </span>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="line-clamp-1">{request.facility_city}, {request.facility_state}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {getStatusBadge(request.status)}
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1 tabular-nums" title={formatFullDate(request.created_at)}>
              <Clock className="h-3 w-3" />
              {formatDate(request.created_at)}
            </span>
            {request.urgency && (
              <Badge variant="outline" className="text-xs py-0">{getUrgencyLabel(request.urgency)}</Badge>
            )}
            {hasProviderResponse && (
              <Badge className="bg-success/10 text-success border-0 text-xs gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" />
                Response Available
              </Badge>
            )}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary shrink-0 self-center transition-colors" />
      </div>
    </button>
  );
}

export default function SeekerRequests() {
  const { email, userId, isAuthenticated, isReady } = useSeekerSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const hydratedRef = useRef(false);

  const [requests, setRequests] = useState<SubmittedRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Distinguish "fetch error" from "no requests yet" so we don't show
  // the empty-state encouragement when the API actually failed.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<{
    id: string;
    name: string;
    city?: string;
    state?: string;
  } | null>(null);
  const [viewedLeadIds, setViewedLeadIds] = useState<Set<string>>(new Set());
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  // Counts of the OTHER inquiry types so this inbox can surface links to
  // /account/concierge and /account/international when the seeker has work
  // in those flows. The leads list above stays the primary feed.
  const [conciergeCount, setConciergeCount] = useState<number>(0);
  // International placement product retired 2026-05-20.
  const [vobCount, setVobCount] = useState<number>(0);
  const [savedSearchCount, setSavedSearchCount] = useState<number>(0);
  const { toast } = useToast();

  // Load viewed lead IDs from localStorage
  useEffect(() => {
    if (!userId) return;
    try {
      const stored = localStorage.getItem(`seeker_viewed_leads_${userId}`);
      if (stored) setViewedLeadIds(new Set(JSON.parse(stored)));
    } catch {
      // ignore
    }
  }, [userId]);

  // Mark a lead as viewed. Cap the set size so localStorage doesn't
  // grow without bound — keep the MAX_VIEWED_LEAD_IDS most-recently
  // added IDs.
  const markLeadViewed = useCallback((leadId: string) => {
    setViewedLeadIds(prev => {
      if (prev.has(leadId)) return prev;
      const arr = [leadId, ...prev];
      const trimmed = arr.length > MAX_VIEWED_LEAD_IDS ? arr.slice(0, MAX_VIEWED_LEAD_IDS) : arr;
      const next = new Set(trimmed);
      if (userId) {
        try {
          localStorage.setItem(`seeker_viewed_leads_${userId}`, JSON.stringify(trimmed));
        } catch {
          // Storage quota — non-fatal, the in-memory set still works
          // for this session.
        }
      }
      return next;
    });
  }, [userId]);

  // URL state for filterTab (?tab=pending|responded|all) — loop-guarded
  // sync so bookmarks restore the user's view and back/forward through
  // the inbox preserves the tab.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const t = searchParams.get("tab");
    if (t === "pending" || t === "responded" || t === "all") {
      setFilterTab(t as FilterTab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const next = new URLSearchParams(searchParams);
    if (filterTab !== "all") next.set("tab", filterTab);
    else next.delete("tab");
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [filterTab, searchParams, setSearchParams]);

  // Check if coming from a facility page with prefill. Clears the
  // search params after consuming so the dialog doesn't keep re-
  // opening on refresh / back navigation.
  useEffect(() => {
    const facilityId = searchParams.get("facilityId");
    const facilityName = searchParams.get("facilityName");
    if (facilityId && facilityName) {
      setSelectedFacility({
        id: facilityId,
        name: decodeURIComponent(facilityName),
        city: searchParams.get("facilityCity") || undefined,
        state: searchParams.get("facilityState") || undefined,
      });
      setShowNewRequest(true);
      // Drain the prefill params from the URL so a refresh after
      // submission doesn't pop the dialog open again.
      const drained = new URLSearchParams(searchParams);
      drained.delete("facilityId");
      drained.delete("facilityName");
      drained.delete("facilityCity");
      drained.delete("facilityState");
      setSearchParams(drained, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const fetchRequests = useCallback(async (userEmail: string): Promise<SubmittedRequest[]> => {
    const normalizedEmail = userEmail.trim().toLowerCase();
    if (!normalizedEmail) return [];

    try {
      const { data: leadsData, error: leadsError } = await supabase.rpc("get_seeker_submitted_leads");
      if (leadsError) throw leadsError;
      setLoadError(null);
      if (!leadsData || leadsData.length === 0) return [];

      const facilityIds = Array.from(new Set(pluckNonNull(leadsData as { facility_id: string | null }[], "facility_id")));
      let facilitiesMap: Record<string, RequestFacilityRow> = {};

      if (facilityIds.length > 0) {
        // Surface facility-fetch errors too — without this, the names
        // silently fall back to "Treatment Center" if the join fails.
        const { data: facilitiesData, error: facErr } = await supabase
          .from("facilities")
          .select("id, name, slug, city, state, logo_url")
          .in("id", facilityIds);
        if (facErr) {
          console.warn("[SeekerRequests] facility join failed:", facErr.message);
        }
        if (facilitiesData) {
          facilitiesMap = facilitiesData.reduce((acc, f) => { acc[f.id] = f; return acc; }, {} as Record<string, RequestFacilityRow>);
        }
      }

      return leadsData.map((req: {
        id: string;
        facility_id: string | null;
        created_at: string;
        status: string;
        urgency: string | null;
        preferred_contact: string;
        provider_responded_at: string | null;
        provider_response_status: string | null;
        [k: string]: unknown;
      }) => {
        const facility = req.facility_id ? facilitiesMap[req.facility_id] : null;
        return {
          id: req.id,
          facility_id: req.facility_id || "",
          facility_name: facility?.name || "Treatment Center",
          facility_slug: facility?.slug || null,
          facility_city: facility?.city || "",
          facility_state: facility?.state || "",
          facility_logo_url: facility?.logo_url || null,
          created_at: req.created_at,
          status: req.status,
          urgency: req.urgency,
          preferred_contact: req.preferred_contact,
          provider_responded_at: req.provider_responded_at,
          provider_response_status: req.provider_response_status,
        };
      });
    } catch (error) {
      console.error("Error fetching requests:", error);
      const msg = error instanceof Error ? error.message : "Could not load your inquiries. Please try again.";
      setLoadError(msg);
      toast({ title: "Error loading inbox", description: msg, variant: "destructive" });
      return [];
    }
  }, [toast]);

  // Initial load
  useEffect(() => {
    let isCancelled = false;

    const syncRequests = async () => {
      if (!isReady) return;
      setRequests([]);

      if (!isAuthenticated || !email || !userId) {
        if (!isCancelled) setIsLoading(false);
        return;
      }

      if (!isCancelled) {
        setIsLoading(true);
      }

      const nextRequests = await fetchRequests(email);
      if (!isCancelled) {
        setRequests(nextRequests);
        setIsLoading(false);
      }
    };

    void syncRequests();
    return () => { isCancelled = true; };
  }, [isAuthenticated, isReady, email, userId, fetchRequests]);

  // Fetch the user's concierge + VOB + saved-search counts so we can
  // render cross-link cards at the top of the inbox. RLS on each table
  // gates by user_id (set by link-inquiry-to-user on signup).
  //
  // Failures are console.warn'd rather than toasted — the cross-link
  // strip is a nice-to-have, not critical. A failure should not be
  // mistaken for "you have 0 of these" though, so the card for any
  // failing source is suppressed (the count stays 0 + warn).
  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setConciergeCount(0);
      setVobCount(0);
      setSavedSearchCount(0);
      return;
    }
    let cancelled = false;
    (async () => {
      // International placement product retired 2026-05-20 — only
      // domestic concierge, VOB requests, and saved searches remain.
      const [conc, vob, saved] = await Promise.all([
        supabase
          .from("concierge_inquiries")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .not("status", "in", "(closed,completed)"),
        supabase
          .from("insurance_verification_requests")
          .select("id", { count: "exact", head: true })
          .eq("linked_user_id", userId),
        supabase
          .from("saved_searches")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
      ]);
      if (cancelled) return;
      if (conc.error) console.warn("[SeekerRequests] concierge count failed:", conc.error.message);
      if (vob.error) console.warn("[SeekerRequests] VOB count failed:", vob.error.message);
      if (saved.error) console.warn("[SeekerRequests] saved-search count failed:", saved.error.message);
      setConciergeCount(conc.error ? 0 : (conc.count ?? 0));
      setVobCount(vob.error ? 0 : (vob.count ?? 0));
      setSavedSearchCount(saved.error ? 0 : (saved.count ?? 0));
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, userId]);

  // Realtime subscription for the seeker's own leads.
  //
  // Filtered server-side by email so we don't waste channel cycles on
  // other users' lead updates (the `leads` SELECT RLS would deny
  // delivery anyway via `email = auth.jwt()->>'email'`, but an
  // explicit filter is faster and clearer about intent).
  //
  // Listens to event:"*" so INSERT (a new submission from another
  // tab/device) and DELETE (admin clean-up) also invalidate the
  // local list, not just status UPDATE.
  useEffect(() => {
    if (!email) return;
    const normalizedEmail = email.trim().toLowerCase();

    const channel = supabase
      .channel(`seeker-inbox-${normalizedEmail}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leads",
          filter: `email=eq.${normalizedEmail}`,
        },
        () => {
          fetchRequests(email).then(setRequests);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [email, fetchRequests]);

  const handleRefresh = async () => {
    if (!email || isRefreshing) return;
    setIsRefreshing(true);
    const nextRequests = await fetchRequests(email);
    setRequests(nextRequests);
    setIsRefreshing(false);
  };

  // (Previously `loadSavedData` / `savedData` machinery existed here
  // to thread a SavedRequestData prop into SeekerRequestForm. The
  // form's underlying LeadIntakeForm now handles its own prefill from
  // seeker_profile + a non-PII localStorage cache, so this state was
  // dead — only writing to localStorage on submit, never read.
  // Removed in the 2026-05-20 hardening pass.)

  const handleRequestSuccess = async () => {
    setShowNewRequest(false);
    setSelectedFacility(null);
    if (!email) { setRequests([]); return; }
    setIsLoading(true);
    const nextRequests = await fetchRequests(email);
    setRequests(nextRequests);
    setIsLoading(false);
  };

  const handleOpenDetail = (leadId: string) => {
    setSelectedLeadId(leadId);
    markLeadViewed(leadId);
  };

  // Filter requests
  const filteredRequests = requests.filter(req => {
    if (filterTab === "pending") return req.status === "new";
    if (filterTab === "responded") return req.status !== "new";
    return true;
  });

  // Counts for tabs
  const pendingCount = requests.filter(r => r.status === "new").length;
  const respondedCount = requests.filter(r => r.status !== "new").length;
  const unviewedCount = requests.filter(r => !viewedLeadIds.has(r.id) && (r.provider_responded_at || r.provider_response_status === "responded")).length;

  if (isReady && !isAuthenticated) {
    return (
      <AuthPrompt
        title="Sign in to view your inbox"
        description="Create a free account to send and track requests to treatment centers."
        icon="send"
        returnTo="/account/requests"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Send className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold">Inbox</h1>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => <RequestCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Inbox | RehabLookup</title>
        <meta name="description" content="Track and manage your treatment center inquiries." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
              <Send className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-display font-bold">Inbox</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Track inquiries & responses</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unviewedCount > 0 && (
              <Badge className="bg-primary text-primary-foreground text-xs">
                {unviewedCount} new
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh inbox"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Cross-link cards: surface the seeker's open concierge + international
            + insurance-verification + saved-search work so this page acts as a
            true inbox. */}
        {(conciergeCount > 0 || vobCount > 0 || savedSearchCount > 0) && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-4">
            {conciergeCount > 0 && (
              <Link to="/account/concierge" className="block">
                <Card className="hover:border-primary/40 transition-colors">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">Concierge placement</p>
                      <p className="text-xs text-muted-foreground">
                        {conciergeCount} active case{conciergeCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            )}
            {/* International placement card retired 2026-05-20 with the paid product. */}
            {vobCount > 0 && (
              <Link to="/account/insurance-verifications" className="block">
                <Card className="hover:border-primary/40 transition-colors">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-5 w-5 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">Insurance verifications</p>
                      <p className="text-xs text-muted-foreground">
                        {vobCount} request{vobCount === 1 ? "" : "s"} on file
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            )}
            {savedSearchCount > 0 && (
              <Link to="/account/saved-searches" className="block">
                <Card className="hover:border-primary/40 transition-colors">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <Bookmark className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">Saved searches</p>
                      <p className="text-xs text-muted-foreground">
                        {savedSearchCount} pinned filter{savedSearchCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        )}

        {loadError && requests.length === 0 ? (
          <Card className="border-destructive/40 bg-destructive/5" role="alert">
            <CardContent className="p-6 flex items-start gap-3">
              <FileText className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-destructive mb-1">Couldn't load your inbox</h3>
                <p className="text-xs text-muted-foreground break-words">{loadError}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : requests.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <div className="p-3 rounded-full bg-muted w-fit mx-auto mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">No Inquiries Yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                Browse treatment centers and send an inquiry to get started. You'll see responses here.
              </p>
              <Button asChild>
                <Link to="/account/search" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Browse Treatment Centers
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Filter tabs */}
            <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as FilterTab)}>
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-9">
                <TabsTrigger value="all" className="text-xs sm:text-sm gap-1">
                  All
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">{requests.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-xs sm:text-sm gap-1">
                  <Clock className="h-3 w-3" />
                  Pending
                  {pendingCount > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">{pendingCount}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="responded" className="text-xs sm:text-sm gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Responded
                  {respondedCount > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">{respondedCount}</Badge>}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Quick action */}
            <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm sm:text-base">Need to contact another facility?</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Your information will be prefilled.</p>
                </div>
                <Button asChild size="sm" className="shrink-0">
                  <Link to="/account/search" className="gap-2">
                    <Plus className="h-4 w-4" />
                    New
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Request cards */}
            {filteredRequests.length === 0 ? (
              <div className="text-center py-8">
                <Filter className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No {filterTab === "pending" ? "pending" : "responded"} inquiries
                </p>
              </div>
            ) : (
              filteredRequests.map((request) => {
                const hasResponse = !!request.provider_responded_at || request.provider_response_status === "responded";
                const isNew = hasResponse && !viewedLeadIds.has(request.id);
                return (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onClick={() => handleOpenDetail(request.id)}
                    isNew={isNew}
                  />
                );
              })
            )}
          </div>
        )}

        {/* Inquiry Detail Modal */}
        {selectedLeadId && email && (
          <InquiryDetailModal
            open={!!selectedLeadId}
            onOpenChange={(open) => { if (!open) setSelectedLeadId(null); }}
            leadId={selectedLeadId}
            userEmail={email}
          />
        )}

        {/* New Request Dialog */}
        <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
          <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="sr-only">Send Request</DialogTitle>
              <DialogDescription className="sr-only">Send an inquiry to a treatment facility</DialogDescription>
            </DialogHeader>
            {selectedFacility ? (
              <SeekerRequestForm
                facilityId={selectedFacility.id}
                facilityName={selectedFacility.name}
                facilityCity={selectedFacility.city}
                facilityState={selectedFacility.state}
                onSuccess={handleRequestSuccess}
                onCancel={() => { setShowNewRequest(false); setSelectedFacility(null); }}
              />
            ) : (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Select a facility to send a request</p>
                <Button asChild>
                  <Link to="/account/search">Browse Facilities</Link>
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
