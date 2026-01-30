import { Link } from "react-router-dom";
import { Plus, Building2, Lock, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AddListingCardProps {
  canAdd: boolean;
  used: number;
  limit: number;
  planTier: "pro" | "free";
  onAddClick: () => void;
}

export function AddListingCard({ canAdd, used, limit, planTier, onAddClick }: AddListingCardProps) {
  if (!canAdd) {
    return (
      <Card className="border-2 border-dashed border-amber-300/50 bg-amber-50/30 dark:bg-amber-950/10">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <Lock className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-semibold text-foreground mb-1">
                Listing Limit Reached
              </h3>
              <p className="text-sm text-muted-foreground">
                {planTier === "free" 
                  ? "Free accounts are limited to 1 listing. Upgrade to Pro for up to 5 listings."
                  : `You've reached the maximum of ${limit} listings on your Pro plan.`
                }
              </p>
            </div>
            {planTier === "free" && (
              <Button asChild className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shrink-0">
                <Link to="/provider/pro-upgrade">
                  <Sparkles className="h-4 w-4" />
                  Upgrade to Pro
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="border-2 border-dashed border-primary/30 hover:border-primary/50 bg-primary/5 hover:bg-primary/10 transition-all duration-200 cursor-pointer group"
      onClick={onAddClick}
    >
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors shrink-0">
            <Plus className="h-7 w-7 text-primary" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
              Add New Listing
            </h3>
            <p className="text-sm text-muted-foreground">
              Create another facility listing ({used} of {limit} used)
            </p>
          </div>
          <Button className="gap-2 shrink-0">
            <Building2 className="h-4 w-4" />
            Add Facility
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
