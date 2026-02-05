import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingsLandingPage } from "@/components/provider/listing";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import ListingEditor from "./ListingEditor";

type ViewMode = "landing" | "edit";

export default function MyListingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedFacility } = useSelectedFacility();
  
  // Determine view mode from URL params
  const editingFacilityId = searchParams.get("edit");
  const viewMode: ViewMode = editingFacilityId ? "edit" : "landing";

  const handleEditListing = useCallback((facilityId: string) => {
    setSearchParams({ edit: facilityId });
  }, [setSearchParams]);

  const handleAddListing = useCallback(() => {
    navigate("/provider/add-location");
  }, [navigate]);

  const handleBackToLanding = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  if (viewMode === "edit" && editingFacilityId) {
    return (
      <div className="min-h-full bg-background">
        {/* Back Button Header */}
        <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6 md:pt-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToLanding}
            className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2 text-sm md:text-base"
          >
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
            Back to All Listings
          </Button>
        </div>
        
        {/* Editor Content */}
        <ListingEditor facilityId={editingFacilityId} />
      </div>
    );
  }

  return (
    <ListingsLandingPage
      onEditListing={handleEditListing}
      onAddListing={handleAddListing}
    />
  );
}
