// Proximity-based search utilities for location matching

import { usStatesWithAbbr } from "@/data/locationSuggestions";

// Nearby states mapping for proximity search
export const nearbyStates: Record<string, string[]> = {
  AL: ["FL", "GA", "MS", "TN"],
  AK: [],
  AZ: ["CA", "CO", "NV", "NM", "UT"],
  AR: ["LA", "MO", "MS", "OK", "TN", "TX"],
  CA: ["AZ", "NV", "OR"],
  CO: ["AZ", "KS", "NE", "NM", "OK", "UT", "WY"],
  CT: ["MA", "NY", "RI"],
  DE: ["MD", "NJ", "PA"],
  FL: ["AL", "GA"],
  GA: ["AL", "FL", "NC", "SC", "TN"],
  HI: [],
  ID: ["MT", "NV", "OR", "UT", "WA", "WY"],
  IL: ["IN", "IA", "KY", "MO", "WI"],
  IN: ["IL", "KY", "MI", "OH"],
  IA: ["IL", "MN", "MO", "NE", "SD", "WI"],
  KS: ["CO", "MO", "NE", "OK"],
  KY: ["IL", "IN", "MO", "OH", "TN", "VA", "WV"],
  LA: ["AR", "MS", "TX"],
  ME: ["NH"],
  MD: ["DE", "PA", "VA", "WV"],
  MA: ["CT", "NH", "NY", "RI", "VT"],
  MI: ["IN", "OH", "WI"],
  MN: ["IA", "ND", "SD", "WI"],
  MS: ["AL", "AR", "LA", "TN"],
  MO: ["AR", "IL", "IA", "KS", "KY", "NE", "OK", "TN"],
  MT: ["ID", "ND", "SD", "WY"],
  NE: ["CO", "IA", "KS", "MO", "SD", "WY"],
  NV: ["AZ", "CA", "ID", "OR", "UT"],
  NH: ["MA", "ME", "VT"],
  NJ: ["DE", "NY", "PA"],
  NM: ["AZ", "CO", "OK", "TX", "UT"],
  NY: ["CT", "MA", "NJ", "PA", "VT"],
  NC: ["GA", "SC", "TN", "VA"],
  ND: ["MN", "MT", "SD"],
  OH: ["IN", "KY", "MI", "PA", "WV"],
  OK: ["AR", "CO", "KS", "MO", "NM", "TX"],
  OR: ["CA", "ID", "NV", "WA"],
  PA: ["DE", "MD", "NJ", "NY", "OH", "WV"],
  RI: ["CT", "MA"],
  SC: ["GA", "NC"],
  SD: ["IA", "MN", "MT", "ND", "NE", "WY"],
  TN: ["AL", "AR", "GA", "KY", "MO", "MS", "NC", "VA"],
  TX: ["AR", "LA", "NM", "OK"],
  UT: ["AZ", "CO", "ID", "NV", "NM", "WY"],
  VT: ["MA", "NH", "NY"],
  VA: ["KY", "MD", "NC", "TN", "WV"],
  WA: ["ID", "OR"],
  WV: ["KY", "MD", "OH", "PA", "VA"],
  WI: ["IA", "IL", "MI", "MN"],
  WY: ["CO", "ID", "MT", "NE", "SD", "UT"],
};

// Get state abbreviation from full name
export function getStateAbbr(stateName: string): string | null {
  const state = usStatesWithAbbr.find(
    (s) => s.name.toLowerCase() === stateName.toLowerCase() ||
           s.abbr.toLowerCase() === stateName.toLowerCase()
  );
  return state?.abbr || null;
}

// Get full state name from abbreviation
export function getStateName(stateAbbr: string): string | null {
  const state = usStatesWithAbbr.find(
    (s) => s.abbr.toLowerCase() === stateAbbr.toLowerCase()
  );
  return state?.name || null;
}

// Get nearby states for a given state
export function getNearbyStates(stateAbbr: string): string[] {
  const abbr = stateAbbr.toUpperCase();
  return nearbyStates[abbr] || [];
}

export interface LocationMatch {
  zipcode: string | null;
  city: string | null;
  state: string | null;
  stateAbbr: string | null;
  nearbyStates: string[];
  isZipcode: boolean;
}

