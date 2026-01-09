import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { HelpCircle, CreditCard, Shield, Building } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ConciergeIntakeData } from "@/pages/concierge/ConciergeIntake";

const PAYMENT_TYPES = [
  { value: "insurance", label: "Insurance", icon: Shield, desc: "Use health insurance coverage" },
  { value: "self-pay", label: "Self-Pay / Private Pay", icon: CreditCard, desc: "Pay out of pocket" },
  { value: "both", label: "Insurance + Self-Pay", icon: Building, desc: "Combination of both" },
  { value: "unsure", label: "Not sure yet", icon: HelpCircle, desc: "Need help understanding options" },
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
    <TooltipProvider>
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground border-l-4 border-primary/30 pl-4 py-2 bg-muted/30 rounded-r-lg">
          Understanding your payment options helps us match you with programs that accept your insurance or fit within your budget.
        </p>

        {/* Payment Type */}
        <div className="space-y-3">
          <Label className="text-base font-medium">How do you plan to pay for treatment? *</Label>
          <RadioGroup
            value={data.paymentType}
            onValueChange={(v) => onChange({ paymentType: v })}
            className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${errors.paymentType ? "p-2 border border-destructive rounded-lg" : ""}`}
          >
            {PAYMENT_TYPES.map((p) => {
              const Icon = p.icon;
              return (
                <div 
                  key={p.value} 
                  className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                    data.paymentType === p.value 
                      ? "bg-primary/5 border-primary ring-1 ring-primary" 
                      : "hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem value={p.value} id={p.value} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <Label htmlFor={p.value} className="font-medium cursor-pointer">{p.label}</Label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
                  </div>
                </div>
              );
            })}
          </RadioGroup>
          {errors.paymentType && <p className="text-sm text-destructive">{errors.paymentType}</p>}
        </div>

        {/* Insurance Details */}
        {showInsurance && (
          <div className="space-y-4 p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <Label className="text-base font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Insurance Information
            </Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="insuranceCarrier">Insurance Carrier *</Label>
                <Input
                  id="insuranceCarrier"
                  value={data.insuranceCarrier}
                  onChange={(e) => onChange({ insuranceCarrier: e.target.value })}
                  placeholder="e.g., Blue Cross, Aetna, UnitedHealthcare"
                  className={errors.insuranceCarrier ? "border-destructive ring-1 ring-destructive" : ""}
                />
                {errors.insuranceCarrier && <p className="text-sm text-destructive">{errors.insuranceCarrier}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="employerName">Employer Name <span className="text-xs text-muted-foreground">(if employer-sponsored)</span></Label>
                <Input
                  id="employerName"
                  value={data.employerName || ""}
                  onChange={(e) => onChange({ employerName: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="insuranceMemberId" className="flex items-center gap-2">
                  Member ID
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Found on your insurance card. Helps with benefits verification.</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="insuranceMemberId"
                  value={data.insuranceMemberId || ""}
                  onChange={(e) => onChange({ insuranceMemberId: e.target.value })}
                  placeholder="Optional - from your insurance card"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="insuranceGroupNumber">Group Number</Label>
                <Input
                  id="insuranceGroupNumber"
                  value={data.insuranceGroupNumber || ""}
                  onChange={(e) => onChange({ insuranceGroupNumber: e.target.value })}
                  placeholder="Optional - from your insurance card"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <Checkbox
                id="benefits-verified"
                checked={data.benefitsVerified || false}
                onCheckedChange={(checked) => onChange({ benefitsVerified: !!checked })}
              />
              <Label htmlFor="benefits-verified" className="font-normal cursor-pointer text-sm">
                I've already verified my benefits cover substance abuse treatment
              </Label>
            </div>
          </div>
        )}

        {/* Self-Pay Budget */}
        {showSelfPay && (
          <div className="space-y-4 p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <Label className="text-base font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Self-Pay Budget
            </Label>
            
            <div className="space-y-2">
              <Label>Budget Range *</Label>
              <Select value={data.budgetRange} onValueChange={(v) => onChange({ budgetRange: v })}>
                <SelectTrigger className={errors.budgetRange ? "border-destructive ring-1 ring-destructive" : ""}>
                  <SelectValue placeholder="Select your budget range" />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_RANGES.map((b) => (
                    <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.budgetRange && <p className="text-sm text-destructive">{errors.budgetRange}</p>}
              <p className="text-xs text-muted-foreground">This is for the entire treatment stay, typically 30-90 days</p>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="scholarship"
                checked={data.scholarshipInterest || false}
                onCheckedChange={(checked) => onChange({ scholarshipInterest: !!checked })}
              />
              <Label htmlFor="scholarship" className="font-normal cursor-pointer text-sm">
                Interested in scholarship or financial assistance options
              </Label>
            </div>
          </div>
        )}

        {/* Willing to Travel */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            Willing to travel out of state for treatment?
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Traveling for treatment can provide privacy and a fresh environment for recovery.</p>
              </TooltipContent>
            </Tooltip>
          </Label>
          <RadioGroup
            value={data.willingToTravel ? "yes" : "no"}
            onValueChange={(v) => onChange({ willingToTravel: v === "yes" })}
            className="grid grid-cols-2 gap-3"
          >
            <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
              data.willingToTravel ? "bg-primary/5 border-primary" : "hover:bg-muted/50"
            }`}>
              <RadioGroupItem value="yes" id="travel-yes" />
              <Label htmlFor="travel-yes" className="font-normal cursor-pointer">Yes, open to traveling</Label>
            </div>
            <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
              !data.willingToTravel ? "bg-primary/5 border-primary" : "hover:bg-muted/50"
            }`}>
              <RadioGroupItem value="no" id="travel-no" />
              <Label htmlFor="travel-no" className="font-normal cursor-pointer">Prefer to stay local</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Cost Transparency Note */}
        <div className="p-4 bg-muted/30 rounded-lg text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">💡 About Treatment Costs</p>
          <p>Treatment costs vary widely based on location, amenities, and length of stay. We'll provide detailed cost information for each matched facility before any commitments are made.</p>
        </div>
      </div>
    </TooltipProvider>
  );
}
