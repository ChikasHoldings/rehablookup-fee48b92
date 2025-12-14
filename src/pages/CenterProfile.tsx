import { useParams, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { LeadSubmissionForm } from "@/components/forms/LeadSubmissionForm";
import {
  MapPin,
  Phone,
  Globe,
  Star,
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
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef, useState } from "react";

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
  logo_url: string | null;
  gallery_urls: string[] | null;
  facility_services: { service_name: string }[];
  facility_insurance: { insurance_name: string }[];
  facility_age_groups: { age_group: string }[];
  facility_credentials: { accreditations: string | null; licensing_info: string | null }[];
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
  const contactFormRef = useRef<HTMLDivElement>(null);
  const [showAllInsurance, setShowAllInsurance] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [logoError, setLogoError] = useState(false);
  const fromSearch = location.state?.fromSearch;

  // Fetch facility data by slug
  const { data: facility, isLoading, error } = useQuery({
    queryKey: ["facility", slug],
    queryFn: async (): Promise<FacilityData | null> => {
      const { data, error } = await supabase
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
          logo_url,
          gallery_urls,
          facility_services (service_name),
          facility_insurance (insurance_name),
          facility_age_groups (age_group),
          facility_credentials (accreditations, licensing_info)
        `)
        .eq("slug", slug)
        .eq("status", "approved")
        .maybeSingle();

      if (error) throw error;
      return data as FacilityData | null;
    },
    enabled: !!slug,
  });

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

  if (isLoading) {
    return (
      <Layout>
        <div className="bg-muted/30 min-h-screen py-8">
          <div className="container max-w-5xl">
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

  return (
    <Layout>
      {/* Sticky Mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card p-3 shadow-lg md:hidden">
        <div className="flex gap-2">
          <a href={`tel:${facility.phone}`} className="flex-1">
            <Button size="sm" className="w-full gap-2">
              <Phone className="h-4 w-4" />
              Call Now
            </Button>
          </a>
          <Button variant="outline" size="sm" className="flex-1" onClick={scrollToContact}>
            Contact
          </Button>
        </div>
      </div>

      {/* Main Content - Contained Layout */}
      <div className="bg-muted/30 min-h-screen pb-24 md:pb-0">
        <div className="container max-w-5xl py-6 md:py-8">
          {/* Back Link */}
          {fromSearch && (
            <Link
              to="/rehab-centers"
              className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to search results
            </Link>
          )}

          {/* Header Card */}
          <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-4">
                {/* Logo with Reserved Space */}
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted md:h-20 md:w-20">
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
                      <span className="font-display text-xl font-bold text-primary md:text-2xl">
                        {initials}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {facility.featured && (
                      <Badge className="bg-accent text-accent-foreground border-0 gap-1 text-xs px-2 py-0.5">
                        <Star className="h-3 w-3 fill-current" />
                        Featured
                      </Badge>
                    )}
                    <Badge variant="secondary" className="gap-1 text-xs px-2 py-0.5">
                      <BadgeCheck className="h-3 w-3" />
                      Verified
                    </Badge>
                  </div>
                  
                  <h1 className="font-display text-xl font-bold text-foreground md:text-2xl">
                    {facility.name}
                  </h1>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {facility.city}, {facility.state} {facility.zip_code}
                  </p>
                </div>
              </div>

              {/* Desktop Actions */}
              <div className="hidden md:flex flex-col gap-2 shrink-0">
                <a href={`tel:${facility.phone}`}>
                  <Button size="sm" className="w-full gap-2">
                    <Phone className="h-4 w-4" />
                    Call Now
                  </Button>
                </a>
                <div className="flex gap-2">
                  {facility.website && (
                    <a href={facility.website} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <Globe className="h-4 w-4" />
                        Website
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </a>
                  )}
                  <Button variant="outline" size="sm" onClick={scrollToContact}>
                    Contact
                  </Button>
                </div>
              </div>
            </div>

            {/* Service Tags */}
            {services.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex flex-wrap gap-1.5">
                  {services.slice(0, 5).map((service) => (
                    <Badge key={service} variant="secondary" className="text-xs px-2.5 py-1">
                      {service}
                    </Badge>
                  ))}
                  {services.length > 5 && (
                    <Badge variant="outline" className="text-xs px-2.5 py-1 text-muted-foreground">
                      +{services.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Two Column Layout */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-5">
              {/* Gallery Section - Only show if images exist */}
              {galleryImages.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    <h2 className="font-display text-base font-semibold text-foreground">
                      Facility Photos
                    </h2>
                  </div>
                  
                  {/* Main Image */}
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted mb-3">
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
                          className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-card/90 flex items-center justify-center shadow-md hover:bg-card transition-colors"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setActiveGalleryIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-card/90 flex items-center justify-center shadow-md hover:bg-card transition-colors"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                  
                  {/* Thumbnails */}
                  {galleryImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {galleryImages.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveGalleryIndex(idx)}
                          className={`shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-colors ${
                            idx === activeGalleryIndex ? 'border-primary' : 'border-transparent hover:border-border'
                          }`}
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
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-base font-semibold text-foreground">
                    About This Facility
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {facility.description || "A trusted treatment center providing quality care and support for individuals seeking recovery. Our dedicated team is committed to helping patients achieve lasting wellness."}
                </p>
              </div>

              {/* Facility Details */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-base font-semibold text-foreground">
                    Facility Details
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-foreground">Address</p>
                      <p className="text-xs text-muted-foreground">
                        {facility.address}, {facility.city}, {facility.state} {facility.zip_code}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Phone className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-foreground">Phone</p>
                      <a href={`tel:${facility.phone}`} className="text-xs text-primary hover:underline">
                        {facility.phone}
                      </a>
                    </div>
                  </div>
                  {facility.website && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Globe className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-foreground">Website</p>
                        <a href={facility.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                          Visit Website
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Building2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-foreground">Facility Type</p>
                      <p className="text-xs text-muted-foreground">{facility.facility_type}</p>
                    </div>
                  </div>
                  {facility.gender_served && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Users className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-foreground">Gender Served</p>
                        <p className="text-xs text-muted-foreground">{facility.gender_served}</p>
                      </div>
                    </div>
                  )}
                  {facility.bed_count && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Heart className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-foreground">Bed Count</p>
                        <p className="text-xs text-muted-foreground">{facility.bed_count} beds</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Services & Programs */}
              {services.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <h2 className="font-display text-base font-semibold text-foreground">
                      Services & Programs
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {services.map((service) => (
                      <Badge key={service} variant="secondary" className="px-2.5 py-1 text-xs">
                        {service}
                      </Badge>
                    ))}
                  </div>
                  {ageGroups.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs font-medium text-foreground mb-2">Age Groups Served</p>
                      <div className="flex flex-wrap gap-2">
                        {ageGroups.map((age) => (
                          <Badge key={age} variant="outline" className="px-2.5 py-1 text-xs">
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
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="h-4 w-4 text-primary" />
                    <h2 className="font-display text-base font-semibold text-foreground">
                      Insurance Accepted
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(showAllInsurance ? insuranceList : insuranceList.slice(0, 8)).map((insurance) => (
                      <Badge key={insurance} variant="secondary" className="px-2.5 py-1 text-xs">
                        {insurance}
                      </Badge>
                    ))}
                  </div>
                  {insuranceList.length > 8 && (
                    <button
                      onClick={() => setShowAllInsurance(!showAllInsurance)}
                      className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {showAllInsurance ? "Show less" : `View all ${insuranceList.length} insurances`}
                      <ChevronDown className={`h-3 w-3 transition-transform ${showAllInsurance ? "rotate-180" : ""}`} />
                    </button>
                  )}
                </div>
              )}

              {/* Trust & Compliance */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <BadgeCheck className="h-4 w-4 text-accent" />
                  <h2 className="font-display text-base font-semibold text-foreground">
                    Trust & Compliance
                  </h2>
                </div>
                {credentials?.accreditations && (
                  <p className="text-xs text-muted-foreground mb-2">
                    <span className="font-medium text-foreground">Accreditations:</span> {credentials.accreditations}
                  </p>
                )}
                {credentials?.licensing_info && (
                  <p className="text-xs text-muted-foreground mb-3">
                    <span className="font-medium text-foreground">Licensing:</span> {credentials.licensing_info}
                  </p>
                )}
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Disclaimer:</strong> RehabLookup is a directory service and does not provide medical advice or treatment. 
                    Always verify credentials and insurance coverage directly with the facility.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Contact Form */}
            <div className="lg:col-span-1">
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
                    A specialist will contact you within 24 hours.
                  </p>
                </div>

                <LeadSubmissionForm 
                  facilityId={facility.id} 
                  facilityName={facility.name}
                  facilityEmail={facility.email}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CenterProfile;