export interface FacilityShowcaseItem {
  id: string;
  name: string;
  slug?: string | null;
  city: string;
  state: string;
  description?: string | null;
  image?: string | null;
  logo_url?: string | null;
  gallery_urls?: string[] | null;
  featured?: boolean;
  verified?: boolean | null;
  hasFeaturedSubscription?: boolean;
  facility_type?: string | null;
  isFromDatabase?: boolean;
  treatmentTypes?: string[] | null;
  insuranceAccepted?: string[] | null;
  year_established?: number | null;
  googleRating?: number | null;
  googleReviewCount?: number | null;
}