/**
 * Proximity-based facility ranking system.
 * Tiers: Same ZIP (0) → Same City (1) → Same State (2) → Nearby States (3) → Nationwide (4)
 */

export interface UserLocation {
  zipCode?: string;
  city?: string;
  state: string;
  stateAbbr: string;
  slug: string;
}

export interface RankableFacility {
  id: string;
  name: string;
  city: string;
  state: string;
  zipCode: string;
  featured?: boolean;
  rating?: number | null;
  isPro?: boolean;
  [key: string]: any;
}

export enum ProximityTier {
  SAME_ZIP = 0,
  SAME_CITY = 1,
  SAME_STATE = 2,
  NEARBY_STATE = 3,
  NATIONWIDE = 4,
}

// All 50 US states with coordinates and neighbor mappings
export const STATE_COORDINATES: Record<string, { lat: number; lng: number; name: string; abbr: string }> = {
  "alabama": { lat: 32.806671, lng: -86.791130, name: "Alabama", abbr: "AL" },
  "alaska": { lat: 61.370716, lng: -152.404419, name: "Alaska", abbr: "AK" },
  "arizona": { lat: 33.729759, lng: -111.431221, name: "Arizona", abbr: "AZ" },
  "arkansas": { lat: 34.969704, lng: -92.373123, name: "Arkansas", abbr: "AR" },
  "california": { lat: 36.116203, lng: -119.681564, name: "California", abbr: "CA" },
  "colorado": { lat: 39.059811, lng: -105.311104, name: "Colorado", abbr: "CO" },
  "connecticut": { lat: 41.597782, lng: -72.755371, name: "Connecticut", abbr: "CT" },
  "delaware": { lat: 39.318523, lng: -75.507141, name: "Delaware", abbr: "DE" },
  "florida": { lat: 27.766279, lng: -81.686783, name: "Florida", abbr: "FL" },
  "georgia": { lat: 33.040619, lng: -83.643074, name: "Georgia", abbr: "GA" },
  "hawaii": { lat: 21.094318, lng: -157.498337, name: "Hawaii", abbr: "HI" },
  "idaho": { lat: 44.240459, lng: -114.478828, name: "Idaho", abbr: "ID" },
  "illinois": { lat: 40.349457, lng: -88.986137, name: "Illinois", abbr: "IL" },
  "indiana": { lat: 39.849426, lng: -86.258278, name: "Indiana", abbr: "IN" },
  "iowa": { lat: 42.011539, lng: -93.210526, name: "Iowa", abbr: "IA" },
  "kansas": { lat: 38.526600, lng: -96.726486, name: "Kansas", abbr: "KS" },
  "kentucky": { lat: 37.668140, lng: -84.670067, name: "Kentucky", abbr: "KY" },
  "louisiana": { lat: 31.169546, lng: -91.867805, name: "Louisiana", abbr: "LA" },
  "maine": { lat: 44.693947, lng: -69.381927, name: "Maine", abbr: "ME" },
  "maryland": { lat: 39.063946, lng: -76.802101, name: "Maryland", abbr: "MD" },
  "massachusetts": { lat: 42.230171, lng: -71.530106, name: "Massachusetts", abbr: "MA" },
  "michigan": { lat: 43.326618, lng: -84.536095, name: "Michigan", abbr: "MI" },
  "minnesota": { lat: 45.694454, lng: -93.900192, name: "Minnesota", abbr: "MN" },
  "mississippi": { lat: 32.741646, lng: -89.678696, name: "Mississippi", abbr: "MS" },
  "missouri": { lat: 38.456085, lng: -92.288368, name: "Missouri", abbr: "MO" },
  "montana": { lat: 46.921925, lng: -110.454353, name: "Montana", abbr: "MT" },
  "nebraska": { lat: 41.125370, lng: -98.268082, name: "Nebraska", abbr: "NE" },
  "nevada": { lat: 38.313515, lng: -117.055374, name: "Nevada", abbr: "NV" },
  "new-hampshire": { lat: 43.452492, lng: -71.563896, name: "New Hampshire", abbr: "NH" },
  "new-jersey": { lat: 40.298904, lng: -74.521011, name: "New Jersey", abbr: "NJ" },
  "new-mexico": { lat: 34.840515, lng: -106.248482, name: "New Mexico", abbr: "NM" },
  "new-york": { lat: 42.165726, lng: -74.948051, name: "New York", abbr: "NY" },
  "north-carolina": { lat: 35.630066, lng: -79.806419, name: "North Carolina", abbr: "NC" },
  "north-dakota": { lat: 47.528912, lng: -99.784012, name: "North Dakota", abbr: "ND" },
  "ohio": { lat: 40.388783, lng: -82.764915, name: "Ohio", abbr: "OH" },
  "oklahoma": { lat: 35.565342, lng: -96.928917, name: "Oklahoma", abbr: "OK" },
  "oregon": { lat: 44.572021, lng: -122.070938, name: "Oregon", abbr: "OR" },
  "pennsylvania": { lat: 40.590752, lng: -77.209755, name: "Pennsylvania", abbr: "PA" },
  "rhode-island": { lat: 41.680893, lng: -71.511780, name: "Rhode Island", abbr: "RI" },
  "south-carolina": { lat: 33.856892, lng: -80.945007, name: "South Carolina", abbr: "SC" },
  "south-dakota": { lat: 44.299782, lng: -99.438828, name: "South Dakota", abbr: "SD" },
  "tennessee": { lat: 35.747845, lng: -86.692345, name: "Tennessee", abbr: "TN" },
  "texas": { lat: 31.054487, lng: -97.563461, name: "Texas", abbr: "TX" },
  "utah": { lat: 40.150032, lng: -111.862434, name: "Utah", abbr: "UT" },
  "vermont": { lat: 44.045876, lng: -72.710686, name: "Vermont", abbr: "VT" },
  "virginia": { lat: 37.769337, lng: -78.169968, name: "Virginia", abbr: "VA" },
  "washington": { lat: 47.400902, lng: -121.490494, name: "Washington", abbr: "WA" },
  "west-virginia": { lat: 38.491226, lng: -80.954456, name: "West Virginia", abbr: "WV" },
  "wisconsin": { lat: 44.268543, lng: -89.616508, name: "Wisconsin", abbr: "WI" },
  "wyoming": { lat: 42.755966, lng: -107.302490, name: "Wyoming", abbr: "WY" },
};

