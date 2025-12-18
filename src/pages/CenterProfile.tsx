import { useParams, Link, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateLocalBusinessSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { RequestInfoModal } from "@/components/profile/RequestInfoModal";
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  MessageSquare,
  Flag,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReportImageDialog } from "@/components/profile/ReportImageDialog";
import { TrustBadgesInline, TrustBadgesSection } from "@/components/trust/TrustBadgesSection";

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
  facility_services: { service_name: string }[];
  facility_insurance: { insurance_name: string }[];
  facility_age_groups: { age_group: string }[];
  facility_credentials: { accreditations: string | null; licensing_info: string | null }[];
  facility_accreditations: { accreditation_type: string; verified: boolean }[];
}

// Generate initials from facility name (first letters of first 2 words)
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const CenterProfile = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const queryClient = useQueryClient();
  const contactFormRef = useRef<HTMLDivElement>(null);
  const [showAllInsurance, setShowAllInsurance] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [logoError, setLogoError] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [reportImageOpen, setReportImageOpen] = useState(false);
  const [reportImageUrl, setReportImageUrl] = useState<string>("");
  const [reportImageType, setReportImageType] = useState<"logo" | "gallery">("gallery");
  
  // Navigation state for prefill and auto-open
  const fromSearch = location.state?.fromSearch;
  const openModalFromNav = location.state?.openRequestModal;
  const prefillDataFromNav = location.state?.prefillData;
  
  // Auto-open modal if navigating with openRequestModal state
  useEffect(() => {
    if (openModalFromNav) {
      setRequestModalOpen(true);
      // Clear the state to prevent re-opening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [openModalFromNav]);

  // Get current user for owner check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  // Real-time subscription for facility updates
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
        (payload) => {
          // Only invalidate if it might be our facility
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

  // Fetch facility data by slug
  const { data: facility, isLoading, error } = useQuery({
    queryKey: ["facility", slug, currentUserId],
    queryFn: async (): Promise<FacilityData | null> => {
      // First try to get approved facility (public access)
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

      // If not found as approved, try to get if user owns it (any status)
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

  // Check if facility has Featured subscription
  const { data: hasFeaturedSubscription } = useQuery({
    queryKey: ["featured-subscription-check", facility?.id],
    queryFn: async (): Promise<boolean> => {
      if (!facility?.id) return false;
      const { data } = await supabase.functions.invoke("get-featured-facilities");
      const featuredIds: string[] = data?.featured_facility_ids || [];
      return featuredIds.includes(facility.id);
    },
    enabled: !!facility?.id,
    staleTime: 1000 * 60 * 5,
  });

  // Check facility's subscription plan (to show/hide phone & website for basic plan)
  const { data: facilityPlan = "basic" } = useQuery({
    queryKey: ["facility-plan", facility?.id],
    queryFn: async (): Promise<string> => {
      if (!facility?.id) return "basic";
      const { data } = await supabase.functions.invoke("get-facility-plan", {
        body: { facilityId: facility.id },
      });
      return data?.plan || "basic";
    },
    enabled: !!facility?.id,
    staleTime: 1000 * 60 * 5,
  });

  // Determine if phone/website should be shown (paid plans only) - computed in JSX after isOwner is defined

  // Track view
  useEffect(() => {
    if (facility?.id) {
      supabase.functions.invoke("track-view", {
        body: { facilityId: facility.id },
      });
    }
  }, [facility?.id]);

  const scrollToContact = () => {
    contactFormRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Track interaction (call or website click)
  const trackInteraction = (type: "call" | "website") => {
    if (facility?.id) {
      supabase.functions.invoke("track-interaction", {
        body: { facilityId: facility.id, interactionType: type },
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="bg-muted/30 min-h-screen py-8">
          <div className="container max-w-6xl">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-48 w-full mb-6 rounded-xl" />
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <Skeleton className="h-40 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
              </div>
              <Skeleton className="h-80 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !facility) {
    return (
      <Layout>
        <div className="bg-muted/30 min-h-screen py-20">
          <div className="container max-w-md text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <Building2 className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="mb-3 font-display text-xl font-bold text-foreground">
              Center Not Found
            </h1>
            <p className="mb-6 text-sm text-muted-foreground">
              The treatment center you're looking for doesn't exist or is no longer available.
            </p>
            <Link to="/rehab-centers">
              <Button size="sm" className="gap-2">
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
  const showContactDetails = facilityPlan !== "basic" || isOwner;

  return (
    <Layout>
      <SEO
        title={`${facility.name} - Addiction Treatment in ${facility.city}, ${facility.state}`}
        description={facility.description || `${facility.name} offers addiction treatment services in ${facility.city}, ${facility.state}. Contact us to learn more about our programs and verify insurance coverage.`}
        canonical={`/center/${facility.slug}`}
        structuredData={generateLocalBusinessSchema({
          name: facility.name,
          address: facility.address,
          city: facility.city,
          state: facility.state,
          zipCode: facility.zip_code,
          phone: facility.phone,
          description: facility.description || "",
          image: facility.logo_url || undefined,
          services: services,
        })}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Find Rehab", url: "/rehab-centers" },
          { name: facility.name, url: `/center/${facility.slug}` },
        ]}
      />
      {/* Sticky Mobile CTA - Enhanced Touch Targets */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card px-4 py-4 shadow-xl md:hidden safe-area-bottom">
        <div className="flex gap-3">
          {showContactDetails ? (
            <a 
              href={`tel:${facility.phone}`} 
              className="flex-1"
              onClick={() => trackInteraction("call")}
            >
              <Button className="w-full h-12 gap-2 text-base font-semibold">
                <Phone className="h-5 w-5" />
                Call Now
              </Button>
            </a>
          ) : (
            <Button 
              className="flex-1 h-12 gap-2 text-base font-semibold"
              onClick={() => setRequestModalOpen(true)}
            >
              <Phone className="h-5 w-5" />
              Request Call
            </Button>
          )}
          <Button 
            variant="outline" 
            className="flex-1 h-12 gap-2 text-base font-semibold"
            onClick={() => setRequestModalOpen(true)}
          >
            <MessageSquare className="h-5 w-5" />
            Contact
          </Button>
        </div>
      </div>

      {/* Main Content - Contained Layout */}
      <div className="bg-muted/30 min-h-screen pb-28 md:pb-0">
        <div className="container max-w-6xl px-4 py-5 md:px-6 md:py-8">
          {/* Pending Status Banner for Owner */}
          {isOwner && isPending && (
            <Alert className="mb-5 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50">
              <Clock className="h-5 w-5 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm md:text-base">
                <strong>Preview Mode:</strong> Your listing is under review and only visible to you. 
                It will be publicly visible once approved (usually within 24-48 hours).
              </AlertDescription>
            </Alert>
          )}

          {/* Back Link */}
          {fromSearch && (
            <Link
              to="/rehab-centers"
              className="mb-5 inline-flex items-center gap-2 text-base text-muted-foreground hover:text-foreground transition-colors h-12 md:h-auto md:text-sm"
            >
              <ArrowLeft className="h-5 w-5 md:h-4 md:w-4" />
              Back to search results
            </Link>
          )}

          {/* Header Card */}
          <div className="mb-5 md:mb-6 rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-4">
                {/* Logo with Reserved Space - Larger on mobile */}
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted md:h-20 md:w-20">
                  {hasValidLogo ? (
                    <img 
                      src={facility.logo_url!} 
                      alt={facility.name} 
                      className="h-full w-full object-contain"
                      loading="lazy"
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <span className="font-display text-2xl font-bold text-primary">
                        {initials}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  {/* Badges - Larger touch targets on mobile */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {hasFeaturedSubscription && (
                      <Badge className="bg-accent text-accent-foreground border-0 gap-1.5 text-sm px-3 py-1.5 md:text-xs md:px-2 md:py-0.5">
                        <Crown className="h-4 w-4 md:h-3 md:w-3" />
                        Featured
                      </Badge>
                    )}
                    <TrustBadgesInline 
                      verified={facility.verified || false}
                      yearEstablished={facility.year_established}
                      accreditations={facility.facility_accreditations || []}
                      size="md"
                    />
                  </div>
                  
                  <h1 className="font-display text-xl font-bold text-foreground md:text-2xl leading-tight">
                    {facility.name}
                  </h1>
                  <p className="mt-2 flex items-center gap-2 text-base text-muted-foreground md:text-sm md:mt-1 md:gap-1.5">
                    <MapPin className="h-5 w-5 shrink-0 md:h-4 md:w-4" />
                    {facility.city}, {facility.state} {facility.zip_code}
                  </p>
                </div>
              </div>

              {/* Desktop Actions */}
              <div className="hidden md:flex flex-col gap-2 shrink-0">
                {showContactDetails ? (
                  <a 
                    href={`tel:${facility.phone}`}
                    onClick={() => trackInteraction("call")}
                  >
                    <Button size="sm" className="w-full gap-2">
                      <Phone className="h-4 w-4" />
                      Call Now
                    </Button>
                  </a>
                ) : (
                  <Button 
                    size="sm" 
                    className="w-full gap-2"
                    onClick={() => setRequestModalOpen(true)}
                  >
                    <Phone className="h-4 w-4" />
                    Request Call
                  </Button>
                )}
                <div className="flex gap-2">
                  {showContactDetails && facility.website && (
                    <a 
                      href={facility.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => trackInteraction("website")}
                    >
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <Globe className="h-4 w-4" />
                        Website
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </a>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="gap-2"
                    onClick={() => setRequestModalOpen(true)}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Contact
                  </Button>
                </div>
              </div>
            </div>

            {/* Service Tags - Scrollable on mobile */}
            {services.length > 0 && (
              <div className="mt-5 pt-5 border-t border-border md:mt-4 md:pt-4">
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 md:flex-wrap md:overflow-visible md:pb-0 md:mx-0 md:px-0 md:gap-1.5">
                  {services.slice(0, 5).map((service) => (
                    <Badge key={service} variant="secondary" className="text-sm px-3 py-1.5 whitespace-nowrap md:text-xs md:px-2.5 md:py-1">
                      {service}
                    </Badge>
                  ))}
                  {services.length > 5 && (
                    <Badge variant="outline" className="text-sm px-3 py-1.5 text-muted-foreground whitespace-nowrap md:text-xs md:px-2.5 md:py-1">
                      +{services.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Two Column Layout */}
          <div className="grid gap-5 lg:grid-cols-3 md:gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-5">
              {/* Gallery Section - Only show if images exist */}
              {galleryImages.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm md:rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-primary md:h-4 md:w-4" />
                      <h2 className="font-display text-lg font-semibold text-foreground md:text-base">
                        Facility Photos
                      </h2>
                    </div>
                    {!isOwner && (
                      <button
                        onClick={() => {
                          setReportImageUrl(galleryImages[activeGalleryIndex]);
                          setReportImageType("gallery");
                          setReportImageOpen(true);
                        }}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                        title="Report this image"
                      >
                        <Flag className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Report</span>
                      </button>
                    )}
                  </div>
                  
                  {/* Main Image */}
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-muted mb-4 md:rounded-lg md:mb-3">
                    <img 
                      src={galleryImages[activeGalleryIndex]} 
                      alt={`${facility.name} - Photo ${activeGalleryIndex + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {galleryImages.length > 1 && (
                      <>
                        <button
                          onClick={() => setActiveGalleryIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1))}
                          className="absolute left-3 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-card/95 flex items-center justify-center shadow-lg active:scale-95 transition-transform md:h-8 md:w-8 md:left-2"
                        >
                          <ChevronLeft className="h-6 w-6 md:h-4 md:w-4" />
                        </button>
                        <button
                          onClick={() => setActiveGalleryIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-card/95 flex items-center justify-center shadow-lg active:scale-95 transition-transform md:h-8 md:w-8 md:right-2"
                        >
                          <ChevronRight className="h-6 w-6 md:h-4 md:w-4" />
                        </button>
                      </>
                    )}
                    {/* Image counter on mobile */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-card/90 px-3 py-1.5 rounded-full text-sm font-medium md:hidden">
                      {activeGalleryIndex + 1} / {galleryImages.length}
                    </div>
                  </div>
                  
                  {/* Thumbnails - Larger on mobile */}
                  {galleryImages.length > 1 && (
                    <div className="flex gap-3 overflow-x-auto pb-2 md:gap-2 md:pb-1">
                      {galleryImages.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveGalleryIndex(idx)}
                          className={`shrink-0 w-18 h-18 rounded-xl overflow-hidden border-2 transition-all active:scale-95 md:w-14 md:h-14 md:rounded-md ${
                            idx === activeGalleryIndex ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-border'
                          }`}
                          style={{ width: '72px', height: '72px' }}
                        >
                          <img 
                            src={img} 
                            alt="" 
                            className="w-full h-full object-cover" 
                            loading="lazy" 
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* About Section */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm md:rounded-xl">
                <div className="flex items-center gap-2 mb-4 md:mb-3">
                  <Building2 className="h-5 w-5 text-primary md:h-4 md:w-4" />
                  <h2 className="font-display text-lg font-semibold text-foreground md:text-base">
                    About This Facility
                  </h2>
                </div>
                <p className="text-base text-muted-foreground leading-relaxed md:text-sm">
                  {facility.description || "A trusted treatment center providing quality care and support for individuals seeking recovery. Our dedicated team is committed to helping patients achieve lasting wellness."}
                </p>
              </div>

              {/* Facility Details */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm md:rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Stethoscope className="h-5 w-5 text-primary md:h-4 md:w-4" />
                  <h2 className="font-display text-lg font-semibold text-foreground md:text-base">
                    Facility Details
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 md:p-3 md:rounded-lg">
                    <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5 md:h-4 md:w-4" />
                    <div>
                      <p className="text-sm font-medium text-foreground md:text-xs">Address</p>
                      <p className="text-sm text-muted-foreground md:text-xs">
                        {facility.address}, {facility.city}, {facility.state} {facility.zip_code}
                      </p>
                    </div>
                  </div>
                  {showContactDetails ? (
                    <a 
                      href={`tel:${facility.phone}`}
                      className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 active:bg-muted transition-colors md:p-3 md:rounded-lg"
                    >
                      <Phone className="h-5 w-5 text-primary shrink-0 mt-0.5 md:h-4 md:w-4" />
                      <div>
                        <p className="text-sm font-medium text-foreground md:text-xs">Phone</p>
                        <p className="text-sm text-primary md:text-xs">
                          {facility.phone}
                        </p>
                      </div>
                    </a>
                  ) : (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 md:p-3 md:rounded-lg">
                      <Phone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5 md:h-4 md:w-4" />
                      <div>
                        <p className="text-sm font-medium text-foreground md:text-xs">Phone</p>
                        <p className="text-sm text-muted-foreground md:text-xs">Use contact form to request a call</p>
                      </div>
                    </div>
                  )}
                  {showContactDetails && facility.website && (
                    <a 
                      href={facility.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 active:bg-muted transition-colors md:p-3 md:rounded-lg"
                    >
                      <Globe className="h-5 w-5 text-primary shrink-0 mt-0.5 md:h-4 md:w-4" />
                      <div>
                        <p className="text-sm font-medium text-foreground md:text-xs">Website</p>
                        <p className="text-sm text-primary flex items-center gap-1 md:text-xs">
                          Visit Website
                          <ExternalLink className="h-4 w-4 md:h-3 md:w-3" />
                        </p>
                      </div>
                    </a>
                  )}
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 md:p-3 md:rounded-lg">
                    <Building2 className="h-5 w-5 text-primary shrink-0 mt-0.5 md:h-4 md:w-4" />
                    <div>
                      <p className="text-sm font-medium text-foreground md:text-xs">Facility Type</p>
                      <p className="text-sm text-muted-foreground md:text-xs">{facility.facility_type}</p>
                    </div>
                  </div>
                  {facility.gender_served && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 md:p-3 md:rounded-lg">
                      <Users className="h-5 w-5 text-primary shrink-0 mt-0.5 md:h-4 md:w-4" />
                      <div>
                        <p className="text-sm font-medium text-foreground md:text-xs">Gender Served</p>
                        <p className="text-sm text-muted-foreground md:text-xs">{facility.gender_served}</p>
                      </div>
                    </div>
                  )}
                  {facility.bed_count && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 md:p-3 md:rounded-lg">
                      <Heart className="h-5 w-5 text-primary shrink-0 mt-0.5 md:h-4 md:w-4" />
                      <div>
                        <p className="text-sm font-medium text-foreground md:text-xs">Bed Count</p>
                        <p className="text-sm text-muted-foreground md:text-xs">{facility.bed_count} beds</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Services & Programs */}
              {services.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm md:rounded-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="h-5 w-5 text-primary md:h-4 md:w-4" />
                    <h2 className="font-display text-lg font-semibold text-foreground md:text-base">
                      Services & Programs
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {services.map((service) => (
                      <Badge key={service} variant="secondary" className="px-3 py-1.5 text-sm md:px-2.5 md:py-1 md:text-xs">
                        {service}
                      </Badge>
                    ))}
                  </div>
                  {ageGroups.length > 0 && (
                    <div className="mt-5 pt-5 border-t border-border md:mt-4 md:pt-4">
                      <p className="text-sm font-medium text-foreground mb-3 md:text-xs md:mb-2">Age Groups Served</p>
                      <div className="flex flex-wrap gap-2">
                        {ageGroups.map((age) => (
                          <Badge key={age} variant="outline" className="px-3 py-1.5 text-sm md:px-2.5 md:py-1 md:text-xs">
                            {age}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Insurance */}
              {insuranceList.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm md:rounded-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="h-5 w-5 text-primary md:h-4 md:w-4" />
                    <h2 className="font-display text-lg font-semibold text-foreground md:text-base">
                      Insurance Accepted
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(showAllInsurance ? insuranceList : insuranceList.slice(0, 8)).map((insurance) => (
                      <Badge key={insurance} variant="secondary" className="px-3 py-1.5 text-sm md:px-2.5 md:py-1 md:text-xs">
                        {insurance}
                      </Badge>
                    ))}
                  </div>
                  {insuranceList.length > 8 && (
                    <button
                      onClick={() => setShowAllInsurance(!showAllInsurance)}
                      className="mt-4 flex items-center gap-2 text-base text-primary active:opacity-70 transition-opacity h-12 md:mt-3 md:gap-1 md:text-xs md:h-auto md:hover:underline"
                    >
                      {showAllInsurance ? "Show less" : `View all ${insuranceList.length} insurances`}
                      <ChevronDown className={`h-5 w-5 transition-transform md:h-3 md:w-3 ${showAllInsurance ? "rotate-180" : ""}`} />
                    </button>
                  )}
                </div>
              )}

              {/* Trust & Compliance */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm md:rounded-xl">
                <div className="flex items-center gap-2 mb-4 md:mb-3">
                  <BadgeCheck className="h-5 w-5 text-accent md:h-4 md:w-4" />
                  <h2 className="font-display text-lg font-semibold text-foreground md:text-base">
                    Trust & Compliance
                  </h2>
                </div>
                {credentials?.accreditations && (
                  <p className="text-sm text-muted-foreground mb-3 md:text-xs md:mb-2">
                    <span className="font-medium text-foreground">Accreditations:</span> {credentials.accreditations}
                  </p>
                )}
                {credentials?.licensing_info && (
                  <p className="text-sm text-muted-foreground mb-4 md:text-xs md:mb-3">
                    <span className="font-medium text-foreground">Licensing:</span> {credentials.licensing_info}
                  </p>
                )}
                <div className="p-4 rounded-xl bg-muted/50 border border-border md:p-3 md:rounded-lg">
                  <p className="text-sm text-muted-foreground leading-relaxed md:text-xs">
                    <strong className="text-foreground">Disclaimer:</strong> RehabLookup is a directory service and does not provide medical advice or treatment. 
                    Always verify credentials and insurance coverage directly with the facility.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Contact CTA - Hidden on mobile (sticky CTA bar instead) */}
            <div className="hidden md:block lg:col-span-1">
              <div ref={contactFormRef} className="sticky top-20 rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-sm font-semibold text-foreground">
                      Contact This Center
                    </h2>
                    <p className="text-xs text-muted-foreground">Get help today</p>
                  </div>
                </div>
                
                <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium text-foreground">Quick Response</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Share your details and a specialist may contact you within 24 hours.
                  </p>
                </div>

                <Button 
                  className="w-full gap-2" 
                  size="lg"
                  onClick={() => setRequestModalOpen(true)}
                >
                  <MessageSquare className="h-4 w-4" />
                  Request a Call Back
                </Button>
                
                {showContactDetails && (
                  <div className="mt-4 pt-4 border-t border-border text-center">
                    <p className="text-xs text-muted-foreground mb-2">Or call directly:</p>
                    <a href={`tel:${facility.phone}`} className="text-sm font-semibold text-primary hover:underline">
                      {facility.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Request Information Modal */}
      <RequestInfoModal
        open={requestModalOpen}
        onOpenChange={setRequestModalOpen}
        facility={{
          id: facility.id,
          name: facility.name,
          city: facility.city,
          state: facility.state,
          slug: facility.slug,
          email: facility.email,
          logo_url: facility.logo_url,
        }}
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