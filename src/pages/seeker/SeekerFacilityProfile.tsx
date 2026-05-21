import { useParams, useNavigate } from "react-router-dom";
import { useProviderEventTracking } from "@/hooks/useProviderEventTracking";
import { gaFacilityView, gaFacilityContact } from "@/lib/ga";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { loadFacilityBySlug } from "@/hooks/useFacilityBySlug";
import { loadFacilityDetails } from "@/hooks/useFacilityDetails";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RatingBadge } from "@/components/ui/RatingBadge";
import { RequestInfoModal } from "@/components/profile/RequestInfoModal";
import { FacilityPhotoGallery } from "@/components/facility/FacilityPhotoGallery";
import { FacilityTourRequestModal } from "@/components/facility/FacilityTourRequestModal";
// Tooltip imports removed — only consumer was the "Unclaimed listing"
// badge which was hidden on the seeker view (provider-only concept).
import { useFavorites } from "@/hooks/useFavorites";
import { useFacilityReviews } from "@/hooks/useFacilityReviews";
import { useFacilityRating } from "@/hooks/useFacilityRating";
import { FacilityStaffSection } from "@/components/facility/FacilityStaffSection";
import { FacilityProfileExtras } from "@/components/facility/FacilityProfileExtras";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { ReviewsList } from "@/components/reviews/ReviewsList";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Globe,
  CheckCircle,
  Shield,
  Clock,
  Users,
  Heart,
  Stethoscope,
  Building2,
  ExternalLink,
  Bed,
  Mail,
  MessageSquare,
  Send,
  Sparkles,
  CalendarDays,
  Award,
  Handshake,
  GlobeIcon,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";

interface SeekerProfile {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  phone: string | null;
}

