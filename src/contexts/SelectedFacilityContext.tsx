import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from "react";
import { useProviderFacilities, type ProviderFacility } from "@/hooks/useProviderFacilities";

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

  // Update selected facility when facilities load
  useEffect(() => {
    console.log("[SelectedFacilityContext] Effect triggered:", { 
      facilitiesLoading, 
      facilitiesCount: facilities.length, 
      selectedFacilityId: selectedFacility?.id 
    });
    
    if (facilitiesLoading || facilities.length === 0) return;
    
    // If we have a selected facility, try to find the full version
    if (selectedFacility?.id) {
      const fullFacility = facilities.find(f => f.id === selectedFacility.id);
      if (fullFacility) {
        console.log("[SelectedFacilityContext] Found full facility:", fullFacility.name);
        setSelectedFacilityState(fullFacility);
        localStorage.setItem("selectedFacilityData", JSON.stringify(fullFacility));
        return;
      }
    }
    
    // Default to first facility
    console.log("[SelectedFacilityContext] Defaulting to first facility:", facilities[0]?.name);
    setSelectedFacilityState(facilities[0]);
    localStorage.setItem("selectedFacilityId", facilities[0].id);
    localStorage.setItem("selectedFacilityData", JSON.stringify(facilities[0]));
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
