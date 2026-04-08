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
  hreflang?: { lang: string; href: string }[];
}

const SITE_NAME = "RehabLookup";
const SITE_URL = "https://rehablookup.com";
const DEFAULT_IMAGE = "/og-image.jpg";
const TWITTER_HANDLE = "@rehablookup";

/**
 * Normalizes a URL path for canonical use:
 * - Removes trailing slashes (except for root "/")
 * - Removes query parameters
 * - Removes hash fragments
 */
function normalizeCanonicalPath(path: string): string {
  // Remove query parameters and hash
  let normalized = path.split('?')[0].split('#')[0];
  // Remove trailing slash (except for root)
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

/**
 * Gets the current path from window.location for auto-canonical
 */
function getCurrentPath(): string {
  if (typeof window !== 'undefined') {
    return normalizeCanonicalPath(window.location.pathname);
  }
  return '/';
}

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
  hreflang,
}: SEOProps) {
  const fullTitle = title === SITE_NAME || title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  
  // Auto-generate canonical from current path if not provided, always normalize
  const normalizedCanonical = canonical 
    ? normalizeCanonicalPath(canonical) 
    : getCurrentPath();
  const canonicalUrl = `${SITE_URL}${normalizedCanonical}`;
  
  const imageUrl = image.startsWith("http") ? image : `${SITE_URL}${image}`;
  const truncatedDescription = description.length > 160 ? description.slice(0, 157) + "..." : description;

  // Base organization schema with comprehensive trust signals
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": ["Organization", "MedicalBusiness"],
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    legalName: "RehabLookup, Inc.",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/logo.svg`,
      width: 512,
      height: 512,
    },
    image: `${SITE_URL}/og-image.jpg`,
    description: "RehabLookup helps individuals and families find verified drug and alcohol treatment centers across the United States.",
    foundingDate: "2024",
    foundingLocation: {
      "@type": "Place",
      name: "United States",
    },
    slogan: "Find the Right Path to Recovery",
    areaServed: {
      "@type": "Country",
      name: "United States",
      sameAs: "https://en.wikipedia.org/wiki/United_States",
    },
    serviceType: [
      "Addiction Treatment Directory",
      "Rehabilitation Center Referral",
      "Treatment Placement Concierge",
      "Insurance Verification",
    ],
    knowsAbout: [
      "Addiction Treatment",
      "Drug Rehabilitation",
      "Alcohol Recovery",
      "Mental Health Services",
      "Detox Programs",
      "Dual Diagnosis Treatment",
      "Medication-Assisted Treatment",
      "Behavioral Health",
    ],
    hasCredential: [
      {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "HIPAA Compliance",
        name: "HIPAA Compliant Platform",
      },
      {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "LegitScript Certification",
        name: "LegitScript Verified",
      },
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        email: "Support@rehablookup.com",
        contactType: "customer service",
        availableLanguage: ["English", "Spanish"],
        areaServed: "US",
        hoursAvailable: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          opens: "00:00",
          closes: "23:59",
        },
      },
      {
        "@type": "ContactPoint",
        email: "Support@rehablookup.com",
        contactType: "sales",
        availableLanguage: ["English"],
        areaServed: "US",
      },
    ],
    publishingPrinciples: `${SITE_URL}/editorial-policy`,
    ethicsPolicy: `${SITE_URL}/editorial-policy`,
    correctionsPolicy: `${SITE_URL}/editorial-policy#corrections`,
    diversityPolicy: `${SITE_URL}/about`,
    ownershipFundingInfo: `${SITE_URL}/about`,
    actionableFeedbackPolicy: `${SITE_URL}/contact`,
    sameAs: [
      "https://facebook.com/rehablookup",
      "https://twitter.com/rehablookup",
      "https://x.com/rehablookup",
      "https://linkedin.com/company/rehablookup",
      "https://instagram.com/rehablookup",
    ],
    numberOfEmployees: {
      "@type": "QuantitativeValue",
      minValue: 10,
      maxValue: 50,
    },
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

  // Medical website schema for health authority with enhanced details
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
      alternateName: ["Drug Addiction", "Alcohol Addiction", "Chemical Dependency", "Substance Abuse"],
    },
    audience: {
      "@type": "PeopleAudience",
      audienceType: "Patients and families seeking addiction treatment",
    },
    specialty: ["Addiction Medicine", "Psychiatry", "Behavioral Health"],
    lastReviewed: modifiedTime || new Date().toISOString().split("T")[0],
    dateModified: modifiedTime || new Date().toISOString().split("T")[0],
    reviewedBy: {
      "@type": "Organization",
      name: "RehabLookup Medical Advisory Board",
    },
    mainContentOfPage: {
      "@type": "WebPageElement",
      cssSelector: "main",
    },
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", ".page-description", ".hero-text"],
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
     <link rel="canonical" href={canonicalUrl} />
     {hreflang && hreflang.map(({ lang, href }) => (
       <link key={lang} rel="alternate" hrefLang={lang} href={href} />
     ))}
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

      {/* DNS prefetch for analytics (preconnects already in index.html) */}
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
    "@type": ["MedicalClinic", "MedicalBusiness", "LocalBusiness"],
    "@id": facilityUrl,
    url: facilityUrl,
    name: facility.name,
    description: facility.description,
    image: facility.image ? [facility.image] : undefined,
    telephone: facility.phone,
    // email removed - provider emails are completely private
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
  keywords?: string[];
  category?: string;
  wordCount?: number;
  readTime?: string;
  isHowTo?: boolean;
  steps?: { name: string; text: string }[];
}) {
  const SITE_URL = "https://rehablookup.com";
  const currentYear = new Date().getFullYear();
  
  // Base article schema with comprehensive rich snippet support
  const baseSchema = {
    "@context": "https://schema.org",
    "@type": ["Article", "MedicalWebPage"],
    "@id": article.url,
    headline: article.title,
    alternativeHeadline: article.description.slice(0, 110),
    name: article.title,
    description: article.description,
    articleBody: article.description, // Helps with snippet generation
    image: article.image ? {
      "@type": "ImageObject",
      url: article.image,
      width: 1200,
      height: 630,
      caption: article.title,
    } : undefined,
    thumbnailUrl: article.image, // For Google Discover
    author: {
      "@type": "Person",
      name: article.author,
      url: `${SITE_URL}/resources`,
      jobTitle: "Health Content Specialist",
      worksFor: {
        "@type": "Organization",
        name: "RehabLookup",
        url: SITE_URL,
      },
    },
    publisher: {
      "@type": "Organization",
      name: "RehabLookup",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.svg`,
        width: 512,
        height: 512,
      },
    },
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": article.url,
    },
    isPartOf: {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "RehabLookup",
      url: SITE_URL,
    },
    // Enhanced SEO fields
    keywords: article.keywords?.join(", "),
    articleSection: article.category || "Health & Recovery",
    wordCount: article.wordCount,
    timeRequired: article.readTime ? `PT${parseInt(article.readTime)}M` : undefined,
    isAccessibleForFree: true,
    inLanguage: "en-US",
    // Copyright information
    copyrightHolder: {
      "@type": "Organization",
      name: "RehabLookup",
    },
    copyrightYear: currentYear,
    // Medical context for health authority
    about: {
      "@type": "MedicalCondition",
      name: "Substance Use Disorder",
      alternateName: ["Addiction", "Drug Addiction", "Alcohol Use Disorder"],
    },
    audience: {
      "@type": "PeopleAudience",
      audienceType: "People seeking addiction treatment information",
      healthCondition: {
        "@type": "MedicalCondition",
        name: "Substance Use Disorder",
      },
    },
    // Educational context
    educationalLevel: "beginner",
    learningResourceType: "Article",
    // Speakable for voice search / Google Assistant
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", ".prose p:first-of-type", "blockquote", ".article-summary"],
    },
    // Potential actions for engagement
    potentialAction: [
      {
        "@type": "ReadAction",
        target: article.url,
      },
      {
        "@type": "ShareAction",
        target: article.url,
      },
    ],
    // Citation/source attribution
    citation: {
      "@type": "CreativeWork",
      name: "RehabLookup Editorial Standards",
      url: `${SITE_URL}/about`,
    },
  };

  // If article is a how-to guide, add HowTo schema
  if (article.isHowTo && article.steps && article.steps.length > 0) {
    return [
      baseSchema,
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: article.title,
        description: article.description,
        image: article.image,
        totalTime: article.readTime ? `PT${parseInt(article.readTime)}M` : "PT15M",
        step: article.steps.map((step, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          name: step.name,
          text: step.text,
          url: `${article.url}#step-${index + 1}`,
        })),
        tool: {
          "@type": "HowToTool",
          name: "Insurance information (optional)",
        },
      },
    ];
  }

  return baseSchema;
}

