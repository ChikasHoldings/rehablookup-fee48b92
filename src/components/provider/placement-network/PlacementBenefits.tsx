import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const BENEFITS = [
  "Pre-screened families ready for treatment",
  "Higher conversion from qualified referrals",
  "No upfront costs—pay only on success",
  "Pro subscribers save $200 per placement",
];

const FEE_STRUCTURE = {
  flat: { standard: "$1,000", pro: "$800" },
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
            Placement Fee
          </h3>
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Flat Fee Per Placement
            </p>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Standard</span>
                <span className="text-xl font-bold text-foreground">{FEE_STRUCTURE.flat.standard}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-emerald-600 dark:text-emerald-400">Pro Member</span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {FEE_STRUCTURE.flat.pro}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-3 border-t mt-3">
              Charged only after confirmed admission by both parties
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
