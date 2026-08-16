import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  MapPin, 
  Phone, 
  Globe, 
  Building2, 
  Users, 
  Bed,
  Shield,
  Heart,
  CheckCircle,
  Clock,
  BadgeCheck,
  Loader2,
  ImageIcon,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { useState } from "react";
import { OptimizedImage } from "@/components/ui/optimized-image";

interface ListingPreviewContentProps {
  facilitySlug: string;
}

interface FacilityData {
  id: string;
  name: string;
  city: string;
  state: string;
  zip_code: string;
  address: string;
  phone: string;
  website: string | null;
  description: string | null;
  facility_type: string;
  gender_served: string | null;
  bed_count: string | null;
  verified: boolean | null;
  year_established: number | null;
  logo_url: string | null;
  gallery_urls: string[] | null;
  facility_services: { service_name: string }[];
  facility_insurance: { insurance_name: string }[];
  facility_age_groups: { age_group: string }[];
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

export function ListingPreviewContent({ facilitySlug }: ListingPreviewContentProps) {
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [logoError, setLogoError] = useState(false);

  const { data: facility, isLoading, error } = useQuery({
    queryKey: ["preview-facility", facilitySlug],
    queryFn: async (): Promise<FacilityData | null> => {
      const { data, error } = await supabase
        .from("facilities")
        .select(`
          id,
          name,
          city,
          state,
          zip_code,
          address,
          phone,
          website,
          description,
          facility_type,
          gender_served,
          bed_count,
          verified,
          year_established,
          logo_url,
          gallery_urls,
          facility_services (service_name),
          facility_insurance (insurance_name),
          facility_age_groups (age_group),
          facility_accreditations (accreditation_type, verified)
        `)
        .eq("slug", facilitySlug)
        .maybeSingle();

      if (error) throw error;
      return data as FacilityData;
    },
    enabled: !!facilitySlug,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error || !facility) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Unable to load preview</p>
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
  
  const genderLabel = facility.gender_served === "male" ? "Men Only" 
    : facility.gender_served === "female" ? "Women Only" 
    : facility.gender_served === "all" ? "All Genders" 
    : facility.gender_served;

  const nextImage = () => {
    setActiveGalleryIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const prevImage = () => {
    setActiveGalleryIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  return (
    <ScrollArea className="h-full">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          {/* Logo */}
          <div className="shrink-0">
            {hasValidLogo ? (
              <img
                src={facility.logo_url!}
                alt={facility.name}
                className="h-20 w-20 rounded-xl object-cover border shadow-sm"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="h-20 w-20 rounded-xl bg-primary/10 flex items-center justify-center border">
                <span className="text-2xl font-bold text-primary">{initials}</span>
              </div>
            )}
          </div>

          {/* Title & Badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
                {facility.name}
              </h1>
            </div>
            
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="text-sm">
                {facility.city}, {facility.state} {facility.zip_code}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {facility.verified && (
                <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-200">
                  <BadgeCheck className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
              <Badge variant="outline" className="capitalize">
                {facility.facility_type.replace(/_/g, " ")}
              </Badge>
              {yearsInBusiness && yearsInBusiness > 0 && (
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  {yearsInBusiness}+ Years
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Photo Gallery */}
        {galleryImages.length > 0 && (
          <div className="relative rounded-xl overflow-hidden bg-muted aspect-[16/9]">
            <OptimizedImage
              src={galleryImages[activeGalleryIndex]}
              alt={`${facility.name} - Photo ${activeGalleryIndex + 1}`}
              className="w-full h-full"
              objectFit="cover"
            />
            
            {galleryImages.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow-md"
                  onClick={prevImage}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow-md"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm">
                  {galleryImages.map((_, idx) => (
                    <button
                      key={idx}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        idx === activeGalleryIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                      )}
                      onClick={() => setActiveGalleryIndex(idx)}
                    />
                  ))}
                </div>
              </>
            )}
            
            <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs">
              <ImageIcon className="h-3 w-3" />
              {activeGalleryIndex + 1} / {galleryImages.length}
            </div>
          </div>
        )}

        {/* No Photos Placeholder */}
        {galleryImages.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 aspect-[16/9] flex flex-col items-center justify-center">
            <ImageIcon className="h-10 w-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No photos added yet</p>
          </div>
        )}

        {/* Quick Facts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {facility.bed_count && (
            <QuickFact icon={Bed} label="Beds" value={facility.bed_count} />
          )}
          {genderLabel && (
            <QuickFact icon={Users} label="Gender" value={genderLabel} />
          )}
          {ageGroups.length > 0 && (
            <QuickFact icon={Users} label="Ages" value={ageGroups.join(", ")} />
          )}
          {facility.phone && (
            <QuickFact icon={Phone} label="Phone" value={formatPhoneNumber(facility.phone)} />
          )}
        </div>

        {/* Description */}
        {facility.description && (
          <div className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              About
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {facility.description}
            </p>
          </div>
        )}

        {/* Services */}
        {services.length > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              Treatment Services
            </h3>
            <div className="flex flex-wrap gap-2">
              {services.map((service, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                  {service}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Insurance */}
        {insuranceList.length > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Insurance Accepted
            </h3>
            <div className="flex flex-wrap gap-2">
              {insuranceList.map((insurance, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {insurance}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Accreditations */}
        {facility.facility_accreditations.length > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-primary" />
              Accreditations
            </h3>
            <div className="flex flex-wrap gap-2">
              {facility.facility_accreditations.map((acc, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {acc.verified && <CheckCircle className="h-3 w-3 mr-1 text-green-600" />}
                  {acc.accreditation_type}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Contact CTA Preview */}
        <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 p-4">
          <h3 className="font-semibold text-foreground mb-2">Ready to Get Help?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Families can request information or verify their insurance directly from your listing.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled className="pointer-events-none">
              <Phone className="h-4 w-4 mr-1.5" />
              Contact Facility
            </Button>
            <Button size="sm" variant="outline" disabled className="pointer-events-none">
              <Globe className="h-4 w-4 mr-1.5" />
              Visit Website
            </Button>
          </div>
        </div>

        {/* Bottom Spacer */}
        <div className="h-4" />
      </div>
    </ScrollArea>
  );
}

function QuickFact({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
      <Icon className="h-4 w-4 text-primary shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-xs font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
