import { useState } from "react";
import { Building2, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProviderFacilities } from "@/hooks/useProviderFacilities";
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
  const { facilities, isLoading, isError, refetch: refetchFacilities } = useProviderFacilities();
  const { setSelectedFacility } = useSelectedFacility();
  const used = facilities.length;

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFacility, setPreviewFacility] = useState<PreviewState | null>(null);

  const handleSelectFacility = (facilityId: string) => {
    const facility = facilities.find(f => f.id === facilityId);
    if (!facility) return;
    // Suspended listings are read-only via the editor — block the click
    // here to avoid a confusing "open then immediately hit a paused
    // banner" jump. Owners reactivate via support per the section copy.
    if (facility.suspended) return;
    setSelectedFacility(facility);
    onEditListing(facilityId);
  };

  const handlePreview = (facility: { name: string; slug: string }) => {
    setPreviewFacility(facility);
    setPreviewOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-full bg-background" aria-busy="true">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
            <span className="sr-only">Loading your facility listings…</span>
          </div>
        </div>
      </div>
    );
  }

  // BUGFIX: Show error state when facilities fail to load instead of rendering an empty list
  if (isError) {
    return (
      <div className="min-h-full bg-background">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-foreground mb-1">Failed to Load Listings</h3>
              <p className="text-sm text-muted-foreground">There was a problem loading your facilities. Please try again.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchFacilities()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
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
                {used === 0
                  ? "Manage your facility listings"
                  : `Manage your facility listings (${used} active)`}
              </p>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        {facilities.length === 0 ? (
          // Genuine empty state — no facilities at all. AddListingCard
          // is rendered with a richer subtitle ("You don't have any
          // facilities yet — add your first.") for first-time providers.
          <div className="space-y-4">
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center">
              <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" aria-hidden />
              </div>
              <h2 className="text-base font-semibold text-foreground">
                No listings yet
              </h2>
              <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
                Add your first facility to start receiving inquiries. The
                process takes about 10 minutes and our team reviews new
                listings within 24-48 hours.
              </p>
            </div>
            <AddListingCard used={0} onAddClick={onAddListing} />
          </div>
        ) : (
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

            {/* Suspended Facilities Section — legacy state from when Pro
                cancellation auto-suspended extras; left visible so any
                historically-paused listings are still surfaced for the
                owner to reactivate via support. */}
            {facilities.some(f => f.suspended) && (
              <div className="space-y-3 pt-4 border-t border-dashed border-border/60">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertCircle className="h-4 w-4" aria-hidden />
                  <span className="text-sm font-medium">Paused Listings</span>
                  <span className="text-xs">(contact support to reactivate)</span>
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
            <AddListingCard used={used} onAddClick={onAddListing} />
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
