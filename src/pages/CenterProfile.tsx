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
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { CenterProfileSkeleton } from "@/components/skeletons/CenterProfileSkeleton";
import { useEffect, useRef, useState, useCallback } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReportImageDialog } from "@/components/profile/ReportImageDialog";
import { TrustBadgesInline } from "@/components/trust/TrustBadgesSection";
import { TrustBadge, AccreditationType } from "@/components/trust/TrustBadge";
import { GoogleReviewsCard } from "@/components/reviews/GoogleReviewsCard";
import { FacilityReviewsSection } from "@/components/reviews/FacilityReviewsSection";
import { usePublicGoogleReviews } from "@/hooks/useGoogleReviews";
import { cn } from "@/lib/utils";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { useProviderEventTracking } from "@/hooks/useProviderEventTracking";
import { FacilityStaffSection } from "@/components/facility/FacilityStaffSection";
import { ConciergeCTACard } from "@/components/concierge/ConciergeCTACard";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

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
  const [lightboxOpen, setLightboxOpen] = useState(false);
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

  // Fetch nearby/related facilities from same state
  const { data: nearbyFacilities = [] } = useQuery({
    queryKey: ["nearby-facilities", facility?.state, facility?.id],
    queryFn: async () => {
      if (!facility) return [];
      const { data } = await supabase
        .from("facilities")
        .select("id, name, slug, city, state, zip_code, address, phone, description, facility_type, featured, verified, logo_url, gallery_urls, year_established")
        .eq("state", facility.state)
        .eq("status", "approved")
        .neq("id", facility.id)
        .limit(6);
      return (data || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        slug: f.slug,
        city: f.city,
        state: f.state,
        zipCode: f.zip_code,
        address: f.address,
        phone: f.phone,
        description: f.description || "",
        treatmentTypes: [],
        insuranceAccepted: [],
        amenities: [],
        rating: null,
        reviewCount: 0,
        image: f.gallery_urls?.[0] || f.logo_url || null,
        featured: f.featured,
        verified: f.verified,
        logo_url: f.logo_url,
        gallery_urls: f.gallery_urls,
        year_established: f.year_established,
        isFromDatabase: true,
        programOverview: "",
      }));
    },
    enabled: !!facility?.id && !!facility?.state,
    staleTime: 1000 * 60 * 10,
  });

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

      {/* Main Content */}
      <div className="bg-gradient-to-b from-muted/40 via-background to-background min-h-screen pb-8">
        <div className="container max-w-7xl px-4 py-6 md:px-6 md:py-10">
          <BreadcrumbNav
            items={[
              { label: "Find Rehab", href: "/rehab-centers" },
              { label: facility.state, href: `/rehab-centers/${facility.state.toLowerCase().replace(/\s+/g, "-")}` },
              { label: facility.name },
            ]}
            className="mb-4"
          />
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
            {/* Hero Image */}
            <div className="relative h-52 md:h-72 overflow-hidden">
              {galleryImages.length > 0 ? (
                <img 
                  src={galleryImages[0]} 
                  alt={facility.name}
                  className="w-full h-full object-cover"
                  width={800}
                  height={400}
                  loading="eager"
                />
              ) : (
                <img 
                  src={facilityPlaceholder} 
                  alt={`${facility.name} facility`}
                  className="w-full h-full object-cover"
                  width={800}
                  height={400}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              
              {/* Status Badges — top left */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                {ratingData.averageRating && ratingData.reviewCount > 0 && (
                  <div className="bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-md flex items-center gap-1">
                    <svg className="h-3.5 w-3.5 fill-amber-500" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-bold text-xs text-foreground">{ratingData.averageRating.toFixed(1)}</span>
                    <span className="text-[10px] text-muted-foreground">({ratingData.reviewCount})</span>
                  </div>
                )}
                {hasFeaturedSubscription && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 gap-1 px-2.5 py-1 shadow-md text-[10px] font-bold uppercase tracking-wider">
                    <Crown className="h-3 w-3" />
                    Featured
                  </Badge>
                )}
                {facility.verified && (
                  <Badge className="bg-emerald-500/90 text-white border-0 gap-1 px-2.5 py-1 shadow-md text-[10px] font-bold uppercase tracking-wider">
                    <ShieldCheck className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
              
              {/* Facility identity overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                <div className="flex items-end gap-3.5">
                  <div className="h-16 w-16 md:h-20 md:w-20 shrink-0 overflow-hidden rounded-xl border-[3px] border-card bg-card shadow-xl">
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
                        <span className="font-display text-xl md:text-2xl font-bold text-primary">{initials}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pb-0.5">
                    <h1 className="speakable-headline font-display text-xl md:text-2xl lg:text-3xl font-bold text-white leading-tight line-clamp-2 drop-shadow-lg">
                      {facility.name}
                    </h1>
                    <div className="speakable-contact flex items-center gap-1.5 mt-1">
                      <MapPin className="h-3.5 w-3.5 text-white/70 shrink-0" />
                      <span className="text-sm text-white/85 font-medium">{facility.city}, {facility.state}</span>
                    </div>
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
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-stretch gap-2 px-4 py-3 md:px-6 border-t border-border/30 bg-card">
              <Button 
                size="lg" 
                className="flex-1 gap-2 h-11 text-sm font-semibold shadow-sm"
                onClick={() => setRequestModalOpen(true)}
              >
                <Phone className="h-4 w-4" />
                Request Call
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="flex-1 gap-2 h-11 text-sm font-semibold"
                onClick={() => setRequestModalOpen(true)}
              >
                <MessageSquare className="h-4 w-4" />
                Request Info
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

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:gap-8 lg:grid-cols-[1fr,380px]">
            {/* Left Column - Main Content */}
            <div className="space-y-0 min-w-0 divide-y divide-border [&>*]:py-8 [&>*:first-child]:pt-0">
              {/* Gallery — compact grid with lightbox */}
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 rounded-xl overflow-hidden">
                    {galleryImages.slice(0, 8).map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setActiveGalleryIndex(idx); setLightboxOpen(true); }}
                        className={cn(
                          "relative aspect-square overflow-hidden bg-muted group",
                          idx === 0 && "col-span-2 row-span-2"
                        )}
                      >
                        <img 
                          src={img} 
                          alt={`${facility.name} - Photo ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        {idx === 7 && galleryImages.length > 8 && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-white font-bold text-base">+{galleryImages.length - 8}</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
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
                  <div className="flex flex-wrap gap-1.5">
                    {(showAllServices ? services : services.slice(0, 8)).map((service) => (
                      <Badge 
                        key={service} 
                        variant="secondary" 
                        className="px-2.5 py-1 text-xs bg-muted hover:bg-muted/80 text-foreground font-medium transition-colors"
                      >
                        <CheckCircle className="h-3 w-3 mr-1 text-emerald-600" />
                        {service}
                      </Badge>
                    ))}
                    {services.length > 8 && (
                      <button
                        onClick={() => setShowAllServices(!showAllServices)}
                        className="px-2.5 py-1 text-xs font-semibold text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 rounded-full transition-all cursor-pointer"
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
                  <div className="flex flex-wrap gap-1.5">
                    {(showAllInsurance ? insuranceList : insuranceList.slice(0, 8)).map((ins) => (
                      <Badge 
                        key={ins} 
                        variant="outline" 
                        className="px-2.5 py-1 text-xs font-medium hover:bg-muted/50 transition-colors"
                      >
                        {ins}
                      </Badge>
                    ))}
                    {insuranceList.length > 8 && (
                      <button
                        onClick={() => setShowAllInsurance(!showAllInsurance)}
                        className="px-2.5 py-1 text-xs font-semibold text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 rounded-full transition-all cursor-pointer"
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

              {/* Trust & Accreditations — inline, no card wrapper */}
              {(() => {
                const verifiedAccreditations = (facility.facility_accreditations || []).filter(a => a.verified);
                const isLuxury = facility.facility_type?.toLowerCase().includes("luxury");
                const hasContent = facility.verified || (yearsInBusiness && yearsInBusiness > 0) || verifiedAccreditations.length > 0 || isLuxury;
                if (!hasContent) return null;
                return (
                  <ProfileSection
                    icon={ShieldCheck}
                    title="Trust & Accreditations"
                    iconColor="bg-emerald-500/10 text-emerald-600"
                  >
                    <div className="flex flex-wrap gap-2">
                      {isLuxury && <TrustBadge type="luxury" />}
                      {facility.verified && <TrustBadge type="verified" />}
                      {yearsInBusiness && yearsInBusiness > 0 && <TrustBadge type="years" years={yearsInBusiness} />}
                      {verifiedAccreditations.map((acc) => (
                        <TrustBadge key={acc.accreditation_type} type={acc.accreditation_type as AccreditationType} verified={acc.verified} />
                      ))}
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground">
                      Accreditations are verified by our team. Learn more about what these badges mean.
                    </p>
                  </ProfileSection>
                );
              })()}

              {/* Google Reviews */}
              <GoogleReviewsDisplay facilityId={facility.id} />

              {/* Our Team Section */}
              <FacilityStaffSection facilityId={facility.id} />

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
                      onClick={() => setRequestModalOpen(true)}
                    >
                      <Sparkles className="h-4 w-4" />
                      Request Info
                    </Button>

                    {showContactDetails && (
                      <a href={`tel:${facility.phone}`} onClick={() => trackInteraction("call")} className="block">
                        <Button variant="outline" size="lg" className="w-full gap-2 h-10 text-xs font-semibold">
                          <Phone className="h-3.5 w-3.5" />
                          {formatPhoneNumber(facility.phone)}
                        </Button>
                      </a>
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

                {/* Quick Facts */}
                <div className="rounded-2xl bg-card border border-border/40 p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-foreground mb-3">Quick Facts</h3>
                  <div className="space-y-0 divide-y divide-border/30">
                    <div className="flex items-center justify-between py-2 text-xs">
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-medium text-foreground">{facility.facility_type}</span>
                    </div>
                    {genderLabel && (
                      <div className="flex items-center justify-between py-2 text-xs">
                        <span className="text-muted-foreground">Gender</span>
                        <span className="font-medium text-foreground">{genderLabel}</span>
                      </div>
                    )}
                    {facility.bed_count && (
                      <div className="flex items-center justify-between py-2 text-xs">
                        <span className="text-muted-foreground">Capacity</span>
                        <span className="font-medium text-foreground">{facility.bed_count} beds</span>
                      </div>
                    )}
                    {facility.year_established && (
                      <div className="flex items-center justify-between py-2 text-xs">
                        <span className="text-muted-foreground">Established</span>
                        <span className="font-medium text-foreground">{facility.year_established}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between py-2 text-xs">
                      <span className="text-muted-foreground">Programs</span>
                      <span className="font-medium text-foreground">{services.length}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 text-xs">
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

          {/* Mobile Bottom Content */}
          <div className="lg:hidden mt-8 space-y-4">
            {/* Mobile CTA */}
            <div className="rounded-2xl bg-card border border-border/40 p-5">
              <h3 className="font-display text-base font-bold text-foreground mb-1">
                Request Information
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Take the first step towards recovery.
              </p>
              <div className="space-y-2.5">
                <Button 
                  size="lg" 
                  className="w-full gap-2 h-11 text-sm font-semibold"
                  onClick={() => setRequestModalOpen(true)}
                >
                  <Sparkles className="h-4 w-4" />
                  Get Started
                </Button>
                {showContactDetails && (
                  <a href={`tel:${facility.phone}`} onClick={() => trackInteraction("call")} className="block">
                    <Button variant="outline" size="lg" className="w-full gap-2 h-10 text-xs font-semibold">
                      <Phone className="h-3.5 w-3.5" />
                      {formatPhoneNumber(facility.phone)}
                    </Button>
                  </a>
                )}
              </div>
            </div>

            {/* Mobile Quick Facts */}
            <div className="rounded-2xl bg-card border border-border/40 p-5">
              <h3 className="text-sm font-bold text-foreground mb-3">Quick Facts</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-muted/40">
                  <span className="text-[10px] text-muted-foreground block uppercase tracking-wide">Type</span>
                  <span className="text-xs font-semibold text-foreground">{facility.facility_type}</span>
                </div>
                {genderLabel && (
                  <div className="p-2.5 rounded-lg bg-muted/40">
                    <span className="text-[10px] text-muted-foreground block uppercase tracking-wide">Gender</span>
                    <span className="text-xs font-semibold text-foreground">{genderLabel}</span>
                  </div>
                )}
                {facility.bed_count && (
                  <div className="p-2.5 rounded-lg bg-muted/40">
                    <span className="text-[10px] text-muted-foreground block uppercase tracking-wide">Capacity</span>
                    <span className="text-xs font-semibold text-foreground">{facility.bed_count} beds</span>
                  </div>
                )}
                {facility.year_established && (
                  <div className="p-2.5 rounded-lg bg-muted/40">
                    <span className="text-[10px] text-muted-foreground block uppercase tracking-wide">Established</span>
                    <span className="text-xs font-semibold text-foreground">{facility.year_established}</span>
                  </div>
                )}
                <div className="p-2.5 rounded-lg bg-muted/40">
                  <span className="text-[10px] text-muted-foreground block uppercase tracking-wide">Services</span>
                  <span className="text-xs font-semibold text-foreground">{services.length} programs</span>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40">
                  <span className="text-[10px] text-muted-foreground block uppercase tracking-wide">Insurance</span>
                  <span className="text-xs font-semibold text-foreground">{insuranceList.length} accepted</span>
                </div>
              </div>
            </div>

            <ConciergeCTACard compact />
          </div>

          {/* Nearby Facilities */}
          {nearbyFacilities.length > 0 && (
            <div className="mt-10 pt-8 border-t border-border">
              <div className="flex items-center gap-2.5 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/80">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
                  More Facilities in {facility.state}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {nearbyFacilities.slice(0, 6).map((center: any) => (
                  <TreatmentCenterCard key={center.id} center={center} variant="compact" />
                ))}
              </div>
              <div className="text-center mt-6">
                <Link to={`/rehab-centers/${facility.state.toLowerCase().replace(/\s+/g, "-")}`}>
                  <Button variant="outline" className="gap-2">
                    View All in {facility.state}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Photo Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl w-[95vw] sm:w-[90vw] p-0 bg-black/95 border-none">
          <VisuallyHidden>
            <DialogTitle>{facility.name} Photo Gallery</DialogTitle>
          </VisuallyHidden>
          <div className="relative aspect-[4/3] sm:aspect-[16/10] w-full">
            <img
              src={galleryImages[activeGalleryIndex]}
              alt={`${facility.name} - Photo ${activeGalleryIndex + 1}`}
              className="w-full h-full object-contain"
            />
            {galleryImages.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setActiveGalleryIndex(activeGalleryIndex === 0 ? galleryImages.length - 1 : activeGalleryIndex - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setActiveGalleryIndex(activeGalleryIndex === galleryImages.length - 1 ? 0 : activeGalleryIndex + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/60 text-white text-sm font-medium">
              {activeGalleryIndex + 1} / {galleryImages.length}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLightboxOpen(false)}
              className="absolute top-2 right-2 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          {galleryImages.length > 1 && (
            <div className="hidden sm:flex gap-1.5 p-3 overflow-x-auto bg-black/80">
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveGalleryIndex(idx)}
                  className={cn(
                    "shrink-0 w-14 h-10 rounded overflow-hidden transition-all",
                    idx === activeGalleryIndex ? "ring-2 ring-white opacity-100" : "opacity-50 hover:opacity-75"
                  )}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
