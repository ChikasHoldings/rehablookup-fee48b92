import { Check, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BENEFITS = [
  "Receive matched inquiries from our placement team",
  "Families pre-screened for treatment readiness",
  "Higher conversion rates from qualified referrals",
  "Commission or flat fee arrangements",
  "No upfront cost—pay only on successful placement",
  "Pro subscribers save 20% on every placement fee",
];

export function PlacementBenefits() {
  return (
    <Card className="mb-8 border border-border/60">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          Network Benefits
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {BENEFITS.map((benefit, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="h-3 w-3 text-emerald-600" />
              </div>
              <span className="text-sm text-muted-foreground">{benefit}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
