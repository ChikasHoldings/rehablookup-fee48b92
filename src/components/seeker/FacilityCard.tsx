import { forwardRef } from "react";
import { SearchResultCard } from "@/components/cards/SearchResultCard";
import { SearchResultCardSkeleton } from "@/components/skeletons/SearchResultSkeleton";
import type { PlanTier } from "@/lib/facilityPlanSort";
import type { TreatmentCenter } from "@/data/treatmentCenters";

/**
 * Data shape consumed by the three seeker-panel surfaces
 * (SeekerHome / SeekerSearch / SeekerSaved). Kept as a stable contract
 * so those pages don't need to refactor — see the mapper below.
 */
export interface FacilityCardData {
  id: string;
  name: string;
  city: string;
  state: string;
  facility_type: string | null;
  slug: string | null;
  phone: string | null;
  description: string | null;
  logo_url: string | null;
  gallery_urls: string[] | null;
  verified: boolean | null;
  year_established: number | null;
  planTier?: PlanTier;
  featured?: boolean;
}

interface FacilityCardProps {
  facility: FacilityCardData;
  /**
   * Optional callback fired when the heart is clicked with showRemoveButton.
   * Kept on the API for SeekerSaved compatibility, but the underlying card's
   * heart already drives useFavorites — which SeekerSaved subscribes to via
   * a re-fetch effect — so removal works whether or not this fires.
   */
  onRemove?: (id: string) => void;
  showRemoveButton?: boolean;
}

/**
 * Seeker-context wrapper around SearchResultCard. As of 2026-05-23 this
 * component delegates rendering to `SearchResultCard` so authenticated
 * seekers see the same card UX as anon visitors on /search-results
 * (phone CTA, proximity badge, treatment chips, insurance count, Featured
 * crown, compare, message-center modal, match-me-free concierge fallback,
 * impression + click-to-call analytics). Previously the seeker panel had
 * its own slimmer card — visual + feature drift had accumulated.
 *
 * The legacy `FacilityCardData` shape is preserved so SeekerHome,
 * SeekerSaved, and SeekerSearch don't need to refactor their data-mapping;
 * we just translate here.
 */
export const FacilityCard = forwardRef<HTMLElement, FacilityCardProps>(
  function FacilityCard({ facility }, ref) {
    const center: TreatmentCenter & {
      slug?: string | null;
      isFromDatabase?: boolean;
      logo_url?: string | null;
      gallery_urls?: string[] | null;
      hasFeaturedSubscription?: boolean;
      hasPaidPlan?: boolean;
      verified?: boolean | null;
      year_established?: number | null;
      facilityType?: string | null;
      insuranceAccepted?: string[];
    } = {
      id: facility.id,
      name: facility.name,
      city: facility.city,
      state: facility.state,
      zipCode: "",
      address: "",
      phone: facility.phone ?? "",
      treatmentTypes: [],
      insuranceAccepted: [],
      description: facility.description ?? "",
      programOverview: "",
      rating: null,
      reviewCount: 0,
      amenities: [],
      image: facility.gallery_urls?.[0] ?? null,
      slug: facility.slug,
      isFromDatabase: true,
      logo_url: facility.logo_url,
      gallery_urls: facility.gallery_urls,
      hasFeaturedSubscription: facility.featured,
      hasPaidPlan: facility.planTier === "pro",
      verified: facility.verified,
      year_established: facility.year_established,
      facilityType: facility.facility_type,
    };

    return <SearchResultCard center={center} featured={facility.featured} ref={ref} />;
  },
);

export const FacilityCardSkeleton = SearchResultCardSkeleton;
