import { useMemo, useRef, useState, useEffect } from "react";
import { Search, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { useFacilityChildData } from "@/hooks/useFacilityChildData";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { buildConciergeHref } from "@/lib/conciergeHref";

// Adapts the legacy snapshot row shape (camelCase facilityType/logoUrl)
// AND the new public_facilities row shape (snake_case facility_type/logo_url)
// into the shape TreatmentCenterCard reads (matches the /rehab-centers
// canonical card visual).
function toCardData(
  facility: Record<string, unknown>,
  services: string[],
  insurance: string[],
) {
  const isFeatured = Boolean(
    facility.hasFeaturedSubscription ?? facility.featured ?? facility.isFeatured,
  );
  return {
    id: String(facility.id),
    name: String(facility.name ?? ""),
    slug: (facility.slug as string | null) ?? null,
    city: String(facility.city ?? ""),
    state: String(facility.state ?? ""),
    zipCode: String(facility.zip_code ?? facility.zipCode ?? ""),
    address: String(facility.address ?? ""),
    phone: String(facility.phone ?? ""),
    treatmentTypes: services,
    insuranceAccepted: insurance,
    description: String(facility.description ?? ""),
    programOverview: "",
    featured: isFeatured,
    rating: (facility.googleRating as number | null) ?? null,
    reviewCount: (facility.googleReviewCount as number) ?? 0,
    amenities: [],
    image: (facility.image as string | null) ?? null,
    isFromDatabase: true,
    logo_url:
      (facility.logo_url as string | null) ??
      (facility.logoUrl as string | null) ??
      null,
    hasFeaturedSubscription: isFeatured,
    isPro: Boolean(facility.isPro ?? facility.is_pro),
    verified: (facility.verified as boolean | null) ?? null,
    year_established: (facility.year_established as number | null) ?? null,
    facilityType:
      (facility.facility_type as string | null) ??
      (facility.facilityType as string | null) ??
      null,
    insuranceAcceptedList: insurance,
    googleRating: (facility.googleRating as number | null) ?? null,
    googleReviewCount: (facility.googleReviewCount as number | null) ?? null,
  };
}

interface ResponsiveListingGridProps {
  facilities: any[];
  maxItems?: number;
  /** Forwarded to /concierge as prefill / attribution. */
  conciergeLocation?: string;
  conciergeTreatment?: string;
  conciergeInsurance?: string;
  conciergeSource?: string;
  /** When `facilities` is empty, render these as "nearby suggestions" instead of a blank state. */
  nearbyFacilities?: any[];
  /** Label shown above nearby fallback (e.g. "Centers in nearby cities"). */
  nearbyLabel?: string;
}

export function ResponsiveListingGrid({
  facilities,
  maxItems = 12,
  conciergeLocation,
  conciergeTreatment,
  conciergeInsurance,
  conciergeSource = "responsive_listing_grid_empty",
  nearbyFacilities,
  nearbyLabel = "Centers in nearby areas",
}: ResponsiveListingGridProps) {
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const items = facilities.slice(0, maxItems);
  const nearbyItems = nearbyFacilities ?? [];

  // Batched child-data lookup — services / insurance / age groups /
  // accreditations for every visible card in 4 IN-list queries total.
  // Includes nearby items when the primary list is empty so the
  // fallback cards aren't blank either.
  const visibleIds = useMemo(() => {
    const set = new Set<string>();
    for (const f of items) if (f?.id) set.add(String(f.id));
    for (const f of nearbyItems) if (f?.id) set.add(String(f.id));
    return [...set];
  }, [items, nearbyItems]);
  const { data: childData } = useFacilityChildData(visibleIds);

  const renderCard = (facility: Record<string, unknown>) => {
    const id = String(facility.id ?? "");
    const services = childData?.services.get(id) ?? [];
    const insurance = childData?.insurance.get(id) ?? [];
    const card = toCardData(facility, services, insurance);
    return (
      <TreatmentCenterCard
        key={id || card.name}
        center={card}
        featured={card.featured}
      />
    );
  };

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [items.length]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = dir === "left" ? -320 : 320;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  // Empty state: render nearby suggestions if available, otherwise CTA fallback
  if (items.length === 0) {
    const nearby = (nearbyFacilities || []).slice(0, maxItems);

    if (nearby.length > 0) {
      return (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              No exact matches yet — showing {nearby.length} {nearby.length === 1 ? "center" : "centers"} {nearbyLabel.toLowerCase()}.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {nearby.map((facility) => renderCard(facility))}
          </div>
          <div className="flex justify-center pt-2">
            <Link
              to={buildConciergeHref({
                location: conciergeLocation,
                treatment: conciergeTreatment,
                insurance: conciergeInsurance,
                source: conciergeSource,
              })}
            >
              <Button variant="outline" className="gap-2">
                <Heart className="h-4 w-4" />
                Get Personalized Help
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl border border-dashed border-border bg-muted/20">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Search className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No Facilities Listed Yet</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          We're expanding our network in this area. Browse all centers nationwide or let our team find the right match for you.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link to="/search-results">
            <Button variant="outline" className="gap-2">
              <Search className="h-4 w-4" />
              Browse All Centers
            </Button>
          </Link>
          <Link
            to={buildConciergeHref({
              location: conciergeLocation,
              treatment: conciergeTreatment,
              insurance: conciergeInsurance,
              source: conciergeSource,
            })}
          >
            <Button className="gap-2">
              <Heart className="h-4 w-4" />
              Get Personalized Help
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!isMobile) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((facility) => renderCard(facility))}
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-4 -mx-4 px-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {items.map((facility) => (
          <div
            key={facility.id || facility.name}
            className="flex-shrink-0 w-[85vw] max-w-[340px] snap-start"
          >
            {renderCard(facility)}
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-1.5 mt-2">
        {items.slice(0, Math.min(items.length, 6)).map((_, i) => (
          <div key={i} className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
        ))}
        {items.length > 6 && <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/15" />}
      </div>
    </div>
  );
}
