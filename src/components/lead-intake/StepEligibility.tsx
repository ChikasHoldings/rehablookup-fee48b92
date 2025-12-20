import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  isUrgent?: boolean;
}

export function StepEligibility({ formData, updateFormData, onNext, onBack, isUrgent }: StepEligibilityProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    if (isUrgent) return true;
    const newErrors: Record<string, string> = {};
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
    <div className="space-y-5 animate-fade-in">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">
          Help Us Find the Right Fit
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          All fields are optional but help us match you better.
        </p>
      </div>

      {/* Level of Care - Dropdown */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Level of care needed</Label>
        <Select
          value={formData.levelOfCare}
          onValueChange={(value) => updateFormData({ levelOfCare: value })}
        >
          <SelectTrigger className="h-10 text-sm">
            <SelectValue placeholder="Select level of care" />
          </SelectTrigger>
          <SelectContent>
            {LEVEL_OF_CARE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Insurance Type - Dropdown */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Insurance or payment</Label>
        <Select
          value={formData.insuranceType}
          onValueChange={(value) => updateFormData({ insuranceType: value })}
        >
          <SelectTrigger className="h-10 text-sm">
            <SelectValue placeholder="Select payment type" />
          </SelectTrigger>
          <SelectContent>
            {INSURANCE_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Insurance Provider Name */}
      {formData.insuranceType && formData.insuranceType !== "self-pay" && formData.insuranceType !== "not-sure" && (
        <div className="space-y-2">
          <Label htmlFor="insuranceProvider" className="text-sm font-medium">
            Insurance provider <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Input
            id="insuranceProvider"
            placeholder="e.g., Blue Cross, Aetna"
            value={formData.insuranceProvider}
            onChange={(e) => updateFormData({ insuranceProvider: e.target.value })}
            className="h-10 text-sm"
          />
        </div>
      )}

      {/* Mental Health - Compact inline options */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Mental health concern?</Label>
        <RadioGroup
          value={formData.dualDiagnosis}
          onValueChange={(value) => updateFormData({ dualDiagnosis: value })}
          className="flex gap-2"
        >
          {DUAL_DIAGNOSIS_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex-1 flex items-center justify-center px-3 py-2 border rounded-lg cursor-pointer transition-all text-sm ${
                formData.dualDiagnosis === option.value
                  ? "border-primary bg-primary/5 text-primary font-medium"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <RadioGroupItem value={option.value} className="sr-only" />
              {option.label}
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Collapsible Advanced Options */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="w-full justify-between text-sm font-medium text-foreground border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 h-10 px-4"
          >
            <span className="flex items-center gap-2">
              <span className="text-primary">+</span>
              More options (substance, budget, special needs)
            </span>
            {showAdvanced ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-primary" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-3">
          {/* Primary Substance - Compact checkboxes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Primary substance(s)</Label>
            <div className="grid grid-cols-2 gap-2">
              {SUBSTANCE_OPTIONS.map((substance) => (
                <label
                  key={substance}
                  className={`flex items-center px-3 py-2 border rounded-lg cursor-pointer transition-all text-xs ${
                    formData.primarySubstance.includes(substance)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Checkbox
                    checked={formData.primarySubstance.includes(substance)}
                    onCheckedChange={() => toggleSubstance(substance)}
                    className="mr-2 h-4 w-4"
                  />
                  <span className={formData.primarySubstance.includes(substance) ? "text-primary font-medium" : ""}>
                    {substance}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Budget - Dropdown */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Budget preference</Label>
            <Select
              value={formData.budgetPreference}
              onValueChange={(value) => updateFormData({ budgetPreference: value })}
            >
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Select budget" />
              </SelectTrigger>
              <SelectContent>
                {BUDGET_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Special Needs - Compact */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Special requirements</Label>
            <div className="grid grid-cols-2 gap-2">
              {SPECIAL_NEEDS_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center px-3 py-2 border rounded-lg cursor-pointer transition-all text-xs ${
                    formData.specialNeeds.includes(option.value)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Checkbox
                    checked={formData.specialNeeds.includes(option.value)}
                    onCheckedChange={() => toggleSpecialNeed(option.value)}
                    className="mr-2 h-4 w-4"
                  />
                  <span className={formData.specialNeeds.includes(option.value) ? "text-primary font-medium" : ""}>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="flex-1 h-11 text-sm" size="lg">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleNext} className="flex-1 h-11 text-sm" size="lg">
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
