import { useState, useEffect, useMemo } from "react";
import { useStaticFacilities, type PublicFacility } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { statesData } from "@/data/locationSeoData";
import {
  getClosestState,
  rankFacilitiesByProximity,
  getNearbyStateData,
  type UserLocation,
} from "@/utils/proximityRanking";

interface UseNearMeFacilitiesOptions {
  stateSlug?: string;
  /** Base URL path for nearby state links, e.g. "/drug-rehab-near-me" */
  basePath: string;
  /** Optional pre-filter before ranking (e.g. filter by treatment type) */
  preFilter?: (facility: PublicFacility) => boolean;
  /** Max results to display */
  maxResults?: number;
  /** Number of nearby state links to show */
  nearbyStatesLimit?: number;
}

export function useNearMeFacilities({
  stateSlug,
  basePath,
  preFilter,
  maxResults = 12,
  nearbyStatesLimit = 4,
}: UseNearMeFacilitiesOptions) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  // Resolve state data from URL slug or geolocation
  const stateData = useMemo((): UserLocation | null => {
    if (stateSlug) {
      const state = statesData.find(s => s.slug === stateSlug);
      return state
        ? { state: state.name, stateAbbr: state.abbreviation, slug: state.slug }
        : null;
    }
    return userLocation;
  }, [stateSlug, userLocation]);

  // Auto-detect location via geolocation when no state in URL
  useEffect(() => {
    if (!stateSlug && !userLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const closest = getClosestState(position.coords.latitude, position.coords.longitude);
          if (closest) setUserLocation(closest);
        },
        () => {},
        { timeout: 10000 }
      );
    }
  }, [stateSlug, userLocation]);

  // Build and rank facilities
  const facilities = useMemo(() => {
    let allFacilities: PublicFacility[] = [
      ...treatmentCenters as any[],
      ...approvedFacilities,
    ];

    // Apply optional pre-filter (e.g. treatment type, insurance)
    if (preFilter) {
      allFacilities = allFacilities.filter(preFilter);
    }

    // Rank by proximity
    return rankFacilitiesByProximity(allFacilities, stateData, maxResults);
  }, [approvedFacilities, stateData, preFilter, maxResults]);

  // Nearby states for linking
  const nearbyStates = useMemo(() => {
    if (!stateData) return [];
    return getNearbyStateData(stateData.stateAbbr, basePath, statesData, nearbyStatesLimit);
  }, [stateData, basePath, nearbyStatesLimit]);

  const locationString = stateData ? stateData.state : "Your Area";

  return {
    facilities,
    stateData,
    nearbyStates,
    locationString,
    isLoading,
    setUserLocation,
  };
}
