/**
 * Shared location-image registry — used by every directory page that
 * supports a photographic hero (StatePage, CityPage, and combo-page
 * SEOLandingTemplate callers that wire heroImage). Centralising
 * here so combo pages can render the same imagery their parent
 * state/city would and so adding a new state/city image is a
 * single-file change.
 */

// State capital / landscape images keyed by state slug.
// State capital images mapping
export const stateCapitalImages: Record<string, string> = {
  'alabama': 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=1920&q=80',
  'alaska': 'https://images.unsplash.com/photo-1531176175280-33e68e01b7d7?w=1920&q=80',
  'arizona': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
  'arkansas': 'https://images.unsplash.com/photo-1590937276195-a0280fab0de6?w=1920&q=80',
  'california': 'https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?w=1920&q=80',
  'colorado': 'https://images.unsplash.com/photo-1546156929-a4c0ac411f47?w=1920&q=80',
  'connecticut': 'https://images.unsplash.com/photo-1569012871812-f38ee64cd54c?w=1920&q=80',
  'delaware': 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1920&q=80',
  'florida': 'https://images.unsplash.com/photo-1605723517503-3cadb5818a0c?w=1920&q=80',
  'georgia': 'https://images.unsplash.com/photo-1575917649705-5b59aaa12e6b?w=1920&q=80',
  'hawaii': 'https://images.unsplash.com/photo-1507876466758-bc54f384809c?w=1920&q=80',
  'idaho': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  'illinois': 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=1920&q=80',
  'indiana': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69c07b?w=1920&q=80',
  'iowa': 'https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=1920&q=80',
  'kansas': 'https://images.unsplash.com/photo-1590937276234-e45c0e6c9e76?w=1920&q=80',
  'kentucky': 'https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=1920&q=80',
  'louisiana': 'https://images.unsplash.com/photo-1568402102990-bc541580b59f?w=1920&q=80',
  'maine': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80',
  'maryland': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
  'massachusetts': 'https://images.unsplash.com/photo-1501979376754-1d09b529c917?w=1920&q=80',
  'michigan': 'https://images.unsplash.com/photo-1534351450181-ea9f78427fe8?w=1920&q=80',
  'minnesota': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
  'mississippi': 'https://images.unsplash.com/photo-1590937276195-a0280fab0de6?w=1920&q=80',
  'missouri': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
  'montana': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  'nebraska': 'https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=1920&q=80',
  'nevada': 'https://images.unsplash.com/photo-1581351721010-8cf859cb14a4?w=1920&q=80',
  'new-hampshire': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80',
  'new-jersey': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
  'new-mexico': 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=1920&q=80',
  'new-york': 'https://images.unsplash.com/photo-1538970272646-f61fabb3a8a2?w=1920&q=80',
  'north-carolina': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
  'north-dakota': 'https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=1920&q=80',
  'ohio': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69c07b?w=1920&q=80',
  'oklahoma': 'https://images.unsplash.com/photo-1590937276234-e45c0e6c9e76?w=1920&q=80',
  'oregon': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80',
  'pennsylvania': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
  'rhode-island': 'https://images.unsplash.com/photo-1501979376754-1d09b529c917?w=1920&q=80',
  'south-carolina': 'https://images.unsplash.com/photo-1575917649705-5b59aaa12e6b?w=1920&q=80',
  'south-dakota': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  'tennessee': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69c07b?w=1920&q=80',
  'texas': 'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=1920&q=80',
  'utah': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=80',
  'vermont': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80',
  'virginia': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
  'washington': 'https://images.unsplash.com/photo-1502175353174-a7a70e73b362?w=1920&q=80',
  'west-virginia': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  'wisconsin': 'https://images.unsplash.com/photo-1534351450181-ea9f78427fe8?w=1920&q=80',
  'wyoming': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
};

// City landmark images keyed by state slug, then city slug.