// Generate NewsArticle schema for time-sensitive content
export function generateNewsArticleSchema(article: {
  title: string;
  description: string;
  author: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
  url?: string;
  keywords?: string[];
}) {
  const SITE_URL = "https://rehablookup.com";
  
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "@id": article.url,
    headline: article.title,
    description: article.description,
    image: article.image ? [article.image] : undefined,
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    author: {
      "@type": "Person",
      name: article.author,
      url: `${SITE_URL}/resources`,
    },
    publisher: {
      "@type": "Organization",
      name: "RehabLookup",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.svg`,
      },
    },
    mainEntityOfPage: article.url,
    keywords: article.keywords?.join(", "),
    isAccessibleForFree: true,
    inLanguage: "en-US",
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

// GeoTargetArea schema for "near me" optimization
export function generateGeoTargetSchema(location: {
  city?: string;
  state: string;
  stateAbbr: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "GeoCircle",
    geoMidpoint: {
      "@type": "GeoCoordinates",
      latitude: location.latitude || 0,
      longitude: location.longitude || 0,
      addressCountry: "US",
      addressRegion: location.stateAbbr,
      ...(location.city && { addressLocality: location.city }),
    },
    geoRadius: location.radius || "50 mi",
  };
}

// LocalBusiness aggregate for area listings
export function generateLocalBusinessAggregateSchema(area: {
  name: string;
  description: string;
  url: string;
  facilityCount: number;
  city?: string;
  state: string;
  stateAbbr: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Addiction Treatment Centers ${area.city ? `in ${area.city}, ` : "in "}${area.state}`,
    description: area.description,
    url: `https://rehablookup.com${area.url}`,
    numberOfItems: area.facilityCount,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: {
      "@type": "MedicalBusiness",
      medicalSpecialty: "Addiction Medicine",
      areaServed: {
        "@type": area.city ? "City" : "State",
        name: area.city || area.state,
        containedInPlace: {
          "@type": "Country",
          name: "United States",
        },
      },
    },
  };
}

