import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useProviderFacilities, type ProviderFacility } from "@/hooks/useProviderFacilities";

interface SelectedFacilityContextType {
  selectedFacility: ProviderFacility | null;
  setSelectedFacility: (facility: ProviderFacility) => void;
  isLoading: boolean;
}

const SelectedFacilityContext = createContext<SelectedFacilityContextType | undefined>(undefined);

export function SelectedFacilityProvider({ children }: { children: ReactNode }) {
  const { facilities, isLoading: facilitiesLoading } = useProviderFacilities();
  const [selectedFacility, setSelectedFacilityState] = useState<ProviderFacility | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize selected facility from localStorage or first available facility
  useEffect(() => {
    if (facilitiesLoading || facilities.length === 0) return;
    
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

  const setSelectedFacility = (facility: ProviderFacility) => {
    setSelectedFacilityState(facility);
    localStorage.setItem("selectedFacilityId", facility.id);
  };

  return (
    <SelectedFacilityContext.Provider
      value={{
        selectedFacility,
        setSelectedFacility,
        isLoading: facilitiesLoading || !isInitialized,
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
