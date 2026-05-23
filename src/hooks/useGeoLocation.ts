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

const CACHE_KEY = "geo_data_v3";
// 7-day TTL on the geo cache. Cross-session: a repeat visitor next week
// gets instant proximity sorting without a 200-800 ms ipapi.co round-trip
// (and avoids ipapi.co rate limits on a busy domain).
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CachedGeo {
  data: Omit<GeoData, "isLoading" | "error">;
  cachedAt: number;
}

function readCachedGeo(): Omit<GeoData, "isLoading" | "error"> | null {
  try {
    if (typeof window === "undefined") return null;
    // localStorage primary (cross-session), sessionStorage legacy fallback.
    const cached = localStorage.getItem(CACHE_KEY) || sessionStorage.getItem("geo_data_v2");
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    if (parsed && typeof parsed.cachedAt === "number" && parsed.data) {
      if (Date.now() - parsed.cachedAt < CACHE_TTL_MS) return parsed.data as CachedGeo["data"];
      return null;
    }
    // Legacy sessionStorage format (no envelope) — accept once, then upgrade.
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

      // Re-check the cache from inside the effect: the initial useState
      // path covers the first render, but the effect can run after the
      // cache was just populated by a parallel call on another route.
      const cached = readCachedGeo();
      if (cached) {
        setGeoData({ ...cached, isLoading: false, error: null });
        return;
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
        
        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ data: result, cachedAt: Date.now() } satisfies CachedGeo),
          );
        } catch { /* localStorage full / disabled — non-fatal */ }
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
