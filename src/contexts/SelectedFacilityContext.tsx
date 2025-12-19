import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useProviderFacilities, type ProviderFacility } from "@/hooks/useProviderFacilities";

interface SelectedFacilityContextType {
  selectedFacility: ProviderFacility | null;
  setSelectedFacility: (facility: ProviderFacility) => void;
  requestFacilitySwitch: (facility: ProviderFacility) => void;
  isLoading: boolean;
  // Unsaved changes handling
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  pendingFacilitySwitch: ProviderFacility | null;
  confirmFacilitySwitch: () => void;
  cancelFacilitySwitch: () => void;
}

const SelectedFacilityContext = createContext<SelectedFacilityContextType | undefined>(undefined);

export function SelectedFacilityProvider({ children }: { children: ReactNode }) {
  const { facilities, isLoading: facilitiesLoading } = useProviderFacilities();
  const [selectedFacility, setSelectedFacilityState] = useState<ProviderFacility | null>(() => {
    // Try to restore from localStorage immediately on mount for instant UI
    const storedFacilityId = localStorage.getItem("selectedFacilityId");
    return storedFacilityId ? { id: storedFacilityId } as ProviderFacility : null;
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingFacilitySwitch, setPendingFacilitySwitch] = useState<ProviderFacility | null>(null);

  // Initialize/update selected facility from fetched facilities
  useEffect(() => {
    if (facilitiesLoading) return;
    
    // If no facilities, still mark as initialized
    if (facilities.length === 0) {
      setSelectedFacilityState(null);
      setIsInitialized(true);
      return;
    }
    
    const storedFacilityId = localStorage.getItem("selectedFacilityId");
    
    if (storedFacilityId) {
      const storedFacility = facilities.find(f => f.id === storedFacilityId);
      if (storedFacility) {
        setSelectedFacilityState(storedFacility);
        setIsInitialized(true);
        return;
      }
    }
    
    // Default to first facility if no stored selection or stored facility not found
    setSelectedFacilityState(facilities[0]);
    localStorage.setItem("selectedFacilityId", facilities[0].id);
    setIsInitialized(true);
  }, [facilities, facilitiesLoading]);

  // Keep selected facility in sync with facilities list (in case of updates)
  useEffect(() => {
    if (!selectedFacility || facilities.length === 0) return;
    
    const updatedFacility = facilities.find(f => f.id === selectedFacility.id);
    if (updatedFacility && JSON.stringify(updatedFacility) !== JSON.stringify(selectedFacility)) {
      setSelectedFacilityState(updatedFacility);
    }
  }, [facilities, selectedFacility]);

  const setSelectedFacility = useCallback((facility: ProviderFacility) => {
    setSelectedFacilityState(facility);
    localStorage.setItem("selectedFacilityId", facility.id);
    setHasUnsavedChanges(false);
    setPendingFacilitySwitch(null);
  }, []);

  // Request to switch facility - checks for unsaved changes first
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

  return (
    <SelectedFacilityContext.Provider
      value={{
        selectedFacility,
        setSelectedFacility,
        requestFacilitySwitch,
        isLoading: facilitiesLoading && !isInitialized,
        hasUnsavedChanges,
        setHasUnsavedChanges,
        pendingFacilitySwitch,
        confirmFacilitySwitch,
        cancelFacilitySwitch,
      }}
    >
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

// Optional version that doesn't throw - returns null if not in provider context
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
