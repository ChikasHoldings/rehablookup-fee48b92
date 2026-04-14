import { useState, useCallback, useMemo } from "react";
import { Building2, Loader2, Lock } from "lucide-react";
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
    refetchLimits();
    refetchFacilities();
  }, [refetchLimits, refetchFacilities]);

  if (isLoading || limitsLoading) {
    return (
      <div className="min-h-full bg-background">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-1 sm:mb-2">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                My Listings
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm md:text-base">
                Manage your facility listings ({used} of {limit})
              </p>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        <div className="space-y-4">
          {/* Active Facilities */}
          {facilities.filter(f => !f.suspended).map((facility) => (
            <ListingCard
              key={facility.id}
              facility={facility}
              onSelect={handleSelectFacility}
              onPreview={handlePreview}
            />
          ))}

          {/* Suspended Facilities Section */}
          {facilities.some(f => f.suspended) && (
            <div className="space-y-3 pt-4 border-t border-dashed border-border/60">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span className="text-sm font-medium">Paused Listings</span>
                <span className="text-xs">(Upgrade to Pro to reactivate)</span>
              </div>
              {facilities.filter(f => f.suspended).map((facility) => (
                <ListingCard
                  key={facility.id}
                  facility={facility}
                  onSelect={handleSelectFacility}
                  onPreview={handlePreview}
                />
              ))}
            </div>
          )}

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
