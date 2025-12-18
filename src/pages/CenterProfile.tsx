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
} from "lucide-react";
import { CenterProfileSkeleton } from "@/components/skeletons/CenterProfileSkeleton";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReportImageDialog } from "@/components/profile/ReportImageDialog";
import { TrustBadgesInline, TrustBadgesSection } from "@/components/trust/TrustBadgesSection";
import { cn } from "@/lib/utils";

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
  bgColor = "bg-primary/5"
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string;
  iconColor?: string;
  bgColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/60 hover:border-border hover:shadow-sm transition-all">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg shrink-0", bgColor)}>
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

// Section Container Component
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
    <div className={cn("rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-md transition-all duration-300", className)}>
      <div className="p-6 pb-0 md:p-8 md:pb-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", iconColor.split(' ')[0])}>
              <Icon className={cn("h-5 w-5", iconColor.split(' ')[1] || 'text-primary')} />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">{title}</h2>
          </div>
          {action}
        </div>
      </div>
      <div className="p-6 pt-0 md:p-8 md:pt-0">
        {children}
      </div>
    </div>
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
  
  const fromSearch = location.state?.fromSearch;
  const openModalFromNav = location.state?.openRequestModal;
  const prefillDataFromNav = location.state?.prefillData;
  
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
      const featuredIds: string[] = data?.featured_facility_ids || [];
      return featuredIds.includes(facility.id);
    },
    enabled: !!facility?.id,
    staleTime: 1000 * 60 * 5,
  });

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
        <CenterProfileSkeleton />
      </Layout>
    );
  }

  if (error || !facility) {
    return (
      <Layout>
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
  const showContactDetails = facilityPlan !== "basic" || isOwner;
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

      {/* Sticky Mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md px-4 py-4 shadow-2xl md:hidden safe-area-bottom">
        <div className="flex gap-3">
          {showContactDetails ? (
            <a 
              href={`tel:${facility.phone}`} 
              className="flex-1"
              onClick={() => trackInteraction("call")}
            >
              <Button className="w-full h-13 gap-2 text-base font-semibold shadow-lg">
                <Phone className="h-5 w-5" />
                Call Now
              </Button>
            </a>
          ) : (
            <Button 
              className="flex-1 h-13 gap-2 text-base font-semibold shadow-lg"
              onClick={() => setRequestModalOpen(true)}
            >
              <Phone className="h-5 w-5" />
              Request Call
            </Button>
          )}
          <Button 
            variant="outline" 
            className="flex-1 h-13 gap-2 text-base font-semibold border-2"
            onClick={() => setRequestModalOpen(true)}
          >
            <MessageSquare className="h-5 w-5" />
            Contact
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-gradient-to-b from-muted/40 via-background to-background min-h-screen pb-32 md:pb-12">
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
          <div className="mb-8 rounded-3xl border border-border/60 bg-card shadow-xl overflow-hidden">
            {/* Header Background Gradient */}
            <div className="relative bg-gradient-to-br from-primary/5 via-primary/3 to-accent/5 p-6 md:p-10">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                {/* Logo and Info */}
                <div className="flex items-start gap-5 md:gap-6">
                  {/* Logo */}
                  <div className="relative">
                    <div className="h-24 w-24 md:h-28 md:w-28 shrink-0 overflow-hidden rounded-full border-2 border-background bg-card shadow-xl ring-4 ring-primary/10">
                      {hasValidLogo ? (
                        <img 
                          src={facility.logo_url!} 
                          alt={facility.name} 
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={() => setLogoError(true)}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                          <span className="font-display text-3xl md:text-4xl font-bold text-primary">
                            {initials}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Verified Trust Badge */}
                    {facility.verified && (
                      <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg ring-2 ring-background z-10">
                        <ShieldCheck className="h-4.5 w-4.5 text-white" />
                      </div>
                    )}
                    {/* Featured Crown Badge */}
                    {hasFeaturedSubscription && (
                      <div className="absolute -top-1 -right-1 h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg ring-2 ring-background z-10">
                        <Crown className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                  
                  {/* Facility Info */}
                  <div className="flex-1 min-w-0">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {hasFeaturedSubscription && (
                        <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 gap-1.5 px-3 py-1.5 shadow-md">
                          <Crown className="h-3.5 w-3.5" />
                          Featured Center
                        </Badge>
                      )}
                      <TrustBadgesInline 
                        verified={facility.verified || false}
                        yearEstablished={facility.year_established}
                        accreditations={facility.facility_accreditations || []}
                        size="md"
                      />
                    </div>
                    
                    <h1 className="font-display text-2xl md:text-4xl font-bold text-foreground leading-tight mb-3">
                      {facility.name}
                    </h1>
                    
                    <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-medium">{facility.city}, {facility.state}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span>{facility.facility_type}</span>
                      </span>
                      {yearsInBusiness && (
                        <span className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span>{yearsInBusiness}+ years</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Desktop Actions */}
                <div className="hidden md:flex flex-col gap-3 shrink-0">
                  {showContactDetails ? (
                    <a 
                      href={`tel:${facility.phone}`}
                      onClick={() => trackInteraction("call")}
                    >
                      <Button size="lg" className="w-full gap-2 shadow-lg hover:shadow-xl transition-all text-base px-8">
                        <Phone className="h-5 w-5" />
                        Call Now
                      </Button>
                    </a>
                  ) : (
                    <Button 
                      size="lg" 
                      className="w-full gap-2 shadow-lg hover:shadow-xl transition-all text-base px-8"
                      onClick={() => setRequestModalOpen(true)}
                    >
                      <Phone className="h-5 w-5" />
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
                        className="flex-1"
                      >
                        <Button variant="outline" size="lg" className="w-full gap-2 border-2">
                          <Globe className="h-4 w-4" />
                          Website
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    )}
                    <Button 
                      variant="outline" 
                      size="lg"
                      className="flex-1 gap-2 border-2"
                      onClick={() => setRequestModalOpen(true)}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Contact
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Facts Strip */}
            <div className="border-t border-border/60 bg-muted/30 px-6 py-4 md:px-10 md:py-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {facility.facility_type && (
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Stethoscope className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="text-sm font-semibold text-foreground">{facility.facility_type}</p>
                    </div>
                  </div>
                )}
                {genderLabel && (
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Gender</p>
                      <p className="text-sm font-semibold text-foreground">{genderLabel}</p>
                    </div>
                  </div>
                )}
                {facility.bed_count && (
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Bed className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Capacity</p>
                      <p className="text-sm font-semibold text-foreground">{facility.bed_count} beds</p>
                    </div>
                  </div>
                )}
                {yearsInBusiness && (
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Award className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Experience</p>
                      <p className="text-sm font-semibold text-foreground">{yearsInBusiness}+ years</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Services Preview */}
            {services.length > 0 && (
              <div className="border-t border-border/60 px-6 py-4 md:px-10 md:py-5">
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 md:flex-wrap md:overflow-visible md:pb-0 md:mx-0 md:px-0">
                  {services.slice(0, 6).map((service) => (
                    <Badge 
                      key={service} 
                      variant="secondary" 
                      className="px-3 py-1.5 text-xs whitespace-nowrap bg-secondary/60 hover:bg-secondary transition-colors font-medium"
                    >
                      {service}
                    </Badge>
                  ))}
                  {services.length > 6 && (
                    <Badge 
                      variant="outline" 
                      className="px-3 py-1.5 text-xs text-muted-foreground whitespace-nowrap"
                    >
                      +{services.length - 6} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-8 lg:grid-cols-[1fr,380px]">
            {/* Left Column - Main Content */}
            <div className="space-y-8 min-w-0">
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
                  {/* Main Image */}
                  <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-muted shadow-inner mb-4">
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
                          className="absolute left-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-card/95 backdrop-blur-sm flex items-center justify-center shadow-lg active:scale-95 hover:bg-card transition-all"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setActiveGalleryIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-card/95 backdrop-blur-sm flex items-center justify-center shadow-lg active:scale-95 hover:bg-card transition-all"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium shadow-md">
                          {activeGalleryIndex + 1} / {galleryImages.length}
                        </div>
                      </>
                    )}
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
                          <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
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
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {facility.description || "A trusted treatment center providing quality care and support for individuals seeking recovery. Our dedicated team is committed to helping patients achieve lasting wellness."}
                </p>
              </ProfileSection>

              {/* Contact & Location Details */}
              <ProfileSection 
                icon={MapPin} 
                title="Contact & Location"
                iconColor="bg-blue-500/10 text-blue-600"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Address Card */}
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/50 hover:border-border hover:bg-muted/70 transition-all">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 shrink-0">
                      <MapPin className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Address</p>
                      <p className="text-sm text-foreground font-medium">
                        {facility.address}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {facility.city}, {facility.state} {facility.zip_code}
                      </p>
                    </div>
                  </div>

                  {/* Phone Card */}
                  {showContactDetails ? (
                    <a 
                      href={`tel:${facility.phone}`}
                      onClick={() => trackInteraction("call")}
                      className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all group"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                        <Phone className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Phone</p>
                        <p className="text-sm text-primary font-semibold group-hover:underline">
                          {facility.phone}
                        </p>
                        <p className="text-xs text-muted-foreground">Tap to call</p>
                      </div>
                    </a>
                  ) : (
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted shrink-0">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Phone</p>
                        <p className="text-sm text-muted-foreground">Use contact form to request a call</p>
                      </div>
                    </div>
                  )}

                  {/* Website Card */}
                  {showContactDetails && facility.website && (
                    <a 
                      href={facility.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => trackInteraction("website")}
                      className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all group"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 shrink-0 group-hover:bg-violet-500/20 transition-colors">
                        <Globe className="h-5 w-5 text-violet-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Website</p>
                        <p className="text-sm text-primary font-semibold flex items-center gap-1.5 group-hover:underline">
                          Visit Website
                          <ExternalLink className="h-3.5 w-3.5" />
                        </p>
                      </div>
                    </a>
                  )}

                  {/* Email Card - if available */}
                  {showContactDetails && facility.email && (
                    <a 
                      href={`mailto:${facility.email}`}
                      className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all group"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 shrink-0 group-hover:bg-amber-500/20 transition-colors">
                        <Mail className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Email</p>
                        <p className="text-sm text-primary font-semibold truncate group-hover:underline">
                          {facility.email}
                        </p>
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
              />
            </div>

            {/* Right Column - Sticky Sidebar */}
            <div className="hidden lg:block">
              <div className="sticky top-24 space-y-6">
              {/* Contact CTA Card */}
              <div 
                ref={contactFormRef}
                className="rounded-2xl border border-border/60 bg-gradient-to-b from-card to-muted/30 p-6 shadow-xl"
              >
                <div className="text-center mb-6">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg mb-4">
                    <MessageSquare className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-foreground mb-2">
                    Get Started Today
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Take the first step towards recovery. Our team is here to help.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button 
                    size="lg" 
                    className="w-full gap-2 h-13 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                    onClick={() => setRequestModalOpen(true)}
                  >
                    <Sparkles className="h-5 w-5" />
                    Request Information
                  </Button>

                  {showContactDetails && (
                    <a href={`tel:${facility.phone}`} onClick={() => trackInteraction("call")}>
                      <Button variant="outline" size="lg" className="w-full gap-2 h-13 text-base font-semibold border-2">
                        <Phone className="h-5 w-5" />
                        {facility.phone}
                      </Button>
                    </a>
                  )}
                </div>

                {/* Quick Response Note */}
                <div className="mt-6 pt-6 border-t border-border/60">
                  <div className="flex items-start gap-3 text-xs text-muted-foreground">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 shrink-0">
                      <Clock className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-0.5">Quick Response</p>
                      <p>Most inquiries receive a response within 24 hours.</p>
                    </div>
                  </div>
                </div>

                {/* Confidentiality Note */}
                <div className="mt-4 flex items-start gap-3 text-xs text-muted-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-0.5">100% Confidential</p>
                    <p>Your information is protected and never shared.</p>
                  </div>
                </div>
              </div>

              {/* Facility Overview Card */}
              <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
                <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Facility Overview
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <span className="text-sm font-semibold text-foreground">{facility.facility_type}</span>
                  </div>
                  {genderLabel && (
                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Gender</span>
                      <span className="text-sm font-semibold text-foreground">{genderLabel}</span>
                    </div>
                  )}
                  {facility.bed_count && (
                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Capacity</span>
                      <span className="text-sm font-semibold text-foreground">{facility.bed_count} beds</span>
                    </div>
                  )}
                  {facility.year_established && (
                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Established</span>
                      <span className="text-sm font-semibold text-foreground">{facility.year_established}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Services</span>
                    <span className="text-sm font-semibold text-foreground">{services.length} programs</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">Insurance</span>
                    <span className="text-sm font-semibold text-foreground">{insuranceList.length} accepted</span>
              </div>
              </div>
            </div>
          </div>

          {/* Mobile Sidebar Content - Shows below main content on mobile */}
          <div className="lg:hidden mt-8 space-y-6">
            {/* Contact CTA Card - Mobile */}
            <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-card to-muted/30 p-6 shadow-xl">
              <div className="text-center mb-6">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg mb-4">
                  <MessageSquare className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-2">
                  Get Started Today
                </h3>
                <p className="text-sm text-muted-foreground">
                  Take the first step towards recovery. Our team is here to help.
                </p>
              </div>

              <div className="space-y-3">
                <Button 
                  size="lg" 
                  className="w-full gap-2 h-13 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                  onClick={() => setRequestModalOpen(true)}
                >
                  <Sparkles className="h-5 w-5" />
                  Request Information
                </Button>

                {showContactDetails && (
                  <a href={`tel:${facility.phone}`} onClick={() => trackInteraction("call")}>
                    <Button variant="outline" size="lg" className="w-full gap-2 h-13 text-base font-semibold border-2">
                      <Phone className="h-5 w-5" />
                      {facility.phone}
                    </Button>
                  </a>
                )}
              </div>
            </div>

            {/* Facility Overview Card - Mobile */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Facility Overview
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <span className="text-xs text-muted-foreground block">Type</span>
                  <span className="text-sm font-semibold text-foreground">{facility.facility_type}</span>
                </div>
                {genderLabel && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <span className="text-xs text-muted-foreground block">Gender</span>
                    <span className="text-sm font-semibold text-foreground">{genderLabel}</span>
                  </div>
                )}
                {facility.bed_count && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <span className="text-xs text-muted-foreground block">Capacity</span>
                    <span className="text-sm font-semibold text-foreground">{facility.bed_count} beds</span>
                  </div>
                )}
                {facility.year_established && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <span className="text-xs text-muted-foreground block">Established</span>
                    <span className="text-sm font-semibold text-foreground">{facility.year_established}</span>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-muted/50">
                  <span className="text-xs text-muted-foreground block">Services</span>
                  <span className="text-sm font-semibold text-foreground">{services.length} programs</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <span className="text-xs text-muted-foreground block">Insurance</span>
                  <span className="text-sm font-semibold text-foreground">{insuranceList.length} accepted</span>
                </div>
              </div>
            </div>
          </div>
            </div>
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
