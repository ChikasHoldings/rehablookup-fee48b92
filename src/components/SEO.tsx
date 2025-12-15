import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  type?: "website" | "article" | "organization" | "local_business";
  image?: string;
  noindex?: boolean;
  structuredData?: object;
  breadcrumbs?: { name: string; url: string }[];
}

const SITE_NAME = "RehabLookup";
const SITE_URL = "https://rehablookup.com";
const DEFAULT_IMAGE = "/og-image.jpg";

export function SEO({
  title,
  description,
  canonical,
  type = "website",
  image = DEFAULT_IMAGE,
  noindex = false,
  structuredData,
  breadcrumbs,
}: SEOProps) {
  const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
  const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : undefined;
  const imageUrl = image.startsWith("http") ? image : `${SITE_URL}${image}`;

  // Base organization schema
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    contactPoint: {
      "@type": "ContactPoint",
      email: "help@rehablookup.com",
      contactType: "customer service",
      availableLanguage: "English",
      areaServed: "US",
    },
    sameAs: [
      "https://facebook.com/rehablookup",
      "https://twitter.com/rehablookup",
      "https://linkedin.com/company/rehablookup",
    ],
  };

  // Breadcrumb schema
  const breadcrumbSchema = breadcrumbs
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: `${SITE_URL}${item.url}`,
        })),
      }
    : null;

  // Website search action schema
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/rehab-centers?location={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type === "article" ? "article" : "website"} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {/* Additional SEO Meta */}
      <meta name="theme-color" content="#1B365D" />
      <meta name="format-detection" content="telephone=yes" />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteSchema)}
      </script>
      {breadcrumbSchema && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      )}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}

// Pre-built structured data generators
export function generateFAQSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function generateLocalBusinessSchema(facility: {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  description: string;
  rating?: number;
  reviewCount?: number;
  image?: string;
  services?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    "@id": `https://rehablookup.com/center/${facility.name.toLowerCase().replace(/\s+/g, "-")}`,
    name: facility.name,
    description: facility.description,
    image: facility.image,
    telephone: facility.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: facility.address,
      addressLocality: facility.city,
      addressRegion: facility.state,
      postalCode: facility.zipCode,
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      // Would be populated with actual coordinates
    },
    medicalSpecialty: "Addiction Medicine",
    availableService: facility.services?.map((service) => ({
      "@type": "MedicalTherapy",
      name: service,
    })),
    ...(facility.rating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: facility.rating,
        reviewCount: facility.reviewCount || 0,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };
}

export function generateArticleSchema(article: {
  title: string;
  description: string;
  author: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    author: {
      "@type": "Person",
      name: article.author,
    },
    publisher: {
      "@type": "Organization",
      name: "RehabLookup",
      logo: {
        "@type": "ImageObject",
        url: "https://rehablookup.com/logo.png",
      },
    },
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    image: article.image,
    mainEntityOfPage: {
      "@type": "WebPage",
    },
  };
}
