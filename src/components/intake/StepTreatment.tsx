import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Brain } from "lucide-react";
import { 
  LeadIntakeData, 
  SUBSTANCE_OPTIONS, 
  LEVEL_OF_CARE_OPTIONS, 
  DUAL_DIAGNOSIS_OPTIONS,
  SPECIAL_NEEDS_OPTIONS 
} from "./types";
import { cn } from "@/lib/utils";

interface StepTreatmentProps {
  formData: LeadIntakeData;
  updateFormData: (updates: Partial<LeadIntakeData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepTreatment({ formData, updateFormData, onNext, onBack }: StepTreatmentProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (formData.primarySubstance.length === 0) {
      newErrors.primarySubstance = "Please select at least one substance";
    }
    if (!formData.levelOfCare) {
      newErrors.levelOfCare = "Please select a level of care";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  const toggleSubstance = (value: string) => {
    const current = formData.primarySubstance;
    const updated = current.includes(value)
      ? current.filter(s => s !== value)
      : [...current, value];
    updateFormData({ primarySubstance: updated });
    setErrors(prev => ({ ...prev, primarySubstance: "" }));
  };

  const toggleSpecialNeed = (value: string) => {
    const current = formData.specialNeeds;
    const updated = current.includes(value)
      ? current.filter(s => s !== value)
      : [...current, value];
    updateFormData({ specialNeeds: updated });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Section: Primary Substance */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">
            What substances are you or your loved one struggling with? <span className="text-destructive">*</span>
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Select all that apply — this helps match you with specialized programs
          </p>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SUBSTANCE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleSubstance(option.value)}
              className={cn(
                "px-3 py-2.5 rounded-lg border text-sm font-medium transition-all duration-200 text-center",
                "hover:border-primary/50 hover:bg-primary/5",
                formData.primarySubstance.includes(option.value)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        {errors.primarySubstance && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {errors.primarySubstance}
          </p>
        )}
      </div>

      {/* Section: Level of Care */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">
            What level of care are you looking for? <span className="text-destructive">*</span>
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Don't worry if you're unsure — we can help guide you
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {LEVEL_OF_CARE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                updateFormData({ levelOfCare: option.value });
                setErrors(prev => ({ ...prev, levelOfCare: "" }));
              }}
              className={cn(
                "relative flex flex-col p-4 rounded-xl border-2 transition-all duration-200 text-left",
                "hover:border-primary/50 hover:bg-primary/5",
                formData.levelOfCare === option.value
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border bg-card"
              )}
            >
              <span className="font-semibold text-foreground">{option.label}</span>
              <span className="text-xs text-muted-foreground mt-0.5">{option.description}</span>
              {formData.levelOfCare === option.value && (
                <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-primary" />
              )}
            </button>
          ))}
        </div>
        {errors.levelOfCare && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {errors.levelOfCare}
          </p>
        )}
      </div>

      {/* Section: Dual Diagnosis */}
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Brain className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <Label className="text-base font-semibold">
              Is there a co-occurring mental health condition?
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Many treatment centers specialize in treating both addiction and mental health
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {DUAL_DIAGNOSIS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateFormData({ dualDiagnosis: option.value })}
              className={cn(
                "px-4 py-3 rounded-lg border-2 font-medium transition-all duration-200",
                "hover:border-primary/50 hover:bg-primary/5",
                formData.dualDiagnosis === option.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section: Special Needs (Optional) */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">
            Any specific needs or preferences?
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Optional — select any that apply to find the best fit
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {SPECIAL_NEEDS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleSpecialNeed(option.value)}
              className={cn(
                "px-3 py-1.5 rounded-full border text-sm font-medium transition-all duration-200",
                "hover:border-primary/50 hover:bg-primary/5",
                formData.specialNeeds.includes(option.value)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground"
              )}
            >
              {option.label}
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
