import { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ProviderSEOPageLayout } from "@/components/provider-guides/ProviderSEOPageLayout";
import pgGetMorePatients from "@/assets/provider-guides/pg-get-more-patients.jpg";
import treatmentFacility from "@/assets/provider-guides/treatment-facility.jpg";

const stateData: Record<string, { name: string; abbr: string }> = {
  "alabama": { name: "Alabama", abbr: "AL" }, "alaska": { name: "Alaska", abbr: "AK" },
  "arizona": { name: "Arizona", abbr: "AZ" }, "arkansas": { name: "Arkansas", abbr: "AR" },
  "california": { name: "California", abbr: "CA" }, "colorado": { name: "Colorado", abbr: "CO" },
  "connecticut": { name: "Connecticut", abbr: "CT" }, "delaware": { name: "Delaware", abbr: "DE" },
  "florida": { name: "Florida", abbr: "FL" }, "georgia": { name: "Georgia", abbr: "GA" },
  "hawaii": { name: "Hawaii", abbr: "HI" }, "idaho": { name: "Idaho", abbr: "ID" },
  "illinois": { name: "Illinois", abbr: "IL" }, "indiana": { name: "Indiana", abbr: "IN" },
  "iowa": { name: "Iowa", abbr: "IA" }, "kansas": { name: "Kansas", abbr: "KS" },
  "kentucky": { name: "Kentucky", abbr: "KY" }, "louisiana": { name: "Louisiana", abbr: "LA" },
  "maine": { name: "Maine", abbr: "ME" }, "maryland": { name: "Maryland", abbr: "MD" },
  "massachusetts": { name: "Massachusetts", abbr: "MA" }, "michigan": { name: "Michigan", abbr: "MI" },
  "minnesota": { name: "Minnesota", abbr: "MN" }, "mississippi": { name: "Mississippi", abbr: "MS" },
  "missouri": { name: "Missouri", abbr: "MO" }, "montana": { name: "Montana", abbr: "MT" },
  "nebraska": { name: "Nebraska", abbr: "NE" }, "nevada": { name: "Nevada", abbr: "NV" },
  "new-hampshire": { name: "New Hampshire", abbr: "NH" }, "new-jersey": { name: "New Jersey", abbr: "NJ" },
  "new-mexico": { name: "New Mexico", abbr: "NM" }, "new-york": { name: "New York", abbr: "NY" },
  "north-carolina": { name: "North Carolina", abbr: "NC" }, "north-dakota": { name: "North Dakota", abbr: "ND" },
  "ohio": { name: "Ohio", abbr: "OH" }, "oklahoma": { name: "Oklahoma", abbr: "OK" },
  "oregon": { name: "Oregon", abbr: "OR" }, "pennsylvania": { name: "Pennsylvania", abbr: "PA" },
  "rhode-island": { name: "Rhode Island", abbr: "RI" }, "south-carolina": { name: "South Carolina", abbr: "SC" },
  "south-dakota": { name: "South Dakota", abbr: "SD" }, "tennessee": { name: "Tennessee", abbr: "TN" },
  "texas": { name: "Texas", abbr: "TX" }, "utah": { name: "Utah", abbr: "UT" },
  "vermont": { name: "Vermont", abbr: "VT" }, "virginia": { name: "Virginia", abbr: "VA" },
  "washington": { name: "Washington", abbr: "WA" }, "west-virginia": { name: "West Virginia", abbr: "WV" },
  "wisconsin": { name: "Wisconsin", abbr: "WI" }, "wyoming": { name: "Wyoming", abbr: "WY" },
};

