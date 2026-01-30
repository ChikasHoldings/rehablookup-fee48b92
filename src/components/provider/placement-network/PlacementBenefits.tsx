import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const BENEFITS = [
  "Pre-screened families ready for treatment",
  "Higher conversion from qualified referrals",
  "No upfront costs—pay only on success",
  "Pro subscribers save 20% on fees",
];

const FEE_STRUCTURE = {
  flat: { standard: "$1,200", pro: "$960" },
  commission: { standard: "8%", pro: "6.4%", cap: "$1,500" },
};

export function PlacementBenefits() {
  return (
    <div className="mb-8 space-y-4">
      {/* Benefits List */}
      <Card className="border-border">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Network Benefits
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {BENEFITS.map((benefit, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm text-foreground">{benefit}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Fee Structure */}
      <Card className="border-border">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Fee Structure
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Flat Fee */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Flat Fee Option
              </p>
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Standard</span>
                  <span className="font-semibold text-foreground">{FEE_STRUCTURE.flat.standard}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-emerald-600 dark:text-emerald-400">Pro Member</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {FEE_STRUCTURE.flat.pro}
                  </span>
                </div>
              </div>
            </div>

            {/* Commission */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Commission Option
              </p>
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Standard</span>
                  <span className="font-semibold text-foreground">{FEE_STRUCTURE.commission.standard}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-emerald-600 dark:text-emerald-400">Pro Member</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {FEE_STRUCTURE.commission.pro}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Capped at {FEE_STRUCTURE.commission.cap} per placement
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