// Speakable specification for voice search
export function generateSpeakableSchema(content: {
  headline: string;
  summary: string;
  cssSelectors?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: content.cssSelectors || [".speakable-headline", ".speakable-summary"],
    },
    headline: content.headline,
    description: content.summary,
  };
}

// Near Me optimization schema
// Note: aggregateRating removed as it's not valid for Service type per Google guidelines
export function generateNearMeSchema(params: {
  serviceType: string;
  location: {
    city?: string;
    state: string;
    stateAbbr: string;
  };
  facilityCount: number;
}) {
  const locationString = params.location.city 
    ? `${params.location.city}, ${params.location.stateAbbr}`
    : params.location.state;
    
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${params.serviceType} Near Me - ${locationString}`,
    serviceType: params.serviceType,
    description: `Find ${params.serviceType.toLowerCase()} near you in ${locationString}. Compare ${params.facilityCount}+ verified treatment centers.`,
    provider: {
      "@type": "Organization",
      name: "RehabLookup",
      url: "https://rehablookup.com",
    },
    areaServed: {
      "@type": params.location.city ? "City" : "State",
      name: params.location.city || params.location.state,
      containedInPlace: {
        "@type": "AdministrativeArea",
        name: params.location.state,
        containedInPlace: {
          "@type": "Country",
          name: "United States",
        },
      },
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Treatment Options",
      itemListElement: [
        {
          "@type": "OfferCatalog",
          name: "Inpatient Rehab",
          itemListElement: [{ "@type": "Offer", itemOffered: { "@type": "Service", name: "Residential Treatment" } }],
        },
        {
          "@type": "OfferCatalog",
          name: "Outpatient Programs",
          itemListElement: [{ "@type": "Offer", itemOffered: { "@type": "Service", name: "IOP/PHP" } }],
        },
        {
          "@type": "OfferCatalog",
          name: "Detox Services",
          itemListElement: [{ "@type": "Offer", itemOffered: { "@type": "Service", name: "Medical Detoxification" } }],
        },
      ],
    },
  };
}

// Treatment-specific "near me" page schema
export function generateTreatmentNearMeSchema(params: {
  treatmentType: string;
  treatmentSlug: string;
  location?: {
    city?: string;
    state?: string;
    stateAbbr?: string;
  };
  facilityCount: number;
  faqs?: { question: string; answer: string }[];
}) {
  const locationSuffix = params.location?.city 
    ? `in ${params.location.city}, ${params.location.stateAbbr}`
    : params.location?.state 
      ? `in ${params.location.state}`
      : "Near You";

  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: `${params.treatmentType} ${locationSuffix}`,
      description: `Find ${params.treatmentType.toLowerCase()} ${locationSuffix.toLowerCase()}. Compare ${params.facilityCount}+ verified treatment centers offering ${params.treatmentType.toLowerCase()}.`,
      specialty: "Addiction Medicine",
      about: {
        "@type": "MedicalTherapy",
        name: params.treatmentType,
        medicineSystem: "WesternConventional",
        relevantSpecialty: {
          "@type": "MedicalSpecialty",
          name: "Addiction Medicine",
        },
      },
      mainContentOfPage: {
        "@type": "WebPageElement",
        cssSelector: ".treatment-listings",
      },
      speakable: {
        "@type": "SpeakableSpecification",
        cssSelector: [".page-headline", ".page-summary", ".treatment-intro"],
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://rehablookup.com" },
        { "@type": "ListItem", position: 2, name: "Treatment Types", item: "https://rehablookup.com/treatment-types" },
        { "@type": "ListItem", position: 3, name: params.treatmentType, item: `https://rehablookup.com/treatment/${params.treatmentSlug}` },
        ...(params.location?.state ? [{ 
          "@type": "ListItem", 
          position: 4, 
          name: `${params.treatmentType} in ${params.location.state}`,
          item: `https://rehablookup.com/treatment/${params.treatmentSlug}/${params.location.state.toLowerCase().replace(/\s+/g, "-")}` 
        }] : []),
      ],
    },
  ];

  // Add FAQ schema if FAQs provided
  if (params.faqs && params.faqs.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: params.faqs.map(faq => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    } as any);
  }

  return schemas;
}

