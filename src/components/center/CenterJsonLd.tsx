/**
 * CenterJsonLd
 * ────────────
 * Emits three JSON-LD blocks per facility detail page:
 *   1. MedicalBusiness   — the facility itself
 *   2. BreadcrumbList    — Home / State / City / Center hierarchy
 *   3. FAQPage           — Q/A entries surfaced in the FAQ accordion
 *
 * Google reads all three to render rich results. FAQs are sourced from
 * the same buildCenterFAQs() the accordion uses so they stay in sync.
 */
import { useEffect } from "react";
import type { FaqEntry } from "./CenterFAQ";

const BASE_URL = "https://rehablookup.com";

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

interface CenterJsonLdProps {
  facility: {
    name: string;
    slug: string | null;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    description: string | null;
  };
  accreditations: string[];
  faqs: FaqEntry[];
}

export function CenterJsonLd({ facility, accreditations, faqs }: CenterJsonLdProps) {
  // Inject three <script type="application/ld+json"> blocks into <head>
  // imperatively so SSR/snapshot crawls also pick them up. We remove
  // them on unmount so navigating away doesn't leave stale schema.
  useEffect(() => {
    if (!facility.slug) return;
    const canonicalUrl = `${BASE_URL}/center/${facility.slug}`;
    const stateSlug = slugify(facility.state);
    const citySlug = slugify(facility.city);

    const businessSchema = {
      "@context": "https://schema.org",
      "@type": "MedicalBusiness",
      name: facility.name,
      url: canonicalUrl,
      address: {
        "@type": "PostalAddress",
        streetAddress: facility.address,
        addressLocality: facility.city,
        addressRegion: facility.state,
        postalCode: facility.zip_code,
        addressCountry: "US",
      },
      medicalSpecialty: "Addiction Medicine",
      description: facility.description ?? `${facility.name} provides addiction treatment services in ${facility.city}, ${facility.state}.`,
      hasCredential: accreditations.map((a) => ({
        "@type": "EducationalOccupationalCredential",
        name: a,
      })),
    };

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${BASE_URL}/` },
        { "@type": "ListItem", position: 2, name: facility.state, item: `${BASE_URL}/rehab-centers/${stateSlug}` },
        { "@type": "ListItem", position: 3, name: facility.city, item: `${BASE_URL}/rehab-centers/${stateSlug}/${citySlug}` },
        { "@type": "ListItem", position: 4, name: facility.name, item: canonicalUrl },
      ],
    };

    const faqSchema = faqs.length > 0 ? {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    } : null;

    const blocks = [businessSchema, breadcrumbSchema, ...(faqSchema ? [faqSchema] : [])];
    const tags: HTMLScriptElement[] = [];
    for (const block of blocks) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.center = facility.slug;
      script.textContent = JSON.stringify(block);
      document.head.appendChild(script);
      tags.push(script);
    }
    return () => {
      for (const t of tags) t.remove();
    };
  }, [facility, accreditations, faqs]);

  return null;
}
