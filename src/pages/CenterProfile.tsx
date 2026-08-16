import { useParams, Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import CenterNotFound from "@/pages/CenterNotFound";
import { getFacilityPlaceholder } from "@/lib/facilityPlaceholder";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { StickyMobileCallBar } from "@/components/profile/StickyMobileCallBar";
import { SEO, generateLocalBusinessSchema } from "@/components/SEO";
import { normalizeSlug, resolveFacilitySlug, slugifyName } from "@/lib/slugUtils";
import { RelatedLinksSection } from "@/components/seo/RelatedLinksSection";
import { buildProfileRelatedLinks } from "@/lib/profileRelatedLinks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { RequestInfoModal } from "@/components/profile/RequestInfoModal";
import { useFacilityRating } from "@/hooks/useFacilityRating";
import { useFavorites } from "@/hooks/useFavorites";
import {
  MapPin,
  Phone,
  Globe,
  Crown,
  Shield,
  ArrowLeft,
  Clock,
  Users,
  Heart,
  Stethoscope,
  Building2,
  ExternalLink,
  Image as ImageIcon,
  MessageSquare,
  Flag,
  Bed,
  Mail,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  GlobeIcon,
} from "lucide-react";
import { CenterProfileSkeleton } from "@/components/skeletons/CenterProfileSkeleton";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReportImageDialog } from "@/components/profile/ReportImageDialog";
import { FacilityReviewsSection } from "@/components/reviews/FacilityReviewsSection";
import { cn } from "@/lib/utils";
import { formatPhoneNumber, getPhoneDigits } from "@/lib/phoneUtils";
import { useProviderEventTracking } from "@/hooks/useProviderEventTracking";
import { gaFacilityView, gaFacilityContact } from "@/lib/ga";
import { FacilityStaffSection } from "@/components/facility/FacilityStaffSection";
import { RichProfileSections } from "@/components/facility/RichProfileSections";
import { FacilityProfileExtras } from "@/components/facility/FacilityProfileExtras";
import { FacilityPhotoGallery } from "@/components/facility/FacilityPhotoGallery";
import { LandingFeaturedSection } from "@/components/featured/LandingFeaturedSection";
import { PageFAQ } from "@/components/seo/PageFAQ";
import { buildProfileFAQs } from "@/lib/buildProfileFAQs";
import { ProfileDirectoryCTACard } from "@/components/profile/ProfileDirectoryCTACard";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { loadFacilityBySlug } from "@/hooks/useFacilityBySlug";
import { loadFacilityDetails } from "@/hooks/useFacilityDetails";
// Premium facility-profile augmentation components (Phase 3 v2). The
// existing CenterProfile already derives services/insurance/ageGroups
// inside its queryFn via a Promise.all batched fetch — these components
// consume those derived arrays directly, so there's no second round-trip.
// RelatedNearby manages its own batched lookup (via useFacilityChildData)
// for the 3 sibling cards it renders.
import { QuickFactsStrip } from "@/components/facility-profile/QuickFactsStrip";
import { LevelsOfCareTiles } from "@/components/facility-profile/LevelsOfCareTiles";
import { TherapyApproachesGrid } from "@/components/facility-profile/TherapyApproachesGrid";
import { InsuranceShowcase } from "@/components/facility-profile/InsuranceShowcase";
import { AccreditationsPanel } from "@/components/facility-profile/AccreditationsPanel";
import { RelatedNearby } from "@/components/facility-profile/RelatedNearby";
import { InlineMiniSearch } from "@/components/seo/InlineMiniSearch";

interface FacilityData {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  zip_code: string;
  address: string;
  phone: string;
  email: string | null;
  website: string | null;
  description: string | null;
  facility_type: string;
  gender_served: string | null;
  bed_count: string | null;
  featured: boolean;
  verified: boolean | null;
  year_established: number | null;
  logo_url: string | null;
  gallery_urls: string[] | null;
  status: string;
  user_id: string | null;
  updated_at: string;
  concierge_network_opted_in: boolean | null;
  accepts_international_patients: boolean | null;
  // Verified-contact gate: when has_facility_verified_contact is true
  // the page prefers verified_phone over phone for the Call CTA.
  has_facility_verified_contact?: boolean | null;
  verified_phone?: string | null;
  facility_services: { service_name: string }[];
  facility_insurance: { insurance_name: string }[];
  facility_age_groups: { age_group: string }[];
  facility_credentials: { accreditations: string | null; licensing_info: string | null }[];
  facility_accreditations: { accreditation_type: string; verified: boolean }[];
  // Extended profile fields (provider-enriched listings).
  hours_of_operation?: string | null;
  languages_spoken?: string[] | null;
  accessibility_features?: string[] | null;
  accepting_admissions?: boolean | null;
  // Optional claim-state flags. Populated when the row comes from the
  // public_facilities fallback path (slug not present in the static
  // snapshot, e.g. SAMHSA-imported listings). When set, the supplemental
  // claim-flags useEffect short-circuits to avoid a duplicate fetch.
  is_claimed?: boolean;
  is_pro?: boolean;
  is_premium_visible?: boolean;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getYearsInBusiness(yearEstablished: number | null): number | null {
  if (!yearEstablished) return null;
  return new Date().getFullYear() - yearEstablished;
}

// Quick Fact Card Component
function QuickFactCard({ 
  icon: Icon, 
  label, 
  value, 
  iconColor = "text-primary",
  bgColor = "bg-primary/10"
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string;
  iconColor?: string;
  bgColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/40 hover:border-border/60 transition-all">
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg shrink-0", bgColor)}>
        <Icon className={cn("h-4 w-4", iconColor)} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

// Section Container Component — premium flowing layout
function ProfileSection({ 
  icon: Icon, 
  title, 
  iconColor = "bg-primary/10 text-primary",
  children,
  className,
  action
}: { 
  icon: React.ElementType; 
  title: string;
  iconColor?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("", className)}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/80">
            <Icon className={cn("h-4 w-4", iconColor.split(' ')[1] || 'text-primary')} />
          </div>
          <h2 className="font-display text-lg font-bold tracking-tight text-foreground">{title}</h2>
        </div>
        {action}
      </div>
      <div>{children}</div>
    </div>
  );
}

// Truncated Description with expand/collapse
const DESCRIPTION_CHAR_LIMIT = 400;

function TruncatedDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = text.length > DESCRIPTION_CHAR_LIMIT;

  const displayText = !expanded && needsTruncation
    ? text.slice(0, DESCRIPTION_CHAR_LIMIT).trimEnd() + "…"
    : text;

  return (
    <div>
      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
        {displayText}
      </p>
      {needsTruncation && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {expanded ? (
            <>Show Less <ChevronUp className="h-4 w-4" /></>
          ) : (
            <>Read More <ChevronDown className="h-4 w-4" /></>
          )}
        </button>
      )}
    </div>
  );
}