interface FacilityData {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  zip_code: string;
  address: string;
  phone: string | null;
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
  user_id: string;
  updated_at: string;
  concierge_network_opted_in: boolean | null;
  accepts_international_patients: boolean | null;
  facility_services: { service_name: string }[];
  facility_insurance: { insurance_name: string }[];
  facility_age_groups: { age_group: string }[];
  facility_credentials: { accreditations: string | null; licensing_info: string | null }[];
  facility_accreditations: { accreditation_type: string; verified: boolean }[];
  // Optional claim-state flags. Populated when the row comes from the
  // public_facilities fallback path (facility not visible via the direct
  // approved-status fetch, e.g. SAMHSA-imported listings). When set, the
  // supplemental claim-flags useEffect short-circuits.
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

function ReviewsSection({ facilityId, facilityName }: { facilityId: string; facilityName: string }) {
  const {
    reviews,
    userReview,
    isLoading,
    averageRating,
    reviewCount,
    isAuthenticated,
    isEmailVerified,
    isAuthLoading,
    isReviewAuthReady,
    submitReview,
    updateReview,
    deleteReview,
    toggleHelpful,
    resendVerificationEmail
  } = useFacilityReviews(facilityId);

  return (
    <section className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 sm:gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-border/40 bg-muted/30">
        <div className="flex h-8 sm:h-9 w-8 sm:w-9 items-center justify-center rounded-lg bg-warning/10">
          <MessageSquare className="h-4 sm:h-4.5 w-4 sm:w-4.5 text-warning" />
        </div>
        <h2 className="font-semibold text-sm sm:text-base text-foreground">Reviews</h2>
      </div>
      <div className="p-4 sm:p-5 space-y-4">
        <ReviewForm
          facilityName={facilityName}
          userReview={userReview}
          isAuthenticated={isAuthenticated}
          isAuthReady={isReviewAuthReady}
          isEmailVerified={isEmailVerified}
          onSubmit={submitReview}
          onUpdate={updateReview}
          onDelete={deleteReview}
          onResendVerification={resendVerificationEmail}
        />
        <ReviewsList
          reviews={reviews}
          averageRating={averageRating}
          reviewCount={reviewCount}
          isLoading={isLoading}
          isAuthenticated={isAuthenticated}
          onToggleHelpful={toggleHelpful}
          facilityId={facilityId}
        />
      </div>
    </section>
  );
}

export default function SeekerFacilityProfile() {
  const { facilityId: slug } = useParams<{ facilityId: string }>();
  const navigate = useNavigate();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [logoError, setLogoError] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [tourModalOpen, setTourModalOpen] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);
  const [showAllInsurance, setShowAllInsurance] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get stored user synchronously to avoid getSession deadlocks
  const getStoredSession = useCallback(() => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      const projectRef = supabaseUrl?.split('//')[1]?.split('.')[0] || 'mldbxpntzcjalgjmwnqa';
      const storageKey = `sb-${projectRef}-auth-token`;
      const stored = localStorage.getItem(storageKey);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      const session = parsed?.currentSession || parsed;
      return session?.user ?? null;
    } catch {
      return null;
    }
  }, []);

  const storedUser = getStoredSession();

  const { data: seekerProfile } = useQuery({
    queryKey: ["seeker-profile-prefill", storedUser?.id],
    queryFn: async (): Promise<SeekerProfile | null> => {
      if (!storedUser?.id) return null;
      
      const { data } = await supabase
        .from("seeker_profiles")
        .select("first_name, last_name, display_name, phone")
        .eq("user_id", storedUser.id)
        .maybeSingle();
      
      return data as SeekerProfile | null;
    },
    enabled: !!storedUser?.id,
  });

  const userEmail = storedUser?.email || "";

  const prefillData = {
    firstName: seekerProfile?.first_name || "",
    lastName: seekerProfile?.last_name || "",
    email: userEmail || "",
    phone: seekerProfile?.phone || "",
  };

  const { data: facility, isLoading, isError: facilityError, refetch: refetchFacility } = useQuery({
    queryKey: ["seeker-facility", slug],
    queryFn: async (): Promise<FacilityData | null> => {
      // Shared loader: snapshot → public_facilities fallback → claim flags.
      // Replaces the previous direct REST fetch + inline fallback; the hook
      // is the single source of truth across CenterProfile, this page, and
      // the claim wizard.
      const loaded = await loadFacilityBySlug(slug!);
      if (!loaded.facility) return null;

      const base = loaded.facility;
      const fromFallback = !!loaded.flags; // fallback path always returns flags inline

      // For fallback rows (typically SAMHSA-imported, unclaimed) skip the
      // joined-table fetches and the Pro contact-details RPC. Those tables
      // are empty for those rows and the view already returned phone/website
      // with the right masking applied.
      if (fromFallback) {
        return {
          ...base,
          email: null,
          facility_services: [],
          facility_insurance: [],
          facility_age_groups: [],
          facility_credentials: [],
          facility_accreditations: [],
          is_claimed: loaded.flags?.is_claimed,
          is_pro: loaded.flags?.is_pro,
          is_premium_visible: loaded.flags?.is_premium_visible,
        } as unknown as FacilityData;
      }

      // Snapshot path — fetch joined detail tables + Pro-gated contact
      // RPC. The joined-tables fetch is shared with /center/[slug] via
      // loadFacilityDetails so both pages stay in sync on column lists.
      const facilityId = base.id;
      const [joins, publicDataResult] = await Promise.all([
        loadFacilityDetails(facilityId),
        supabase.rpc("get_public_facility_data", { facility_id: facilityId }).maybeSingle(),
      ]);
      const publicData = publicDataResult.data as
        | { phone?: string | null; email?: string | null; website?: string | null }
        | null;

      return {
        ...base,
        // Pro-gated values override the snapshot's masked defaults.
        phone: publicData?.phone || null,
        email: publicData?.email || null,
        website: publicData?.website || null,
        ...joins,
        is_claimed: loaded.flags?.is_claimed,
        is_pro: loaded.flags?.is_pro,
        is_premium_visible: loaded.flags?.is_premium_visible,
      } as unknown as FacilityData;
    },
    enabled: !!slug,
    retry: 2,
    staleTime: 1000 * 60 * 5,
  });

  // handleClaimClick was removed: the Claim CTA is provider-only and
  // doesn't belong on a seeker view. Providers reach the claim flow
  // through /provider/onboarding when they sign up — no entry-point
  // is needed here.

  const { data: facilityPlan = "free" } = useQuery({
    queryKey: ["facility-plan", facility?.id],
    queryFn: async (): Promise<string> => {
      if (!facility?.id) return "free";
      const { data } = await supabase.functions.invoke("get-facility-plan", {
        body: { facilityId: facility.id },
      });
      return data?.plan || "free";
    },
    enabled: !!facility?.id,
    staleTime: 1000 * 60 * 5,
  });

  // Claim-state flags sourced directly from the shared loader's result
  // (baked into `facility` by the queryFn above via `loaded.flags`).
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

  // Track current user id for the claim modal's auth-gated CTA.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) setCurrentUserId(session?.user?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const ratingData = useFacilityRating(facility?.id);

  const { trackProfileView, trackClickToCall, trackWebsiteClick } = useProviderEventTracking();

  /**
   * Dual-sink interaction tracker: writes to provider_events (admin
   * dashboard / billing) AND fires a GA4 facility_contact custom event
   * with facility identity dimensions. Use this in onClick handlers
   * instead of calling trackClickToCall / trackWebsiteClick directly so
   * the two streams stay in sync.
   */
  const handleFacilityContact = useCallback((method: "call" | "website" | "directions") => {
    if (!facility?.id) return;
    if (method === "call") trackClickToCall(facility.id, "profile");
    else if (method === "website") trackWebsiteClick(facility.id, "profile");
    gaFacilityContact({
      facility_id: facility.id,
      method,
      facility_slug: facility.slug ?? null,
      facility_state: facility.state ?? null,
    });
  }, [facility?.id, facility?.slug, facility?.state, trackClickToCall, trackWebsiteClick]);

  useEffect(() => {
    if (facility?.id) {
      // provider_events (admin dashboard) — seeker-panel views still count
      // toward provider engagement KPIs because the click intent is the
      // same as on the public profile.
      trackProfileView(facility.id);
      // GA4 facility_view with surface=seeker_panel so reports can
      // distinguish authenticated seeker browsing from public traffic.
      gaFacilityView({
        facility_id: facility.id,
        facility_slug: facility.slug ?? null,
        facility_name: facility.name ?? null,
        facility_state: facility.state ?? null,
        facility_city: facility.city ?? null,
        facility_type: (facility as { facilityType?: string | null })?.facilityType ?? null,
        surface: "seeker_panel",
      });
    }
  }, [facility?.id, facility?.slug, facility?.name, facility?.state, facility?.city, trackProfileView]);

  const handleFavoriteClick = useCallback(() => {
    if (facility?.id) {
      toggleFavorite(facility.id);
    }
  }, [facility?.id, toggleFavorite]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading facility...</p>
        </div>
      </div>
    );
  }

  if (facilityError) {
    return (
      <div className="flex-1 py-16">
        <div className="max-w-md mx-auto text-center px-4">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <Building2 className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="mb-2 font-display text-xl font-bold text-foreground">
            Something Went Wrong
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            We couldn't load this facility. Please try again.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => refetchFacility()} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retry
            </Button>
            <Button onClick={() => navigate("/account")} className="gap-2">
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="flex-1 py-16">
        <div className="max-w-md mx-auto text-center px-4">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <Building2 className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="mb-2 font-display text-xl font-bold text-foreground">
            Facility Not Found
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            This facility doesn't exist or is no longer available.
          </p>
          <Button onClick={() => navigate("/account")} className="gap-2" size="lg">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const services = facility.facility_services.map((s) => s.service_name);
  const insuranceList = facility.facility_insurance.map((i) => i.insurance_name);
  const ageGroups = facility.facility_age_groups.map((a) => a.age_group);
  const galleryImages = facility.gallery_urls?.filter(Boolean) || [];
  const initials = getInitials(facility.name);
  const hasValidLogo = facility.logo_url && !logoError;
  const yearsInBusiness = getYearsInBusiness(facility.year_established);
  // Pro members only: show phone and website on facility page
  // Align with CenterProfile + get-facility-plan, which only emit "pro" or
  // "free". The legacy "professional"/"featured" tier strings were never
  // returned by the edge function; keeping them here caused the same listing
  // to show phone in one view and not the other.
  const showContactDetails = facilityPlan === "pro";
  const accreditations = facility.facility_accreditations.filter(a => a.verified);

  const genderLabel = facility.gender_served === "male" ? "Men Only" 
    : facility.gender_served === "female" ? "Women Only" 
    : facility.gender_served === "all" ? "All Genders" 
    : facility.gender_served;

  const displayedServices = showAllServices ? services : services.slice(0, 8);
  const displayedInsurance = showAllInsurance ? insuranceList : insuranceList.slice(0, 10);

  return (
    <>
      <Helmet>
        <title>{facility.name} - Treatment Center | RehabLookup</title>
        <meta name="description" content={`${facility.name} in ${facility.city}, ${facility.state}. ${facility.facility_type} treatment center. ${facility.description?.slice(0, 120) || 'Find treatment options and request information.'}`} />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="flex-1 pb-6 bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/account")}
          className="mb-3 sm:mb-4 gap-1.5 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {/* Main Content Grid - Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Hero Card */}
            <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
              <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-accent" />
              
              <div className="p-4 sm:p-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Logo */}
                  <div className="relative shrink-0">
                    <div className="h-14 w-14 sm:h-20 sm:w-20 overflow-hidden rounded-xl border-2 border-border/60 bg-muted shadow-sm">
                      {hasValidLogo ? (
                        <img
                          src={facility.logo_url!}
                          alt={`${facility.name} logo`}
                          className="h-full w-full object-cover"
                          onError={() => setLogoError(true)}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                          <span className="font-display text-lg sm:text-2xl font-bold text-primary">
                            {initials}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h1 className="font-display text-lg sm:text-2xl font-bold text-foreground leading-tight line-clamp-2">
                          {facility.name}
                        </h1>
                        <p className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                          <MapPin className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-primary shrink-0" />
                          {facility.city}, {facility.state}
                        </p>
                      </div>

                      {/* Favorite */}
                      <button
                        onClick={handleFavoriteClick}
                        className={cn(
                          "p-1.5 sm:p-2 rounded-lg border transition-all shrink-0",
                          isFavorite(facility.id)
                            ? "bg-rose-50 border-rose-200 text-rose-500"
                            : "bg-muted/50 border-border text-muted-foreground hover:text-rose-500 hover:border-rose-200"
                        )}
                      >
                        <Heart className={cn("h-4 sm:h-5 w-4 sm:w-5", isFavorite(facility.id) && "fill-current")} />
                      </button>
                    </div>

                    {/* Badges - Stack on mobile */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                      <RatingBadge
                        rating={ratingData.averageRating}
                        reviewCount={ratingData.reviewCount}
                        size="sm"
                      />
                      {/* "Unclaimed listing" badge intentionally hidden
                          on the seeker view — claim status is a provider
                          concern. Seekers care about whether they can
                          contact the facility, which works the same
                          regardless of claim state (modal routes
                          unclaimed inquiries through concierge intake). */}
                      {facility.featured && (
                        <Badge className="gap-1 px-1.5 sm:px-2 py-0.5 text-xs sm:text-xs bg-warning/10 text-warning border-warning/20">
                          <Sparkles className="h-2.5 sm:h-3 w-2.5 sm:w-3" />
                          Featured
                        </Badge>
                      )}
                      {facility.verified && (
                        <Badge className="gap-1 px-1.5 sm:px-2 py-0.5 text-xs sm:text-xs bg-success/10 text-success border-success/20">
                          <Shield className="h-2.5 sm:h-3 w-2.5 sm:w-3" />
                          Verified
                        </Badge>
                      )}
                      {facility.concierge_network_opted_in && (
                        <Badge className="gap-1 px-1.5 sm:px-2 py-0.5 text-xs sm:text-xs bg-sky-500/10 text-sky-600 border-sky-500/20">
                          <Handshake className="h-2.5 sm:h-3 w-2.5 sm:w-3" />
                          Accepts Placements
                        </Badge>
                      )}
                      {facility.accepts_international_patients && (
                        <Badge className="gap-1 px-1.5 sm:px-2 py-0.5 text-xs sm:text-xs bg-violet-500/10 text-violet-600 border-violet-500/20">
                          <GlobeIcon className="h-2.5 sm:h-3 w-2.5 sm:w-3" />
                          International
                        </Badge>
                      )}
                      {/* "Claim This Listing" button intentionally
                          hidden on the seeker view — provider CTA.
                          Providers reach the claim flow via
                          /provider/onboarding when they sign up. */}
                    </div>
                  </div>
              </div>

                {/* Mobile Action Buttons - Visible below header on mobile */}
                <div className="flex gap-2 mt-4 lg:hidden">
                  <Button 
                    onClick={() => setRequestModalOpen(true)} 
                    className="flex-1 gap-2"
                    size="default"
                  >
                    <Send className="h-4 w-4" />
                    Send Request
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setTourModalOpen(true)} 
                    className="flex-1 gap-2"
                    size="default"
                  >
                    <CalendarDays className="h-4 w-4" />
                    Request Tour
                  </Button>
                </div>

                {/* Quick Stats - Horizontal scroll on mobile */}
                <div className="flex sm:grid sm:grid-cols-4 gap-2 mt-4 sm:mt-5 pt-4 sm:pt-5 border-t border-border/40 overflow-x-auto pb-1 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
                  {facility.facility_type && (
                    <div className="flex items-center gap-2 p-2 sm:p-2.5 rounded-lg bg-muted/50 shrink-0">
                      <Building2 className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-primary shrink-0" />
                      <span className="text-xs sm:text-xs font-medium text-foreground whitespace-nowrap">{facility.facility_type}</span>
                    </div>
                  )}
                  {yearsInBusiness && yearsInBusiness > 0 && (
                    <div className="flex items-center gap-2 p-2 sm:p-2.5 rounded-lg bg-muted/50 shrink-0">
                      <Clock className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-primary shrink-0" />
                      <span className="text-xs sm:text-xs font-medium text-foreground whitespace-nowrap tabular-nums">{yearsInBusiness}+ years</span>
                    </div>
                  )}
                  {genderLabel && (
                    <div className="flex items-center gap-2 p-2 sm:p-2.5 rounded-lg bg-muted/50 shrink-0">
                      <Users className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-primary shrink-0" />
                      <span className="text-xs sm:text-xs font-medium text-foreground whitespace-nowrap">{genderLabel}</span>
                    </div>
                  )}
                  {facility.bed_count && (
                    <div className="flex items-center gap-2 p-2 sm:p-2.5 rounded-lg bg-muted/50 shrink-0">
                      <Bed className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-primary shrink-0" />
                      <span className="text-xs sm:text-xs font-medium text-foreground whitespace-nowrap tabular-nums">{facility.bed_count} beds</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Photo Gallery */}
            {galleryImages.length > 0 && (
              <section className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5">
                  <FacilityPhotoGallery images={galleryImages} facilityName={facility.name} />
                </div>
              </section>
            )}

            {/* About */}
            {facility.description && (
              <section className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
                <div className="flex items-center gap-2.5 sm:gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-border/40 bg-muted/30">
                  <div className="flex h-8 sm:h-9 w-8 sm:w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-4 sm:h-4.5 w-4 sm:w-4.5 text-primary" />
                  </div>
                  <h2 className="font-semibold text-sm sm:text-base text-foreground">About</h2>
                </div>
                <div className="p-4 sm:p-5">
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {facility.description}
                  </p>
                </div>
              </section>
            )}

            {/* Treatment Services */}
            {services.length > 0 && (
              <section className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
                <div className="flex items-center gap-2.5 sm:gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-border/40 bg-muted/30">
                  <div className="flex h-8 sm:h-9 w-8 sm:w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Stethoscope className="h-4 sm:h-4.5 w-4 sm:w-4.5 text-emerald-600" />
                  </div>
                  <h2 className="font-semibold text-sm sm:text-base text-foreground">Treatment Services</h2>
                  <span className="ml-auto text-xs sm:text-xs text-muted-foreground">{services.length} services</span>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="grid gap-1.5 sm:gap-2 sm:grid-cols-2">
                    {displayedServices.map((service) => (
                      <div 
                        key={service} 
                        className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50/50 border border-emerald-100/60"
                      >
                        <CheckCircle className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-emerald-500 shrink-0" />
                        <span className="text-xs sm:text-sm text-foreground">{service}</span>
                      </div>
                    ))}
                  </div>
                  {services.length > 8 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-3 w-full text-xs"
                      onClick={() => setShowAllServices(!showAllServices)}
                    >
                      {showAllServices ? "Show less" : `Show all ${services.length} services`}
                    </Button>
                  )}
                </div>
              </section>
            )}

            {/* Insurance */}
            {insuranceList.length > 0 && (
              <section className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
                <div className="flex items-center gap-2.5 sm:gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-border/40 bg-muted/30">
                  <div className="flex h-8 sm:h-9 w-8 sm:w-9 items-center justify-center rounded-lg bg-blue-500/10">
                    <Shield className="h-4 sm:h-4.5 w-4 sm:w-4.5 text-blue-600" />
                  </div>
                  <h2 className="font-semibold text-sm sm:text-base text-foreground">Insurance Accepted</h2>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="flex flex-wrap gap-1 sm:gap-1.5">
                    {displayedInsurance.map((ins) => (
                      <Badge 
                        key={ins} 
                        variant="secondary" 
                        className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs sm:text-xs bg-blue-50/80 text-blue-700 border border-blue-100"
                      >
                        {ins}
                      </Badge>
                    ))}
                  </div>
                  {insuranceList.length > 10 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-3 w-full text-xs"
                      onClick={() => setShowAllInsurance(!showAllInsurance)}
                    >
                      {showAllInsurance ? "Show less" : `Show all ${insuranceList.length} insurers`}
                    </Button>
                  )}
                </div>
              </section>
            )}

            {/* Age Groups & Accreditations Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {ageGroups.length > 0 && (
                <section className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2.5 sm:gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-border/40 bg-muted/30">
                    <div className="flex h-8 sm:h-9 w-8 sm:w-9 items-center justify-center rounded-lg bg-purple-500/10">
                      <Users className="h-4 sm:h-4.5 w-4 sm:w-4.5 text-purple-600" />
                    </div>
                    <h2 className="font-semibold text-sm sm:text-base text-foreground">Age Groups</h2>
                  </div>
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-wrap gap-1 sm:gap-1.5">
                      {ageGroups.map((group) => (
                        <Badge 
                          key={group} 
                          variant="secondary" 
                          className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs sm:text-xs bg-purple-50/80 text-purple-700 border border-purple-100"
                        >
                          {group}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {accreditations.length > 0 && (
                <section className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2.5 sm:gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-border/40 bg-muted/30">
                    <div className="flex h-8 sm:h-9 w-8 sm:w-9 items-center justify-center rounded-lg bg-amber-500/10">
                      <Award className="h-4 sm:h-4.5 w-4 sm:w-4.5 text-amber-600" />
                    </div>
                    <h2 className="font-semibold text-sm sm:text-base text-foreground">Accreditations</h2>
                  </div>
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-wrap gap-1 sm:gap-1.5">
                      {accreditations.map((acc) => (
                        <Badge 
                          key={acc.accreditation_type} 
                          variant="secondary" 
                          className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs sm:text-xs bg-amber-50/80 text-amber-700 border border-amber-100"
                        >
                          {acc.accreditation_type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* Staff Section */}
            <FacilityStaffSection facilityId={facility.id} />

            {/* Reviews Section */}
            <ReviewsSection facilityId={facility.id} facilityName={facility.name} />
          </div>

          {/* Right Column - Sidebar (Hidden on mobile, actions in sticky bar) */}
          <div className="hidden lg:block space-y-5">
            {/* Sticky Action Card */}
            <div className="lg:sticky lg:top-6 space-y-5">
              {/* Primary Actions Card */}
              <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
                <div className="p-5 space-y-3">
                  <Button 
                    onClick={() => setRequestModalOpen(true)} 
                    className="w-full gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary shadow-md"
                    size="lg"
                  >
                    <Send className="h-4 w-4" />
                    Send Request
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => setTourModalOpen(true)} 
                    className="w-full gap-2 border-2 hover:bg-primary/5 hover:border-primary/30"
                    size="lg"
                  >
                    <CalendarDays className="h-4 w-4" />
                    Request Tour
                  </Button>

                  {/* Website only visible for Pro members */}
                  {showContactDetails && facility.website && (
                    <a 
                      href={facility.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => handleFacilityContact("website")}
                      className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors py-2"
                    >
                      <Globe className="h-4 w-4" />
                      <span>Visit website</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Contact Info Card */}
              {showContactDetails && (
                <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40 bg-muted/30">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Mail className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground">Contact</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* Address — clickable when we have enough to build
                        a directions URL. Opens the user's default maps
                        app on mobile, Google Maps on desktop. No API
                        key required. */}
                    {(facility.address || facility.city) ? (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                          [facility.address, facility.city, facility.state, facility.zip_code]
                            .filter(Boolean)
                            .join(", "),
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 -mx-2 px-2 py-1 rounded hover:bg-muted/50 transition-colors group"
                        aria-label={`Get directions to ${facility.name}`}
                      >
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="text-sm min-w-0">
                          {facility.address && (
                            <p className="text-foreground group-hover:underline">{facility.address}</p>
                          )}
                          <p className="text-muted-foreground">{facility.city}, {facility.state} {facility.zip_code}</p>
                          <p className="text-xs text-primary mt-0.5 opacity-70 group-hover:opacity-100">
                            ↗ Get directions
                          </p>
                        </div>
                      </a>
                    ) : (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="text-muted-foreground">Address not provided</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Phone — matches the public /center/[slug] page:
                        Pro facilities expose their direct line; Free /
                        unclaimed surface our concierge helpline so the
                        seeker still has a one-tap call path. The
                        helpline number lives in VITE_CONCIERGE_HELPLINE
                        with a stable fallback so the link works even
                        before the env is set. */}
                    {showContactDetails && facility.phone ? (
                      <a
                        href={`tel:${facility.phone}`}
                        onClick={() => handleFacilityContact("call")}
                        className="flex items-start gap-3 -mx-2 px-2 py-1 rounded hover:bg-muted/50 transition-colors group"
                      >
                        <Phone className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="text-sm min-w-0">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Phone</p>
                          <p className="text-primary font-semibold group-hover:underline">{formatPhoneNumber(facility.phone)}</p>
                        </div>
                      </a>
                    ) : (
                      <a
                        href={`tel:${(import.meta.env.VITE_CONCIERGE_HELPLINE as string | undefined) || "+18006624357"}`}
                        className="flex items-start gap-3 -mx-2 px-2 py-1 rounded hover:bg-muted/50 transition-colors group"
                      >
                        <Phone className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="text-sm min-w-0">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Call our helpline</p>
                          <p className="text-primary font-semibold group-hover:underline">
                            {(import.meta.env.VITE_CONCIERGE_HELPLINE_DISPLAY as string | undefined) || "1-800-662-4357"}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Free, confidential — we'll route you to the right team.</p>
                        </div>
                      </a>
                    )}

                    {/* Website — Pro facilities only. Free facilities
                        keep this slot empty rather than show a misleading
                        "no website" placeholder. */}
                    {showContactDetails && facility.website && (
                      <a
                        href={facility.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleFacilityContact("website")}
                        className="flex items-start gap-3 -mx-2 px-2 py-1 rounded hover:bg-muted/50 transition-colors group"
                      >
                        <Globe className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
                        <div className="text-sm min-w-0">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Website</p>
                          <p className="text-primary font-semibold flex items-center gap-1 group-hover:underline">
                            Visit Website <ExternalLink className="h-3 w-3" />
                          </p>
                        </div>
                      </a>
                    )}

                    {/* Hours / Languages / Accessibility / Admissions —
                        shared compact block. Self-suppresses when no
                        fields are populated, so the sidebar stays
                        clean for SAMHSA-imported listings. */}
                    <FacilityProfileExtras
                      hours={facility.hours_of_operation ?? null}
                      languages={facility.languages_spoken ?? null}
                      accessibility={facility.accessibility_features ?? null}
                      acceptingAdmissions={facility.accepting_admissions ?? null}
                      variant="compact"
                      className="pt-3 mt-1 border-t border-border/40"
                    />
                  </div>
                </div>
              )}

              {/* CTA Card */}
              <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-5 text-center">
                <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-1.5">Ready to Connect?</h4>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  Get in touch with {facility.name} to learn more about their programs.
                </p>
                <Button 
                  onClick={() => setRequestModalOpen(true)} 
                  size="sm"
                  className="w-full"
                >
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {/* Inquiry + tour modals always mount on the seeker view. The
          modals handle the claim-state routing internally:
            • Claimed facilities → submit-qualified-lead (provider inbox)
            • Unclaimed listings → concierge match flow (placement team)
          Previously these were gated on `claimFlags.is_claimed`, which
          made the "Send Request" / "Request Tour" / "Ready to Connect"
          buttons silently do nothing for unclaimed listings — the
          seeker clicked and saw no modal. Now the buttons always
          produce a working flow. */}
      {(
        <>
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
            }}
            facilityPlan={facilityPlan === "pro" ? "pro" : "free"}
            prefillData={prefillData}
          />

          <FacilityTourRequestModal
            open={tourModalOpen}
            onClose={() => setTourModalOpen(false)}
            facilityId={facility.id}
            facilityName={facility.name}
            prefillData={prefillData}
          />
        </>
      )}
      </div>
    </>
  );
}