// Parse location input to extract components
export function parseLocationInput(input: string): LocationMatch {
  const trimmed = input.trim();
  
  // Check if it's a zipcode (5 digits)
  if (/^\d{5}$/.test(trimmed)) {
    return {
      zipcode: trimmed,
      city: null,
      state: null,
      stateAbbr: null,
      nearbyStates: [],
      isZipcode: true,
    };
  }
  
  // Check for "City, State" or "City, ST" format
  const cityStateMatch = trimmed.match(/^([^,]+),\s*([A-Za-z]{2}|[A-Za-z\s]+)$/);
  if (cityStateMatch) {
    const city = cityStateMatch[1].trim();
    const stateInput = cityStateMatch[2].trim();
    const stateAbbr = stateInput.length === 2 
      ? stateInput.toUpperCase() 
      : getStateAbbr(stateInput);
    const stateName = stateAbbr ? getStateName(stateAbbr) : null;
    
    return {
      zipcode: null,
      city,
      state: stateName,
      stateAbbr,
      nearbyStates: stateAbbr ? getNearbyStates(stateAbbr) : [],
      isZipcode: false,
    };
  }
  
  // Check if it's just a state name or abbreviation
  const stateMatch = usStatesWithAbbr.find(
    (s) => s.name.toLowerCase() === trimmed.toLowerCase() ||
           s.abbr.toLowerCase() === trimmed.toLowerCase()
  );
  if (stateMatch) {
    return {
      zipcode: null,
      city: null,
      state: stateMatch.name,
      stateAbbr: stateMatch.abbr,
      nearbyStates: getNearbyStates(stateMatch.abbr),
      isZipcode: false,
    };
  }
  
  // Assume it's a city name
  return {
    zipcode: null,
    city: trimmed,
    state: null,
    stateAbbr: null,
    nearbyStates: [],
    isZipcode: false,
  };
}

export type ProximityTier = "exact" | "city" | "state" | "nearby" | "nationwide";

export interface ProximityResult<T> {
  item: T;
  tier: ProximityTier;
  matchReason: string;
}

// Sort results by proximity tier
export function sortByProximity<T extends { city: string; state: string; zipCode?: string }>(
  items: T[],
  locationMatch: LocationMatch
): ProximityResult<T>[] {
  const results: ProximityResult<T>[] = [];
  
  for (const item of items) {
    const itemStateAbbr = getStateAbbr(item.state);
    let tier: ProximityTier = "nationwide";
    let matchReason = "Nationwide";
    
    // Tier 1: Exact zipcode match
    if (locationMatch.zipcode && item.zipCode === locationMatch.zipcode) {
      tier = "exact";
      matchReason = `Exact ZIP: ${locationMatch.zipcode}`;
    }
    // Tier 2: Same city (case-insensitive)
    else if (
      locationMatch.city &&
      item.city.toLowerCase() === locationMatch.city.toLowerCase()
    ) {
      tier = "city";
      matchReason = `In ${item.city}`;
    }
    // Tier 3: Same state
    else if (
      locationMatch.stateAbbr &&
      itemStateAbbr?.toUpperCase() === locationMatch.stateAbbr.toUpperCase()
    ) {
      tier = "state";
      matchReason = `In ${item.state}`;
    }
    // Tier 4: Nearby state
    else if (
      itemStateAbbr &&
      locationMatch.nearbyStates.includes(itemStateAbbr.toUpperCase())
    ) {
      tier = "nearby";
      matchReason = `Nearby: ${item.state}`;
    }
    
    results.push({ item, tier, matchReason });
  }
  
  // Sort by tier priority
  const tierOrder: Record<ProximityTier, number> = {
    exact: 0,
    city: 1,
    state: 2,
    nearby: 3,
    nationwide: 4,
  };
  
  return results.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);
}

// Filter results based on location with proximity fallback
export function filterByLocationWithProximity<T extends { city: string; state: string; zipCode?: string }>(
  items: T[],
  location: string
): { results: ProximityResult<T>[]; locationMatch: LocationMatch } {
  if (!location.trim()) {
    // No location filter - return all as nationwide
    return {
      results: items.map((item) => ({
        item,
        tier: "nationwide" as ProximityTier,
        matchReason: "Nationwide",
      })),
      locationMatch: {
        zipcode: null,
        city: null,
        state: null,
        stateAbbr: null,
        nearbyStates: [],
        isZipcode: false,
      },
    };
  }
  
  const locationMatch = parseLocationInput(location);
  const proximityResults = sortByProximity(items, locationMatch);
  
  return { results: proximityResults, locationMatch };
}
