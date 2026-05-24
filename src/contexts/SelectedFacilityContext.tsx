import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo, useRef } from "react";
import { useProviderFacilities, type ProviderFacility } from "@/hooks/useProviderFacilities";
import { supabase } from "@/integrations/supabase/client";

interface SelectedFacilityContextType {
  selectedFacility: ProviderFacility | null;
  setSelectedFacility: (facility: ProviderFacility) => void;
  requestFacilitySwitch: (facility: ProviderFacility) => void;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  pendingFacilitySwitch: ProviderFacility | null;
  confirmFacilitySwitch: () => void;
  cancelFacilitySwitch: () => void;
}

const SelectedFacilityContext = createContext<SelectedFacilityContextType | undefined>(undefined);

// Get initial facility from localStorage synchronously
function getInitialFacility(): ProviderFacility | null {
  try {
    const stored = localStorage.getItem("selectedFacilityData");
    if (stored) {
      return JSON.parse(stored) as ProviderFacility;
    }
    const storedId = localStorage.getItem("selectedFacilityId");
    if (storedId) {
      return { id: storedId } as ProviderFacility;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

export function SelectedFacilityProvider({ children }: { children: ReactNode }) {
  const { facilities, isLoading: facilitiesLoading } = useProviderFacilities();
  const [selectedFacility, setSelectedFacilityState] = useState<ProviderFacility | null>(getInitialFacility);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingFacilitySwitch, setPendingFacilitySwitch] = useState<ProviderFacility | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Track if we've already hydrated from the facilities list
  const hydratedRef = useRef(false);

  // Reset hydration when user changes (prevents stale data cross-contamination)
  useEffect(() => {
    const checkUser = async () => {
      let newUserId: string | null = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        newUserId = session?.user?.id || null;
      } catch (err) {
        // Transient auth-endpoint failure. Don't tear down the user's
        // selected-facility state — that would force them to re-pick
        // a facility just because the auth check blipped. Leave the
        // context as-is and try again on the next render cycle.
        console.warn("[SelectedFacilityContext] auth.getSession failed, retaining state", err);
        return;
      }
      
      // If user changed, reset everything
      if (currentUserId && newUserId && currentUserId !== newUserId) {
        if (import.meta.env.DEV) console.log("[SelectedFacilityContext] User changed, resetting hydration");
        hydratedRef.current = false;
        setSelectedFacilityState(null);
      }
      
      setCurrentUserId(newUserId);
    };
    
    checkUser();
    
    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUserId = session?.user?.id || null;
      
      if (event === 'SIGNED_OUT') {
        if (import.meta.env.DEV) console.log("[SelectedFacilityContext] User signed out, clearing state");
        hydratedRef.current = false;
        setSelectedFacilityState(null);
        setCurrentUserId(null);
      } else if (event === 'SIGNED_IN' && currentUserId && newUserId !== currentUserId) {
        if (import.meta.env.DEV) console.log("[SelectedFacilityContext] Different user signed in, resetting");
        hydratedRef.current = false;
        setSelectedFacilityState(null);
        setCurrentUserId(newUserId);
      } else if (newUserId) {
        setCurrentUserId(newUserId);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [currentUserId]);

  // Update selected facility when facilities load (only once)
  useEffect(() => {
    if (facilitiesLoading || facilities.length === 0 || hydratedRef.current) return;
    
    const currentId = selectedFacility?.id;
    
    // If we have a selected facility, try to find the full version
    if (currentId) {
      const fullFacility = facilities.find(f => f.id === currentId);
      if (fullFacility && !fullFacility.suspended) {
        if (import.meta.env.DEV) console.log("[SelectedFacilityContext] Hydrated facility:", fullFacility.name);
        setSelectedFacilityState(fullFacility);
        localStorage.setItem("selectedFacilityData", JSON.stringify(fullFacility));
        hydratedRef.current = true;
        return;
      }
    }
    
    // Default to first non-suspended facility
    const activeFacility = facilities.find(f => !f.suspended) ?? facilities[0];
    if (activeFacility) {
      if (import.meta.env.DEV) console.log("[SelectedFacilityContext] Defaulting to first active facility:", activeFacility.name);
      setSelectedFacilityState(activeFacility);
      localStorage.setItem("selectedFacilityId", activeFacility.id);
      localStorage.setItem("selectedFacilityData", JSON.stringify(activeFacility));
    }
    hydratedRef.current = true;
  }, [facilities, facilitiesLoading, selectedFacility?.id]);

  const setSelectedFacility = useCallback((facility: ProviderFacility) => {
    setSelectedFacilityState(facility);
    localStorage.setItem("selectedFacilityId", facility.id);
    localStorage.setItem("selectedFacilityData", JSON.stringify(facility));
    setHasUnsavedChanges(false);
    setPendingFacilitySwitch(null);
  }, []);

  const requestFacilitySwitch = useCallback((facility: ProviderFacility) => {
    if (facility.id === selectedFacility?.id) return;
    
    if (hasUnsavedChanges) {
      setPendingFacilitySwitch(facility);
    } else {
      setSelectedFacility(facility);
    }
  }, [hasUnsavedChanges, selectedFacility?.id, setSelectedFacility]);

  const confirmFacilitySwitch = useCallback(() => {
    if (pendingFacilitySwitch) {
      setSelectedFacility(pendingFacilitySwitch);
    }
  }, [pendingFacilitySwitch, setSelectedFacility]);

  const cancelFacilitySwitch = useCallback(() => {
    setPendingFacilitySwitch(null);
  }, []);

  const value = useMemo(() => ({
    selectedFacility,
    setSelectedFacility,
    requestFacilitySwitch,
    // BUGFIX: Expose the real facilities loading state so consumers (e.g. Analytics page)
    // can show a skeleton while facilities are being fetched on first load, rather than
    // rendering with a null selectedFacility and then re-rendering once facilities arrive.
    isLoading: facilitiesLoading,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    pendingFacilitySwitch,
    confirmFacilitySwitch,
    cancelFacilitySwitch,
  }), [selectedFacility, setSelectedFacility, requestFacilitySwitch, facilitiesLoading, hasUnsavedChanges, pendingFacilitySwitch, confirmFacilitySwitch, cancelFacilitySwitch]);

  return (
    <SelectedFacilityContext.Provider value={value}>
      {children}
    </SelectedFacilityContext.Provider>
  );
}

export function useSelectedFacility() {
  const context = useContext(SelectedFacilityContext);
  if (context === undefined) {
    throw new Error("useSelectedFacility must be used within a SelectedFacilityProvider");
  }
  return context;
}

export function useSelectedFacilityOptional() {
  const context = useContext(SelectedFacilityContext);
  return context ?? { 
    selectedFacility: null, 
    setSelectedFacility: () => {}, 
    requestFacilitySwitch: () => {},
    isLoading: false,
    hasUnsavedChanges: false,
    setHasUnsavedChanges: () => {},
    pendingFacilitySwitch: null,
    confirmFacilitySwitch: () => {},
    cancelFacilitySwitch: () => {},
  };
}
