import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { EmbedBadgeWidget } from "@/components/provider/EmbedBadgeWidget";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Award } from "lucide-react";

export default function EmbedBadgePage() {
  const { selectedFacility } = useSelectedFacility();

  if (!selectedFacility) {
    return (
      <div className="p-4 lg:p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Please select a facility to view your badge collection.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedFacility.status !== "approved") {
    return (
      <div className="p-4 lg:p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Facility Not Approved</h3>
            <p className="text-muted-foreground">
              Embed badges are only available for approved facilities. Please wait for your listing to be approved.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Award className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">Badge Collection</h1>
          <p className="text-sm text-muted-foreground">
            Earn badges by improving your facility performance and embed them on your website
          </p>
        </div>
      </div>

      {/* Badge Widget */}
      <EmbedBadgeWidget
        facilityId={selectedFacility.id}
        facilitySlug={selectedFacility.slug || selectedFacility.id}
        facilityName={selectedFacility.name}
      />
    </div>
  );
}
