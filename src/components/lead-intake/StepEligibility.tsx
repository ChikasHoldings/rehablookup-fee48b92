import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Shield, Scale, Heart, Briefcase, Target } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { 
  LeadIntakeFormData, 
  SUBSTANCE_OPTIONS, 
  LEVEL_OF_CARE_OPTIONS, 
  DUAL_DIAGNOSIS_OPTIONS,
  INSURANCE_TYPE_OPTIONS,
  BUDGET_OPTIONS,
  SPECIAL_NEEDS_OPTIONS,
  PREVIOUS_TREATMENT_OPTIONS,
  READINESS_OPTIONS,
  VETERAN_STATUS_OPTIONS,
  LEGAL_OPTIONS,
  CO_OCCURRING_OPTIONS,
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
    if (!formData.levelOfCare) {
      newErrors.levelOfCare = "Please select a level of care";
    }
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

  const toggleCoOccurring = (condition: string) => {
    const current = formData.coOccurringConditions || [];
    const updated = current.includes(condition)
      ? current.filter(c => c !== condition)
      : [...current, condition];
    updateFormData({ coOccurringConditions: updated });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Section Header */}
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-foreground">Treatment Preferences</h2>
        <p className="text-sm text-muted-foreground mt-1">
          All fields are optional but help us find the right match.
        </p>
      </div>

      {/* Primary Fields - Always Visible */}
      <div className="space-y-5">
        {/* Level of Care */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">What level of care are you looking for?</Label>
          <Select
            value={formData.levelOfCare}
            onValueChange={(value) => updateFormData({ levelOfCare: value })}
          >
            <SelectTrigger className="h-12 text-sm">
              <SelectValue placeholder="Select level of care" />
            </SelectTrigger>
            <SelectContent>
              {LEVEL_OF_CARE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="py-2.5">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Insurance - Two columns on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Payment method</Label>
            <Select
              value={formData.insuranceType}
              onValueChange={(value) => updateFormData({ insuranceType: value })}
            >
              <SelectTrigger className="h-12 text-sm">
                <SelectValue placeholder="Select payment type" />
              </SelectTrigger>
              <SelectContent>
                {INSURANCE_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="py-2.5">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Insurance Provider - Conditional */}
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
                className="h-12 text-sm"
              />
            </div>
          )}
        </div>

        {/* Readiness Level - NEW */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Readiness to start treatment
          </Label>
          <Select
            value={formData.readinessLevel}
            onValueChange={(value) => updateFormData({ readinessLevel: value })}
          >
            <SelectTrigger className="h-12 text-sm">
              <SelectValue placeholder="How ready are you/they to start?" />
            </SelectTrigger>
            <SelectContent>
              {READINESS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="py-2.5">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mental Health - Inline Pills */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Do you also need mental health support?</Label>
          <RadioGroup
            value={formData.dualDiagnosis}
            onValueChange={(value) => updateFormData({ dualDiagnosis: value })}
            className="flex gap-2"
          >
            {DUAL_DIAGNOSIS_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex-1 flex items-center justify-center px-4 py-3 border-2 rounded-xl cursor-pointer transition-all text-sm font-medium",
                  formData.dualDiagnosis === option.value
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value={option.value} className="sr-only" />
                {option.label}
              </label>
            ))}
          </RadioGroup>
        </div>

        {/* Co-Occurring Conditions - Show when yes or not-sure */}
        {(formData.dualDiagnosis === "yes" || formData.dualDiagnosis === "not-sure") && (
          <div className="space-y-3 animate-fade-in p-4 bg-muted/30 rounded-xl border">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              Which mental health conditions apply?
            </Label>
            <div className="flex flex-wrap gap-2">
              {CO_OCCURRING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleCoOccurring(option.value)}
                  className={cn(
                    "px-3 py-2 border-2 rounded-lg cursor-pointer transition-all text-xs font-medium",
                    formData.coOccurringConditions?.includes(option.value)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 text-foreground"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Previous Treatment - NEW */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Previous treatment history
          </Label>
          <Select
            value={formData.previousTreatment}
            onValueChange={(value) => updateFormData({ previousTreatment: value })}
          >
            <SelectTrigger className="h-12 text-sm">
              <SelectValue placeholder="Any prior treatment experience?" />
            </SelectTrigger>
            <SelectContent>
              {PREVIOUS_TREATMENT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="py-2.5">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Previous Treatment Details - Show when there's history */}
        {formData.previousTreatment && formData.previousTreatment !== "none" && (
          <div className="space-y-2 animate-fade-in">
            <Label htmlFor="previousTreatmentDetails" className="text-sm font-medium">
              Any details about previous treatment? <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea
              id="previousTreatmentDetails"
              placeholder="e.g., Type of program, what worked or didn't work..."
              value={formData.previousTreatmentDetails}
              onChange={(e) => updateFormData({ previousTreatmentDetails: e.target.value })}
              className="min-h-[80px] text-sm resize-none"
              maxLength={500}
            />
          </div>
        )}
      </div>

      {/* Collapsible Advanced Options */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="w-full justify-between text-sm font-medium text-foreground border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 h-11 px-4"
          >
            <span className="flex items-center gap-2">
              <span className="text-primary font-bold">{showAdvanced ? "−" : "+"}</span>
              Additional preferences
            </span>
            {showAdvanced ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-primary" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-5 pt-4">
          {/* Primary Substance - Pill Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">What substance(s) are you seeking help for?</Label>
            <div className="flex flex-wrap gap-2">
              {SUBSTANCE_OPTIONS.map((substance) => (
                <button
                  key={substance}
                  type="button"
                  onClick={() => toggleSubstance(substance)}
                  className={cn(
                    "px-3 py-2 border-2 rounded-lg cursor-pointer transition-all text-xs font-medium",
                    formData.primarySubstance.includes(substance)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 text-foreground"
                  )}
                >
                  {substance}
                </button>
              ))}
            </div>
          </div>

          {/* Legal Involvement - NEW */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              Legal or court involvement
            </Label>
            <Select
              value={formData.legalInvolvement}
              onValueChange={(value) => updateFormData({ legalInvolvement: value })}
            >
              <SelectTrigger className="h-12 text-sm">
                <SelectValue placeholder="Any legal requirements?" />
              </SelectTrigger>
              <SelectContent>
                {LEGAL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="py-2.5">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Veteran Status - NEW */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Military/Veteran status
            </Label>
            <Select
              value={formData.veteranStatus}
              onValueChange={(value) => updateFormData({ veteranStatus: value })}
            >
              <SelectTrigger className="h-12 text-sm">
                <SelectValue placeholder="Select if applicable" />
              </SelectTrigger>
              <SelectContent>
                {VETERAN_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="py-2.5">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Budget */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Budget preference</Label>
            <Select
              value={formData.budgetPreference}
              onValueChange={(value) => updateFormData({ budgetPreference: value })}
            >
              <SelectTrigger className="h-12 text-sm">
                <SelectValue placeholder="Select budget preference" />
              </SelectTrigger>
              <SelectContent>
                {BUDGET_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="py-2.5">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Special Needs - Pill Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Any special requirements?</Label>
            <div className="flex flex-wrap gap-2">
              {SPECIAL_NEEDS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleSpecialNeed(option.value)}
                  className={cn(
                    "px-3 py-2 border-2 rounded-lg cursor-pointer transition-all text-xs font-medium",
                    formData.specialNeeds.includes(option.value)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 text-foreground"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="flex-1 h-14 text-base font-semibold rounded-xl" size="lg">
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back
        </Button>
        <Button onClick={handleNext} className="flex-1 h-14 text-base font-semibold rounded-xl shadow-sm" size="lg">
          Continue
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}