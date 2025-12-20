import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  type?: "website" | "article" | "organization" | "local_business" | "service";
  image?: string;
  noindex?: boolean;
  structuredData?: object | object[];
  breadcrumbs?: { name: string; url: string }[];
  keywords?: string[];
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  locale?: string;
}

const SITE_NAME = "RehabLookup";
const SITE_URL = "https://rehablookup.com";
const DEFAULT_IMAGE = "/og-image.jpg";
const TWITTER_HANDLE = "@rehablookup";

export function SEO({
  title,
  description,
  canonical,
  type = "website",
  image = DEFAULT_IMAGE,
  noindex = false,
  structuredData,
  breadcrumbs,
  keywords,
  author = "RehabLookup Editorial Team",
  publishedTime,
  modifiedTime,
  locale = "en_US",
}: SEOProps) {
  const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
  const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : undefined;
  const imageUrl = image.startsWith("http") ? image : `${SITE_URL}${image}`;
  const truncatedDescription = description.length > 160 ? description.slice(0, 157) + "..." : description;

  // Base organization schema
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/logo.png`,
      width: 512,
      height: 512,
    },
    description: "RehabLookup helps individuals and families find verified drug and alcohol treatment centers across the United States.",
    foundingDate: "2024",
    contactPoint: {
      "@type": "ContactPoint",
      email: "help@rehablookup.com",
      contactType: "customer service",
      availableLanguage: ["English", "Spanish"],
      areaServed: "US",
    },
    sameAs: [
      "https://facebook.com/rehablookup",
      "https://twitter.com/rehablookup",
      "https://linkedin.com/company/rehablookup",
      "https://instagram.com/rehablookup",
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

  // Website search action schema with enhanced sitelinks searchbox
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    description: "Find verified addiction treatment centers near you",
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: [
      {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/search-results?location={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    ],
    inLanguage: "en-US",
  };

  // Medical website schema for health authority
  const medicalWebsiteSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    "@id": canonicalUrl ? `${canonicalUrl}/#webpage` : undefined,
    url: canonicalUrl,
    name: fullTitle,
    description: truncatedDescription,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: {
      "@type": "MedicalCondition",
      name: "Substance Use Disorder",
      alternateName: ["Drug Addiction", "Alcohol Addiction", "Chemical Dependency"],
    },
    specialty: "Addiction Medicine",
    lastReviewed: modifiedTime || new Date().toISOString().split("T")[0],
    reviewedBy: {
      "@type": "Organization",
      name: "RehabLookup Medical Advisory Board",
    },
  };

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <html lang="en" />
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={truncatedDescription} />
      {keywords && keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(", ")} />
      )}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}
      <meta name="author" content={author} />
      <meta name="publisher" content={SITE_NAME} />
      <meta name="copyright" content={`© ${new Date().getFullYear()} ${SITE_NAME}`} />

      {/* Geographic Meta */}
      <meta name="geo.region" content="US" />
      <meta name="geo.placename" content="United States" />
      <meta name="ICBM" content="39.8283, -98.5795" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type === "article" ? "article" : "website"} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={truncatedDescription} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title} />
      <meta property="og:locale" content={locale} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {type === "article" && <meta property="article:author" content={author} />}
      {type === "article" && <meta property="article:section" content="Health" />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:creator" content={TWITTER_HANDLE} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={truncatedDescription} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={title} />

      {/* Additional SEO Meta */}
      <meta name="theme-color" content="#1B365D" />
      <meta name="msapplication-TileColor" content="#1B365D" />
      <meta name="format-detection" content="telephone=yes" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content={SITE_NAME} />

      {/* Preconnect for performance */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://www.google-analytics.com" />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteSchema)}
      </script>
      {canonicalUrl && (
        <script type="application/ld+json">
          {JSON.stringify(medicalWebsiteSchema)}
        </script>
      )}
      {breadcrumbSchema && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      )}
      {structuredData && Array.isArray(structuredData) ? (
        structuredData.map((data, index) => (
          <script key={index} type="application/ld+json">
            {JSON.stringify(data)}
          </script>
        ))
      ) : structuredData ? (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      ) : null}
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
  insurance?: string[];
  slug?: string;
  email?: string;
  website?: string;
  facilityType?: string;
  yearEstablished?: number;
  verified?: boolean;
  featured?: boolean;
  accreditations?: string[];
}) {
  const facilityUrl = `https://rehablookup.com/center/${facility.slug || facility.name.toLowerCase().replace(/\s+/g, "-")}`;
  
  return {
    "@context": "https://schema.org",
    "@type": ["MedicalBusiness", "LocalBusiness", "HealthAndBeautyBusiness"],
    "@id": facilityUrl,
    url: facilityUrl,
    name: facility.name,
    description: facility.description,
    image: facility.image ? [facility.image] : undefined,
    telephone: facility.phone,
    email: facility.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: facility.address,
      addressLocality: facility.city,
      addressRegion: facility.state,
      postalCode: facility.zipCode,
      addressCountry: "US",
    },
    areaServed: {
      "@type": "State",
      name: facility.state,
    },
    geo: {
      "@type": "GeoCoordinates",
      addressCountry: "US",
    },
    // Open 24/7 for treatment facilities
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "00:00",
      closes: "23:59",
    },
    isAccessibleForFree: false,
    medicalSpecialty: ["Addiction Medicine", "Psychiatry", "Behavioral Health"],
    availableService: facility.services?.map((service) => ({
      "@type": "MedicalTherapy",
      name: service,
      serviceType: "Addiction Treatment",
    })),
    hasCredential: facility.accreditations?.map((accreditation) => ({
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "Accreditation",
      name: accreditation,
    })),
    paymentAccepted: ["Cash", "Credit Card", "Insurance", ...(facility.insurance || [])],
    currenciesAccepted: "USD",
    priceRange: "$$-$$$$",
    foundingDate: facility.yearEstablished?.toString(),
    sameAs: facility.website ? [facility.website] : undefined,
    slogan: "Your Path to Recovery Starts Here",
    knowsAbout: [
      "Drug Addiction Treatment",
      "Alcohol Rehabilitation", 
      "Mental Health Services",
      "Detoxification Programs",
      "Outpatient Treatment",
      "Inpatient Rehabilitation",
    ],
    ...(facility.rating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: facility.rating,
        reviewCount: facility.reviewCount || 0,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    // Additional trust signals
    ...(facility.verified && {
      award: "RehabLookup Verified Facility",
    }),
    potentialAction: [
      {
        "@type": "ReserveAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${facilityUrl}?action=contact`,
          inLanguage: "en-US",
          actionPlatform: ["http://schema.org/DesktopWebPlatform", "http://schema.org/MobileWebPlatform"],
        },
        result: {
          "@type": "Reservation",
          name: "Treatment Consultation",
        },
      },
      {
        "@type": "CommunicateAction",
        target: {
          "@type": "EntryPoint",
          telephone: facility.phone,
          actionPlatform: "http://schema.org/TelephonePlatform",
        },
      },
    ],
  };
}

