import { useParams, Link, useLocation } from "react-router-dom";
import facilityPlaceholder from "@/assets/facility-placeholder.jpg";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateLocalBusinessSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RatingBadge } from "@/components/ui/RatingBadge";
import { supabase } from "@/integrations/supabase/client";
import { RequestInfoModal } from "@/components/profile/RequestInfoModal";
import { useFacilityRating } from "@/hooks/useFacilityRating";
import {
  MapPin,
  Phone,
  Globe,
  Crown,
  CheckCircle,
  Shield,
  ArrowLeft,
  Clock,
  Users,
  Heart,
  Stethoscope,
  Building2,
  BadgeCheck,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  MessageSquare,
  Flag,
  Calendar,
  Bed,
  Mail,
  Award,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { CenterProfileSkeleton } from "@/components/skeletons/CenterProfileSkeleton";
import { useEffect, useRef, useState, useCallback } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReportImageDialog } from "@/components/profile/ReportImageDialog";
import { TrustBadgesInline, TrustBadgesSection } from "@/components/trust/TrustBadgesSection";
import { GoogleReviewsCard } from "@/components/reviews/GoogleReviewsCard";
import { FacilityReviewsSection } from "@/components/reviews/FacilityReviewsSection";
import { usePublicGoogleReviews } from "@/hooks/useGoogleReviews";
import { cn } from "@/lib/utils";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { useProviderEventTracking } from "@/hooks/useProviderEventTracking";
import { FacilityStaffSection } from "@/components/facility/FacilityStaffSection";
import { ConciergeCTACard } from "@/components/concierge/ConciergeCTACard";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";

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
  user_id: string;
  updated_at: string;
  facility_services: { service_name: string }[];
  facility_insurance: { insurance_name: string }[];
  facility_age_groups: { age_group: string }[];
  facility_credentials: { accreditations: string | null; licensing_info: string | null }[];
  facility_accreditations: { accreditation_type: string; verified: boolean }[];
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
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

// Section Container Component — borderless flowing layout
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Icon className={cn("h-5 w-5", iconColor.split(' ')[1] || 'text-primary')} />
          <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
        </div>
        {action}
      </div>
      <div>
        {children}
      </div>
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

// Google Reviews Display Component
function GoogleReviewsDisplay({ facilityId }: { facilityId: string }) {
  const { data: reviewsConfig } = usePublicGoogleReviews(facilityId);
  
  if (!reviewsConfig?.google_rating || !reviewsConfig?.google_review_count) {
    return null;
  }

  return (
    <GoogleReviewsCard
      rating={Number(reviewsConfig.google_rating)}
      reviewCount={reviewsConfig.google_review_count}
      googleUrl={reviewsConfig.google_place_url}
      className="mt-8"
    />
  );
}

