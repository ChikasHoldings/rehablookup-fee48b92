import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RequestInfoModal } from "@/components/profile/RequestInfoModal";
import { useFavorites } from "@/hooks/useFavorites";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Globe,
  Crown,
  CheckCircle,
  Shield,
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
  Calendar,
  Bed,
  Mail,
  Award,
  Star,
  Sparkles,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";

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

function ProfileSection({ 
  icon: Icon, 
  title, 
  iconColor = "bg-primary/10 text-primary",
  children,
  className
}: { 
  icon: React.ElementType; 
  title: string;
  iconColor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border/50 bg-card shadow-sm", className)}>
      <div className="flex items-center gap-3 p-4 border-b border-border/40">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", iconColor.split(' ')[0])}>
          <Icon className={cn("h-4 w-4", iconColor.split(' ')[1] || 'text-primary')} />
        </div>
        <h2 className="font-display text-base font-bold text-foreground">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function SeekerFacilityProfile() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [logoError, setLogoError] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);
  const [showAllInsurance, setShowAllInsurance] = useState(false);

  const { data: facility, isLoading } = useQuery({
    queryKey: ["seeker-facility", slug],
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

      if (error) throw error;
      return data as FacilityData | null;
    },
    enabled: !!slug,
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

  // Track view
  useEffect(() => {
    if (facility?.id) {
      supabase.functions.invoke("track-view", {
        body: { facilityId: facility.id },
      });
    }
  }, [facility?.id]);

  const handleFavoriteClick = useCallback(() => {
    if (facility?.id) {
      toggleFavorite(facility.id);
    }
  }, [facility?.id, toggleFavorite]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="flex-1 py-12">
        <div className="max-w-md mx-auto text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-destructive/10">
            <Building2 className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="mb-2 font-display text-lg font-bold text-foreground">
            Facility Not Found
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            This facility doesn't exist or is no longer available.
          </p>
          <Button onClick={() => navigate("/account")} className="gap-2">
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
  const showContactDetails = facilityPlan !== "basic";

  const genderLabel = facility.gender_served === "male" ? "Men Only" 
    : facility.gender_served === "female" ? "Women Only" 
    : facility.gender_served === "all" ? "All Genders" 
    : facility.gender_served;

  const displayedServices = showAllServices ? services : services.slice(0, 6);
  const displayedInsurance = showAllInsurance ? insuranceList : insuranceList.slice(0, 8);

  return (
    <div className="flex-1 py-4 sm:py-6">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="space-y-4 pr-2">
          {/* Header Card */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start gap-4">
              {/* Logo */}
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                {hasValidLogo ? (
                  <img
                    src={facility.logo_url!}
                    alt={`${facility.name} logo`}
                    className="h-full w-full object-cover"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="font-display text-lg font-bold text-primary">
                      {initials}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  {facility.featured && (
                    <Badge className="gap-1 px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 border-0">
                      <Star className="h-2.5 w-2.5 fill-current" />
                      Featured
                    </Badge>
                  )}
                  {facility.verified && (
                    <Badge className="gap-1 px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 border-0">
                      <Shield className="h-2.5 w-2.5" />
                      Verified
                    </Badge>
                  )}
                </div>

                <h1 className="font-display text-lg font-bold text-foreground leading-tight mb-1">
                  {facility.name}
                </h1>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                  {facility.city}, {facility.state}
                </p>
              </div>

              {/* Favorite button */}
              <button
                onClick={handleFavoriteClick}
                className={cn(
                  "p-2 rounded-lg border transition-all shrink-0",
                  isFavorite(facility.id)
                    ? "bg-rose-50 border-rose-200 text-rose-500"
                    : "bg-secondary/50 border-border text-muted-foreground hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50"
                )}
              >
                <Heart className={cn("h-5 w-5", isFavorite(facility.id) && "fill-current")} />
              </button>
            </div>

            {/* Quick info */}
            <div className="mt-4 pt-3 border-t border-border/50 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {facility.facility_type && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  <span className="truncate">{facility.facility_type}</span>
                </div>
              )}
              {yearsInBusiness && yearsInBusiness > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-3.5 w-3.5 text-blue-600" />
                  <span>{yearsInBusiness}+ years</span>
                </div>
              )}
              {genderLabel && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-3.5 w-3.5 text-purple-600" />
                  <span>{genderLabel}</span>
                </div>
              )}
              {facility.bed_count && (
                <div className="flex items-center gap-2 text-sm">
                  <Bed className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{facility.bed_count} beds</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex gap-2">
              {showContactDetails ? (
                <a href={`tel:${facility.phone}`} className="flex-1">
                  <Button className="w-full gap-2">
                    <Phone className="h-4 w-4" />
                    {formatPhoneNumber(facility.phone)}
                  </Button>
                </a>
              ) : (
                <Button onClick={() => setRequestModalOpen(true)} className="flex-1 gap-2">
                  <Phone className="h-4 w-4" />
                  Get Contact Info
                </Button>
              )}
              {facility.website && showContactDetails && (
                <a href={facility.website} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="gap-2">
                    <Globe className="h-4 w-4" />
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* Gallery */}
          {galleryImages.length > 0 && (
            <ProfileSection icon={ImageIcon} title="Facility Photos">
              <div className="relative aspect-video rounded-lg overflow-hidden bg-muted mb-3">
                <img
                  src={galleryImages[activeGalleryIndex]}
                  alt={`${facility.name} - Photo ${activeGalleryIndex + 1}`}
                  className="w-full h-full object-cover"
                />
                {galleryImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveGalleryIndex((prev) => 
                        prev === 0 ? galleryImages.length - 1 : prev - 1
                      )}
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-card/90 flex items-center justify-center shadow-md hover:bg-card transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setActiveGalleryIndex((prev) => 
                        prev === galleryImages.length - 1 ? 0 : prev + 1
                      )}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-card/90 flex items-center justify-center shadow-md hover:bg-card transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveGalleryIndex(idx)}
                    className={cn(
                      "shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-colors",
                      idx === activeGalleryIndex ? "border-primary" : "border-transparent hover:border-border"
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </ProfileSection>
          )}

          {/* About */}
          {facility.description && (
            <ProfileSection icon={Building2} title="About">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {facility.description}
              </p>
            </ProfileSection>
          )}

          {/* Services */}
          {services.length > 0 && (
            <ProfileSection icon={Stethoscope} title="Treatment Services" iconColor="bg-emerald-500/10 text-emerald-600">
              <div className="grid gap-2 sm:grid-cols-2">
                {displayedServices.map((service) => (
                  <div key={service} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{service}</span>
                  </div>
                ))}
              </div>
              {services.length > 6 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => setShowAllServices(!showAllServices)}
                >
                  {showAllServices ? "Show less" : `Show all ${services.length} services`}
                </Button>
              )}
            </ProfileSection>
          )}

          {/* Insurance */}
          {insuranceList.length > 0 && (
            <ProfileSection icon={Shield} title="Insurance Accepted" iconColor="bg-blue-500/10 text-blue-600">
              <div className="flex flex-wrap gap-2">
                {displayedInsurance.map((ins) => (
                  <Badge key={ins} variant="secondary" className="px-2.5 py-1 text-xs">
                    {ins}
                  </Badge>
                ))}
              </div>
              {insuranceList.length > 8 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => setShowAllInsurance(!showAllInsurance)}
                >
                  {showAllInsurance ? "Show less" : `Show all ${insuranceList.length} insurers`}
                </Button>
              )}
            </ProfileSection>
          )}

          {/* Age Groups */}
          {ageGroups.length > 0 && (
            <ProfileSection icon={Users} title="Age Groups Served" iconColor="bg-purple-500/10 text-purple-600">
              <div className="flex flex-wrap gap-2">
                {ageGroups.map((group) => (
                  <Badge key={group} variant="secondary" className="px-2.5 py-1 text-xs">
                    {group}
                  </Badge>
                ))}
              </div>
            </ProfileSection>
          )}

          {/* Contact info section */}
          {showContactDetails && (
            <ProfileSection icon={Mail} title="Contact Information" iconColor="bg-primary/10 text-primary">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{facility.address}</p>
                    <p className="text-sm text-muted-foreground">
                      {facility.city}, {facility.state} {facility.zip_code}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${facility.phone}`} className="text-sm font-medium text-primary hover:underline">
                    {formatPhoneNumber(facility.phone)}
                  </a>
                </div>
                {facility.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${facility.email}`} className="text-sm font-medium text-primary hover:underline">
                      {facility.email}
                    </a>
                  </div>
                )}
                {facility.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a href={facility.website} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                      Visit website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            </ProfileSection>
          )}

          {/* CTA to view on main site */}
          <div className="rounded-xl border border-border/50 bg-muted/50 p-4 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Want to see more details and submit a contact request?
            </p>
            <Link to={`/center/${facility.slug}`} target="_blank">
              <Button variant="outline" className="gap-2">
                View Full Profile
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </ScrollArea>

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
          featured: facility.featured,
        }}
      />
    </div>
  );
}