// Health topic schema for educational content
export function generateHealthTopicSchema(topic: {
  name: string;
  description: string;
  url: string;
  relatedConditions?: string[];
  treatments?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HealthTopicContent",
    name: topic.name,
    description: topic.description,
    url: `https://rehablookup.com${topic.url}`,
    about: {
      "@type": "MedicalCondition",
      name: "Substance Use Disorder",
      associatedAnatomy: {
        "@type": "AnatomicalStructure",
        name: "Brain",
      },
    },
    ...(topic.relatedConditions && {
      mainContentOfPage: {
        "@type": "WebPageElement",
        text: topic.relatedConditions.join(", "),
      },
    }),
    ...(topic.treatments && {
      significantLink: topic.treatments.map(t => ({
        "@type": "MedicalTherapy",
        name: t,
      })),
    }),
    reviewedBy: {
      "@type": "Organization",
      name: "RehabLookup Medical Advisory Board",
    },
  };
}

// Product schema for provider listings/subscriptions
export function generateProductSchema(product: {
  name: string;
  description: string;
  price: number;
  priceCurrency?: string;
  features?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    brand: {
      "@type": "Organization",
      name: "RehabLookup",
    },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.priceCurrency || "USD",
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "RehabLookup",
      },
    },
    ...(product.features && {
      additionalProperty: product.features.map(f => ({
        "@type": "PropertyValue",
        name: "Feature",
        value: f,
      })),
    }),
  };
}

