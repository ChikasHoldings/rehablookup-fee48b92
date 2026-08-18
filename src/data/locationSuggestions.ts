// US States with abbreviations
export const usStatesWithAbbr = [
  { name: "Alabama", abbr: "AL", type: "state" as const },
  { name: "Alaska", abbr: "AK", type: "state" as const },
  { name: "Arizona", abbr: "AZ", type: "state" as const },
  { name: "Arkansas", abbr: "AR", type: "state" as const },
  { name: "California", abbr: "CA", type: "state" as const },
  { name: "Colorado", abbr: "CO", type: "state" as const },
  { name: "Connecticut", abbr: "CT", type: "state" as const },
  { name: "Delaware", abbr: "DE", type: "state" as const },
  // The district is a real market: the live catalogue carries 18 approved
  // facilities recorded as "District of Columbia". Omitting it here meant
  // a "Washington, DC" search normalized to nothing and matched none of
  // them. Canonical normalization lives in @/lib/location; this entry
  // keeps the autocomplete list consistent with it.
  { name: "District of Columbia", abbr: "DC", type: "state" as const },
  { name: "Florida", abbr: "FL", type: "state" as const },
  { name: "Georgia", abbr: "GA", type: "state" as const },
  { name: "Hawaii", abbr: "HI", type: "state" as const },
  { name: "Idaho", abbr: "ID", type: "state" as const },
  { name: "Illinois", abbr: "IL", type: "state" as const },
  { name: "Indiana", abbr: "IN", type: "state" as const },
  { name: "Iowa", abbr: "IA", type: "state" as const },
  { name: "Kansas", abbr: "KS", type: "state" as const },
  { name: "Kentucky", abbr: "KY", type: "state" as const },
  { name: "Louisiana", abbr: "LA", type: "state" as const },
  { name: "Maine", abbr: "ME", type: "state" as const },
  { name: "Maryland", abbr: "MD", type: "state" as const },
  { name: "Massachusetts", abbr: "MA", type: "state" as const },
  { name: "Michigan", abbr: "MI", type: "state" as const },
  { name: "Minnesota", abbr: "MN", type: "state" as const },
  { name: "Mississippi", abbr: "MS", type: "state" as const },
  { name: "Missouri", abbr: "MO", type: "state" as const },
  { name: "Montana", abbr: "MT", type: "state" as const },
  { name: "Nebraska", abbr: "NE", type: "state" as const },
  { name: "Nevada", abbr: "NV", type: "state" as const },
  { name: "New Hampshire", abbr: "NH", type: "state" as const },
  { name: "New Jersey", abbr: "NJ", type: "state" as const },
  { name: "New Mexico", abbr: "NM", type: "state" as const },
  { name: "New York", abbr: "NY", type: "state" as const },
  { name: "North Carolina", abbr: "NC", type: "state" as const },
  { name: "North Dakota", abbr: "ND", type: "state" as const },
  { name: "Ohio", abbr: "OH", type: "state" as const },
  { name: "Oklahoma", abbr: "OK", type: "state" as const },
  { name: "Oregon", abbr: "OR", type: "state" as const },
  { name: "Pennsylvania", abbr: "PA", type: "state" as const },
  { name: "Rhode Island", abbr: "RI", type: "state" as const },
  { name: "South Carolina", abbr: "SC", type: "state" as const },
  { name: "South Dakota", abbr: "SD", type: "state" as const },
  { name: "Tennessee", abbr: "TN", type: "state" as const },
  { name: "Texas", abbr: "TX", type: "state" as const },
  { name: "Utah", abbr: "UT", type: "state" as const },
  { name: "Vermont", abbr: "VT", type: "state" as const },
  { name: "Virginia", abbr: "VA", type: "state" as const },
  { name: "Washington", abbr: "WA", type: "state" as const },
  { name: "West Virginia", abbr: "WV", type: "state" as const },
  { name: "Wisconsin", abbr: "WI", type: "state" as const },
  { name: "Wyoming", abbr: "WY", type: "state" as const },
];