// Adjacent state mappings for nearby state matching
const ADJACENT_STATES: Record<string, string[]> = {
  "AL": ["FL", "GA", "MS", "TN"],
  "AK": [],
  "AZ": ["CA", "CO", "NM", "NV", "UT"],
  "AR": ["LA", "MO", "MS", "OK", "TN", "TX"],
  "CA": ["AZ", "NV", "OR"],
  "CO": ["AZ", "KS", "NE", "NM", "OK", "UT", "WY"],
  "CT": ["MA", "NY", "RI"],
  "DE": ["MD", "NJ", "PA"],
  "FL": ["AL", "GA"],
  "GA": ["AL", "FL", "NC", "SC", "TN"],
  "HI": [],
  "ID": ["MT", "NV", "OR", "UT", "WA", "WY"],
  "IL": ["IN", "IA", "KY", "MO", "WI"],
  "IN": ["IL", "KY", "MI", "OH"],
  "IA": ["IL", "MN", "MO", "NE", "SD", "WI"],
  "KS": ["CO", "MO", "NE", "OK"],
  "KY": ["IL", "IN", "MO", "OH", "TN", "VA", "WV"],
  "LA": ["AR", "MS", "TX"],
  "ME": ["NH"],
  "MD": ["DE", "PA", "VA", "WV"],
  "MA": ["CT", "NH", "NY", "RI", "VT"],
  "MI": ["IN", "OH", "WI"],
  "MN": ["IA", "ND", "SD", "WI"],
  "MS": ["AL", "AR", "LA", "TN"],
  "MO": ["AR", "IL", "IA", "KS", "KY", "NE", "OK", "TN"],
  "MT": ["ID", "ND", "SD", "WY"],
  "NE": ["CO", "IA", "KS", "MO", "SD", "WY"],
  "NV": ["AZ", "CA", "ID", "OR", "UT"],
  "NH": ["MA", "ME", "VT"],
  "NJ": ["DE", "NY", "PA"],
  "NM": ["AZ", "CO", "OK", "TX", "UT"],
  "NY": ["CT", "MA", "NJ", "PA", "VT"],
  "NC": ["GA", "SC", "TN", "VA"],
  "ND": ["MN", "MT", "SD"],
  "OH": ["IN", "KY", "MI", "PA", "WV"],
  "OK": ["AR", "CO", "KS", "MO", "NM", "TX"],
  "OR": ["CA", "ID", "NV", "WA"],
  "PA": ["DE", "MD", "NJ", "NY", "OH", "WV"],
  "RI": ["CT", "MA"],
  "SC": ["GA", "NC"],
  "SD": ["IA", "MN", "MT", "ND", "NE", "WY"],
  "TN": ["AL", "AR", "GA", "KY", "MO", "MS", "NC", "VA"],
  "TX": ["AR", "LA", "NM", "OK"],
  "UT": ["AZ", "CO", "ID", "NM", "NV", "WY"],
  "VT": ["MA", "NH", "NY"],
  "VA": ["KY", "MD", "NC", "TN", "WV"],
  "WA": ["ID", "OR"],
  "WV": ["KY", "MD", "OH", "PA", "VA"],
  "WI": ["IA", "IL", "MI", "MN"],
  "WY": ["CO", "ID", "MT", "NE", "SD", "UT"],
};

