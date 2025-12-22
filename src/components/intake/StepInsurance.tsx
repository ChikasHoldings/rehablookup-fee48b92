import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, CreditCard, DollarSign } from "lucide-react";
import { 
  LeadIntakeData, 
  INSURANCE_TYPE_OPTIONS, 
  BUDGET_OPTIONS 
} from "./types";
import { cn } from "@/lib/utils";

interface StepInsuranceProps {
  formData: LeadIntakeData;
  updateFormData: (updates: Partial<LeadIntakeData>) => void;
  onNext: () => void;
  onBack: () => void;
}

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

  const showProviderInput = formData.insuranceType && 
    !["self-pay", "not-sure"].includes(formData.insuranceType);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Section: Insurance Type */}
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <CreditCard className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <Label className="text-base font-semibold">
              What type of insurance do you have? <span className="text-destructive">*</span>
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              This helps us find facilities that accept your coverage
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {INSURANCE_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                updateFormData({ insuranceType: option.value });
                setErrors(prev => ({ ...prev, insuranceType: "" }));
                // Clear provider if switching to self-pay or not-sure
                if (["self-pay", "not-sure"].includes(option.value)) {
                  updateFormData({ insuranceProvider: "" });
                }
              }}
              className={cn(
                "relative flex flex-col p-4 rounded-xl border-2 transition-all duration-200 text-left",
                "hover:border-primary/50 hover:bg-primary/5",
                formData.insuranceType === option.value
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border bg-card"
              )}
            >
              <span className="font-semibold text-foreground">{option.label}</span>
              <span className="text-xs text-muted-foreground mt-0.5">{option.description}</span>
              {formData.insuranceType === option.value && (
                <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-primary" />
              )}
            </button>
          ))}
        </div>
        {errors.insuranceType && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {errors.insuranceType}
          </p>
        )}
      </div>

      {/* Section: Insurance Provider (conditional) */}
      {showProviderInput && (
        <div className="space-y-3 animate-in fade-in duration-300">
          <Label className="text-base font-semibold">
            Who is your insurance provider?
          </Label>
          <Input
            type="text"
            placeholder="e.g., Blue Cross Blue Shield, Aetna, United Healthcare..."
            value={formData.insuranceProvider}
            onChange={(e) => updateFormData({ insuranceProvider: e.target.value })}
            className="h-12"
          />
          <p className="text-xs text-muted-foreground">
            Optional but helpful — we can verify coverage before connecting you
          </p>
        </div>
      )}

      {/* Section: Budget Preference */}
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <DollarSign className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <Label className="text-base font-semibold">
              What's your budget preference?
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              This helps us match you with appropriate options
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {BUDGET_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateFormData({ budgetPreference: option.value })}
              className={cn(
                "relative flex flex-col p-4 rounded-xl border-2 transition-all duration-200 text-left",
                "hover:border-primary/50 hover:bg-primary/5",
                formData.budgetPreference === option.value
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border bg-card"
              )}
            >
              <span className="font-semibold text-foreground">{option.label}</span>
              <span className="text-xs text-muted-foreground mt-0.5">{option.description}</span>
              {formData.budgetPreference === option.value && (
                <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-4">
        <Button 
          variant="outline" 
          onClick={onBack} 
          size="lg" 
          className="gap-2"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </Button>
        <Button 
          onClick={handleNext} 
          size="lg" 
          className="flex-1 gap-2 h-12 text-base"
        >
          Continue
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