export const cityImages: Record<string, Record<string, string>> = {
  'alabama': {
    'birmingham': 'https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=1920&q=80',
    'huntsville': 'https://images.unsplash.com/photo-1590937276234-e45c0e6c9e76?w=1920&q=80',
    'mobile': 'https://images.unsplash.com/photo-1568402102990-bc541580b59f?w=1920&q=80',
    'montgomery': 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=1920&q=80',
  },
  'alaska': {
    'anchorage': 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=1920&q=80',
    'fairbanks': 'https://images.unsplash.com/photo-1531176175280-33e68e01b7d7?w=1920&q=80',
    'juneau': 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=1920&q=80',
  },
  'arizona': {
    'phoenix': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
    'tucson': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=80',
    'scottsdale': 'https://images.unsplash.com/photo-1512295767273-ac109ac3acfa?w=1920&q=80',
    'mesa': 'https://images.unsplash.com/photo-1494587416117-f102a2ac0a8d?w=1920&q=80',
  },
  'california': {
    'los-angeles': 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=1920&q=80',
    'san-francisco': 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1920&q=80',
    'san-diego': 'https://images.unsplash.com/photo-1538964173425-93640b087f84?w=1920&q=80',
    'sacramento': 'https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?w=1920&q=80',
    'oakland': 'https://images.unsplash.com/photo-1515896769750-31548aa180ed?w=1920&q=80',
    'malibu': 'https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=1920&q=80',
  },
  'colorado': {
    'denver': 'https://images.unsplash.com/photo-1546156929-a4c0ac411f47?w=1920&q=80',
    'colorado-springs': 'https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=1920&q=80',
    'boulder': 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=1920&q=80',
    'aspen': 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=1920&q=80',
  },
  'florida': {
    'miami': 'https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?w=1920&q=80',
    'orlando': 'https://images.unsplash.com/photo-1575089976121-8ed7b2a54265?w=1920&q=80',
    'tampa': 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1920&q=80',
    'jacksonville': 'https://images.unsplash.com/photo-1599558859083-ab8b92c27c3a?w=1920&q=80',
    'fort-lauderdale': 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=1920&q=80',
    'west-palm-beach': 'https://images.unsplash.com/photo-1548438294-1ad5d5f4f063?w=1920&q=80',
  },
  'georgia': {
    'atlanta': 'https://images.unsplash.com/photo-1575917649705-5b59aaa12e6b?w=1920&q=80',
    'savannah': 'https://images.unsplash.com/photo-1587578931330-f0bcdb9ace11?w=1920&q=80',
    'augusta': 'https://images.unsplash.com/photo-1590937276195-a0280fab0de6?w=1920&q=80',
  },
  'illinois': {
    'chicago': 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=1920&q=80',
    'springfield': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
  },
  'massachusetts': {
    'boston': 'https://images.unsplash.com/photo-1501979376754-1d09b529c917?w=1920&q=80',
    'cambridge': 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=1920&q=80',
    'worcester': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
  },
  'michigan': {
    'detroit': 'https://images.unsplash.com/photo-1534351450181-ea9f78427fe8?w=1920&q=80',
    'grand-rapids': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
    'ann-arbor': 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=1920&q=80',
  },
  'nevada': {
    'las-vegas': 'https://images.unsplash.com/photo-1581351721010-8cf859cb14a4?w=1920&q=80',
    'reno': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  },
  'new-jersey': {
    'newark': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
    'jersey-city': 'https://images.unsplash.com/photo-1538970272646-f61fabb3a8a2?w=1920&q=80',
    'atlantic-city': 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=1920&q=80',
  },
  'new-york': {
    'new-york-city': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1920&q=80',
    'manhattan': 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1920&q=80',
    'brooklyn': 'https://images.unsplash.com/photo-1555529771-835f59fc5efe?w=1920&q=80',
    'long-island': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
    'buffalo': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
    'rochester': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
    'albany': 'https://images.unsplash.com/photo-1538970272646-f61fabb3a8a2?w=1920&q=80',
  },
  'ohio': {
    'columbus': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69c07b?w=1920&q=80',
    'cleveland': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
    'cincinnati': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
  },
  'pennsylvania': {
    'philadelphia': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
    'pittsburgh': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
  },
  'tennessee': {
    'nashville': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69c07b?w=1920&q=80',
    'memphis': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
    'knoxville': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  },
  'texas': {
    'houston': 'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=1920&q=80',
    'austin': 'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=1920&q=80',
    'dallas': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
    'san-antonio': 'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=1920&q=80',
    'fort-worth': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
  },
  'washington': {
    'seattle': 'https://images.unsplash.com/photo-1502175353174-a7a70e73b362?w=1920&q=80',
    'tacoma': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
    'spokane': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  },
};

// Convenience helpers — return undefined if no image is on file
// so callers can fall back to a no-image hero gracefully.
export function getStateImage(stateSlug: string | null | undefined): string | undefined {
  if (!stateSlug) return undefined;
  return stateCapitalImages[stateSlug];
}

export function getCityImage(stateSlug: string | null | undefined, citySlug: string | null | undefined): string | undefined {
  if (!stateSlug || !citySlug) return undefined;
  return cityImages[stateSlug]?.[citySlug];
}

/**
 * Topic-themed fallback hero images for SEO-landing pages that have
 * no clear single-geo context (TreatmentHubPage, SubstanceTreatment-
 * Page, ExpandedTreatmentHubPage, DurationSettingPage, TherapyModality-
 * Page, DemographicTreatmentPage, …). Same vetted Unsplash imagery
 * used by the directory hero archetypes — picked for "premium
 * wellness / recovery" tone rather than specific locations.
 */
export const TOPIC_HERO_IMAGES = {
  // Treatment / wellness focus — calm bedroom / therapy / nature
  treatment: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1920&q=80",
  // Education / library / writing
  editorial: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1920&q=80",
  // Cost / planning / paperwork
  finance: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1920&q=80",
  // Wellness / nature / recovery
  wellness: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=1920&q=80",
  // Community / family / support
  community: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=1920&q=80",
} as const;

export type TopicImageKey = keyof typeof TOPIC_HERO_IMAGES;