// Event schema for webinars/support groups
export function generateEventSchema(event: {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  location?: string;
  isVirtual?: boolean;
  url?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.name,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate || event.startDate,
    eventAttendanceMode: event.isVirtual 
      ? "https://schema.org/OnlineEventAttendanceMode" 
      : "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: event.isVirtual 
      ? {
          "@type": "VirtualLocation",
          url: event.url || "https://rehablookup.com",
        }
      : {
          "@type": "Place",
          name: event.location || "Online",
          address: {
            "@type": "PostalAddress",
            addressCountry: "US",
          },
        },
    organizer: {
      "@type": "Organization",
      name: "RehabLookup",
      url: "https://rehablookup.com",
    },
  };
}

// Aggregate offer schema for insurance coverage pages
export function generateInsuranceSchema(insurance: {
  name: string;
  description: string;
  url: string;
  coverageTypes?: string[];
  facilityCount?: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HealthInsurancePlan",
    name: `${insurance.name} Addiction Treatment Coverage`,
    description: insurance.description,
    url: `https://rehablookup.com${insurance.url}`,
    usesHealthPlanIdStandard: "HIOS",
    healthPlanMarketingName: insurance.name,
    ...(insurance.coverageTypes && {
      benefitsSummaryUrl: `https://rehablookup.com${insurance.url}#benefits`,
    }),
    ...(insurance.facilityCount && {
      healthPlanNetworkTier: "In-Network",
    }),
  };
}

// Search results / directory listing schema
export function generateSearchResultsSchema(params: {
  query?: string;
  location?: string;
  resultCount: number;
  facilities?: Array<{
    name: string;
    city: string;
    state: string;
    slug?: string;
  }>;
}) {
  const locationText = params.location ? ` near ${params.location}` : "";
  
  return [
    {
      "@context": "https://schema.org",
      "@type": "SearchResultsPage",
      name: `Addiction Treatment Centers${locationText}`,
      description: `Browse ${params.resultCount} verified addiction treatment centers${locationText}. Compare programs, check insurance, and find the right rehab facility.`,
      mainEntity: {
        "@type": "ItemList",
        name: `Treatment Centers${locationText}`,
        numberOfItems: params.resultCount,
        itemListOrder: "https://schema.org/ItemListOrderDescending",
        itemListElement: params.facilities?.slice(0, 10).map((facility, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": ["MedicalClinic", "MedicalBusiness", "LocalBusiness"],
            name: facility.name,
            address: {
              "@type": "PostalAddress",
              addressLocality: facility.city,
              addressRegion: facility.state,
              addressCountry: "US",
            },
            url: facility.slug 
              ? `https://rehablookup.com/center/${facility.slug}`
              : undefined,
            medicalSpecialty: "Addiction Medicine",
          },
        })) || [],
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      url: "https://rehablookup.com",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://rehablookup.com/search-results?location={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
  ];
}
