import { Check, Globe, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const BENEFITS = [
  "Pre-screened families ready for treatment",
  "Higher conversion from qualified referrals",
  "No upfront costs—pay only on success",
  "Pro subscribers save $200 per placement",
];

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
            Placement Fees
          </h3>
          
          <div className="space-y-4">
            {/* Domestic Placements */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-primary" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Domestic Placements
                </p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                US-based families seeking treatment
              </p>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Standard</span>
                  <span className="text-xl font-bold text-foreground">$1,000</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-emerald-600 dark:text-emerald-400">Pro Member</span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">$800</span>
                </div>
              </div>
            </div>

            {/* International Placements */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-4 w-4 text-primary" />
                <p className="text-xs font-medium text-primary uppercase tracking-wide">
                  International Placements
                </p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Global clients seeking US treatment
              </p>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Flat Fee</span>
                <span className="text-xl font-bold text-primary">$4,500</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Higher-value clients • Longer stays • Private pay
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground pt-4 border-t mt-4">
            Charged only after confirmed admission by both parties
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