export default function ListYourFacilityState() {
  const location = useLocation();
  const stateSlug = location.pathname.replace("/list-your-facility-in-", "").replace(/\/$/, "") || undefined;
  const state = stateSlug ? stateData[stateSlug] : null;

  if (!state) {
    return <Navigate to="/404" replace />;
  }

  return (
    <ProviderSEOPageLayout
      title={`List Your Facility in ${state.name}`}
      metaTitle={`List Your Rehab Center in ${state.name} Free | RehabLookup`}
      metaDescription={`List your ${state.name} treatment center on RehabLookup for free. Connect with families searching for rehab in ${state.abbr} and grow your admissions.`}
      canonical={`/list-your-facility-in-${stateSlug}`}
      keywords={[
        `list rehab center ${state.name}`,
        `${state.name} treatment center directory`,
        `rehab listing ${state.abbr}`,
        `addiction treatment marketing ${state.name}`,
        `${state.name} rehab referrals`,
      ]}
      heroHeadline={`List Your Treatment Center in ${state.name}`}
      heroSubheadline={`Join ${state.name}'s growing network of accredited treatment providers on RehabLookup. Connect with families actively searching for rehab in ${state.abbr}.`}
      sections={[
        {
          heading: `Why ${state.name} Providers Choose RehabLookup`,
          content: `RehabLookup is the fastest-growing treatment center directory for ${state.name}. Families across ${state.abbr} use our platform to find accredited rehab programs, verify insurance, and connect with providers — and your facility should be where they're looking.`,
          bullets: [
            `Thousands of families search for treatment in ${state.name} every month`,
            `RehabLookup ranks on Google for ${state.abbr} treatment-related searches`,
            `Free listing with full facility profile — no credit card required`,
            `Appear in location-filtered search results across ${state.name} cities`,
            `Receive verified patient inquiries with detailed intake information`,
          ],
        },
        {
          heading: `${state.name} Treatment Market Overview`,
          content: `The addiction treatment landscape in ${state.name} continues to evolve with growing demand, expanded insurance coverage, and increasing competition. Facilities that establish strong online visibility now will capture market share as families increasingly turn to digital platforms for treatment research.`,
          bullets: [
            `Digital treatment searches in ${state.abbr} have grown 40%+ year-over-year`,
            `Insurance parity laws have expanded access to treatment across ${state.name}`,
            `Families compare 3-5 facilities online before making contact`,
            `Directory-listed facilities in ${state.abbr} receive 3x more inquiries`,
            `Early adopters on RehabLookup secure prime positioning in ${state.name} results`,
          ],
        },
        {
          heading: "What's Included in Your Free Listing",
          content: `Every ${state.name} treatment provider gets a comprehensive free listing on RehabLookup. Your profile includes everything families need to evaluate your facility and make contact — with no hidden costs or obligations.`,
          bullets: [
            "Complete facility profile with programs, amenities, and photos",
            "Insurance verification display showing accepted carriers",
            "Appear in treatment-type and city-specific search results",
            "Patient inquiry system with verified contact information",
            "Real-time analytics: profile views, inquiries, and search performance",
          ],
        },
        {
          heading: "Upgrade to Pro for Maximum Visibility",
          content: `Pro listings in ${state.name} receive priority placement in search results, expanded profile features, and access to RehabLookup's concierge placement network — delivering pre-screened, high-intent patient referrals directly to your admissions team.`,
          bullets: [
            `Priority placement in all ${state.name} search results and city pages`,
            "Featured badge and enhanced profile with unlimited photos",
            "Access to concierge placement network for pre-screened referrals",
            "Dedicated account support and marketing consultation",
            "Advanced analytics with competitive benchmarking data",
          ],
        },
        {
          heading: "Get Listed in Under 10 Minutes",
          content: `Signing up your ${state.name} facility on RehabLookup takes less than 10 minutes. Our streamlined onboarding process captures your essential information and creates a professional profile that starts attracting patient inquiries immediately.`,
          bullets: [
            "Step 1: Create your free provider account",
            "Step 2: Add your facility details, programs, and insurance information",
            "Step 3: Upload photos and complete your profile",
            "Step 4: Your listing goes live and starts appearing in search results",
            "Step 5: Receive and respond to patient inquiries through your dashboard",
          ],
        },
      ]}
      ctaHeadline={`List Your ${state.name} Facility Today`}
      ctaSubheadline={`Join treatment centers across ${state.abbr} already connecting with families on RehabLookup. Free to list. No contracts.`}
      images={[
        { src: treatmentFacility, alt: `Treatment center in ${state.name} listed on RehabLookup`, caption: `${state.name} facilities on RehabLookup connect with families searching locally.` },
        { src: pgGetMorePatients, alt: `Admissions team at a ${state.name} rehab center`, caption: `Providers in ${state.abbr} receive verified inquiries from families seeking treatment.` },
      ]}
    />
  );
}
