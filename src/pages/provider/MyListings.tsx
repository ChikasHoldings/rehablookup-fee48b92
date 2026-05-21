import { useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingsLandingPage } from "@/components/provider/listing";
import { useProviderFacilities } from "@/hooks/useProviderFacilities";
import ListingEditor from "./ListingEditor";

type ViewMode = "landing" | "edit";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function MyListingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { facilities, isLoading } = useProviderFacilities();

  const editingFacilityId = searchParams.get("edit");
  const isValidUuid = !!editingFacilityId && UUID_PATTERN.test(editingFacilityId);

  // Client-side ownership check. RLS will also reject the row fetch
  // inside ListingEditor for any facility this user doesn't own, but
  // strip a bogus `?edit=<other-facility-id>` URL immediately so the
  // user doesn't see a half-rendered editor that then fails to load.
  const ownsFacility = isValidUuid && facilities.some(f => f.id === editingFacilityId);
  const isUnownedAfterLoad =
    !!editingFacilityId && !isLoading && facilities.length > 0 && !ownsFacility;

  useEffect(() => {
    if (isUnownedAfterLoad || (!!editingFacilityId && !isValidUuid)) {
      setSearchParams({}, { replace: true });
    }
  }, [isUnownedAfterLoad, editingFacilityId, isValidUuid, setSearchParams]);

  const viewMode: ViewMode = ownsFacility ? "edit" : "landing";

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
            aria-label="Back to all listings"
          >
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" aria-hidden />
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
