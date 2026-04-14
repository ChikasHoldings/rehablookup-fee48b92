import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, CreditCard } from "lucide-react";
import type { ConciergeIntakeData } from "@/pages/concierge/ConciergeIntake";

const PAYMENT_TYPES = [
  { value: "insurance", label: "Insurance" },
  { value: "self-pay", label: "Self-Pay / Private Pay" },
  { value: "both", label: "Insurance + Self-Pay" },
  { value: "unsure", label: "Not sure yet" },
];

const BUDGET_RANGES = [
  { value: "under_10k", label: "Under $10,000" },
  { value: "10k_25k", label: "$10,000 - $25,000" },
  { value: "25k_50k", label: "$25,000 - $50,000" },
  { value: "50k_100k", label: "$50,000 - $100,000" },
  { value: "over_100k", label: "Over $100,000" },
  { value: "flexible", label: "Flexible / Need guidance" },
];

interface Props {
  data: ConciergeIntakeData;
  errors: Record<string, string>;
  onChange: (updates: Partial<ConciergeIntakeData>) => void;
}

export function StepPaymentInfo({ data, errors, onChange }: Props) {
  const showInsurance = data.paymentType === "insurance" || data.paymentType === "both";
  const showSelfPay = data.paymentType === "self-pay" || data.paymentType === "both";

  return (
    <div className="space-y-5">
      {/* Payment Type */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          How will you pay? <span className="text-destructive">*</span>
        </Label>
        <Select value={data.paymentType} onValueChange={(v) => onChange({ paymentType: v })}>
          <SelectTrigger className={`h-11 ${errors.paymentType ? "border-destructive ring-1 ring-destructive" : ""}`}>
            <SelectValue placeholder="Select payment method" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {PAYMENT_TYPES.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.paymentType && <p className="text-xs text-destructive">{errors.paymentType}</p>}
      </div>

      {/* Insurance Details */}
      {showInsurance && (
        <div className="space-y-4 p-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-medium">Insurance Information</span>
          </div>
          
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Insurance Carrier <span className="text-destructive">*</span>
              </Label>
              <Input
                value={data.insuranceCarrier}
                onChange={(e) => onChange({ insuranceCarrier: e.target.value.replace(/<[^>]*>/g, "").slice(0, 100) })}
                placeholder="Blue Cross, Aetna, etc."
                maxLength={100}
                className={`h-11 ${errors.insuranceCarrier ? "border-destructive ring-1 ring-destructive" : ""}`}
              />
              {errors.insuranceCarrier && <p className="text-xs text-destructive">{errors.insuranceCarrier}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Employer</Label>
              <Input
                value={data.employerName || ""}
                onChange={(e) => onChange({ employerName: e.target.value.replace(/<[^>]*>/g, "").slice(0, 100) })}
                placeholder="If employer-sponsored"
                maxLength={100}
                className="h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Member ID</Label>
              <Input
                value={data.insuranceMemberId || ""}
                onChange={(e) => onChange({ insuranceMemberId: e.target.value.replace(/<[^>]*>/g, "").slice(0, 50) })}
                placeholder="From card"
                maxLength={50}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Group #</Label>
              <Input
                value={data.insuranceGroupNumber || ""}
                onChange={(e) => onChange({ insuranceGroupNumber: e.target.value.replace(/<[^>]*>/g, "").slice(0, 50) })}
                placeholder="From card"
                maxLength={50}
                className="h-11"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer pt-1">
            <Checkbox
              checked={data.benefitsVerified || false}
              onCheckedChange={(checked) => onChange({ benefitsVerified: !!checked })}
            />
            <span className="text-sm">I've verified benefits cover substance abuse</span>
          </label>
        </div>
      )}

      {/* Self-Pay Budget */}
      {showSelfPay && (
        <div className="space-y-4 p-4 rounded-lg bg-green-50/50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
            <CreditCard className="h-4 w-4" />
            <span className="text-sm font-medium">Self-Pay Budget</span>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Budget Range <span className="text-destructive">*</span>
            </Label>
            <Select value={data.budgetRange} onValueChange={(v) => onChange({ budgetRange: v })}>
              <SelectTrigger className={`h-11 ${errors.budgetRange ? "border-destructive ring-1 ring-destructive" : ""}`}>
                <SelectValue placeholder="Select budget" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {BUDGET_RANGES.map((b) => (
                  <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.budgetRange && <p className="text-xs text-destructive">{errors.budgetRange}</p>}
            <p className="text-xs text-muted-foreground">For entire stay (30-90 days)</p>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <Checkbox
              checked={data.scholarshipInterest || false}
              onCheckedChange={(checked) => onChange({ scholarshipInterest: !!checked })}
            />
            <span className="text-sm">Interested in financial assistance</span>
          </label>
        </div>
      )}

      {/* Travel Preference */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Willing to travel out of state?</Label>
        <Select 
          value={data.willingToTravel ? "yes" : "no"} 
          onValueChange={(v) => onChange({ willingToTravel: v === "yes" })}
        >
          <SelectTrigger className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="yes">Yes, open to traveling</SelectItem>
            <SelectItem value="no">Prefer to stay local</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Info Note */}
      <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">💡 About Costs</p>
        <p>Treatment costs vary widely. We'll provide detailed pricing for each matched facility before any commitments.</p>
      </div>
    </div>
  );
}
