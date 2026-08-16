import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle, Scale, Search, Clock } from "lucide-react";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { LocationStatTile } from "@/components/seo/LocationStatTile";

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

/**
 * NearMeHero — proximity / "find nearby" directory hero used by the
 * ~30 /near-me pages. Distinct from State / City / County /
 * Treatment-State / SEO Landing heroes in three ways:
 *
 *   1. EMERALD accent. The other archetypes use slate/primary
 *      (state), warm primary/accent (city), pure primary (county),
 *      per-modality colour (treatment), or amber (SEO landing).
 *      Near-me leans emerald because the page promise is "show me
 *      what's near me" — green reads as proximity / availability.
 *   2. PULSING live-location dot in the eyebrow chip. Subtle, but
 *      reinforces the live / right-now intent that distinguishes
 *      near-me from the other location archetypes.
 *   3. Stat strip emphasises NEARBY signals (Centers Nearby, Same-Day
 *      Admit, States Covered) rather than location-static metrics.
 *
 * Hero footprint is intentionally smaller than the State hero
 * (py-6 md:py-8) — State remains the network centerpiece.
 */
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
    <section className="relative overflow-hidden border-b border-white/5">
      {heroImage && (
        <img
          src={heroImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
      )}
      {/* Emerald-tinged overlay — proximity / availability palette. */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-emerald-900/75 to-teal-700/55" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(16,185,129,0.12),_transparent_55%)]" />

      <div className="container relative z-10 py-6 md:py-8">
        <BreadcrumbNav
          className="mb-3 [&_*]:!text-white/70 [&_a:hover]:!text-white"
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
          {/* Eyebrow with pulsing live-location dot — reinforces the
              "right now / near me" intent. */}
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-100 backdrop-blur-sm ring-1 ring-emerald-400/30">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300" />
            </span>
            Near You · {locationString}
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-white md:text-3xl lg:text-4xl speakable-headline">
            {title}
          </h1>

          <p className="mt-2 text-sm md:text-base text-white/85 max-w-2xl speakable-summary">
            {subtitle}
          </p>

          <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
            <Link to="/search-results">
              <Button size="default" className="gap-2 w-full sm:w-auto shadow-lg shadow-black/20">
                <Search className="h-4 w-4" />
                Browse All Centers
              </Button>
            </Link>
            <Link to="/compare">
              <Button
                size="default"
                variant="outline"
                className="gap-2 w-full sm:w-auto border-white/30 bg-white/5 text-white hover:bg-white/15 backdrop-blur-sm"
              >
                <Scale className="h-4 w-4" />
                Compare Facilities
              </Button>
            </Link>
          </div>
        </div>

        {/* Stat strip — proximity-focused signals. Uses the same
            LocationStatTile glass primitive as every other directory
            hero so the visual vocabulary stays consistent. */}
        <div className="mt-5 hidden md:grid grid-cols-3 gap-2 max-w-3xl">
          <LocationStatTile
            size="sm"
            label={facilityCount > 0 ? "Centers Nearby" : "Growing Network"}
            value={facilityCount > 0 ? `${facilityCount}+` : "Live"}
            icon={Building2}
          />
          <LocationStatTile
            size="sm"
            label="Same-Day Admit"
            value="24/7"
            icon={Clock}
          />
          <LocationStatTile
            size="sm"
            label="Credentials"
            value="Verified"
            icon={CheckCircle}
          />
        </div>
      </div>
    </section>
  );
}