/**
 * Get the proximity tier for a facility relative to a user's location
 */
export function getProximityTier(
  facility: RankableFacility,
  userLocation: UserLocation
): ProximityTier {
  const facilityState = facility.state?.toLowerCase().trim();
  const facilityCity = facility.city?.toLowerCase().trim();
  const facilityZip = facility.zipCode?.trim();
  
  const userState = userLocation.state.toLowerCase().trim();
  const userStateAbbr = userLocation.stateAbbr.toUpperCase().trim();
  const userCity = userLocation.city?.toLowerCase().trim();
  const userZip = userLocation.zipCode?.trim();

  // Tier 0: Same ZIP code
  if (userZip && facilityZip && facilityZip === userZip) {
    return ProximityTier.SAME_ZIP;
  }

  // Tier 1: Same city
  if (userCity && facilityCity === userCity && (facilityState === userState || facilityState === userStateAbbr.toLowerCase())) {
    return ProximityTier.SAME_CITY;
  }

  // Tier 2: Same state
  if (facilityState === userState || facilityState === userStateAbbr.toLowerCase()) {
    return ProximityTier.SAME_STATE;
  }

  // Tier 3: Adjacent/nearby state
  const adjacentAbbrs = ADJACENT_STATES[userStateAbbr] || [];
  // Resolve facility state abbreviation
  const facilityAbbr = resolveStateAbbr(facilityState);
  if (facilityAbbr && adjacentAbbrs.includes(facilityAbbr)) {
    return ProximityTier.NEARBY_STATE;
  }

  // Tier 4: Nationwide
  return ProximityTier.NATIONWIDE;
}

/**
 * Resolve a state name or abbreviation to its 2-letter abbreviation
 */
function resolveStateAbbr(stateInput: string): string | null {
  if (!stateInput) return null;
  const upper = stateInput.toUpperCase();
  
  // Already an abbreviation
  if (upper.length === 2 && ADJACENT_STATES[upper]) return upper;
  
  // Find by name
  for (const coords of Object.values(STATE_COORDINATES)) {
    if (coords.name.toLowerCase() === stateInput.toLowerCase()) {
      return coords.abbr;
    }
  }
  return null;
}

/**
 * Rank and sort facilities by proximity to user's location
 * Within each tier, Pro/featured listings rank first, then by rating
 */
export function rankFacilitiesByProximity<T extends RankableFacility>(
  facilities: T[],
  userLocation: UserLocation | null,
  maxResults?: number
): T[] {
  if (!userLocation) {
    // No location context - sort by featured/Pro first, then rating
    return facilities
      .sort((a, b) => {
        const aPro = a.isPro || a.featured ? 1 : 0;
        const bPro = b.isPro || b.featured ? 1 : 0;
        if (bPro !== aPro) return bPro - aPro;
        return (b.rating ?? 0) - (a.rating ?? 0);
      })
      .slice(0, maxResults);
  }

  // Score each facility
  const scored = facilities.map(f => ({
    facility: f,
    tier: getProximityTier(f, userLocation),
    isPro: f.isPro || f.featured ? 1 : 0,
    rating: f.rating ?? 0,
  }));

  // Sort: tier ASC (closest first), then Pro DESC, then rating DESC
  scored.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (b.isPro !== a.isPro) return b.isPro - a.isPro;
    return b.rating - a.rating;
  });

  const result = scored.map(s => s.facility);
  return maxResults ? result.slice(0, maxResults) : result;
}

/**
 * Get the closest state to a lat/lng coordinate
 */
export function getClosestState(lat: number, lng: number): UserLocation | null {
  let closest: UserLocation | null = null;
  let minDistance = Infinity;

  for (const [slug, coords] of Object.entries(STATE_COORDINATES)) {
    const distance = Math.sqrt(
      Math.pow(lat - coords.lat, 2) + Math.pow(lng - coords.lng, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      closest = { state: coords.name, stateAbbr: coords.abbr, slug };
    }
  }

  return closest;
}

/**
 * Get nearby states for a given state abbreviation
 */
export function getNearbyStates(stateAbbr: string, limit = 4): string[] {
  return (ADJACENT_STATES[stateAbbr.toUpperCase()] || []).slice(0, limit);
}

/**
 * Get nearby state data from statesData for link generation
 */
export function getNearbyStateData(
  stateAbbr: string,
  basePath: string,
  statesData: Array<{ name: string; slug: string; abbreviation: string }>,
  limit = 4
): Array<{ name: string; slug: string; facilityCount?: number }> {
  const nearbyAbbrs = getNearbyStates(stateAbbr, limit);
  
  return nearbyAbbrs
    .map(abbr => {
      const state = statesData.find(s => s.abbreviation === abbr);
      if (!state) return null;
      return {
        name: state.name,
        slug: `${basePath}/${state.slug}`,
      };
    })
    .filter(Boolean) as Array<{ name: string; slug: string }>;
}
