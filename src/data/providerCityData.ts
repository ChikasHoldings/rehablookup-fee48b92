export interface ProviderCityInfo {
  city: string;
  citySlug: string;
  state: string;
  stateSlug: string;
  population: number;
  competitionLevel: "high" | "medium" | "low";
  monthlySearches: number;
  avgCostPerClick: number;
  rehabFacilityCount: number;
  region: string;
}

export const providerCities: ProviderCityInfo[] = [
  { city: "Los Angeles", citySlug: "los-angeles", state: "California", stateSlug: "california", population: 3898747, competitionLevel: "high", monthlySearches: 4800, avgCostPerClick: 142, rehabFacilityCount: 380, region: "West Coast" },
  { city: "New York City", citySlug: "new-york-city", state: "New York", stateSlug: "new-york", population: 8336817, competitionLevel: "high", monthlySearches: 5200, avgCostPerClick: 158, rehabFacilityCount: 420, region: "Northeast" },
  { city: "Chicago", citySlug: "chicago", state: "Illinois", stateSlug: "illinois", population: 2693976, competitionLevel: "high", monthlySearches: 3600, avgCostPerClick: 128, rehabFacilityCount: 290, region: "Midwest" },
  { city: "Houston", citySlug: "houston", state: "Texas", stateSlug: "texas", population: 2304580, competitionLevel: "high", monthlySearches: 3200, avgCostPerClick: 118, rehabFacilityCount: 260, region: "South" },
  { city: "Phoenix", citySlug: "phoenix", state: "Arizona", stateSlug: "arizona", population: 1608139, competitionLevel: "high", monthlySearches: 2800, avgCostPerClick: 135, rehabFacilityCount: 210, region: "Southwest" },
  { city: "Philadelphia", citySlug: "philadelphia", state: "Pennsylvania", stateSlug: "pennsylvania", population: 1603797, competitionLevel: "high", monthlySearches: 2600, avgCostPerClick: 122, rehabFacilityCount: 240, region: "Northeast" },
  { city: "San Antonio", citySlug: "san-antonio", state: "Texas", stateSlug: "texas", population: 1547253, competitionLevel: "medium", monthlySearches: 1800, avgCostPerClick: 105, rehabFacilityCount: 140, region: "South" },
  { city: "San Diego", citySlug: "san-diego", state: "California", stateSlug: "california", population: 1423851, competitionLevel: "high", monthlySearches: 2400, avgCostPerClick: 138, rehabFacilityCount: 190, region: "West Coast" },
  { city: "Dallas", citySlug: "dallas", state: "Texas", stateSlug: "texas", population: 1304379, competitionLevel: "high", monthlySearches: 2800, avgCostPerClick: 125, rehabFacilityCount: 220, region: "South" },
  { city: "Austin", citySlug: "austin", state: "Texas", stateSlug: "texas", population: 978908, competitionLevel: "medium", monthlySearches: 1600, avgCostPerClick: 112, rehabFacilityCount: 120, region: "South" },
  { city: "Jacksonville", citySlug: "jacksonville", state: "Florida", stateSlug: "florida", population: 949611, competitionLevel: "medium", monthlySearches: 1400, avgCostPerClick: 108, rehabFacilityCount: 110, region: "Southeast" },
  { city: "Fort Worth", citySlug: "fort-worth", state: "Texas", stateSlug: "texas", population: 918915, competitionLevel: "medium", monthlySearches: 1200, avgCostPerClick: 115, rehabFacilityCount: 95, region: "South" },
  { city: "Columbus", citySlug: "columbus", state: "Ohio", stateSlug: "ohio", population: 905748, competitionLevel: "medium", monthlySearches: 1600, avgCostPerClick: 98, rehabFacilityCount: 130, region: "Midwest" },
  { city: "Charlotte", citySlug: "charlotte", state: "North Carolina", stateSlug: "north-carolina", population: 874579, competitionLevel: "medium", monthlySearches: 1400, avgCostPerClick: 105, rehabFacilityCount: 100, region: "Southeast" },
  { city: "San Francisco", citySlug: "san-francisco", state: "California", stateSlug: "california", population: 873965, competitionLevel: "high", monthlySearches: 2200, avgCostPerClick: 155, rehabFacilityCount: 170, region: "West Coast" },
  { city: "Indianapolis", citySlug: "indianapolis", state: "Indiana", stateSlug: "indiana", population: 887642, competitionLevel: "medium", monthlySearches: 1200, avgCostPerClick: 92, rehabFacilityCount: 105, region: "Midwest" },
  { city: "Seattle", citySlug: "seattle", state: "Washington", stateSlug: "washington", population: 737015, competitionLevel: "high", monthlySearches: 2000, avgCostPerClick: 132, rehabFacilityCount: 150, region: "Pacific Northwest" },
  { city: "Denver", citySlug: "denver", state: "Colorado", stateSlug: "colorado", population: 715522, competitionLevel: "high", monthlySearches: 2200, avgCostPerClick: 128, rehabFacilityCount: 160, region: "Mountain West" },
  { city: "Boston", citySlug: "boston", state: "Massachusetts", stateSlug: "massachusetts", population: 675647, competitionLevel: "high", monthlySearches: 2400, avgCostPerClick: 145, rehabFacilityCount: 180, region: "Northeast" },
  { city: "Nashville", citySlug: "nashville", state: "Tennessee", stateSlug: "tennessee", population: 689447, competitionLevel: "high", monthlySearches: 1800, avgCostPerClick: 118, rehabFacilityCount: 140, region: "South" },
  { city: "Detroit", citySlug: "detroit", state: "Michigan", stateSlug: "michigan", population: 639111, competitionLevel: "medium", monthlySearches: 1600, avgCostPerClick: 95, rehabFacilityCount: 130, region: "Midwest" },
  { city: "Portland", citySlug: "portland", state: "Oregon", stateSlug: "oregon", population: 652503, competitionLevel: "high", monthlySearches: 1800, avgCostPerClick: 125, rehabFacilityCount: 120, region: "Pacific Northwest" },
  { city: "Las Vegas", citySlug: "las-vegas", state: "Nevada", stateSlug: "nevada", population: 641903, competitionLevel: "high", monthlySearches: 2000, avgCostPerClick: 135, rehabFacilityCount: 110, region: "Southwest" },
  { city: "Miami", citySlug: "miami", state: "Florida", stateSlug: "florida", population: 442241, competitionLevel: "high", monthlySearches: 3800, avgCostPerClick: 148, rehabFacilityCount: 320, region: "Southeast" },
  { city: "Atlanta", citySlug: "atlanta", state: "Georgia", stateSlug: "georgia", population: 498715, competitionLevel: "high", monthlySearches: 2600, avgCostPerClick: 122, rehabFacilityCount: 200, region: "Southeast" },
  { city: "Tampa", citySlug: "tampa", state: "Florida", stateSlug: "florida", population: 384959, competitionLevel: "high", monthlySearches: 2200, avgCostPerClick: 130, rehabFacilityCount: 180, region: "Southeast" },
  { city: "Orlando", citySlug: "orlando", state: "Florida", stateSlug: "florida", population: 307573, competitionLevel: "high", monthlySearches: 1800, avgCostPerClick: 125, rehabFacilityCount: 150, region: "Southeast" },
  { city: "Minneapolis", citySlug: "minneapolis", state: "Minnesota", stateSlug: "minnesota", population: 429954, competitionLevel: "medium", monthlySearches: 1400, avgCostPerClick: 108, rehabFacilityCount: 110, region: "Midwest" },
  { city: "Sacramento", citySlug: "sacramento", state: "California", stateSlug: "california", population: 524943, competitionLevel: "medium", monthlySearches: 1600, avgCostPerClick: 118, rehabFacilityCount: 130, region: "West Coast" },
  { city: "Salt Lake City", citySlug: "salt-lake-city", state: "Utah", stateSlug: "utah", population: 199723, competitionLevel: "medium", monthlySearches: 1200, avgCostPerClick: 105, rehabFacilityCount: 90, region: "Mountain West" },
  { city: "Baltimore", citySlug: "baltimore", state: "Maryland", stateSlug: "maryland", population: 585708, competitionLevel: "high", monthlySearches: 2000, avgCostPerClick: 115, rehabFacilityCount: 160, region: "Mid-Atlantic" },
  { city: "St. Louis", citySlug: "st-louis", state: "Missouri", stateSlug: "missouri", population: 301578, competitionLevel: "medium", monthlySearches: 1400, avgCostPerClick: 98, rehabFacilityCount: 120, region: "Midwest" },
  { city: "Pittsburgh", citySlug: "pittsburgh", state: "Pennsylvania", stateSlug: "pennsylvania", population: 302971, competitionLevel: "medium", monthlySearches: 1200, avgCostPerClick: 95, rehabFacilityCount: 100, region: "Northeast" },
  { city: "Cleveland", citySlug: "cleveland", state: "Ohio", stateSlug: "ohio", population: 372624, competitionLevel: "medium", monthlySearches: 1400, avgCostPerClick: 92, rehabFacilityCount: 115, region: "Midwest" },
  { city: "Cincinnati", citySlug: "cincinnati", state: "Ohio", stateSlug: "ohio", population: 309317, competitionLevel: "medium", monthlySearches: 1200, avgCostPerClick: 90, rehabFacilityCount: 105, region: "Midwest" },
  { city: "Kansas City", citySlug: "kansas-city", state: "Missouri", stateSlug: "missouri", population: 508090, competitionLevel: "medium", monthlySearches: 1200, avgCostPerClick: 95, rehabFacilityCount: 100, region: "Midwest" },
  { city: "Raleigh", citySlug: "raleigh", state: "North Carolina", stateSlug: "north-carolina", population: 467665, competitionLevel: "medium", monthlySearches: 1000, avgCostPerClick: 102, rehabFacilityCount: 80, region: "Southeast" },
  { city: "New Orleans", citySlug: "new-orleans", state: "Louisiana", stateSlug: "louisiana", population: 383997, competitionLevel: "medium", monthlySearches: 1200, avgCostPerClick: 98, rehabFacilityCount: 90, region: "South" },
  { city: "Milwaukee", citySlug: "milwaukee", state: "Wisconsin", stateSlug: "wisconsin", population: 577222, competitionLevel: "medium", monthlySearches: 1000, avgCostPerClick: 88, rehabFacilityCount: 85, region: "Midwest" },
  { city: "Tucson", citySlug: "tucson", state: "Arizona", stateSlug: "arizona", population: 542629, competitionLevel: "medium", monthlySearches: 1200, avgCostPerClick: 110, rehabFacilityCount: 90, region: "Southwest" },
  { city: "Scottsdale", citySlug: "scottsdale", state: "Arizona", stateSlug: "arizona", population: 241361, competitionLevel: "high", monthlySearches: 1800, avgCostPerClick: 145, rehabFacilityCount: 85, region: "Southwest" },
  { city: "Honolulu", citySlug: "honolulu", state: "Hawaii", stateSlug: "hawaii", population: 350964, competitionLevel: "medium", monthlySearches: 800, avgCostPerClick: 115, rehabFacilityCount: 45, region: "Pacific" },
  { city: "Boise", citySlug: "boise", state: "Idaho", stateSlug: "idaho", population: 235684, competitionLevel: "low", monthlySearches: 600, avgCostPerClick: 85, rehabFacilityCount: 40, region: "Mountain West" },
  { city: "Richmond", citySlug: "richmond", state: "Virginia", stateSlug: "virginia", population: 226610, competitionLevel: "medium", monthlySearches: 1000, avgCostPerClick: 98, rehabFacilityCount: 80, region: "Mid-Atlantic" },
  { city: "Memphis", citySlug: "memphis", state: "Tennessee", stateSlug: "tennessee", population: 633104, competitionLevel: "medium", monthlySearches: 1000, avgCostPerClick: 88, rehabFacilityCount: 75, region: "South" },
  { city: "Louisville", citySlug: "louisville", state: "Kentucky", stateSlug: "kentucky", population: 633045, competitionLevel: "medium", monthlySearches: 1000, avgCostPerClick: 85, rehabFacilityCount: 80, region: "South" },
  { city: "Oklahoma City", citySlug: "oklahoma-city", state: "Oklahoma", stateSlug: "oklahoma", population: 681054, competitionLevel: "medium", monthlySearches: 800, avgCostPerClick: 82, rehabFacilityCount: 70, region: "South" },
  { city: "Albuquerque", citySlug: "albuquerque", state: "New Mexico", stateSlug: "new-mexico", population: 564559, competitionLevel: "medium", monthlySearches: 800, avgCostPerClick: 88, rehabFacilityCount: 60, region: "Southwest" },
  { city: "Omaha", citySlug: "omaha", state: "Nebraska", stateSlug: "nebraska", population: 486051, competitionLevel: "low", monthlySearches: 600, avgCostPerClick: 78, rehabFacilityCount: 50, region: "Midwest" },
  { city: "Malibu", citySlug: "malibu", state: "California", stateSlug: "california", population: 10654, competitionLevel: "high", monthlySearches: 2600, avgCostPerClick: 185, rehabFacilityCount: 45, region: "West Coast" },
];

export function getCityBySlug(citySlug: string): ProviderCityInfo | undefined {
  return providerCities.find(c => c.citySlug === citySlug);
}

export function getCityFromPathname(pathname: string): ProviderCityInfo | undefined {
  const match = pathname.match(/^\/get-more-patients-in-(.+)$/);
  if (!match) return undefined;
  const slug = match[1];
  // Try to find city by matching citySlug-stateSlug pattern
  for (const city of providerCities) {
    if (slug === `${city.citySlug}-${city.stateSlug}`) return city;
  }
  // Fallback: try just city slug
  return providerCities.find(c => slug.startsWith(c.citySlug));
}
