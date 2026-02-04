import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { EmbedBadgeWidget } from "@/components/provider/EmbedBadgeWidget";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Code2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function EmbedBadgePage() {
  const { selectedFacility } = useSelectedFacility();

  // Check if facility has reviews
  const { data: reviewCount } = useQuery({
    queryKey: ["facility-review-count", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return 0;
      const { count } = await supabase
        .from("facility_reviews")
        .select("*", { count: "exact", head: true })
        .eq("facility_id", selectedFacility.id)
        .eq("status", "approved");
      return count || 0;
    },
    enabled: !!selectedFacility?.id,
  });

  if (!selectedFacility) {
    return (
      <div className="p-4 lg:p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Please select a facility to generate embed badges.
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
          <Code2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">Embed Badge</h1>
          <p className="text-sm text-muted-foreground">
            Add a badge to your website to boost visibility and SEO
          </p>
        </div>
      </div>

      {/* Badge Widget */}
      <EmbedBadgeWidget
        facilityId={selectedFacility.id}
        facilitySlug={selectedFacility.slug || selectedFacility.id}
        facilityName={selectedFacility.name}
        isFeatured={selectedFacility.featured}
        hasReviews={(reviewCount || 0) > 0}
      />
    </div>
  );
}
