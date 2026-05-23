import { useState, useCallback } from "react";

interface ZipcodeData {
  city: string;
  state: string;
  stateAbbr: string;
  // Zippopotam.us returns lat/lng on `places[0]`. We capture them here so
  // proximity-distance logic (Haversine) can use them when the user enters
  // a ZIP code, even though the public facilities snapshot doesn't carry
  // lat/lng yet — schema backfill tracked in docs/proximity-followup.md.
  latitude: number | null;
  longitude: number | null;
}

interface ZipcodeLookupResult {
  data: ZipcodeData | null;
  isLoading: boolean;
  error: string | null;
}

// US Zipcode to City/State mapping using Zippopotam.us API (free, no key required)
export function useZipcodeLookup() {
  const [result, setResult] = useState<ZipcodeLookupResult>({
    data: null,
    isLoading: false,
    error: null,
  });

  const lookup = useCallback(async (zipcode: string): Promise<ZipcodeData | null> => {
    // Validate zipcode format
    if (!zipcode || !/^\d{5}$/.test(zipcode)) {
      setResult({ data: null, isLoading: false, error: null });
      return null;
    }

    setResult({ data: null, isLoading: true, error: null });

    try {
      const response = await fetch(`https://api.zippopotam.us/us/${zipcode}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setResult({ data: null, isLoading: false, error: "Invalid ZIP code" });
          return null;
        }
        throw new Error("Failed to lookup ZIP code");
      }

      const data = await response.json();
      
      if (data.places && data.places.length > 0) {
        const place = data.places[0];
        const lat = Number(place["latitude"]);
        const lng = Number(place["longitude"]);
        const zipcodeData: ZipcodeData = {
          city: place["place name"],
          state: place["state"],
          stateAbbr: place["state abbreviation"],
          latitude: Number.isFinite(lat) ? lat : null,
          longitude: Number.isFinite(lng) ? lng : null,
        };

        setResult({ data: zipcodeData, isLoading: false, error: null });
        return zipcodeData;
      }
      
      setResult({ data: null, isLoading: false, error: "No data found" });
      return null;
    } catch (err) {
      console.error("Zipcode lookup error:", err);
      setResult({ data: null, isLoading: false, error: "Lookup failed" });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setResult({ data: null, isLoading: false, error: null });
  }, []);

  return {
    ...result,
    lookup,
    reset,
  };
}
