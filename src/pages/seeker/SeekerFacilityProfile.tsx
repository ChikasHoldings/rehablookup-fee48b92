import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RatingBadge } from "@/components/ui/RatingBadge";
import { RequestInfoModal } from "@/components/profile/RequestInfoModal";
import { useFavorites } from "@/hooks/useFavorites";
import { useFacilityReviews } from "@/hooks/useFacilityReviews";
import { useFacilityRating } from "@/hooks/useFacilityRating";
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
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Bed,
  Mail,
  Star,
  MessageSquare,
  Send,
  Sparkles,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";

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
  className,
  delay = 0
}: { 
  icon: React.ElementType; 
  title: string;
  iconColor?: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div 
      className={cn(
        "rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden animate-in fade-in slide-in-from-bottom-2",
        className
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40 bg-gradient-to-r from-muted/30 to-transparent">
        <div className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl transition-transform hover:scale-105",
          iconColor.split(' ')[0]
        )}>
          <Icon className={cn("h-4.5 w-4.5", iconColor.split(' ')[1] || 'text-primary')} />
        </div>
        <h2 className="font-display text-base font-bold text-foreground tracking-tight">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
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
    submitReview,
    updateReview,
    deleteReview,
    toggleHelpful,
    resendVerificationEmail
  } = useFacilityReviews(facilityId);

  return (
    <ProfileSection icon={MessageSquare} title="Reviews" iconColor="bg-amber-500/10 text-amber-600" delay={500}>
      <div className="space-y-4">
        <ReviewForm
          facilityName={facilityName}
          userReview={userReview}
          isAuthenticated={isAuthenticated}
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
    </ProfileSection>
  );
}

