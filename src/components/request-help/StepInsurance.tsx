import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RequestHelpFormData } from "@/pages/RequestHelp";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface StepInsuranceProps {
  formData: RequestHelpFormData;
  updateFormData: (updates: Partial<RequestHelpFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const insuranceOptions = [
  { value: "ppo", label: "PPO / Private Insurance" },
  { value: "medicaid", label: "Medicaid" },
  { value: "medicare", label: "Medicare" },
  { value: "self-pay", label: "Self-Pay / No Insurance" },
  { value: "not-sure", label: "Not sure" },
];

const budgetOptions = [
  { value: "low", label: "Budget-conscious" },
  { value: "medium", label: "Moderate" },
  { value: "flexible", label: "Flexible / Cost not a concern" },
];

export function StepInsurance({ formData, updateFormData, onNext, onBack }: StepInsuranceProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.insuranceType) {
      newErrors.insuranceType = "Please select an insurance type";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div>
        <h2 className="text-xl md:text-lg font-semibold text-foreground mb-2">Insurance & Budget</h2>
        <p className="text-base md:text-sm text-muted-foreground">This helps us find facilities that work with your coverage.</p>
      </div>

      {/* Insurance Type */}
      <div className="space-y-4">
        <Label className="text-base font-medium">What type of insurance do you have?</Label>
        <RadioGroup
          value={formData.insuranceType}
          onValueChange={(value) => {
            updateFormData({ insuranceType: value });
            setErrors(prev => ({ ...prev, insuranceType: "" }));
          }}
          className="space-y-3"
        >
          {insuranceOptions.map((option) => (
            <label
              key={option.value}
              className={`flex items-center px-4 py-4 md:py-3 border-2 rounded-xl cursor-pointer transition-all active:scale-[0.99] ${
                formData.insuranceType === option.value
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <RadioGroupItem value={option.value} className="mr-3 h-5 w-5" />
              <span className={`text-base ${formData.insuranceType === option.value ? "text-primary font-medium" : ""}`}>
                {option.label}
              </span>
            </label>
          ))}
        </RadioGroup>
        {errors.insuranceType && (
          <p className="text-sm text-destructive">{errors.insuranceType}</p>
        )}
      </div>

      {/* Insurance Provider Name */}
      {formData.insuranceType && formData.insuranceType !== "self-pay" && formData.insuranceType !== "not-sure" && (
        <div className="space-y-4">
          <Label htmlFor="insuranceProvider" className="text-base font-medium">
            Insurance provider name <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="insuranceProvider"
            placeholder="e.g., Blue Cross Blue Shield, Aetna"
            value={formData.insuranceProvider}
            onChange={(e) => updateFormData({ insuranceProvider: e.target.value })}
            className="h-12 md:h-10 text-base"
          />
        </div>
      )}

      {/* Budget Preference */}
      <div className="space-y-4">
        <Label className="text-base font-medium">
          Budget preference <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <RadioGroup
          value={formData.budgetPreference}
          onValueChange={(value) => updateFormData({ budgetPreference: value })}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {budgetOptions.map((option) => (
            <label
              key={option.value}
              className={`flex items-center justify-center px-4 py-4 md:py-3 border-2 rounded-xl cursor-pointer transition-all active:scale-[0.98] text-center ${
                formData.budgetPreference === option.value
                  ? "border-primary bg-primary/5 text-primary shadow-sm"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <RadioGroupItem value={option.value} className="sr-only" />
              <span className="font-medium text-base">{option.label}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="flex gap-3 pt-4 md:pt-4">
        <Button variant="outline" onClick={onBack} className="flex-1 h-14 md:h-12 text-base" size="lg">
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back
        </Button>
        <Button onClick={handleNext} className="flex-1 h-14 md:h-12 text-base" size="lg">
          Continue
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
