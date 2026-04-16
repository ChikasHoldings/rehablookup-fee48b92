import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Building2, CheckCircle, Heart, Search } from "lucide-react";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";

interface NearMeHeroProps {
  title: string;
  subtitle: string;
  treatmentType: string;
  location?: {
    city?: string;
    state?: string;
    stateAbbr?: string;
  };
  facilityCount: number;
  heroImage?: string;
}

export function NearMeHero({
  title,
  subtitle,
  treatmentType,
  location,
  facilityCount,
  heroImage,
}: NearMeHeroProps) {
  const locationString = location?.city 
    ? `${location.city}, ${location.stateAbbr}`
    : location?.state || "Your Area";

  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      {heroImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/85 to-primary/75" />
      <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-transparent to-primary/40" />
      
      <div className="container relative z-10 py-10 md:py-14 lg:py-16">
        <BreadcrumbNav
          className="mb-5"
          variant="dark"
          items={[
            { label: "Treatment", href: "/treatment-types" },
            ...(location?.state
              ? [{ label: treatmentType, href: "#" }, { label: locationString }]
              : [{ label: treatmentType }]
            ),
          ]}
        />

        <div className="max-w-3xl">
          {/* Location badge */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm border border-white/10">
            <MapPin className="h-4 w-4" />
            {treatmentType} Near You
          </div>
          
          {/* H1 - Critical for SEO */}
          <h1 className="font-display text-2xl font-bold tracking-tight text-white md:text-3xl lg:text-4xl speakable-headline">
            {title}
          </h1>
          
          {/* Subtitle/summary for voice search */}
          <p className="mt-4 text-base md:text-lg text-white/85 leading-relaxed max-w-2xl speakable-summary">
            {subtitle}
          </p>

          {/* Trust metrics */}
          <div className="mt-5 flex flex-wrap items-center gap-4 md:gap-6">
            <div className="flex items-center gap-2 text-white text-sm md:text-base">
              <Building2 className="h-4 w-4 md:h-5 md:w-5 text-white/80" />
              <span className="font-semibold">{facilityCount}+</span>
              <span className="text-white/80">Verified Centers</span>
            </div>
            <div className="flex items-center gap-2 text-white text-sm md:text-base">
              <MapPin className="h-4 w-4 md:h-5 md:w-5 text-white/80" />
              <span className="text-white/80">{locationString}</span>
            </div>
            <div className="flex items-center gap-2 text-white text-sm md:text-base">
              <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-white/80" />
              <span className="text-white/80">Credentials Verified</span>
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link to="/concierge">
              <Button size="lg" variant="secondary" className="gap-2 w-full sm:w-auto shadow-lg">
                <Heart className="h-4 w-4" />
                Get Matched Instantly
              </Button>
            </Link>
            
            <Link to="/rehab-centers">
              <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto border-white/30 text-white hover:bg-white/10 backdrop-blur-sm">
                <Search className="h-4 w-4" />
                Browse All Centers
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
