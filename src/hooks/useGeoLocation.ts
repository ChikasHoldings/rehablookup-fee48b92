import { useState, useEffect } from "react";

interface GeoData {
  country: string;
  countryCode: string;
  city: string;
  region: string; // state/region name
  regionCode: string; // state abbreviation (e.g. "TX")
  postal: string; // zip code
  isUS: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Synchronously hydrate from sessionStorage on the very first render so the
 * `useGeoLocation` consumer (e.g. InternationalBanner) doesn't flicker
 * isLoading=true → isUS=true → eventually-correct on repeat visits within
 * the same session. The async useEffect path below still runs as a fallback
 * for first visits / corrupt cache.
 */
function readCachedGeo(): Omit<GeoData, "isLoading" | "error"> | null {
  try {
    if (typeof window === "undefined") return null;
    const cached = sessionStorage.getItem("geo_data_v2");
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    if (parsed && typeof parsed.isUS === "boolean") return parsed;
  } catch { /* ignore */ }
  return null;
}

export function useGeoLocation(): GeoData {
  const [geoData, setGeoData] = useState<GeoData>(() => {
    const cached = readCachedGeo();
    if (cached) {
      // Repeat-session visit: settle synchronously, no async window, no CLS.
      return { ...cached, isLoading: false, error: null };
    }
    return {
      country: "",
      countryCode: "",
      city: "",
      region: "",
      regionCode: "",
      postal: "",
      isUS: true, // Default to US to avoid showing banner unnecessarily
      isLoading: true,
      error: null,
    };
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
      const cached = sessionStorage.getItem("geo_data_v2");
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
          // Silently fall back on rate-limit or server errors (avoids console 429 in Lighthouse)
          setGeoData(prev => ({ ...prev, isLoading: false }));
          return;
        }
        
        const data = await response.json();
        const countryCode = data.country_code || data.country || "";
        const result = {
          country: data.country_name || "",
          countryCode,
          city: data.city || "",
          region: data.region || "",
          regionCode: data.region_code || "",
          postal: data.postal || "",
          isUS: countryCode === "US",
        };
        
        sessionStorage.setItem("geo_data_v2", JSON.stringify(result));
        setGeoData({ ...result, isLoading: false, error: null });
      } catch (err) {
        setGeoData({
          country: "",
          countryCode: "",
          city: "",
          region: "",
          regionCode: "",
          postal: "",
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
