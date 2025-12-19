import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  LeadIntakeFormData, 
  SUBSTANCE_OPTIONS, 
  LEVEL_OF_CARE_OPTIONS, 
  DUAL_DIAGNOSIS_OPTIONS,
  INSURANCE_TYPE_OPTIONS,
  BUDGET_OPTIONS,
  SPECIAL_NEEDS_OPTIONS 
} from "./types";

interface StepEligibilityProps {
  formData: LeadIntakeFormData;
  updateFormData: (updates: Partial<LeadIntakeFormData>) => void;
  onNext: () => void;
  onBack: () => void;
  isUrgent?: boolean; // If urgent, show shorter form
}

export function StepEligibility({ formData, updateFormData, onNext, onBack, isUrgent }: StepEligibilityProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    // For urgent users, skip validation - all fields optional
    if (isUrgent) return true;
    
    const newErrors: Record<string, string> = {};
    
    // Insurance is the only semi-required field (helps with matching)
    // But even this is optional to avoid drop-off
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  const toggleSubstance = (substance: string) => {
    const current = formData.primarySubstance || [];
    const updated = current.includes(substance)
      ? current.filter(s => s !== substance)
      : [...current, substance];
    updateFormData({ primarySubstance: updated });
  };

  const toggleSpecialNeed = (need: string) => {
    const current = formData.specialNeeds || [];
    const updated = current.includes(need)
      ? current.filter(n => n !== need)
      : [...current, need];
    updateFormData({ specialNeeds: updated });
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div>
        <h2 className="text-xl md:text-lg font-semibold text-foreground mb-2">
          Help Us Find the Right Fit
        </h2>
        <p className="text-base md:text-sm text-muted-foreground">
          The more we know, the better we can match you. All fields are optional.
        </p>
      </div>

      {/* Level of Care */}
      <div className="space-y-4">
        <Label className="text-base font-medium">
          What level of care might be needed?
        </Label>
        <RadioGroup
          value={formData.levelOfCare}
          onValueChange={(value) => updateFormData({ levelOfCare: value })}
          className="space-y-3"
        >
          {LEVEL_OF_CARE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-center px-4 py-4 md:py-3 border-2 rounded-xl cursor-pointer transition-all active:scale-[0.99] ${
                formData.levelOfCare === option.value
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <RadioGroupItem value={option.value} className="mr-3 h-5 w-5" />
              <span className={`text-base ${formData.levelOfCare === option.value ? "text-primary font-medium" : ""}`}>
                {option.label}
              </span>
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Insurance Type */}
      <div className="space-y-4">
        <Label className="text-base font-medium">
          Insurance or payment preference?
        </Label>
        <RadioGroup
          value={formData.insuranceType}
          onValueChange={(value) => updateFormData({ insuranceType: value })}
          className="space-y-3"
        >
          {INSURANCE_TYPE_OPTIONS.map((option) => (
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
      </div>

      {/* Insurance Provider Name - only show if insurance selected */}
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

      {/* Mental Health (Dual Diagnosis) */}
      <div className="space-y-4">
        <Label className="text-base font-medium">
          Is there also a mental health concern?
        </Label>
        <RadioGroup
          value={formData.dualDiagnosis}
          onValueChange={(value) => updateFormData({ dualDiagnosis: value })}
          className="grid grid-cols-3 gap-3"
        >
          {DUAL_DIAGNOSIS_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-center justify-center px-3 py-4 md:py-3 border-2 rounded-xl cursor-pointer transition-all active:scale-[0.98] ${
                formData.dualDiagnosis === option.value
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

      {/* Collapsible Advanced Options */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between text-muted-foreground hover:text-foreground"
          >
            <span>More options (substance, budget, special needs)</span>
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-6 pt-4">
          {/* Primary Substance */}
          <div className="space-y-4">
            <Label className="text-base font-medium">
              Primary substance(s) of concern
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SUBSTANCE_OPTIONS.map((substance) => (
                <label
                  key={substance}
                  className={`flex items-center px-4 py-3 border-2 rounded-xl cursor-pointer transition-all active:scale-[0.98] ${
                    formData.primarySubstance.includes(substance)
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Checkbox
                    checked={formData.primarySubstance.includes(substance)}
                    onCheckedChange={() => toggleSubstance(substance)}
                    className="mr-3 h-5 w-5"
                  />
                  <span className={`text-sm ${formData.primarySubstance.includes(substance) ? "text-primary font-medium" : ""}`}>
                    {substance}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Budget Preference */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Budget preference</Label>
            <RadioGroup
              value={formData.budgetPreference}
              onValueChange={(value) => updateFormData({ budgetPreference: value })}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              {BUDGET_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center justify-center px-4 py-3 border-2 rounded-xl cursor-pointer transition-all active:scale-[0.98] text-center ${
                    formData.budgetPreference === option.value
                      ? "border-primary bg-primary/5 text-primary shadow-sm"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value={option.value} className="sr-only" />
                  <span className="font-medium text-sm">{option.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Special Needs */}
          <div className="space-y-4">
            <Label className="text-base font-medium">
              Any special requirements?
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SPECIAL_NEEDS_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center px-4 py-3 border-2 rounded-xl cursor-pointer transition-all active:scale-[0.98] ${
                    formData.specialNeeds.includes(option.value)
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Checkbox
                    checked={formData.specialNeeds.includes(option.value)}
                    onCheckedChange={() => toggleSpecialNeed(option.value)}
                    className="mr-3 h-5 w-5"
                  />
                  <span className={`text-sm ${formData.specialNeeds.includes(option.value) ? "text-primary font-medium" : ""}`}>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

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
