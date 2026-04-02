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
      // Skip geo fetch for bots/crawlers to avoid 429 errors in Lighthouse
      const ua = navigator.userAgent;
      if (/Lighthouse|Googlebot|bingbot|Baiduspider|YandexBot/i.test(ua)) {
        setGeoData(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Check sessionStorage cache to reduce API calls
      const cached = sessionStorage.getItem("geo_data");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setGeoData({ ...parsed, isLoading: false, error: null });
          return;
        } catch { /* ignore parse errors */ }
      }

      try {
        const response = await fetch("https://ipapi.co/json/", {
          signal: AbortSignal.timeout(5000),
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch geo data");
        }
        
        const data = await response.json();
        const countryCode = data.country_code || data.country || "";
        const result = {
          country: data.country_name || "",
          countryCode,
          isUS: countryCode === "US",
        };
        
        sessionStorage.setItem("geo_data", JSON.stringify(result));
        setGeoData({ ...result, isLoading: false, error: null });
      } catch (err) {
        setGeoData({
          country: "",
          countryCode: "",
          isUS: true,
          isLoading: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    };

    const deferFetch = () => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(() => fetchGeoData(), { timeout: 3000 });
      } else {
        setTimeout(fetchGeoData, 1500);
      }
    };

    deferFetch();
  }, []);

  return geoData;
}