function QuickStatCard({ icon: Icon, label, value, color }: { 
  icon: React.ElementType; 
  label: string; 
  value: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-muted/50 border border-border/40 hover:border-border transition-colors">
      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg mb-1.5", color)}>
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-xs font-medium text-foreground text-center leading-tight">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
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

  // Fetch current seeker's profile for prefill
  const { data: seekerProfile } = useQuery({
    queryKey: ["seeker-profile-prefill"],
    queryFn: async (): Promise<SeekerProfile | null> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;
      
      const { data } = await supabase
        .from("seeker_profiles")
        .select("first_name, last_name, display_name, phone")
        .eq("user_id", session.user.id)
        .maybeSingle();
      
      return data as SeekerProfile | null;
    },
  });

  // Get user email for prefill
  const { data: userEmail } = useQuery({
    queryKey: ["user-email"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user?.email || "";
    },
  });

  // Prepare prefill data for the modal
  const prefillData = {
    firstName: seekerProfile?.first_name || "",
    lastName: seekerProfile?.last_name || "",
    email: userEmail || "",
    phone: seekerProfile?.phone || "",
  };

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

  // Fetch facility rating
  const ratingData = useFacilityRating(facility?.id);

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
      <div className="flex-1 flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading facility...</p>
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
  const showContactDetails = facilityPlan !== "basic";

  const genderLabel = facility.gender_served === "male" ? "Men Only" 
    : facility.gender_served === "female" ? "Women Only" 
    : facility.gender_served === "all" ? "All Genders" 
    : facility.gender_served;

  const displayedServices = showAllServices ? services : services.slice(0, 6);
  const displayedInsurance = showAllInsurance ? insuranceList : insuranceList.slice(0, 8);

  return (
    <div className="flex-1 py-4 sm:py-6 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate("/account");
            }
          }}
          className="mb-4 gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="space-y-5">
          {/* Hero Header Card */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-lg animate-in fade-in slide-in-from-bottom-3 duration-500">
            {/* Top accent bar */}
            <div className="h-1.5 bg-gradient-to-r from-primary via-primary/80 to-accent" />
            
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-4 sm:gap-5">
                {/* Logo with glow effect */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-xl border-2 border-border/60 bg-muted shadow-md">
                    {hasValidLogo ? (
                      <img
                        src={facility.logo_url!}
                        alt={`${facility.name} logo`}
                        className="h-full w-full object-cover"
                        onError={() => setLogoError(true)}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                        <span className="font-display text-xl sm:text-2xl font-bold text-primary">
                          {initials}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  {/* Badges row with rating */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {/* Rating badge - most prominent */}
                    <RatingBadge 
                      rating={ratingData.averageRating} 
                      reviewCount={ratingData.reviewCount} 
                      size="md" 
                    />
                    {facility.featured && (
                      <Badge className="gap-1.5 px-2.5 py-1 text-xs font-semibold bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 border border-amber-200/60 shadow-sm">
                        <Sparkles className="h-3 w-3" />
                        Featured
                      </Badge>
                    )}
                    {facility.verified && (
                      <Badge className="gap-1.5 px-2.5 py-1 text-xs font-semibold bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-sm">
                        <Shield className="h-3 w-3" />
                        Verified
                      </Badge>
                    )}
                  </div>

                  <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground leading-tight mb-1.5">
                    {facility.name}
                  </h1>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    <span>{facility.city}, {facility.state}</span>
                  </p>
                </div>

                {/* Favorite button with animation */}
                <button
                  onClick={handleFavoriteClick}
                  className={cn(
                    "p-2.5 rounded-xl border-2 transition-all duration-300 shrink-0 hover:scale-105 active:scale-95",
                    isFavorite(facility.id)
                      ? "bg-rose-50 border-rose-300 text-rose-500 shadow-md shadow-rose-100"
                      : "bg-muted/50 border-border text-muted-foreground hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50"
                  )}
                >
                  <Heart className={cn("h-5 w-5 transition-transform", isFavorite(facility.id) && "fill-current scale-110")} />
                </button>
              </div>

              {/* Quick stats grid */}
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {facility.facility_type && (
                  <QuickStatCard 
                    icon={Building2} 
                    label="Type" 
                    value={facility.facility_type}
                    color="bg-primary/10 text-primary"
                  />
                )}
                {yearsInBusiness && yearsInBusiness > 0 && (
                  <QuickStatCard 
                    icon={Clock} 
                    label="Experience" 
                    value={`${yearsInBusiness}+ years`}
                    color="bg-blue-500/10 text-blue-600"
                  />
                )}
                {genderLabel && (
                  <QuickStatCard 
                    icon={Users} 
                    label="Serves" 
                    value={genderLabel}
                    color="bg-purple-500/10 text-purple-600"
                  />
                )}
                {facility.bed_count && (
                  <QuickStatCard 
                    icon={Bed} 
                    label="Capacity" 
                    value={`${facility.bed_count} beds`}
                    color="bg-emerald-500/10 text-emerald-600"
                  />
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => setRequestModalOpen(true)} 
                  className="flex-1 gap-2.5 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5"
                  size="lg"
                >
                  <Send className="h-4 w-4" />
                  Send Request
                </Button>
                <a href={`tel:${facility.phone}`} className="flex-1">
                  <Button 
                    variant="outline" 
                    className="w-full gap-2.5 border-2 hover:bg-primary/5 hover:border-primary/30 transition-all duration-300" 
                    size="lg"
                  >
                    <Phone className="h-4 w-4" />
                    {showContactDetails ? "Call Now" : "Call"}
                  </Button>
                </a>
              </div>
              
              {facility.website && (
                <a 
                  href={facility.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors group"
                >
                  <Globe className="h-4 w-4" />
                  <span>Visit website</span>
                  <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                </a>
              )}
            </div>
          </div>

          {/* Gallery with enhanced styling */}
          {galleryImages.length > 0 && (
            <ProfileSection icon={ImageIcon} title="Facility Photos" delay={100}>
              <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-muted shadow-inner mb-4">
                <img
                  src={galleryImages[activeGalleryIndex]}
                  alt={`${facility.name} - Photo ${activeGalleryIndex + 1}`}
                  className="w-full h-full object-cover transition-opacity duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                
                {galleryImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveGalleryIndex((prev) => 
                        prev === 0 ? galleryImages.length - 1 : prev - 1
                      )}
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/95 flex items-center justify-center shadow-lg hover:bg-card hover:scale-105 transition-all"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setActiveGalleryIndex((prev) => 
                        prev === galleryImages.length - 1 ? 0 : prev + 1
                      )}
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/95 flex items-center justify-center shadow-lg hover:bg-card hover:scale-105 transition-all"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    
                    {/* Image counter */}
                    <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
                      {activeGalleryIndex + 1} / {galleryImages.length}
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveGalleryIndex(idx)}
                    className={cn(
                      "shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-105",
                      idx === activeGalleryIndex 
                        ? "border-primary ring-2 ring-primary/20 shadow-md" 
                        : "border-transparent hover:border-border opacity-70 hover:opacity-100"
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </ProfileSection>
          )}

          {/* About with enhanced typography */}
          {facility.description && (
            <ProfileSection icon={Building2} title="About" delay={200}>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {facility.description}
              </p>
            </ProfileSection>
          )}

          {/* Services with better grid */}
          {services.length > 0 && (
            <ProfileSection icon={Stethoscope} title="Treatment Services" iconColor="bg-emerald-500/10 text-emerald-600" delay={250}>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {displayedServices.map((service) => (
                  <div 
                    key={service} 
                    className="flex items-center gap-2.5 p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100/60 hover:bg-emerald-50 transition-colors"
                  >
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="text-sm font-medium text-foreground">{service}</span>
                  </div>
                ))}
              </div>
              {services.length > 6 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-4 w-full"
                  onClick={() => setShowAllServices(!showAllServices)}
                >
                  {showAllServices ? "Show less" : `Show all ${services.length} services`}
                </Button>
              )}
            </ProfileSection>
          )}

          {/* Insurance with pill design */}
          {insuranceList.length > 0 && (
            <ProfileSection icon={Shield} title="Insurance Accepted" iconColor="bg-blue-500/10 text-blue-600" delay={300}>
              <div className="flex flex-wrap gap-2">
                {displayedInsurance.map((ins) => (
                  <Badge 
                    key={ins} 
                    variant="secondary" 
                    className="px-3 py-1.5 text-xs font-medium bg-blue-50/80 text-blue-700 border border-blue-100 hover:bg-blue-100/60 transition-colors"
                  >
                    {ins}
                  </Badge>
                ))}
              </div>
              {insuranceList.length > 8 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-4 w-full"
                  onClick={() => setShowAllInsurance(!showAllInsurance)}
                >
                  {showAllInsurance ? "Show less" : `Show all ${insuranceList.length} insurers`}
                </Button>
              )}
            </ProfileSection>
          )}

          {/* Age Groups */}
          {ageGroups.length > 0 && (
            <ProfileSection icon={Users} title="Age Groups Served" iconColor="bg-purple-500/10 text-purple-600" delay={350}>
              <div className="flex flex-wrap gap-2">
                {ageGroups.map((group) => (
                  <Badge 
                    key={group} 
                    variant="secondary" 
                    className="px-3 py-1.5 text-xs font-medium bg-purple-50/80 text-purple-700 border border-purple-100 hover:bg-purple-100/60 transition-colors"
                  >
                    {group}
                  </Badge>
                ))}
              </div>
            </ProfileSection>
          )}

          {/* Contact info section with enhanced cards */}
          {showContactDetails && (
            <ProfileSection icon={Mail} title="Contact Information" iconColor="bg-primary/10 text-primary" delay={400}>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/40 hover:bg-muted/70 transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{facility.address}</p>
                    <p className="text-sm text-muted-foreground">
                      {facility.city}, {facility.state} {facility.zip_code}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/40 hover:bg-muted/70 transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <a href={`tel:${facility.phone}`} className="text-sm font-medium text-primary hover:underline">
                    {formatPhoneNumber(facility.phone)}
                  </a>
                </div>
                
                {facility.email && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/40 hover:bg-muted/70 transition-colors">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <a href={`mailto:${facility.email}`} className="text-sm font-medium text-primary hover:underline">
                      {facility.email}
                    </a>
                  </div>
                )}
                
                {facility.website && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/40 hover:bg-muted/70 transition-colors">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <Globe className="h-4 w-4 text-primary" />
                    </div>
                    <a href={facility.website} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline flex items-center gap-1.5">
                      Visit website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            </ProfileSection>
          )}

          {/* Reviews Section */}
          <ReviewsSection facilityId={facility.id} facilityName={facility.name} />

          {/* Enhanced Request CTA Section */}
          <div 
            className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-6 sm:p-8 text-center relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500"
            style={{ animationDelay: '550ms', animationFillMode: 'both' }}
          >
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-accent/10 to-transparent rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-primary/10 to-transparent rounded-full blur-2xl" />
            
            <div className="relative">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 shadow-lg shadow-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mb-2">
                Ready to Connect?
              </h3>
              <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto leading-relaxed">
                Send a request to <span className="font-medium text-foreground">{facility.name}</span> and they'll reach out to discuss your needs.
              </p>
              <Button 
                onClick={() => setRequestModalOpen(true)} 
                className="gap-2.5 px-8 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5"
                size="lg"
              >
                <Send className="h-4 w-4" />
                Send Request Now
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Request Info Modal with prefill */}
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
        prefillData={prefillData}
      />
    </div>
  );
}
