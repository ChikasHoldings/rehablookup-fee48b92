import { Plus, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AddListingCardProps {
  used: number;
  onAddClick: () => void;
}

/**
 * "Add another facility" card on the My Listings landing page.
 * No per-plan cap is enforced — providers can add unlimited facilities
 * regardless of tier (listing limits + paid extra-slot flow retired
 * with the credit/unlock monetization model).
 */
export function AddListingCard({ used, onAddClick }: AddListingCardProps) {
  return (
    <Card
      className="border-2 border-dashed border-primary/30 hover:border-primary/50 bg-primary/5 hover:bg-primary/10 transition-all duration-200 cursor-pointer group"
      onClick={onAddClick}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          <div className="h-11 w-11 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors shrink-0">
            <Plus className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-semibold text-foreground text-sm sm:text-base mb-0.5 sm:mb-1 group-hover:text-primary transition-colors">
              Add New Listing
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Create another facility listing ({used} {used === 1 ? "currently" : "currently"})
            </p>
          </div>
          <Button className="gap-2 shrink-0 w-full sm:w-auto h-9 sm:h-10 text-sm">
            <Building2 className="h-4 w-4" />
            Add Facility
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
