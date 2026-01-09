import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { ConciergeIntakeData } from "@/pages/concierge/ConciergeIntake";

const PAYMENT_TYPES = [
  { value: "insurance", label: "Insurance" },
  { value: "self-pay", label: "Self-Pay" },
  { value: "both", label: "Insurance + Self-Pay" },
  { value: "unsure", label: "Not sure yet" },
];

const BUDGET_RANGES = [
  { value: "under_10k", label: "Under $10,000" },
  { value: "10k_25k", label: "$10,000 - $25,000" },
  { value: "25k_50k", label: "$25,000 - $50,000" },
  { value: "50k_100k", label: "$50,000 - $100,000" },
  { value: "over_100k", label: "Over $100,000" },
  { value: "flexible", label: "Flexible/Need guidance" },
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
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>How do you plan to pay for treatment? *</Label>
        <RadioGroup
          value={data.paymentType}
          onValueChange={(v) => onChange({ paymentType: v })}
          className={errors.paymentType ? "border border-destructive rounded-md p-2" : ""}
        >
          {PAYMENT_TYPES.map((p) => (
            <div key={p.value} className="flex items-center space-x-2">
              <RadioGroupItem value={p.value} id={p.value} />
              <Label htmlFor={p.value} className="font-normal">{p.label}</Label>
            </div>
          ))}
        </RadioGroup>
        {errors.paymentType && <p className="text-sm text-destructive">{errors.paymentType}</p>}
      </div>

      {showInsurance && (
        <div className="space-y-2">
          <Label htmlFor="insuranceCarrier">Insurance carrier *</Label>
          <Input
            id="insuranceCarrier"
            value={data.insuranceCarrier}
            onChange={(e) => onChange({ insuranceCarrier: e.target.value })}
            placeholder="e.g., Blue Cross, Aetna, UnitedHealthcare"
            className={errors.insuranceCarrier ? "border-destructive" : ""}
          />
          {errors.insuranceCarrier && <p className="text-sm text-destructive">{errors.insuranceCarrier}</p>}
        </div>
      )}

      {showSelfPay && (
        <div className="space-y-2">
          <Label>Budget range *</Label>
          <Select value={data.budgetRange} onValueChange={(v) => onChange({ budgetRange: v })}>
            <SelectTrigger className={errors.budgetRange ? "border-destructive" : ""}>
              <SelectValue placeholder="Select budget range" />
            </SelectTrigger>
            <SelectContent>
              {BUDGET_RANGES.map((b) => (
                <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.budgetRange && <p className="text-sm text-destructive">{errors.budgetRange}</p>}
        </div>
      )}

      <div className="space-y-3">
        <Label>Willing to travel out of state for treatment?</Label>
        <RadioGroup
          value={data.willingToTravel ? "yes" : "no"}
          onValueChange={(v) => onChange({ willingToTravel: v === "yes" })}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="travel-yes" />
            <Label htmlFor="travel-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="travel-no" />
            <Label htmlFor="travel-no" className="font-normal">No, prefer to stay local</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}