const CenterProfile = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const queryClient = useQueryClient();
  const contactFormRef = useRef<HTMLDivElement>(null);
  const [showAllInsurance, setShowAllInsurance] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [logoError, setLogoError] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [reportImageOpen, setReportImageOpen] = useState(false);
  const [reportImageUrl, setReportImageUrl] = useState<string>("");
  const [reportImageType, setReportImageType] = useState<"logo" | "gallery">("gallery");
  const { trackProfileView, trackClickToCall, trackWebsiteClick } = useProviderEventTracking();
  
  const fromSearch = location.state?.fromSearch;
  const openModalFromNav = location.state?.openRequestModal;
  const prefillDataFromNav = location.state?.prefillData;

  // Redirect mixed-case slugs to lowercase canonical URL
  useEffect(() => {
    if (slug && slug !== slug.toLowerCase()) {
      window.location.replace(`/center/${slug.toLowerCase()}`);
    }
    // Reset gallery index on slug change
    setActiveGalleryIndex(0);
    setLogoError(false);
  }, [slug]);
  
  useEffect(() => {
    if (openModalFromNav) {
      setRequestModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [openModalFromNav]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!slug) return;

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
  }, [slug, queryClient]);

  const { data: facility, isLoading, error } = useQuery({
    queryKey: ["facility", slug, currentUserId],
    queryFn: async (): Promise<FacilityData | null> => {
      const { data: approvedData, error: approvedError } = await supabase
        .from("facilities")
        .select(`
          id,
          name,
          slug,
          city,
          state,
          zip_code,
          address,
          phone,
          email,
          website,
          description,
          facility_type,
          gender_served,
          bed_count,
          featured,
          verified,
          year_established,
          logo_url,
          gallery_urls,
          status,
          user_id,
          updated_at,
          facility_services (service_name),
          facility_insurance (insurance_name),
          facility_age_groups (age_group),
          facility_credentials (accreditations, licensing_info),
          facility_accreditations (accreditation_type, verified)
        `)
        .eq("slug", slug)
        .eq("status", "approved")
        .maybeSingle();

      if (approvedData) return approvedData as FacilityData;

      if (currentUserId) {
        const { data: ownedData } = await supabase
          .from("facilities")
          .select(`
            id,
            name,
            slug,
            city,
            state,
            zip_code,
            address,
            phone,
            email,
            website,
            description,
            facility_type,
            gender_served,
            bed_count,
            featured,
            verified,
            year_established,
            logo_url,
            gallery_urls,
            status,
            user_id,
            updated_at,
            facility_services (service_name),
            facility_insurance (insurance_name),
            facility_age_groups (age_group),
            facility_credentials (accreditations, licensing_info),
            facility_accreditations (accreditation_type, verified)
          `)
          .eq("slug", slug)
          .eq("user_id", currentUserId)
          .maybeSingle();

        if (ownedData) return ownedData as FacilityData;
      }

      if (approvedError) throw approvedError;
      return null;
    },
    enabled: !!slug,
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

  const { data: facilityPlan = "free" } = useQuery({
    queryKey: ["facility-plan", facility?.id],
    queryFn: async (): Promise<string> => {
      if (!facility?.id) return "free";
      const { data } = await supabase.functions.invoke("get-facility-plan", {
        body: { facilityId: facility.id },
      });
      // Map legacy tiers to Free/Pro
      const plan = data?.plan || "free";
      if (plan === "professional" || plan === "featured") return "pro";
      if (plan === "basic") return "free";
      return plan;
    },
    enabled: !!facility?.id,
    staleTime: 1000 * 60 * 5,
  });

  // Fetch facility rating for badge display
  const ratingData = useFacilityRating(facility?.id);

  useEffect(() => {
    if (facility?.id) {
      // Track view in facility_views (existing system)
      supabase.functions.invoke("track-view", {
        body: { facilityId: facility.id },
      });
      // Track profile view in provider_events (new analytics system)
      trackProfileView(facility.id);
    }
  }, [facility?.id, trackProfileView]);

  const scrollToContact = () => {
    contactFormRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const trackInteraction = useCallback((type: "call" | "website") => {
    if (facility?.id) {
      // Track in facility_interactions (existing system)
      supabase.functions.invoke("track-interaction", {
        body: { facilityId: facility.id, interactionType: type },
      });
      // Track in provider_events (new analytics system)
      if (type === "call") {
        trackClickToCall(facility.id, "profile");
      } else {
        trackWebsiteClick(facility.id, "profile");
      }
    }
  }, [facility?.id, trackClickToCall, trackWebsiteClick]);

  if (isLoading) {
    return (
      <Layout>
        <CenterProfileSkeleton />
      </Layout>
    );
  }

  if (error || !facility) {
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

  const services = facility.facility_services.map((s) => s.service_name);
  const insuranceList = facility.facility_insurance.map((i) => i.insurance_name);
  const ageGroups = facility.facility_age_groups.map((a) => a.age_group);
  const credentials = facility.facility_credentials[0];
  const galleryImages = facility.gallery_urls?.filter(Boolean) || [];
  const initials = getInitials(facility.name);
  const hasValidLogo = facility.logo_url && !logoError;
  const isOwner = currentUserId === facility.user_id;
  const isPending = facility.status === "pending";
  const showContactDetails = facilityPlan === "pro" || isOwner;
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
        canonical={`/center/${facility.slug}`}
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
          phone: facility.phone,
          description: facility.description || `${facility.name} provides quality addiction treatment in ${facility.city}, ${facility.state}.`,
          image: facility.logo_url || undefined,
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
          // Include review ratings for rich snippets when available
          rating: ratingData.averageRating || undefined,
          reviewCount: ratingData.reviewCount || undefined,
        })}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Find Rehab", url: "/rehab-centers" },
          { name: facility.state, url: `/locations/${facility.state.toLowerCase().replace(/\s+/g, "-")}` },
          { name: facility.name, url: `/center/${facility.slug}` },
        ]}
        modifiedTime={facility.updated_at}
      />

      {/* Visual Breadcrumb Navigation */}
      <div className="bg-muted/30 border-b">
        <div className="container py-3">
          <BreadcrumbNav
            items={[
              { label: "Find Rehab", href: "/rehab-centers" },
              { label: facility.state, href: `/rehab-centers/${facility.state.toLowerCase().replace(/\s+/g, "-")}` },
              { label: facility.name },
            ]}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-gradient-to-b from-muted/40 via-background to-background min-h-screen pb-8">
        <div className="container max-w-7xl px-4 py-6 md:px-6 md:py-10">
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

          {/* Hero Header Card */}
          <div className="mb-8 rounded-2xl border border-border/50 bg-card shadow-lg overflow-hidden">
            {/* Hero Image / Gradient Background */}
            <div className="relative h-48 md:h-64 overflow-hidden">
              {galleryImages.length > 0 ? (
                <>
                  <img 
                    src={galleryImages[0]} 
                    alt={facility.name}
                    className="w-full h-full object-cover"
                    width={800}
                    height={400}
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
                </>
              ) : (
                <>
                  <img 
                    src={facilityPlaceholder} 
                    alt={`${facility.name} facility`}
                    className="w-full h-full object-cover"
                    width={800}
                    height={400}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
                </>
              )}
              
              {/* Badges on hero */}
              <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap">
                {/* Rating badge - prominent on hero */}
                {ratingData.averageRating && ratingData.reviewCount > 0 && (
                  <div className="bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg flex items-center gap-1.5">
                    <div className="flex items-center gap-1 text-amber-500">
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="font-bold text-sm text-foreground">{ratingData.averageRating.toFixed(1)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">({ratingData.reviewCount})</span>
                  </div>
                )}
                {hasFeaturedSubscription && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 gap-1.5 px-3 py-1.5 shadow-lg text-xs font-bold uppercase tracking-wide">
                    <Crown className="h-3.5 w-3.5" />
                    Featured
                  </Badge>
                )}
                {facility.verified && (
                  <Badge className="bg-emerald-500 text-white border-0 gap-1.5 px-3 py-1.5 shadow-lg text-xs font-bold uppercase tracking-wide">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Verified
                  </Badge>
                )}
              </div>
              
              {/* Facility info overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                <div className="flex items-end gap-4">
                  {/* Logo */}
                  <div className="h-20 w-20 md:h-24 md:w-24 shrink-0 overflow-hidden rounded-xl border-4 border-card bg-card shadow-xl">
                    {hasValidLogo ? (
                      <img 
                        src={facility.logo_url!} 
                        alt={facility.name} 
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={() => setLogoError(true)}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
                        <span className="font-display text-2xl md:text-3xl font-bold text-primary">
                          {initials}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Name and Location */}
                  <div className="flex-1 min-w-0 pb-1">
                    <h1 className="speakable-headline font-display text-xl md:text-3xl font-bold text-white leading-tight line-clamp-2 drop-shadow-lg">
                      {facility.name}
                    </h1>
                    <div className="speakable-contact flex items-center gap-2 mt-1.5">
                      <MapPin className="h-4 w-4 text-white/80 shrink-0" />
                      <span className="text-sm md:text-base text-white/90 font-medium">{facility.city}, {facility.state}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="bg-muted/40 border-t border-border/50 px-4 py-3 md:px-6 md:py-4">
              <div className="flex items-center gap-3 md:gap-6 overflow-x-auto pb-1 -mb-1">
                <div className="flex items-center gap-2 shrink-0">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Stethoscope className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{facility.facility_type}</span>
                </div>
                {yearsInBusiness && (
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{yearsInBusiness}+ years</span>
                  </div>
                )}
                {genderLabel && (
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-violet-600" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{genderLabel}</span>
                  </div>
                )}
                {facility.bed_count && (
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Bed className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{facility.bed_count} beds</span>
                  </div>
                )}
                {insuranceList.length > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-amber-600" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Accepts Insurance</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons - Responsive for all screens */}
            <div className="flex flex-col sm:flex-row items-stretch gap-3 border-t border-border/50 px-4 py-4 md:px-6 bg-card">
              <Button 
                size="lg" 
                className="flex-1 gap-2 h-12 text-base font-semibold shadow-md"
                onClick={() => setRequestModalOpen(true)}
              >
                <Phone className="h-5 w-5" />
                Request Call
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="flex-1 gap-2 h-12 text-base font-semibold border-2"
                onClick={() => setRequestModalOpen(true)}
              >
                <MessageSquare className="h-5 w-5" />
                Request Info
              </Button>
              {showContactDetails && facility.website && (
                <a 
                  href={facility.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={() => trackInteraction("website")}
                  className="flex-1 sm:flex-none"
                >
                  <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 h-12 border-2">
                    <Globe className="h-4 w-4" />
                    Website
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:gap-8 lg:grid-cols-[1fr,380px]">
            {/* Left Column - Main Content */}
            <div className="space-y-8 lg:space-y-10 min-w-0 divide-y divide-border/40 [&>*]:pt-8 [&>*:first-child]:pt-0">
              {/* Gallery */}
              {galleryImages.length > 0 && (
                <ProfileSection 
                  icon={ImageIcon} 
                  title="Facility Photos"
                  iconColor="bg-rose-500/10 text-rose-600"
                  action={
                    !isOwner && (
                      <button
                        onClick={() => {
                          setReportImageUrl(galleryImages[activeGalleryIndex]);
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
                  {/* Main Image — clean, no overlays */}
                  <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-muted mb-4">
                    <img 
                      src={galleryImages[activeGalleryIndex]} 
                      alt={`${facility.name} - Photo ${activeGalleryIndex + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  
                  {/* Thumbnails */}
                  {galleryImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {galleryImages.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveGalleryIndex(idx)}
                          className={cn(
                            "shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all",
                            idx === activeGalleryIndex 
                              ? "border-primary ring-2 ring-primary/30 shadow-md" 
                              : "border-border/50 hover:border-primary/50 hover:shadow-sm"
                          )}
                        >
                          <img src={img} alt={`${facility.name} facility photo ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  )}
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

              {/* Contact & Location Details */}
              <ProfileSection 
                icon={MapPin} 
                title="Contact & Location"
                iconColor="bg-blue-500/10 text-blue-600"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Address */}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                    <MapPin className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Address</p>
                      <p className="text-sm text-foreground font-medium">{facility.address}</p>
                      <p className="text-sm text-muted-foreground">{facility.city}, {facility.state} {facility.zip_code}</p>
                    </div>
                  </div>

                  {/* Phone */}
                  {showContactDetails ? (
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
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                      <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Phone</p>
                        <p className="text-sm text-muted-foreground">Use contact form to request a call</p>
                      </div>
                    </div>
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
              </ProfileSection>

              {/* Services & Programs */}
              {services.length > 0 && (
                <ProfileSection 
                  icon={CheckCircle} 
                  title="Services & Programs"
                  iconColor="bg-emerald-500/10 text-emerald-600"
                >
                  <div className="flex flex-wrap gap-2">
                    {(showAllServices ? services : services.slice(0, 8)).map((service) => (
                      <Badge 
                        key={service} 
                        variant="secondary" 
                        className="px-3 py-1.5 text-sm bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50 hover:bg-emerald-500/15 transition-colors font-medium"
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                        {service}
                      </Badge>
                    ))}
                    {services.length > 8 && (
                      <button
                        onClick={() => setShowAllServices(!showAllServices)}
                        className="px-3 py-1.5 text-sm font-semibold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/15 rounded-full transition-all cursor-pointer"
                      >
                        {showAllServices ? 'Show less' : `+${services.length - 8} more`}
                      </button>
                    )}
                  </div>
                  
                  {/* Age Groups */}
                  {ageGroups.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-border/60">
                      <div className="flex items-center gap-2 mb-4">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-semibold text-foreground">Age Groups Served</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {ageGroups.map((age) => (
                          <Badge 
                            key={age} 
                            variant="outline" 
                            className="px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors font-medium"
                          >
                            {age}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </ProfileSection>
              )}

              {/* Insurance Accepted */}
              {insuranceList.length > 0 && (
                <ProfileSection 
                  icon={Shield} 
                  title="Insurance Accepted"
                  iconColor="bg-amber-500/10 text-amber-600"
                >
                  <div className="flex flex-wrap gap-2">
                    {(showAllInsurance ? insuranceList : insuranceList.slice(0, 8)).map((ins) => (
                      <Badge 
                        key={ins} 
                        variant="secondary" 
                        className="px-3 py-1.5 text-sm bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/50 hover:bg-amber-500/15 transition-colors font-medium"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                        {ins}
                      </Badge>
                    ))}
                    {insuranceList.length > 8 && (
                      <button
                        onClick={() => setShowAllInsurance(!showAllInsurance)}
                        className="px-3 py-1.5 text-sm font-semibold text-amber-700 hover:text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-full transition-all cursor-pointer"
                      >
                        {showAllInsurance ? 'Show less' : `+${insuranceList.length - 8} more`}
                      </button>
                    )}
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">
                    Insurance coverage varies. Contact us to verify your specific plan.
                  </p>
                </ProfileSection>
              )}

              {/* Trust & Accreditations */}
              <TrustBadgesSection
                verified={facility.verified || false}
                yearEstablished={facility.year_established}
                accreditations={facility.facility_accreditations || []}
                facilityType={facility.facility_type}
              />

              {/* Google Reviews - shown below trust badges */}
              <GoogleReviewsDisplay facilityId={facility.id} />

              {/* Our Team Section */}
              <FacilityStaffSection facilityId={facility.id} />

              {/* Community Reviews Section */}
              <FacilityReviewsSection 
                facilityId={facility.id} 
                facilityName={facility.name} 
              />
            </div>

            {/* Right Column - Sticky Sidebar */}
            <div className="hidden lg:block">
              <div className="sticky top-24 space-y-4">
                {/* Contact CTA Card */}
                <div 
                  ref={contactFormRef}
                  className="rounded-xl border border-border/50 bg-card p-5 shadow-lg"
                >
                  <div className="text-center mb-5">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-md mb-3">
                      <MessageSquare className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-foreground mb-1">
                      Get Help Today
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Take the first step towards recovery
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Button 
                      size="lg" 
                      className="w-full gap-2 h-12 text-base font-semibold shadow-md"
                      onClick={() => setRequestModalOpen(true)}
                    >
                      <Sparkles className="h-4 w-4" />
                      Request Info
                    </Button>

                    {showContactDetails && (
                      <a href={`tel:${facility.phone}`} onClick={() => trackInteraction("call")} className="block">
                        <Button variant="outline" size="lg" className="w-full gap-2 h-11 text-sm font-semibold border-2">
                          <Phone className="h-4 w-4" />
                          {formatPhoneNumber(facility.phone)}
                        </Button>
                      </a>
                    )}
                  </div>

                  {/* Trust indicators */}
                  <div className="mt-5 pt-4 border-t border-border/50 space-y-3">
                    <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 shrink-0">
                        <Clock className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                      <span><strong className="text-foreground">Quick Response</strong> - Within 24 hours</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <Shield className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span><strong className="text-foreground">100% Confidential</strong></span>
                    </div>
                  </div>
                </div>

                {/* Facility Overview Card */}
                <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
                  <h3 className="font-display text-base font-bold text-foreground mb-4 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Quick Facts
                  </h3>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between py-1.5 text-sm">
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-medium text-foreground">{facility.facility_type}</span>
                    </div>
                    {genderLabel && (
                      <div className="flex items-center justify-between py-1.5 text-sm border-t border-border/30">
                        <span className="text-muted-foreground">Gender</span>
                        <span className="font-medium text-foreground">{genderLabel}</span>
                      </div>
                    )}
                    {facility.bed_count && (
                      <div className="flex items-center justify-between py-1.5 text-sm border-t border-border/30">
                        <span className="text-muted-foreground">Capacity</span>
                        <span className="font-medium text-foreground">{facility.bed_count} beds</span>
                      </div>
                    )}
                    {facility.year_established && (
                      <div className="flex items-center justify-between py-1.5 text-sm border-t border-border/30">
                        <span className="text-muted-foreground">Established</span>
                        <span className="font-medium text-foreground">{facility.year_established}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between py-1.5 text-sm border-t border-border/30">
                      <span className="text-muted-foreground">Programs</span>
                      <span className="font-medium text-foreground">{services.length}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 text-sm border-t border-border/30">
                      <span className="text-muted-foreground">Insurance</span>
                      <span className="font-medium text-foreground">{insuranceList.length} accepted</span>
                    </div>
                  </div>
                </div>

                {/* Concierge CTA Card */}
                <ConciergeCTACard />
              </div>
            </div>
          </div>

          {/* Mobile Sidebar Content - Shows below main content on mobile */}
          <div className="lg:hidden mt-6 space-y-5">
            {/* Contact CTA Card - Mobile */}
            <div className="rounded-xl border border-border/60 bg-gradient-to-b from-card to-muted/30 p-5 shadow-lg">
              <div className="text-center mb-5">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg mb-3">
                  <MessageSquare className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground mb-1.5">
                  Request Information
                </h3>
                <p className="text-sm text-muted-foreground">
                  Take the first step towards recovery.
                </p>
              </div>

              <div className="space-y-3">
                <Button 
                  size="lg" 
                  className="w-full gap-2 h-12 text-base font-semibold shadow-md"
                  onClick={() => setRequestModalOpen(true)}
                >
                  <Sparkles className="h-4 w-4" />
                  Get Started
                </Button>

                {showContactDetails && (
                  <a href={`tel:${facility.phone}`} onClick={() => trackInteraction("call")} className="block">
                    <Button variant="outline" size="lg" className="w-full gap-2 h-11 text-sm font-semibold border-2">
                      <Phone className="h-4 w-4" />
                      {formatPhoneNumber(facility.phone)}
                    </Button>
                  </a>
                )}
              </div>
            </div>

            {/* Facility Overview Card - Mobile */}
            <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
              <h3 className="font-display text-base font-bold text-foreground mb-4 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Quick Facts
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <span className="text-[10px] text-muted-foreground block uppercase tracking-wide">Type</span>
                  <span className="text-xs font-semibold text-foreground">{facility.facility_type}</span>
                </div>
                {genderLabel && (
                  <div className="p-2.5 rounded-lg bg-muted/50">
                    <span className="text-[10px] text-muted-foreground block uppercase tracking-wide">Gender</span>
                    <span className="text-xs font-semibold text-foreground">{genderLabel}</span>
                  </div>
                )}
                {facility.bed_count && (
                  <div className="p-2.5 rounded-lg bg-muted/50">
                    <span className="text-[10px] text-muted-foreground block uppercase tracking-wide">Capacity</span>
                    <span className="text-xs font-semibold text-foreground">{facility.bed_count} beds</span>
                  </div>
                )}
                {facility.year_established && (
                  <div className="p-2.5 rounded-lg bg-muted/50">
                    <span className="text-[10px] text-muted-foreground block uppercase tracking-wide">Established</span>
                    <span className="text-xs font-semibold text-foreground">{facility.year_established}</span>
                  </div>
                )}
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <span className="text-[10px] text-muted-foreground block uppercase tracking-wide">Services</span>
                  <span className="text-xs font-semibold text-foreground">{services.length} programs</span>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <span className="text-[10px] text-muted-foreground block uppercase tracking-wide">Insurance</span>
                  <span className="text-xs font-semibold text-foreground">{insuranceList.length} accepted</span>
                </div>
              </div>
            </div>

            {/* Concierge CTA Card - Mobile */}
            <ConciergeCTACard compact />
          </div>
        </div>
      </div>

      {/* Request Info Modal */}
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
        prefillData={prefillDataFromNav}
      />

      {/* Report Image Dialog */}
      <ReportImageDialog
        open={reportImageOpen}
        onOpenChange={setReportImageOpen}
        facilityId={facility.id}
        imageUrl={reportImageUrl}
        imageType={reportImageType}
      />
    </Layout>
  );
};

export default CenterProfile;
