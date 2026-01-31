import { useState, useCallback } from "react";
import { Building2, Loader2 } from "lucide-react";
import { useProviderFacilities } from "@/hooks/useProviderFacilities";
import { useFacilityLimits } from "@/hooks/useFacilityLimits";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { ListingCard } from "./ListingCard";
import { AddListingCard } from "./AddListingCard";
import { ListingPreviewModal } from "./ListingPreviewModal";

interface ListingsLandingPageProps {
  onEditListing: (facilityId: string) => void;
  onAddListing: () => void;
}

interface PreviewState {
  name: string;
  slug: string;
}

export function ListingsLandingPage({ onEditListing, onAddListing }: ListingsLandingPageProps) {
  const { facilities, isLoading, refetch: refetchFacilities } = useProviderFacilities();
  const { limit, used, canAddMore, canPurchaseSlot, planTier, isLoading: limitsLoading, refetch: refetchLimits } = useFacilityLimits();
  const { setSelectedFacility } = useSelectedFacility();
  
  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFacility, setPreviewFacility] = useState<PreviewState | null>(null);

  const handleSelectFacility = (facilityId: string) => {
    const facility = facilities.find(f => f.id === facilityId);
    if (facility) {
      setSelectedFacility(facility);
      onEditListing(facilityId);
    }
  };

  const handlePreview = (facility: { name: string; slug: string }) => {
    setPreviewFacility(facility);
    setPreviewOpen(true);
  };

  const handleAddClick = () => {
    if (canAddMore) {
      onAddListing();
    }
  };

  // Callback when a slot is purchased - refetch all data
  const handleSlotPurchased = useCallback(() => {
    console.log("[ListingsLandingPage] Slot purchased, refetching data");
    refetchLimits();
    refetchFacilities();
  }, [refetchLimits, refetchFacilities]);

  if (isLoading || limitsLoading) {
    return (
      <div className="min-h-full bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                My Listings
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Manage your facility listings ({used} of {limit})
              </p>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        <div className="space-y-4">
          {/* Existing Facilities */}
          {facilities.map((facility) => (
            <ListingCard
              key={facility.id}
              facility={facility}
              onSelect={handleSelectFacility}
              onPreview={handlePreview}
            />
          ))}

          {/* Add New Listing Card */}
          <AddListingCard
            canAdd={canAddMore}
            used={used}
            limit={limit}
            planTier={planTier}
            canPurchaseSlot={canPurchaseSlot}
            onAddClick={handleAddClick}
            onSlotPurchased={handleSlotPurchased}
          />
        </div>

        {/* Empty State - only shown when no facilities exist */}
        {facilities.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              You haven't created any listings yet. Get started by adding your first facility.
            </p>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewFacility && (
        <ListingPreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          facilityName={previewFacility.name}
          facilitySlug={previewFacility.slug}
        />
      )}
    </div>
  );
}