// Major US cities
export const majorCities = [
  { name: "New York", state: "NY", type: "city" as const },
  { name: "Los Angeles", state: "CA", type: "city" as const },
  { name: "Chicago", state: "IL", type: "city" as const },
  { name: "Houston", state: "TX", type: "city" as const },
  { name: "Phoenix", state: "AZ", type: "city" as const },
  { name: "Philadelphia", state: "PA", type: "city" as const },
  { name: "San Antonio", state: "TX", type: "city" as const },
  { name: "San Diego", state: "CA", type: "city" as const },
  { name: "Dallas", state: "TX", type: "city" as const },
  { name: "San Jose", state: "CA", type: "city" as const },
  { name: "Austin", state: "TX", type: "city" as const },
  { name: "Jacksonville", state: "FL", type: "city" as const },
  { name: "Fort Worth", state: "TX", type: "city" as const },
  { name: "Columbus", state: "OH", type: "city" as const },
  { name: "Charlotte", state: "NC", type: "city" as const },
  { name: "San Francisco", state: "CA", type: "city" as const },
  { name: "Indianapolis", state: "IN", type: "city" as const },
  { name: "Seattle", state: "WA", type: "city" as const },
  { name: "Denver", state: "CO", type: "city" as const },
  { name: "Boston", state: "MA", type: "city" as const },
  { name: "El Paso", state: "TX", type: "city" as const },
  { name: "Nashville", state: "TN", type: "city" as const },
  { name: "Detroit", state: "MI", type: "city" as const },
  { name: "Portland", state: "OR", type: "city" as const },
  { name: "Memphis", state: "TN", type: "city" as const },
  { name: "Oklahoma City", state: "OK", type: "city" as const },
  { name: "Las Vegas", state: "NV", type: "city" as const },
  { name: "Louisville", state: "KY", type: "city" as const },
  { name: "Baltimore", state: "MD", type: "city" as const },
  { name: "Milwaukee", state: "WI", type: "city" as const },
  { name: "Albuquerque", state: "NM", type: "city" as const },
  { name: "Tucson", state: "AZ", type: "city" as const },
  { name: "Fresno", state: "CA", type: "city" as const },
  { name: "Sacramento", state: "CA", type: "city" as const },
  { name: "Mesa", state: "AZ", type: "city" as const },
  { name: "Kansas City", state: "MO", type: "city" as const },
  { name: "Atlanta", state: "GA", type: "city" as const },
  { name: "Miami", state: "FL", type: "city" as const },
  { name: "Raleigh", state: "NC", type: "city" as const },
  { name: "Omaha", state: "NE", type: "city" as const },
  { name: "Colorado Springs", state: "CO", type: "city" as const },
  { name: "Virginia Beach", state: "VA", type: "city" as const },
  { name: "Long Beach", state: "CA", type: "city" as const },
  { name: "Oakland", state: "CA", type: "city" as const },
  { name: "Minneapolis", state: "MN", type: "city" as const },
  { name: "Tampa", state: "FL", type: "city" as const },
  { name: "Tulsa", state: "OK", type: "city" as const },
  { name: "Arlington", state: "TX", type: "city" as const },
  { name: "New Orleans", state: "LA", type: "city" as const },
  { name: "Cleveland", state: "OH", type: "city" as const },
  { name: "Honolulu", state: "HI", type: "city" as const },
  { name: "Anaheim", state: "CA", type: "city" as const },
  { name: "Orlando", state: "FL", type: "city" as const },
  { name: "St. Louis", state: "MO", type: "city" as const },
  { name: "Pittsburgh", state: "PA", type: "city" as const },
  { name: "Cincinnati", state: "OH", type: "city" as const },
  { name: "Scottsdale", state: "AZ", type: "city" as const },
  { name: "Boca Raton", state: "FL", type: "city" as const },
  { name: "Palm Beach", state: "FL", type: "city" as const },
  { name: "Malibu", state: "CA", type: "city" as const },
  { name: "Sedona", state: "AZ", type: "city" as const },
];

export type LocationSuggestion = 
  | { name: string; abbr: string; type: "state" }
  | { name: string; state: string; type: "city" };

export function getLocationSuggestions(query: string): LocationSuggestion[] {
  if (!query || query.length < 2) return [];
  
  const lowerQuery = query.toLowerCase().trim();
  const results: LocationSuggestion[] = [];
  
  // Search states
  for (const state of usStatesWithAbbr) {
    if (
      state.name.toLowerCase().includes(lowerQuery) ||
      state.abbr.toLowerCase() === lowerQuery
    ) {
      results.push(state);
    }
  }
  
  // Search cities
  for (const city of majorCities) {
    const citySearch = `${city.name}, ${city.state}`.toLowerCase();
    if (
      city.name.toLowerCase().includes(lowerQuery) ||
      citySearch.includes(lowerQuery)
    ) {
      results.push(city);
    }
  }
  
  // Sort: prioritize exact matches, then alphabetically
  return results
    .sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aExact = aName.startsWith(lowerQuery);
      const bExact = bName.startsWith(lowerQuery);
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return aName.localeCompare(bName);
    })
    .slice(0, 8); // Limit to 8 suggestions
}

export function formatLocationSuggestion(suggestion: LocationSuggestion): string {
  if (suggestion.type === "state") {
    return suggestion.name;
  }
  return `${suggestion.name}, ${suggestion.state}`;
}
