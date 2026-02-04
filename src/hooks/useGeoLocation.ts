import { useState, useEffect } from "react";

interface GeoData {
  country: string;
  countryCode: string;
  isUS: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useGeoLocation(): GeoData {
  const [geoData, setGeoData] = useState<GeoData>({
    country: "",
    countryCode: "",
    isUS: true, // Default to US to avoid showing banner unnecessarily
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchGeoData = async () => {
      try {
        // Use ipapi.co for free geo detection
        const response = await fetch("https://ipapi.co/json/", {
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch geo data");
        }
        
        const data = await response.json();
        const countryCode = data.country_code || data.country || "";
        
        setGeoData({
          country: data.country_name || "",
          countryCode,
          isUS: countryCode === "US",
          isLoading: false,
          error: null,
        });
      } catch (err) {
        // On error, default to US (don't show banner)
        setGeoData({
          country: "",
          countryCode: "",
          isUS: true,
          isLoading: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    };

    // Defer geolocation fetch until after page is interactive to improve TTI
    const deferFetch = () => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(() => fetchGeoData(), { timeout: 3000 });
      } else {
        setTimeout(fetchGeoData, 1500);
      }
    };

    // Start deferred fetch after initial render
    deferFetch();
  }, []);

  return geoData;
}