const CenterProfile = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const contactFormRef = useRef<HTMLDivElement>(null);
  const [showAllInsurance, setShowAllInsurance] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [logoError, setLogoError] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  // Anon and authed visitors can save a facility from the public profile.
  // Guest favorites are kept in localStorage and migrated to user_favorites
  // on signin via the useFavorites hook.
  const { isFavorite, toggleFavorite } = useFavorites();
  const [reportImageOpen, setReportImageOpen] = useState(false);
  const [reportImageUrl, setReportImageUrl] = useState<string>("");
  const [reportImageType, setReportImageType] = useState<"logo" | "gallery">("gallery");
  const { trackProfileView, trackClickToCall, trackWebsiteClick } = useProviderEventTracking();
  
  const fromSearch = location.state?.fromSearch;
  const openModalFromNav = location.state?.openRequestModal;
  const prefillDataFromNav = location.state?.prefillData;

  // Slug format gate: a valid center slug is lowercase, hyphen-separated,
  // alphanumerics only, between 3 and 200 chars. Anything else (UUIDs,
  // empty segments, query-style noise, path traversal, etc.) is treated
  // as an invalid route and redirected to the directory rather than
  // attempting a DB lookup that will always miss.
  // Consecutive hyphens are allowed because the persisted-slug generator
  // emits "company-name-inc--city-state-hash" for facilities whose legal
  // name ends in punctuation (INC., LLC,, MMRS )). 537 of 3,803 approved
  // rows have this shape — see the matching note on normalizeSlug.
  const SLUG_FORMAT = /^[a-z0-9]+(?:-+[a-z0-9]+)*$/;

  // Runtime route validation:
  //   1. Decode any percent-encoded segment (so `/center/Foo%20Bar` becomes
  //      `Foo Bar` and can be normalized).
  //   2. Run through `normalizeSlug` — trims whitespace, lowercases,
  //      collapses internal whitespace runs into single hyphens, strips
  //      leading/trailing hyphens. (Does NOT collapse `--`, see slugUtils.)
  //   3. If the normalized form differs from the raw param AND is valid,
  //      we redirect (replace) to the canonical lowercase URL. This covers
  //      mixed-case and whitespace differences; double-hyphens flow through.
  //   4. If even the normalized form fails `SLUG_FORMAT`, the slug
  //      contains illegal characters (punctuation, unicode, traversal
  //      attempts, etc.) and we fall through to the CenterNotFound
  //      "invalid" branch below.
  let decodedSlug = slug ?? "";
  try {
    decodedSlug = slug ? decodeURIComponent(slug) : "";
  } catch {
    // Malformed percent-encoding — treat as invalid.
    decodedSlug = slug ?? "";
  }
  const normalisedSlug = normalizeSlug(decodedSlug);
  const isSlugFormatValid =
    !!normalisedSlug &&
    normalisedSlug.length >= 3 &&
    normalisedSlug.length <= 200 &&
    SLUG_FORMAT.test(normalisedSlug);
  const slugNeedsCanonicalRedirect =
    !!slug && isSlugFormatValid && slug !== normalisedSlug;

  // Reset gallery state when slug changes.
  useEffect(() => {
    setActiveGalleryIndex(0);
    setLogoError(false);
  }, [slug]);
  
  useEffect(() => {
    if (openModalFromNav) {
      setRequestModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [openModalFromNav]);

  // Deep-link support for static prerendered CTAs (e.g. /center/<slug>?action=request-info).
  // The static HTML mirrors served to bots / no-JS users link here so JS-enabled
  // visitors immediately land on the Request Info form. We strip the query param
  // after handling so the canonical URL stays clean for analytics + sharing.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("action") === "request-info") {
      setRequestModalOpen(true);
      params.delete("action");
      const cleanSearch = params.toString();
      const cleanUrl = location.pathname + (cleanSearch ? `?${cleanSearch}` : "");
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setCurrentUserId(session?.user?.id ?? null);
      })
      .catch((err) => {
        // Session lookup failure → treat as logged-out. Don't break
        // the page render; the public profile works fine without it.
        console.error("[CenterProfile] getSession failed:", err);
        setCurrentUserId(null);
      });
  }, []);

  useEffect(() => {
    if (!slug) return;
    if (!currentUserId) return;

    const facilityChannel = supabase
      .channel(`center-profile-${slug}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "facilities",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["facility", slug] });
        }
      )
      .subscribe();

    const servicesChannel = supabase
      .channel(`center-profile-services-${slug}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "facility_services",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["facility", slug] });
        }
      )
      .subscribe();

    const insuranceChannel = supabase
      .channel(`center-profile-insurance-${slug}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "facility_insurance",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["facility", slug] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(facilityChannel);
      supabase.removeChannel(servicesChannel);
      supabase.removeChannel(insuranceChannel);
    };
  }, [slug, queryClient, currentUserId]);

  const { data: facility, isLoading, isFetching, isFetched, error } = useQuery({
    queryKey: ["facility", slug],
    queryFn: async (): Promise<FacilityData | null> => {
      // PUBLIC profile route — load from the public_facilities view via the
      // shared loader. This must NEVER append a user_id filter, otherwise
      // logged-in visitors who don't own this facility (admins, seekers,
      // providers viewing other listings) see "Center Unavailable" for
      // every unclaimed SAMHSA listing. PII fields the owner needs (email,
      // claim_status, etc.) are fetched in a separate hook used only by
      // the owner-edit dashboard.
      const loaded = await loadFacilityBySlug(slug!);
      const base = loaded.facility;
      if (!base) return null;

      // Joined detail tables (anon-readable) — shared loader so both
      // /center/[slug] and /account/facility/[id] stay in sync if the
      // column lists ever change.
      const facilityId = base.id as string;
      const joins = await loadFacilityDetails(facilityId);

      return {
        ...base,
        // PII fields not exposed on the public view stay null on the public
        // profile route; the owner-edit hook surfaces them separately when
        // the viewer is the owner.
        email: null,
        user_id: null,
        concierge_network_opted_in: null,
        accepts_international_patients: base.accepts_international_patients ?? null,
        ...joins,
        is_claimed: loaded.flags?.is_claimed,
        is_pro: loaded.flags?.is_pro,
        is_premium_visible: loaded.flags?.is_premium_visible,
      } as FacilityData;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Route the "Claim This Listing" affordances through the unified
  // onboarding wizard at /provider/onboarding so seekers see one
  // consistent entry path. The wizard reads ?intent=claim&facility_id=
  // and pre-seeds selected_facility_id once the user finishes account
  // creation. Signed-in providers land in the wizard at their current
  // resume step; the wizard's claim-seed is still applied. Signed-out
  // visitors are bounced to /auth/signup by the wizard if they haven't
  // started yet — no separate detour needed here.
  const handleClaimClick = useCallback(() => {
    if (!facility?.id) return;
    const search = new URLSearchParams({
      intent: "claim",
      facility_id: facility.id,
    }).toString();
    navigate(`/provider/onboarding?${search}`);
  }, [facility?.id, navigate]);

  // Claim-state flags are now sourced directly from the shared loader's
  // result (baked into `facility` by the queryFn above). When the flags
  // haven't loaded yet — e.g. the rare case where the facility loaded via
  // an owner-only read and no public_facilities row exists — `claimFlags`
  // stays null and the unclaimed banner stays hidden.
  const claimFlags = useMemo<
    | { is_claimed: boolean; is_pro: boolean; is_premium_visible: boolean }
    | null
  >(() => {
    if (!facility || facility.is_claimed === undefined) return null;
    return {
      is_claimed: !!facility.is_claimed,
      is_pro: !!facility.is_pro,
      is_premium_visible: !!facility.is_premium_visible,
    };
  }, [facility]);

  // Does the signed-in viewer own this facility? Drives the "Manage this
  // listing" affordance for owners (owned facilities no longer show the
  // claim CTA — is_claimed keys off user_id since the 2026-07-03 fix).
  // RLS lets only the owner see their own facilities row, so this is a
  // safe, cheap existence check; anonymous viewers short-circuit to false.
  const { data: viewerOwnsFacility } = useQuery({
    queryKey: ["viewer-owns-facility", facility?.id],
    enabled: !!facility?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<boolean> => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid || !facility?.id) return false;
      const { data } = await supabase
        .from("facilities")
        .select("id")
        .eq("id", facility.id)
        .eq("user_id", uid)
        .maybeSingle();
      return !!data;
    },
  });

  const { data: hasFeaturedSubscription } = useQuery({
    queryKey: ["featured-subscription-check", facility?.id],
    queryFn: async (): Promise<boolean> => {
      if (!facility?.id) return false;
      const { data } = await supabase.functions.invoke("get-featured-facilities");
      // Check Pro subscription status
      const proIds: string[] = data?.proFacilityIds || [];
      return proIds.includes(facility.id);
    },
    enabled: !!facility?.id,
    staleTime: 1000 * 60 * 5,
  });

  // Pro plan is derived directly from the public_facilities view's `is_pro`
  // flag (= has_active_pro), which is loaded with the facility above and is
  // visible to ANONYMOUS visitors. The previous get-facility-plan edge call
  // required verify_jwt, so anonymous seekers — the majority of public-profile
  // traffic — always resolved to "free", silently defeating the Pro lead-modal
  // benefits (competitor hiding, uncapped leads, Pro badge). Deriving from
  // is_pro fixes it for everyone, removes a JWT-gated round-trip on a public
  // page, and honours the past_due grace period that get-facility-plan missed.
  const facilityPlan = facility?.is_pro ? "pro" : "free";

  // Fetch facility rating for badge display
  const ratingData = useFacilityRating(facility?.id);

  // Nearby/related facilities are now fetched by <RelatedNearby /> via a
  // single batched query against public_facilities + useFacilityChildData.
  // The previous snapshot-based loader pulled the full directory JSON
  // (~3MB on first visit) just to filter to 6 sibling cards — replaced
  // with a 3-row PostgREST lookup that hits the same view the rest of
  // the page already trusts.

  useEffect(() => {
    if (facility?.id) {
      // Track profile view in provider_events (admin dashboard source of
      // truth — feeds /admin/analytics provider performance KPIs).
      trackProfileView(facility.id);
      // ALSO fire a GA4 facility_view custom event with the structured
      // dimensions GA reports need to slice traffic by facility / state /
      // type. Registered as Custom Dimensions in GA4 → Admin → Custom
      // definitions: facility_id, facility_state, facility_type,
      // facility_slug. The generic page_view fired by RouteChangeTracker
      // already records the visit; this event adds the facility identity
      // so reports can answer "how many sessions hit /center/<this-id>?".
      gaFacilityView({
        facility_id: facility.id,
        facility_slug: facility.slug,
        facility_name: facility.name,
        facility_state: facility.state,
        facility_city: facility.city,
        facility_type: facility.facility_type ?? null,
        surface: "public",
      });
    }
  }, [facility?.id, facility?.slug, facility?.name, facility?.state, facility?.city, facility?.facility_type, trackProfileView]);

  const scrollToContact = () => {
    contactFormRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const trackInteraction = useCallback((type: "call" | "website" | "directions") => {
    if (!facility?.id) return;
    // Track in provider_events (single source of truth for billing/scoring).
    if (type === "call") {
      trackClickToCall(facility.id, "profile");
    } else if (type === "website") {
      trackWebsiteClick(facility.id, "profile");
    }
    // ALSO fire GA4 facility_contact for every method, including
    // "directions" (provider_events has no directions table since the
    // click doesn't transfer PII, but GA reports still benefit from the
    // engagement signal). One event per method so funnel reports work.
    gaFacilityContact({
      facility_id: facility.id,
      method: type,
      facility_slug: facility.slug,
      facility_state: facility.state,
    });
  }, [facility?.id, facility?.slug, facility?.state, trackClickToCall, trackWebsiteClick]);

  const handleRequestInfoOpen = useCallback((cta_location: string) => {
    // Always open the Message Center modal in-place. Previously the
    // handler redirected unclaimed facilities to /concierge to route
    // through the concierge intake, but that broke the user
    // expectation that "Message Center" is a modal-opening button.
    // The modal itself handles the unclaimed case internally by
    // routing the inquiry through the concierge match flow on submit,
    // so the seeker still ends up in the right pipeline without the
    // jarring page change.
    setRequestModalOpen(true);
    void cta_location;
  }, []);

  // Show skeleton while:
  // - the slug isn't ready yet (route param still resolving), OR
  // - react-query is loading/fetching, OR
  // - the query hasn't completed at least once yet.
  // This prevents a premature "Center Not Found" flash before the client
  // query has had a chance to verify the slug against the database.
  // Hard-redirect malformed slugs straight to the directory rather than
  // attempting a DB lookup that will always miss.
  // Canonical redirect: the slug normalizes to a valid form that differs
  // from what's in the URL (e.g. mixed-case, whitespace, percent-encoded
  // spaces, doubled hyphens). Replace in-place so back-button still works.
  if (slugNeedsCanonicalRedirect) {
    return <Navigate to={`/center/${normalisedSlug}${location.search}`} replace />;
  }

  if (slug && !isSlugFormatValid) {
    return <CenterNotFound attemptedSlug={slug} reason="invalid" />;
  }

  // Slug looks valid but the query resolved to no row (deleted, suspended,
  // never existed) — render the dedicated Center Not Found page with
  // search-and-retry instead of a silent redirect.
  if (
    isSlugFormatValid &&
    isFetched &&
    !isFetching &&
    !error &&
    (facility === null || facility === undefined)
  ) {
    return <CenterNotFound attemptedSlug={slug} reason="missing" />;
  }

  // Listing exists but isn't publicly approved — show the inactive variant.
  // The public route never loads `user_id` (it's masked by the view + forced
  // to null in the queryFn), so we can't fall back to "owner can still view"
  // here without re-introducing the bug that 404'd every claimed listing
  // for any logged-in visitor. Owners who want to preview their own pending
  // listing have a dedicated route (`/provider/facility/:id`).
  if (facility && facility.status !== "approved") {
    return <CenterNotFound attemptedSlug={slug} reason="inactive" />;
  }

  // Show skeleton only on the very first load. Background refetches keep the
  // already-rendered profile in place to avoid a flash to skeleton on revisit
  // or when auth state changes (currentUserId becomes available after mount).
  if (!slug || (isLoading && !facility)) {
    return (
      <Layout>
        <CenterProfileSkeleton />
      </Layout>
    );
  }

  // Only after a completed fetch do we render the not-found state, and only
  // when the query truly returned no row (or hard-errored). While a refetch
  // is in flight without prior data, keep showing the skeleton.
  if (!facility) {
    // Refetch in flight without prior data → keep skeleton, don't flash NotFound
    if (isFetching && !isFetched) {
      return (
        <Layout>
          <CenterProfileSkeleton />
        </Layout>
      );
    }
    return (
      <Layout>
        <SEO
          title="Center Not Found"
          description="The treatment center you're looking for doesn't exist or is no longer available."
          noindex={true}
        />
        <div className="bg-gradient-to-b from-muted/50 to-background min-h-screen py-20">
          <div className="container max-w-md text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10 shadow-lg">
              <Building2 className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="mb-3 font-display text-2xl font-bold text-foreground">
              Center Not Found
            </h1>
            <p className="mb-8 text-muted-foreground">
              The treatment center you're looking for doesn't exist or is no longer available.
            </p>
            <Link to="/rehab-centers">
              <Button size="lg" className="gap-2 shadow-md">
                <ArrowLeft className="h-4 w-4" />
                Back to Search
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <SEO title="Center Not Found" description="Unavailable" noindex={true} />
        <div className="bg-gradient-to-b from-muted/50 to-background min-h-screen py-20">
          <div className="container max-w-md text-center">
            <h1 className="mb-3 font-display text-2xl font-bold text-foreground">Center Not Found</h1>
            <Link to="/rehab-centers">
              <Button size="lg" className="gap-2 shadow-md mt-4">
                <ArrowLeft className="h-4 w-4" /> Back to Search
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const services = facility.facility_services.map((s) => s.service_name);
  const insuranceList = facility.facility_insurance.map((i) => i.insurance_name);
  const ageGroups = facility.facility_age_groups.map((a) => a.age_group);
  const accreditationTypes = (facility.facility_accreditations ?? []).map(
    (a) => a.accreditation_type,
  );
  const credentials = facility.facility_credentials[0];
  const galleryImages = facility.gallery_urls?.filter(Boolean) || [];
  const initials = getInitials(facility.name);
  const hasValidLogo = facility.logo_url && !logoError;
  // 2026-05-23: same fallback ladder as the directory cards — when
  // the facility has uploaded any photo/logo, never fall back to the
  // generic stock-building placeholder on this profile (would
  // misleadingly imply the provider hasn't added any media). The
  // building illustration is reserved for never-uploaded facilities.
  const hasAnyRealImageConfigured =
    galleryImages.length > 0 || !!facility.logo_url;
  // The public profile route never resolves `facility.user_id` (the view
  // doesn't expose it and the queryFn forces it to null), so ownership can
  // never be detected here. Owners who want an "edit my listing" experience
  // are routed to the provider dashboard via the unclaimed-banner CTA below
  // and the dedicated `/provider/facility/:id` route.
  const isOwner = false;
  const isPending = facility.status === "pending";
  // PII gate removed 2026-05-21 — every approved facility surfaces its
  // public business contact info (phone, email, website) to every
  // visitor. The plan tier no longer determines content visibility;
  // facilityPlan is kept for sort priority + Featured-badge eligibility
  // upstream but does not gate display here.
  const showContactDetails = true;
  const yearsInBusiness = getYearsInBusiness(facility.year_established);

  // Map gender_served to display label
  const genderLabel = facility.gender_served === "male" ? "Men Only" 
    : facility.gender_served === "female" ? "Women Only" 
    : facility.gender_served === "all" ? "All Genders" 
    : facility.gender_served;

  return (
    <Layout>
      <SEO
        title={`${facility.name} - Addiction Treatment in ${facility.city}, ${facility.state}`}
        description={facility.description
          ? facility.description.slice(0, 155) + (facility.description.length > 155 ? '...' : '')
          : `${facility.name} offers comprehensive addiction treatment services in ${facility.city}, ${facility.state}. Verify insurance coverage and start your recovery journey today.`
        }
        canonical={`/center/${resolveFacilitySlug(facility)}`}
        // Center profiles render as a local business — surface the right OG
        // type so social cards and link unfurlers treat them as a place,
        // not a generic article. The image priority below mirrors what
        // users see in the hero, so social previews match the page.
        type="local_business"
        image={
          facility.gallery_urls?.[0] ||
          facility.logo_url ||
          undefined
        }
        keywords={[
          `${facility.name}`,
          `addiction treatment ${facility.city}`,
          `rehab center ${facility.state}`,
          `drug rehab ${facility.city} ${facility.state}`,
          `alcohol treatment ${facility.city}`,
          facility.facility_type,
          ...services.slice(0, 5),
        ].filter(Boolean) as string[]}
        structuredData={generateLocalBusinessSchema({
          name: facility.name,
          address: facility.address,
          city: facility.city,
          state: facility.state,
          zipCode: facility.zip_code,
          // Phone is a Pro-only contact channel; omit from structured data for
          // non-Pro listings so search engines / rich results match the on-page UX.
          phone: showContactDetails ? facility.phone : undefined,
          description: facility.description || `${facility.name} provides quality addiction treatment in ${facility.city}, ${facility.state}.`,
          image: facility.logo_url || facility.gallery_urls?.[0] || undefined,
          gallery: facility.gallery_urls || undefined,
          services: services,
          insurance: insuranceList,
          slug: facility.slug || undefined,
          // email removed - provider emails are completely private
          website: facility.website || undefined,
          facilityType: facility.facility_type,
          yearEstablished: facility.year_established || undefined,
          verified: facility.verified || false,
          featured: facility.featured,
          accreditations: facility.facility_accreditations?.map(a => a.accreditation_type) || [],
          bedCount: facility.bed_count || undefined,
          genderServed: facility.gender_served || undefined,
          ageGroups: facility.facility_age_groups?.map(g => g.age_group) || [],
          // Include review ratings for rich snippets when available
          rating: ratingData.averageRating || undefined,
          reviewCount: ratingData.reviewCount || undefined,
          // E-E-A-T: when this listing was last editorially reviewed and by whom.
          // We derive `lastReviewed` from updated_at (every approval / edit
          // touches it) and credit the RehabLookup Editorial Team as reviewer
          // for verified listings, falling back to the same team for unverified.
          lastReviewed: facility.updated_at || undefined,
          reviewedBy: {
            type: "Organization",
            name: "RehabLookup Editorial Team",
            url: "https://rehablookup.com/editorial-policy",
          },
        })}
        breadcrumbs={(() => {
          const stateSlug = facility.state.toLowerCase().replace(/\s+/g, "-");
          const citySlug = facility.city.toLowerCase().replace(/\s+/g, "-");
          return [
            { name: "Home", url: "/" },
            { name: "Find Rehab", url: "/rehab-centers" },
            { name: facility.state, url: `/rehab-centers/${stateSlug}` },
            { name: facility.city, url: `/rehab-centers/${stateSlug}/${citySlug}` },
            { name: facility.name, url: `/center/${facility.slug}` },
          ];
        })()}
        modifiedTime={facility.updated_at}
      />

      {/* Main Content */}
      <div className="bg-gradient-to-b from-muted/40 via-background to-background min-h-screen pb-24 md:pb-8">
        <div className="container max-w-7xl px-4 py-6 md:px-6 md:py-10">
          {(() => {
            const stateSlug = facility.state.toLowerCase().replace(/\s+/g, "-");
            const citySlug = facility.city.toLowerCase().replace(/\s+/g, "-");
            return (
              <BreadcrumbNav
                items={[
                  { label: "Find Rehab", href: "/rehab-centers" },
                  { label: facility.state, href: `/rehab-centers/${stateSlug}` },
                  { label: facility.city, href: `/rehab-centers/${stateSlug}/${citySlug}` },
                  { label: facility.name },
                ]}
                className="mb-4"
                variant="light"
                /* JSON-LD already emitted by <SEO breadcrumbs={...}/> above —
                   suppress the duplicate set here per Google's
                   "one BreadcrumbList per page" guidance. */
                emitJsonLd={false}
              />
            );
          })()}
          {/* Pending Status Banner */}
          {isOwner && isPending && (
            <Alert className="mb-6 border-amber-300/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 shadow-sm">
              <Clock className="h-5 w-5 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>Preview Mode:</strong> Your listing is under review and only visible to you.
                It will be publicly visible once approved (usually within 24-48 hours).
              </AlertDescription>
            </Alert>
          )}

          {/* Back Link */}
          {fromSearch && (
            <Link
              to="/rehab-centers"
              className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Back to search results
            </Link>
          )}

          {/* Hero Header */}
          <div className="mb-8 rounded-2xl bg-card shadow-lg overflow-hidden border border-border/30">
            {/* Hero Image — bg-muted reserves a colored placeholder so swap-in is invisible */}
            <div className="relative h-52 md:h-72 overflow-hidden bg-muted">
              {galleryImages.length > 0 ? (
                <img
                  src={galleryImages[0]}
                  alt={facility.name}
                  className="w-full h-full object-cover"
                  width={800}
                  height={400}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
              ) : hasAnyRealImageConfigured ? (
                // The facility has a logo uploaded (just no gallery
                // photos yet). Render an initials block keyed to the
                // facility name rather than a generic stock-building
                // illustration — keeps the hero identity-consistent
                // with the logo + name already present below.
                <div
                  aria-label={`${facility.name} — header image`}
                  className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5"
                >
                  <span className="font-display text-5xl md:text-6xl font-bold text-primary">
                    {initials}
                  </span>
                </div>
              ) : (
                <img
                  src={getFacilityPlaceholder(facility)}
                  alt={`${facility.name} facility illustration`}
                  className="w-full h-full object-cover"
                  width={800}
                  height={400}
                  loading="eager"
                  decoding="async"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              
              {/* Status Badges — top left (max 3 to avoid crowding) */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5">
                {ratingData.averageRating && ratingData.reviewCount > 0 && (
                  <div className="bg-white/95 backdrop-blur-sm rounded-full px-2 py-0.5 shadow-md flex items-center gap-1">
                    <svg className="h-3 w-3 fill-amber-500" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-bold text-[11px] text-foreground tabular-nums">{ratingData.averageRating.toFixed(1)}</span>
                    <span className="text-[11px] text-muted-foreground">({ratingData.reviewCount})</span>
                  </div>
                )}
                {hasFeaturedSubscription && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 gap-1 px-2 py-0.5 shadow-md text-[11px] font-bold uppercase tracking-wider">
                    <Crown className="h-3 w-3" />
                    Featured
                  </Badge>
                )}
                {facility.verified && (
                  <Badge className="bg-emerald-500/90 text-white border-0 gap-1 px-2 py-0.5 shadow-md text-[11px] font-bold uppercase tracking-wider">
                    <ShieldCheck className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>

              {/* Claim CTA — top-right of hero, secondary style so it
                  doesn't compete with the primary Request Info CTAs below.
                  Hover override (2026-05-23): the outline-variant baseline
                  applies `hover:text-accent-foreground` (white) on hover,
                  which collided with our white background here and made
                  the label disappear. Pin the hover text to `text-primary`
                  for a clear color shift that stays readable on the white
                  hover background. */}
              {claimFlags && !claimFlags.is_claimed && (
                <div className="absolute top-3 right-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClaimClick}
                    className="bg-white/90 hover:bg-white text-foreground hover:text-primary border-white/60 hover:border-primary/40 backdrop-blur-sm shadow-md"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                    Claim This Listing
                  </Button>
                </div>
              )}
              {/* Managed listing — owner shortcut into the editor. Public
                  visitors of a claimed/owned listing see nothing here (the
                  managed state is conveyed by the absence of the claim CTA
                  and the verified/Pro badges, not an extra chip). */}
              {claimFlags?.is_claimed && viewerOwnsFacility && (
                <div className="absolute top-3 right-3">
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="bg-white/90 hover:bg-white text-foreground hover:text-primary border-white/60 hover:border-primary/40 backdrop-blur-sm shadow-md"
                  >
                    <Link to={`/provider/listings?edit=${facility.id}`}>
                      <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                      Manage this listing
                    </Link>
                  </Button>
                </div>
              )}

              {/* Facility identity overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                <div className="flex items-end gap-3.5">
                  <div className="h-16 w-16 md:h-20 md:w-20 shrink-0 overflow-hidden rounded-xl border-[3px] border-card bg-card shadow-xl">
                    {hasValidLogo ? (
                      <img
                        src={facility.logo_url!}
                        alt={facility.name}
                        className="h-full w-full object-cover"
                        loading="eager"
                        decoding="async"
                        fetchPriority="high"
                        onError={() => setLogoError(true)}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
                        <span className="font-display text-xl md:text-2xl font-bold text-primary">{initials}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pb-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="speakable-headline font-display text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white leading-tight line-clamp-2 break-words drop-shadow-lg">
                        {facility.name}
                      </h1>
                      {/* Pro badge — signals to other providers researching the
                          directory that competing facilities are paying, and
                          gives Pro subscribers a visible benefit. */}
                      {claimFlags?.is_pro && (
                        <Badge
                          className="gap-1 bg-amber-400 text-amber-950 hover:bg-amber-400/90 border-0 shadow-md"
                          aria-label="This facility is a Pro provider"
                        >
                          <Crown className="h-3 w-3" />
                          Pro
                        </Badge>
                      )}
                    </div>
                    <div className="speakable-contact flex items-center gap-1.5 mt-1 min-w-0">
                      <MapPin className="h-3.5 w-3.5 text-white/70 shrink-0" />
                      <span className="text-sm text-white/85 font-medium truncate">{facility.city}, {facility.state}</span>
                    </div>
                    {/* "Unclaimed listing" badge intentionally hidden on
                        the public profile. The claimFlags state is still
                        fetched + used downstream — unclaimed inquiries
                        route through the concierge match flow, the
                        provider "Claim This Listing" CTA still appears
                        for facility operators, and the admin panel
                        continues to surface claim status. The badge
                        itself was creating reader confusion ("is this
                        place real?") on what is otherwise a verified
                        SAMHSA-sourced record, without giving the seeker
                        anything actionable. */}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats — horizontal pills */}
            <div className="px-4 py-3 md:px-6 md:py-3.5 border-t border-border/30 bg-muted/30">
              <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-0.5 -mb-0.5 scrollbar-hide">
                <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-foreground bg-background rounded-full px-3 py-1.5 border border-border/50">
                  <Stethoscope className="h-3.5 w-3.5 text-primary" />
                  {facility.facility_type}
                </span>
                {yearsInBusiness && (
                  <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-foreground bg-background rounded-full px-3 py-1.5 border border-border/50">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {yearsInBusiness}+ years
                  </span>
                )}
                {genderLabel && (
                  <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-foreground bg-background rounded-full px-3 py-1.5 border border-border/50">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    {genderLabel}
                  </span>
                )}
                {facility.bed_count && (
                  <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-foreground bg-background rounded-full px-3 py-1.5 border border-border/50">
                    <Bed className="h-3.5 w-3.5 text-muted-foreground" />
                    {facility.bed_count} beds
                  </span>
                )}
                {insuranceList.length > 0 && (
                  <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-foreground bg-background rounded-full px-3 py-1.5 border border-border/50">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                    Insurance
                  </span>
                )}
                {facility.accepts_international_patients && (
                  <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-400 bg-violet-500/10 rounded-full px-3 py-1.5 border border-violet-200 dark:border-violet-800">
                    <GlobeIcon className="h-3.5 w-3.5" />
                    International
                  </span>
                )}
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col xs:flex-row items-stretch gap-2 px-3 py-3 sm:px-4 md:px-6 border-t border-border/30 bg-card">
              {/* Call — native dialer via tel:. Phone selection per
                  spec: verified_phone when has_facility_verified_contact
                  is true, else the public phone. Renders any time we
                  have a callable number; the global useTelClickTracking
                  handler logs the click via the standard phone_click
                  event, and trackInteraction preserves the page-local
                  "call" interaction signal. */}
              {(() => {
                const callPhone = facility.has_facility_verified_contact && facility.verified_phone
                  ? facility.verified_phone
                  : facility.phone;
                if (!callPhone) return null;
                return (
                  <Button
                    asChild
                    size="lg"
                    className="flex-1 min-w-0 gap-2 h-11 text-sm font-semibold shadow-sm"
                  >
                    <a
                      href={`tel:+1${getPhoneDigits(callPhone)}`}
                      onClick={() => trackInteraction("call")}
                      aria-label={`Call ${facility.name} at ${formatPhoneNumber(callPhone)}`}
                      data-cta-location="hero_call"
                    >
                      <Phone className="h-4 w-4 shrink-0" />
                      <span className="truncate whitespace-nowrap">
                        Call {formatPhoneNumber(callPhone)}
                      </span>
                    </a>
                  </Button>
                );
              })()}
              <Button
                variant="outline"
                size="lg"
                className="flex-1 min-w-0 gap-2 h-11 text-sm font-semibold"
                onClick={() => handleRequestInfoOpen("hero_request_info")}
                aria-label={`Open Message Center for ${facility.name}`}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="truncate">Message Center</span>
              </Button>
              {/* Save / favorite — guest favorites persist to localStorage and
                  migrate to user_favorites on signin; authed seekers update the
                  DB directly. Works for anon + authed without an extra prompt. */}
              <Button
                variant="outline"
                size="lg"
                className="gap-2 h-11 text-sm font-semibold"
                aria-label={isFavorite(facility.id) ? "Remove from saved" : "Save to favorites"}
                onClick={() => toggleFavorite(facility.id)}
              >
                <Heart
                  className={cn("h-4 w-4 shrink-0", isFavorite(facility.id) && "fill-current text-rose-500")}
                />
                <span className="truncate">{isFavorite(facility.id) ? "Saved" : "Save"}</span>
              </Button>
              {showContactDetails && facility.website && (
                <a
                  href={facility.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackInteraction("website")}
                  className="hidden sm:block"
                >
                  <Button variant="ghost" size="lg" className="gap-1.5 h-11 text-sm font-medium text-muted-foreground hover:text-foreground">
                    <Globe className="h-4 w-4" />
                    Website
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* Owner banner — only renders for unclaimed listings. Surfaces
              the claim CTA + the Pro discount/featured-placement benefits
              so a facility operator browsing their own page sees the
              business case immediately. (Phase 5C) */}
          {claimFlags && !claimFlags.is_claimed && (
            <div className="mt-4 sm:mt-5">
              <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/[0.04] to-amber-500/[0.04] p-4 sm:p-5">
                <div className="flex items-start gap-3 sm:gap-4 flex-wrap">
                  <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-semibold text-foreground">
                      Are you the owner of {facility.name}?
                    </p>
                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Claim this listing free in 2 minutes — keep your contact details up to date,
                      respond to leads, and unlock a verified badge, priority placement, and
                      enhanced profile features with a Pro membership.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    <Button onClick={handleClaimClick} className="gap-1.5 h-10">
                      <ShieldCheck className="h-4 w-4" />
                      Claim free
                    </Button>
                    <Button asChild variant="outline" size="sm" className="gap-1 h-10">
                      <Link to="/for-providers#pricing">
                        See Pro pricing
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:gap-8 lg:grid-cols-[1fr,380px]">
            {/* Left Column - Main Content */}
            <div className="space-y-0 min-w-0 divide-y divide-border [&>*]:py-8 [&>*:first-child]:pt-0">
              {/* Gallery — delegates to FacilityPhotoGallery so mobile
                  shows a single-image snap carousel (swipe to navigate)
                  while desktop keeps the 1-large + 4-thumbs grid. The
                  component owns its own lightbox; the report-image
                  affordance below sits in the section action slot and
                  uses the section's own activeGalleryIndex (reset to 0
                  on mount) since the carousel's internal mobileIndex
                  isn't exposed across that boundary — reporting from
                  the gallery falls back to "the image currently
                  showing in the dedicated CenterProfile lightbox" when
                  open, otherwise the first. */}
              {galleryImages.length > 0 && (
                <ProfileSection
                  icon={ImageIcon}
                  title="Facility Photos"
                  iconColor="bg-rose-500/10 text-rose-600"
                  action={
                    !isOwner && (
                      <button
                        onClick={() => {
                          setReportImageUrl(galleryImages[activeGalleryIndex] || galleryImages[0]);
                          setReportImageType("gallery");
                          setReportImageOpen(true);
                        }}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors px-3 py-1.5 rounded-lg hover:bg-destructive/5"
                      >
                        <Flag className="h-3.5 w-3.5" />
                        Report
                      </button>
                    )
                  }
                >
                  <FacilityPhotoGallery
                    images={galleryImages}
                    facilityName={facility.name}
                  />
                </ProfileSection>
              )}

              {/* About */}
              <ProfileSection
                icon={Building2}
                title="About This Facility"
                iconColor="bg-primary/10 text-primary"
              >
                {facility.description ? (
                  <TruncatedDescription text={facility.description} />
                ) : (
                  <p className="text-muted-foreground leading-relaxed italic">
                    No description provided yet. Contact this facility for more information about their programs and services.
                  </p>
                )}
              </ProfileSection>

              {/* Quick Facts Strip — dense info bar surfacing the data the
                  SAMHSA pass populated (levels of care, ages, insurance,
                  gender, year established). Self-hides any tile whose data
                  is empty, so the strip never shows "—" placeholders. */}
              <QuickFactsStrip
                services={services}
                ageGroups={ageGroups}
                insurance={insuranceList}
                gender={facility.gender_served}
                yearEstablished={facility.year_established}
              />

              {/* Contact & Location Details */}
              <ProfileSection 
                icon={MapPin} 
                title="Contact & Location"
                iconColor="bg-blue-500/10 text-blue-600"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Address — clickable when we have enough to build a
                      directions URL. Falls back to a plain text block
                      when address/city/state are missing. The href uses
                      maps.google.com/?q=... which opens in the user's
                      default map app on mobile and Google Maps on
                      desktop — no API key required. */}
                  {(facility.address || facility.city) ? (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                        [facility.address, facility.city, facility.state, facility.zip_code]
                          .filter(Boolean)
                          .join(", "),
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackInteraction("directions")}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 hover:bg-primary/5 transition-colors group"
                      aria-label={`Get directions to ${facility.name}`}
                    >
                      <MapPin className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5 flex items-center gap-1.5">
                          Address
                          <span className="text-[10px] font-normal text-primary opacity-70 group-hover:opacity-100">↗ Get directions</span>
                        </p>
                        {facility.address && (
                          <p className="text-sm text-foreground font-medium group-hover:underline">{facility.address}</p>
                        )}
                        <p className="text-sm text-muted-foreground">{facility.city}, {facility.state} {facility.zip_code}</p>
                      </div>
                    </a>
                  ) : (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                      <MapPin className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Address</p>
                        <p className="text-sm text-muted-foreground">Not provided</p>
                      </div>
                    </div>
                  )}

                  {/* Phone — only when the facility actually has a number;
                      otherwise fall through to the placement helpline below so
                      we never render an empty label or a dead tel:null link. */}
                  {showContactDetails && facility.phone ? (
                    <a
                      href={`tel:${facility.phone}`}
                      onClick={() => trackInteraction("call")}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 hover:bg-primary/5 transition-colors group"
                    >
                      <Phone className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Phone</p>
                        <p className="text-sm text-primary font-semibold group-hover:underline">{formatPhoneNumber(facility.phone)}</p>
                      </div>
                    </a>
                  ) : (
                    // Non-Pro facilities don't expose their direct phone here,
                    // so surface the free public SAMHSA National Helpline as a
                    // one-tap fallback for mobile users. The number lives in
                    // env (VITE_CONCIERGE_HELPLINE) with SAMHSA's published
                    // number as the stable default.
                    <a
                      href={`tel:${(import.meta.env.VITE_CONCIERGE_HELPLINE as string | undefined) || "+18006624357"}`}
                      onClick={() => trackInteraction("call")}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 hover:bg-primary/5 transition-colors group"
                    >
                      <Phone className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">SAMHSA National Helpline</p>
                        <p className="text-sm text-primary font-semibold group-hover:underline">
                          {(import.meta.env.VITE_CONCIERGE_HELPLINE_DISPLAY as string | undefined) || "1-800-662-4357"}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Free, confidential treatment referral line operated by SAMHSA — not by RehabLookup.</p>
                      </div>
                    </a>
                  )}

                  {/* Website */}
                  {showContactDetails && facility.website && (
                    <a 
                      href={facility.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => trackInteraction("website")}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 hover:bg-primary/5 transition-colors group"
                    >
                      <Globe className="h-4 w-4 text-violet-600 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Website</p>
                        <p className="text-sm text-primary font-semibold flex items-center gap-1 group-hover:underline">
                          Visit Website <ExternalLink className="h-3 w-3" />
                        </p>
                      </div>
                    </a>
                  )}

                  {/* Email */}
                  {showContactDetails && facility.email && (
                    <a 
                      href={`mailto:${facility.email}`}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 hover:bg-primary/5 transition-colors group"
                    >
                      <Mail className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Email</p>
                        <p className="text-sm text-primary font-semibold truncate group-hover:underline">{facility.email}</p>
                      </div>
                    </a>
                  )}
                </div>

                {/* Hours / Languages / Accessibility / Admissions —
                    shared block. Renders nothing when all four fields
                    are null/empty so the section stays clean for
                    SAMHSA-imported listings without provider input. */}
                <FacilityProfileExtras
                  hours={facility.hours_of_operation ?? null}
                  languages={facility.languages_spoken ?? null}
                  accessibility={facility.accessibility_features ?? null}
                  acceptingAdmissions={facility.accepting_admissions ?? null}
                  variant="full"
                  className="mt-3 pt-4 border-t border-border/40"
                />
              </ProfileSection>

              {/* Levels of Care — visual tile grid filtered to the canonical
                  level-of-care set. Replaces the previous inline chip cloud
                  that mixed levels with therapy modalities. */}
              <LevelsOfCareTiles services={services} />

              {/* Therapy approaches grouped into Evidence-Based + Recovery
                  Supports columns, with an "Who's Served" demographics row
                  showing age bands and gender_served when populated. */}
              <TherapyApproachesGrid
                services={services}
                ageGroups={ageGroups}
                gender={facility.gender_served}
              />

              {/* Insurance Accepted — visual plan grid with paywall-aware
                  verify links and a sliding-scale callout. Renders a
                  factual fallback when no plans are listed instead of
                  hiding the section entirely. */}
              <InsuranceShowcase insurance={insuranceList} />

              {/* Rehab Score panel removed 2026-05-23. The composite score
                  combined raw verification flags, service count, Google
                  reviews, and profile completeness into a single number
                  that implied clinical predictive validity it could not
                  support — and penalized unclaimed listings (most of the
                  directory) for not yet being marketed by their owners.
                  The underlying signals (accreditation badges, verified
                  pill, Google rating, service list) all still render in
                  their own dedicated sections below — they were always
                  the truth the score was glossing over. */}

              {/* Accreditations & Licensing — per-credential cards with
                  authoritative external verification links (Joint Commission,
                  CARF, SAMHSA, NAATP). Self-hides when no accreditations are
                  recorded; never renders "—" placeholders. */}
              <AccreditationsPanel accreditations={accreditationTypes} />


              {/* Our Team Section — Pro-gated via public_facility_staff.
                  Component returns null when the view returns empty, so
                  Free facilities render nothing (the divide-y skips it). */}
              <FacilityStaffSection facilityId={facility.id} />

              {/* Pro rich content — programs, amenities, video tour,
                  virtual tour, highlighted accreditations. Each
                  subsection self-gates: it only renders when the
                  server-side Pro-gated view actually returned data, so
                  a tampered SPA can't surface any of this for Free
                  facilities (public_facility_programs/amenities are
                  filtered by has_active_pro server-side; video_url +
                  virtual_tour_url are masked to NULL via the
                  public_facilities CASE expression). */}
              <RichProfileSections
                facilityId={facility.id}
                videoUrl={(facility as { video_url?: string | null }).video_url ?? null}
                virtualTourUrl={(facility as { virtual_tour_url?: string | null }).virtual_tour_url ?? null}
              />

              {/* SEO-friendly FAQ — data-driven, unique per profile.
                  PageFAQ emits FAQPage JSON-LD when ≥3 Q&A pairs are
                  present, satisfying the FAQ JSON-LD audit. */}
              {(() => {
                const faqs = buildProfileFAQs({
                  name: facility.name,
                  city: facility.city,
                  state: facility.state,
                  services,
                  insurance: insuranceList,
                  ageGroups,
                  genderServed: facility.gender_served,
                  facilityType: facility.facility_type,
                  yearEstablished: facility.year_established,
                  verified: facility.verified,
                  accreditations: facility.facility_accreditations,
                });
                if (faqs.length < 3) return null;
                return (
                  <PageFAQ
                    faqs={faqs}
                    title="Frequently Asked Questions"
                    description={`Common questions about ${facility.name}, treatment options, insurance, and what to expect.`}
                    className="!py-0 !pt-2"
                  />
                );
              })()}

              {/* Inline directory search — for seekers who read the FAQ
                  and want to widen the comparison set. */}
              <InlineMiniSearch
                source="center_profile_inline"
                className="max-w-xl mx-auto"
              />

              {/* Contextual internal links — strengthens crawl paths from
                  the profile to related treatment-type, city, state, and
                  insurance hubs. Built from the facility's actual services
                  + insurance so links stay topically relevant. */}
              {(() => {
                const { treatmentLinks, locationLinks, insuranceLinks } = buildProfileRelatedLinks({
                  city: facility.city,
                  state: facility.state,
                  services: facility.facility_services,
                  insurance: facility.facility_insurance,
                });
                return (
                  <RelatedLinksSection
                    title={`Explore More Rehab Options in ${facility.state}`}
                    treatmentLinks={treatmentLinks}
                    locationLinks={locationLinks}
                    insuranceLinks={insuranceLinks}
                    className="-mx-4 sm:-mx-6 lg:mx-0 rounded-2xl"
                  />
                );
              })()}

              {/* Community Reviews — single consolidated section */}
              <ProfileSection
                icon={MessageSquare}
                title="Community Reviews"
                iconColor="bg-violet-500/10 text-violet-600"
              >
                <FacilityReviewsSection 
                  facilityId={facility.id} 
                  facilityName={facility.name} 
                />
              </ProfileSection>
            </div>

            {/* Right Column - Sticky Sidebar */}
            <div className="hidden lg:block">
              <div className="sticky top-24 space-y-4">
                {/* Contact CTA */}
                <div 
                  ref={contactFormRef}
                  className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm"
                >
                  <h3 className="font-display text-base font-bold text-foreground mb-1">
                    Get Help Today
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Take the first step towards recovery
                  </p>

                  <div className="space-y-2.5">
                    <Button
                      size="lg"
                      className="w-full gap-2 h-11 text-sm font-semibold"
                      onClick={() => handleRequestInfoOpen("sidebar_request_info")}
                      aria-label={`Open Message Center for ${facility.name}`}
                    >
                      <Sparkles className="h-4 w-4" />
                      Message Center
                    </Button>

                    {showContactDetails && facility.phone && (
                      // Was <a><Button>...</Button></a> — invalid HTML
                      // (nested interactive). Use Button's asChild to
                      // mount the <a> as the root element instead.
                      <Button asChild variant="outline" size="lg" className="w-full gap-2 h-11 text-xs font-semibold">
                        <a
                          href={`tel:${facility.phone}`}
                          onClick={() => trackInteraction("call")}
                          aria-label={`Call ${facility.name} at ${formatPhoneNumber(facility.phone)}`}
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {formatPhoneNumber(facility.phone)}
                        </a>
                      </Button>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/40 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span>Quick Response — Within 24 hours</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Shield className="h-3 w-3 text-primary shrink-0" />
                      <span>100% Confidential</span>
                    </div>
                  </div>
                </div>

                {/* (Quick Facts sidebar card removed — its data already
                    appears in the page's QuickFactsStrip + the body
                    sections above. The sidebar now leads with the
                    primary contact CTAs and the directory card.) */}

                {/* Keep-looking directory card */}
                <ProfileDirectoryCTACard city={facility.city} state={facility.state} />
              </div>
            </div>
          </div>

          {/* Mobile Bottom Content */}
          <div className="lg:hidden mt-8 space-y-4">
            {/* Mobile CTA */}
            <div className="rounded-2xl bg-card border border-border/40 p-5">
              <h3 className="font-display text-base font-bold text-foreground mb-1">
                Message Center
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Take the first step towards recovery.
              </p>
              <div className="space-y-2.5">
                <Button 
                  size="lg" 
                  className="w-full gap-2 h-11 text-sm font-semibold"
                  onClick={() => handleRequestInfoOpen("sidebar_get_started")}
                >
                  <Sparkles className="h-4 w-4" />
                  Get Started
                </Button>
                {showContactDetails && facility.phone && (
                  // Same asChild fix as the sidebar Call CTA above —
                  // avoid <a><Button></Button></a> nested interactive.
                  <Button asChild variant="outline" size="lg" className="w-full gap-2 h-11 text-xs font-semibold">
                    <a
                      href={`tel:${facility.phone}`}
                      onClick={() => trackInteraction("call")}
                      aria-label={`Call ${facility.name} at ${formatPhoneNumber(facility.phone)}`}
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {formatPhoneNumber(facility.phone)}
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* (Mobile Quick Facts card removed alongside the desktop
                sidebar version — same data already lives in the page's
                QuickFactsStrip near the top.) */}

            <ProfileDirectoryCTACard compact city={facility.city} state={facility.state} />
          </div>

          {/* Related nearby — 3 sibling facilities in the same state +
              facility_type, ranked by completeness. Uses the new FacilityCard
              and batches services/insurance/age-groups/accreditations for
              all 3 cards in a single round-trip via useFacilityChildData. */}
          <RelatedNearby
            facility={{
              id: facility.id,
              state: facility.state,
              facility_type: facility.facility_type,
            }}
          />
        </div>
      </div>

      {/* Photo lightbox lives inside <FacilityPhotoGallery /> now —
          the duplicate dialog that used to live here was orphaned by
          the gallery refactor (no remaining caller hit setLightboxOpen)
          and removed to avoid shipping dead state + JSX. */}

      {/* End-of-page Featured rotation — OTHER paid Featured facilities
          in the SAME CITY. Mounted at the bottom (not under hero)
          because this page is dedicated to one specific facility;
          surfacing a "Featured near here" strip would compete with
          the focused profile if placed above the fold. Placed AFTER
          the profile content so users who scrolled the whole profile
          see "More Featured facilities in {city}" as a natural next
          step. Renders nothing when the city bucket has no active
          Featured subscribers. */}
      <LandingFeaturedSection
        placement_type="city"
        placement_value={facility.city ? slugifyName(facility.city) : null}
        slot_count={6}
        title={`More Featured Facilities in ${facility.city}`}
        subtitle="Other verified centers near here, sponsored by their providers."
      />

      {/* Request Info / Message Center Modal.
          ────────────────────────────────────────────────────────────
          2026-05-23 bugfix: previously gated to claimed listings only,
          which meant clicking "Message Center" / "Get matched" on an
          unclaimed facility set requestModalOpen=true but the modal
          was never mounted — the button looked broken. The
          submit-qualified-lead edge function already handles the
          unclaimed case server-side: it sees no active Pro
          subscription, creates a concierge_inquiries row with
          routing_mode='free_tier_redirect' and originating_facility_id
          pinned to this facility, then returns a redirect to
          /concierge/thank-you so the seeker lands on the canonical
          post-submit page. The seeker is then matched with verified
          providers signed up for the concierge network — which is the
          intended workflow for unclaimed listings.
          Mount the modal unconditionally so the Message Center button
          is functional regardless of claim state. */}
      <RequestInfoModal
        open={requestModalOpen}
        onOpenChange={setRequestModalOpen}
        facility={{
          id: facility.id,
          name: facility.name,
          city: facility.city,
          state: facility.state,
          slug: facility.slug,
          logo_url: facility.logo_url,
          featured: facility.featured,
          phone: facility.phone ?? null,
          verified: facility.verified ?? null,
        }}
        facilityPlan={facilityPlan === "pro" ? "pro" : "free"}
        prefillData={prefillDataFromNav}
      />

      {/* Sticky mobile CTA bar — persistent at the viewport bottom on mobile
          so seekers always have a one-tap path to convert without scrolling
          back to the hero. Hidden on md+ where the hero/sidebar CTAs are
          already visible. */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.15)]">
        <div className="grid grid-cols-3 gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {/* Phone — Pro listings dial direct; non-Pro dial the helpline. */}
          <a
            href={showContactDetails && facility.phone
              ? `tel:${facility.phone}`
              : `tel:${(import.meta.env.VITE_CONCIERGE_HELPLINE as string | undefined) || "+18006624357"}`}
            onClick={() => trackInteraction("call")}
            className="flex flex-col items-center justify-center gap-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-2 transition-colors"
            aria-label={showContactDetails ? "Call this facility" : "Call our helpline"}
          >
            <Phone className="h-5 w-5 text-emerald-600" />
            <span className="text-[11px] font-semibold text-emerald-700">Call</span>
          </a>
          {/* Request information from this facility. */}
          <button
            type="button"
            onClick={() => handleRequestInfoOpen("sticky_mobile_request")}
            className="flex flex-col items-center justify-center gap-0.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 px-2 py-2 transition-colors"
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-[11px] font-semibold">Request info</span>
          </button>
          {/* Save. RehabLookup-coordinated tour scheduling was retired in
              the directory cutover — saving the listing is the directory
              action that belongs in this slot for every claim state. */}
          <button
            type="button"
            onClick={() => toggleFavorite(facility.id)}
            className="flex flex-col items-center justify-center gap-0.5 rounded-lg border border-border hover:bg-muted/40 px-2 py-2 transition-colors"
            aria-label={isFavorite(facility.id) ? "Remove from saved" : "Save to favorites"}
          >
            <Heart className={cn("h-5 w-5", isFavorite(facility.id) && "fill-rose-500 text-rose-500")} />
            <span className="text-[11px] font-semibold text-foreground">
              {isFavorite(facility.id) ? "Saved" : "Save"}
            </span>
          </button>
        </div>
      </div>

      {/* Report Image Dialog */}
      <ReportImageDialog
        open={reportImageOpen}
        onOpenChange={setReportImageOpen}
        facilityId={facility.id}
        imageUrl={reportImageUrl}
        imageType={reportImageType}
      />

      {/* Mobile sticky call CTA — Yelp/Healthgrades pattern. Keeps the
          primary conversion action one tap away through the full scroll.
          Hidden at md: where the in-page CTA stays in viewport. Uses
          the same phone-selection rule as the in-page Call button
          (verified_phone when has_facility_verified_contact, else
          public phone). */}
      {(() => {
        const callPhone =
          facility.has_facility_verified_contact && facility.verified_phone
            ? facility.verified_phone
            : facility.phone;
        return (
          <StickyMobileCallBar
            facilityName={facility.name}
            phone={callPhone}
            onCallClick={() => trackInteraction("call")}
          />
        );
      })()}
    </Layout>
  );
};

export default CenterProfile;
