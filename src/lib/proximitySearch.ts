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
  if (!stateName) return null;
  const trimmed = stateName.trim();
  const state = usStatesWithAbbr.find(
    (s) => s.name.toLowerCase() === trimmed.toLowerCase() ||
           s.abbr.toLowerCase() === trimmed.toLowerCase()
  );
  return state?.abbr || null;
}

// Get full state name from abbreviation
export function getStateName(stateAbbr: string): string | null {
  if (!stateAbbr) return null;
  const state = usStatesWithAbbr.find(
    (s) => s.abbr.toLowerCase() === stateAbbr.toLowerCase()
  );
  return state?.name || null;
}

// Get nearby states for a given state
export function getNearbyStates(stateAbbr: string): string[] {
  if (!stateAbbr) return [];
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
  resolvedCity?: string | null; // Resolved from ZIP lookup
  resolvedState?: string | null; // Resolved from ZIP lookup
  resolvedStateAbbr?: string | null;
}

// Parse location input to extract components
export function parseLocationInput(input: string): LocationMatch {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return {
      zipcode: null,
      city: null,
      state: null,
      stateAbbr: null,
      nearbyStates: [],
      isZipcode: false,
    };
  }
  
  // Check if it's a zipcode (5 digits, possibly with +4)
  const zipMatch = trimmed.match(/^(\d{5})(?:-\d{4})?$/);
  if (zipMatch) {
    return {
      zipcode: zipMatch[1],
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

/**
 * Enhance a LocationMatch with resolved ZIP data
 */
export function enrichLocationMatchWithZip(
  match: LocationMatch,
  zipData: { city: string; state: string; stateAbbr: string } | null
): LocationMatch {
  if (!zipData || !match.isZipcode) return match;
  
  return {
    ...match,
    city: zipData.city,
    state: zipData.state,
    stateAbbr: zipData.stateAbbr,
    nearbyStates: getNearbyStates(zipData.stateAbbr),
    resolvedCity: zipData.city,
    resolvedState: zipData.state,
    resolvedStateAbbr: zipData.stateAbbr,
  };
}

export type ProximityTier = "exact" | "city" | "state" | "nearby" | "nationwide";

export const PROXIMITY_TIER_ORDER: Record<ProximityTier, number> = {
  exact: 0,
  city: 1,
  state: 2,
  nearby: 3,
  nationwide: 4,
};

export const PROXIMITY_TIER_LABELS: Record<ProximityTier, string> = {
  exact: "Exact Match",
  city: "Same City",
  state: "Same State",
  nearby: "Nearby State",
  nationwide: "Nationwide",
};

export const PROXIMITY_TIER_COLORS: Record<ProximityTier, string> = {
  exact: "bg-emerald-100 text-emerald-700 border-emerald-200",
  city: "bg-blue-100 text-blue-700 border-blue-200",
  state: "bg-purple-100 text-purple-700 border-purple-200",
  nearby: "bg-amber-100 text-amber-700 border-amber-200",
  nationwide: "bg-muted text-muted-foreground border-border",
};

export interface ProximityResult<T> {
  item: T;
  tier: ProximityTier;
  matchReason: string;
}

/**
 * Get the proximity tier for a facility relative to a location match.
 * Handles both full state names and abbreviations.
 */
export function getProximityTier(
  facility: { city: string; state: string; zipCode?: string },
  locationMatch: LocationMatch
): { tier: ProximityTier; reason: string } {
  const facilityStateAbbr = getStateAbbr(facility.state);
  
  // Tier 0: Exact zipcode match
  if (locationMatch.zipcode && facility.zipCode === locationMatch.zipcode) {
    return { tier: "exact", reason: `ZIP ${locationMatch.zipcode}` };
  }
  
  // Tier 1: Same city + state
  if (locationMatch.city) {
    const cityMatch = facility.city.toLowerCase() === locationMatch.city.toLowerCase();
    // If we have a state, require it to match too
    if (cityMatch) {
      if (locationMatch.stateAbbr) {
        if (facilityStateAbbr?.toUpperCase() === locationMatch.stateAbbr.toUpperCase()) {
          return { tier: "city", reason: `In ${facility.city}, ${facility.state}` };
        }
      } else {
        // No state specified — city match alone is sufficient
        return { tier: "city", reason: `In ${facility.city}` };
      }
    }
  }
  
  // Tier 2: Same state
  if (locationMatch.stateAbbr && facilityStateAbbr) {
    if (facilityStateAbbr.toUpperCase() === locationMatch.stateAbbr.toUpperCase()) {
      return { tier: "state", reason: `In ${facility.state}` };
    }
  }
  
  // Tier 3: Nearby state
  if (facilityStateAbbr && locationMatch.nearbyStates.includes(facilityStateAbbr.toUpperCase())) {
    return { tier: "nearby", reason: `Near: ${facility.state}` };
  }
  
  // Tier 4: Nationwide
  return { tier: "nationwide", reason: "Nationwide" };
}

// Sort results by proximity tier
export function sortByProximity<T extends { city: string; state: string; zipCode?: string }>(
  items: T[],
  locationMatch: LocationMatch
): ProximityResult<T>[] {
  const results: ProximityResult<T>[] = items.map((item) => {
    const { tier, reason } = getProximityTier(item, locationMatch);
    return { item, tier, matchReason: reason };
  });
  
  return results.sort((a, b) => PROXIMITY_TIER_ORDER[a.tier] - PROXIMITY_TIER_ORDER[b.tier]);
}

// Filter results based on location with proximity fallback
export function filterByLocationWithProximity<T extends { city: string; state: string; zipCode?: string }>(
  items: T[],
  location: string
): { results: ProximityResult<T>[]; locationMatch: LocationMatch } {
  if (!location.trim()) {
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

/**
 * Normalize a location string for consistent comparison
 */
export function normalizeLocation(input: string): string {
  return input.trim().replace(/\s+/g, " ").replace(/,\s*/g, ", ");
}

/**
 * Check if a facility matches a location filter (inclusive, with proximity fallback).
 * Returns true for ZIP/City/State/Nearby matches; false only for nationwide.
 */
export function facilityMatchesLocation(
  facility: { city: string; state: string; zipCode?: string },
  locationMatch: LocationMatch
): boolean {
  const { tier } = getProximityTier(facility, locationMatch);
  return tier !== "nationwide";
}