export function generateArticleSchema(article: {
  title: string;
  description: string;
  author: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
  url?: string;
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
      "@id": article.url,
    },
  };
}

// Service schema for treatment type pages
export function generateServiceSchema(service: {
  name: string;
  description: string;
  url: string;
  provider?: string;
  areaServed?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalTherapy",
    name: service.name,
    description: service.description,
    url: `https://rehablookup.com${service.url}`,
    medicineSystem: "WesternConventional",
    relevantSpecialty: {
      "@type": "MedicalSpecialty",
      name: "Addiction Medicine",
    },
    provider: {
      "@type": "Organization",
      name: service.provider || "RehabLookup Network",
    },
    areaServed: service.areaServed?.map(area => ({
      "@type": "State",
      name: area,
    })) || [{
      "@type": "Country",
      name: "United States",
    }],
  };
}

// How-to schema for guides
export function generateHowToSchema(howTo: {
  name: string;
  description: string;
  steps: { name: string; text: string; url?: string }[];
  totalTime?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: howTo.name,
    description: howTo.description,
    totalTime: howTo.totalTime || "PT30M",
    step: howTo.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
      url: step.url,
    })),
  };
}

// Collection page schema for location/category pages
export function generateCollectionSchema(collection: {
  name: string;
  description: string;
  url: string;
  itemCount: number;
  itemType?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: collection.name,
    description: collection.description,
    url: `https://rehablookup.com${collection.url}`,
    numberOfItems: collection.itemCount,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: collection.itemCount,
      itemListElement: {
        "@type": collection.itemType || "MedicalBusiness",
      },
    },
  };
}

// Video schema for embedded content
export function generateVideoSchema(video: {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration?: string;
  embedUrl?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.name,
    description: video.description,
    thumbnailUrl: video.thumbnailUrl,
    uploadDate: video.uploadDate,
    duration: video.duration || "PT5M",
    embedUrl: video.embedUrl,
    publisher: {
      "@type": "Organization",
      name: "RehabLookup",
      logo: {
        "@type": "ImageObject",
        url: "https://rehablookup.com/logo.png",
      },
    },
  };
}
