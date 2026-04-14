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
      const { data: { session } } = await supabase.auth.getSession();
      const newUserId = session?.user?.id || null;
      
      // If user changed, reset everything
      if (currentUserId && newUserId && currentUserId !== newUserId) {
        console.log("[SelectedFacilityContext] User changed, resetting hydration");
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
        console.log("[SelectedFacilityContext] User signed out, clearing state");
        hydratedRef.current = false;
        setSelectedFacilityState(null);
        setCurrentUserId(null);
      } else if (event === 'SIGNED_IN' && currentUserId && newUserId !== currentUserId) {
        console.log("[SelectedFacilityContext] Different user signed in, resetting");
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
        console.log("[SelectedFacilityContext] Hydrated facility:", fullFacility.name);
        setSelectedFacilityState(fullFacility);
        localStorage.setItem("selectedFacilityData", JSON.stringify(fullFacility));
        hydratedRef.current = true;
        return;
      }
    }
    
    // Default to first non-suspended facility
    const activeFacility = facilities.find(f => !f.suspended) ?? facilities[0];
    if (activeFacility) {
      console.log("[SelectedFacilityContext] Defaulting to first active facility:", activeFacility.name);
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
    isLoading: false, // Never block - we use cached data
    hasUnsavedChanges,
    setHasUnsavedChanges,
    pendingFacilitySwitch,
    confirmFacilitySwitch,
    cancelFacilitySwitch,
  }), [selectedFacility, setSelectedFacility, requestFacilitySwitch, hasUnsavedChanges, pendingFacilitySwitch, confirmFacilitySwitch, cancelFacilitySwitch]);

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
