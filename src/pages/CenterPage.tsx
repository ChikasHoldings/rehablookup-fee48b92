/**
 * CenterPage — premium directory-style facility profile.
 * Replaces the legacy CenterProfile.tsx body on the /center/:slug route.
 *
 * Reads from the public_facilities view via useFacilityBySlug (no
 * user_id filter — anyone can view, owners get their PII via a
 * separate hook on the editor route).
 *
 * Layout:
 *   Breadcrumb
 *   Hero (gallery / monogram + name + meta + trust row)
 *   Sticky tab strip
 *   Main (Overview, Levels of Care, Services, Insurance, Accreditations,
 *         Location, FAQ) + Sticky Sidebar (Verify Insurance, Talk to
 *         Advisor, Concierge Match, Claim if unclaimed)
 *   Similar Centers Nearby (3 FacilityCards)
 *
 * Injects MedicalBusiness + BreadcrumbList + FAQPage JSON-LD.
 */
import { useParams } from "react-router-dom";
import { useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import CenterNotFound from "@/pages/CenterNotFound";
import { useFacilityBySlug } from "@/hooks/useFacilityBySlug";
import { useFacilityChildData } from "@/hooks/useFacilityChildData";
import { CenterBreadcrumb } from "@/components/center/CenterBreadcrumb";
import { CenterHero } from "@/components/center/CenterHero";
import { CenterTabs } from "@/components/center/CenterTabs";
import { CenterSidebar } from "@/components/center/CenterSidebar";
import { CenterOverview } from "@/components/center/CenterOverview";
import { CenterLevelsOfCare } from "@/components/center/CenterLevelsOfCare";
import { CenterServices } from "@/components/center/CenterServices";
import { CenterInsurance } from "@/components/center/CenterInsurance";
import { CenterAccreditations } from "@/components/center/CenterAccreditations";
import { CenterLocation } from "@/components/center/CenterLocation";
import { CenterFAQ, buildCenterFAQs } from "@/components/center/CenterFAQ";
import { SimilarCenters } from "@/components/center/SimilarCenters";
import { CenterJsonLd } from "@/components/center/CenterJsonLd";

export default function CenterPage() {
  const { slug } = useParams<{ slug: string }>();
  const { facility, claimFlags, loading, notFound } = useFacilityBySlug(slug);
  const ids = useMemo(() => (facility ? [facility.id] : []), [facility]);
  const { data: childData } = useFacilityChildData(ids);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center text-sm text-slate-500">
          Loading…
        </div>
      </Layout>
    );
  }

  if (notFound || !facility) {
    return <CenterNotFound attemptedSlug={slug} reason="missing" />;
  }

  const services = childData?.services.get(facility.id) ?? [];
  const insurance = childData?.insurance.get(facility.id) ?? [];
  const ageGroups = childData?.ageGroups.get(facility.id) ?? [];
  const accreditations = childData?.accreditations.get(facility.id) ?? [];

  const isClaimed = claimFlags?.is_claimed ?? false;
  const facilityForSidebar = {
    name: facility.name,
    slug: facility.slug,
    is_claimed: isClaimed,
  };

  const faqs = buildCenterFAQs({
    name: facility.name,
    city: facility.city,
    state: facility.state,
    services,
    insurance,
    accreditations,
    ageGroups,
    genderServed: facility.gender_served,
  });

  // Which tab anchors actually have content to render? Skip tabs whose
  // section will be hidden so the strip never points at empty sections.
  const tabs = [
    { id: "overview", label: "Overview" },
    ...(services.length > 0 ? [{ id: "levels-of-care", label: "Levels of Care" }] : []),
    ...(services.length > 0 || ageGroups.length > 0 || facility.gender_served
      ? [{ id: "services", label: "Services" }]
      : []),
    { id: "insurance", label: "Insurance" },
    ...(accreditations.length > 0 ? [{ id: "accreditations", label: "Accreditations" }] : []),
    { id: "location", label: "Location" },
    ...(faqs.length > 0 ? [{ id: "faq", label: "FAQ" }] : []),
  ];

  const pageTitle = `${facility.name} — ${facility.city}, ${facility.state} | RehabLookup`;
  const pageDesc =
    facility.description?.slice(0, 155) ||
    `${facility.name} in ${facility.city}, ${facility.state}. Verified treatment center on RehabLookup.`;

  return (
    <Layout>
      <SEO
        title={pageTitle}
        description={pageDesc}
        canonical={facility.slug ? `https://rehablookup.com/center/${facility.slug}` : undefined}
      />
      <CenterJsonLd
        facility={{
          name: facility.name,
          slug: facility.slug,
          address: facility.address,
          city: facility.city,
          state: facility.state,
          zip_code: facility.zip_code,
          description: facility.description,
        }}
        accreditations={accreditations}
        faqs={faqs}
      />

      <div className="bg-white">
        <CenterBreadcrumb state={facility.state} city={facility.city} name={facility.name} />
        <CenterHero
          facility={{
            id: facility.id,
            name: facility.name,
            city: facility.city,
            state: facility.state,
            facility_type: facility.facility_type,
            logo_url: facility.logo_url,
            gallery_urls: facility.gallery_urls,
            verified: facility.verified,
          }}
          accreditations={accreditations}
        />
        <CenterTabs tabs={tabs} />
        <div className="container mx-auto px-4 py-6 md:py-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="space-y-10">
              <CenterOverview
                name={facility.name}
                description={facility.description}
                city={facility.city}
                state={facility.state}
                facilityType={facility.facility_type}
              />
              <CenterLevelsOfCare services={services} />
              <CenterServices
                services={services}
                ageGroups={ageGroups}
                genderServed={facility.gender_served}
              />
              <CenterInsurance insurance={insurance} />
              <CenterAccreditations accreditations={accreditations} />
              <CenterLocation
                facility={{
                  name: facility.name,
                  address: facility.address,
                  city: facility.city,
                  state: facility.state,
                  zip_code: facility.zip_code,
                  phone: facility.phone,
                  website: facility.website,
                }}
              />
              <CenterFAQ faqs={faqs} />
            </div>
            <CenterSidebar facility={facilityForSidebar} />
          </div>
        </div>
        <SimilarCenters
          excludeId={facility.id}
          state={facility.state}
          facilityType={facility.facility_type}
        />
      </div>
    </Layout>
  );
}
