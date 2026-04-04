import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateLocalBusinessSchema } from "@/components/SEO";
import { ContactRequestForm } from "@/components/forms/ContactRequestForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { treatmentCenters } from "@/data/treatmentCenters";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { analytics } from "@/lib/analytics";
import {
  MapPin,
  Phone,
  Star,
  CheckCircle,
  Shield,
  Clock,
  ArrowLeft,
  Building2,
  Heart,
  BadgeCheck,
  Globe,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ConciergeCTACard } from "@/components/concierge/ConciergeCTACard";

// Generate initials from facility name
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const TreatmentCenterProfile = () => {
  const { slug: id } = useParams<{ slug: string }>();
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  
  const staticCenter = treatmentCenters.find((c) => c.id === id);
  
  useEffect(() => {
    const trackView = async () => {
      if (!id || hasTrackedView || staticCenter) return;
      
      try {
        await supabase.functions.invoke('track-view', {
          body: { facility_id: id }
        });
        setHasTrackedView(true);
        
        // Track in GA
        if (staticCenter?.name) {
          analytics.facilityView(id, staticCenter.name);
        }
      } catch (error) {
        console.error('Failed to track view:', error);
      }
    };

    trackView();
  }, [id, hasTrackedView, staticCenter]);

  const center = staticCenter;

  if (!center) {
    return (
      <Layout>
        <div className="bg-muted/30 min-h-screen py-20">
          <div className="container max-w-md text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <h1 className="mb-3 font-display text-xl font-bold text-foreground">
              Center Not Found
            </h1>
            <p className="mb-6 text-sm text-muted-foreground">
              The treatment center you're looking for doesn't exist or has been removed.
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

  // Demo gallery images
  const galleryImages = [
    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1551076805-e1869033e561?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
  ];

  const initials = getInitials(center.name);

  return (
    <Layout>
      <SEO
        title={`${center.name} - Addiction Treatment in ${center.city}, ${center.state}`}
        description={center.description.slice(0, 155) + (center.description.length > 155 ? '...' : '')}
        canonical={`/rehab-centers/${center.id}`}
        keywords={[
          center.name,
          `addiction treatment ${center.city}`,
          `rehab center ${center.state}`,
          `drug rehab ${center.city} ${center.state}`,
          ...center.treatmentTypes.slice(0, 5),
        ]}
        structuredData={generateLocalBusinessSchema({
          name: center.name,
          address: center.address,
          city: center.city,
          state: center.state,
          zipCode: center.zipCode,
          phone: center.phone,
          description: center.description,
          rating: center.rating,
          reviewCount: center.reviewCount,
          services: center.treatmentTypes,
          insurance: center.insuranceAccepted,
          verified: true,
          featured: center.featured,
        })}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Find Rehab", url: "/rehab-centers" },
          { name: center.state, url: `/locations/${center.state.toLowerCase().replace(/\s+/g, "-")}` },
          { name: center.name, url: `/rehab-centers/${center.id}` },
        ]}
      />
      {/* Main Content - Contained Layout */}
      <div className="bg-muted/30 min-h-screen pb-6">
        <div className="container max-w-5xl py-6 md:py-8">
          {/* Back Link */}
          <Link
            to="/rehab-centers"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to search results
          </Link>

          {/* Header Card */}
          <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-3 sm:gap-4">
                {/* Logo Placeholder with Initials */}
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-muted sm:h-16 sm:w-16 md:h-20 md:w-20">
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="font-display text-lg font-bold text-primary sm:text-xl md:text-2xl">
                      {initials}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {center.featured && (
                      <Badge className="bg-accent text-accent-foreground border-0 gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
                        <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-current" />
                        Featured
                      </Badge>
                    )}
                    <Badge variant="secondary" className="gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
                      <BadgeCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      Verified
                    </Badge>
                  </div>
                  
                  <h1 className="font-display text-lg font-bold text-foreground leading-tight sm:text-xl md:text-2xl line-clamp-2">
                    {center.name}
                  </h1>
                  <p className="mt-1 flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                    {center.city}, {center.state}
                  </p>
                  
                  {/* Rating */}
                  <div className="mt-2 flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-accent text-accent" />
                    <span className="text-xs sm:text-sm font-semibold">{center.rating}</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground">({center.reviewCount} reviews)</span>
                  </div>
                </div>
              </div>

              {/* Desktop Actions - Request-based for static profiles */}
              <div className="hidden md:flex flex-col gap-2 shrink-0">
                <Button size="sm" className="w-full gap-2">
                  <Phone className="h-4 w-4" />
                  Request Call
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Globe className="h-4 w-4" />
                  Request Info
                </Button>
              </div>
            </div>

            {/* Mobile Action Buttons */}
            <div className="flex gap-2 mt-4 md:hidden">
              <Button size="sm" className="flex-1 gap-2">
                <Phone className="h-4 w-4" />
                Request Call
              </Button>
              <Button variant="outline" size="sm" className="flex-1 gap-1.5">
                <Globe className="h-4 w-4" />
                Request Info
              </Button>
            </div>

            {/* Treatment Tags */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex flex-wrap gap-1.5">
                {center.treatmentTypes.map((type) => (
                  <Badge key={type} variant="secondary" className="text-xs px-2.5 py-1">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid gap-5 lg:gap-6 lg:grid-cols-3">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-4 lg:space-y-5">
              {/* Gallery */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-base font-semibold text-foreground">
                    Facility Photos
                  </h2>
                </div>
                
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted mb-3">
                  <img 
                    src={galleryImages[activeGalleryIndex]} 
                    alt={`${center.name} - Photo ${activeGalleryIndex + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
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
                </div>
                
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {galleryImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveGalleryIndex(idx)}
                      className={`shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-colors ${
                        idx === activeGalleryIndex ? 'border-primary' : 'border-transparent hover:border-border'
                      }`}
                    >
                      <img src={img} alt={`${center.name} facility photo ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>

              {/* About */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-base font-semibold text-foreground">
                    About This Facility
                  </h2>
                </div>
                <TruncatedText text={center.description} />
              </div>

              {/* Program Overview */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Heart className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-base font-semibold text-foreground">
                    Program Overview
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {center.programOverview}
                </p>
              </div>

              {/* Treatment Programs */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-base font-semibold text-foreground">
                    Treatment Programs
                  </h2>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {center.treatmentTypes.map((type) => (
                    <div
                      key={type}
                      className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3"
                    >
                      <Heart className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm font-medium text-foreground">{type}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Insurance */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-base font-semibold text-foreground">
                    Insurance Accepted
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {center.insuranceAccepted.map((ins) => (
                    <Badge key={ins} variant="secondary" className="px-2.5 py-1 text-xs">
                      {ins}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div className="rounded-xl border border-border bg-card p-4 lg:p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3 lg:mb-4">
                  <BadgeCheck className="h-4 w-4 text-accent" />
                  <h2 className="font-display text-sm lg:text-base font-semibold text-foreground">
                    Facility Amenities
                  </h2>
                </div>
                <div className="grid gap-1.5 lg:gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {center.amenities.map((amenity) => (
                    <div key={amenity} className="flex items-center gap-2 text-xs lg:text-sm text-foreground">
                      <CheckCircle className="h-3.5 lg:h-4 w-3.5 lg:w-4 shrink-0 text-accent" />
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile Contact Form */}
              <div className="lg:hidden rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-sm font-semibold text-foreground">
                      Request Information
                    </h2>
                    <p className="text-xs text-muted-foreground">Get help today</p>
                  </div>
                </div>
                
                <div className="mb-3 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Clock className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium text-foreground">Quick Response</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    A specialist will contact you within 24 hours.
                  </p>
                </div>

                <ContactRequestForm centerName={center.name} />
              </div>

              {/* Concierge CTA Card - Mobile */}
              <div className="lg:hidden">
                <ConciergeCTACard compact />
              </div>
            </div>

            {/* Right Column - Contact Form (Hidden on mobile, shown inline above) */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="sticky top-20 rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-sm font-semibold text-foreground">
                      Request Information
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

                <ContactRequestForm centerName={center.name} />
              </div>

              {/* Concierge CTA Card */}
              <ConciergeCTACard className="mt-4" />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TreatmentCenterProfile;