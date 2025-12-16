import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { RequestHelpFormData } from "@/pages/RequestHelp";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface StepTreatmentNeedsProps {
  formData: RequestHelpFormData;
  updateFormData: (updates: Partial<RequestHelpFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const substanceOptions = [
  "Alcohol",
  "Opioids (Heroin, Fentanyl, etc.)",
  "Prescription Drugs",
  "Cocaine/Crack",
  "Methamphetamine",
  "Marijuana",
  "Benzodiazepines",
  "Other",
];

const levelOfCareOptions = [
  { value: "detox", label: "Detox" },
  { value: "inpatient", label: "Inpatient / Residential" },
  { value: "outpatient", label: "Outpatient" },
  { value: "not-sure", label: "Not sure — I need guidance" },
];

export function StepTreatmentNeeds({ formData, updateFormData, onNext, onBack }: StepTreatmentNeedsProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
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

  const toggleSubstance = (substance: string) => {
    const current = formData.primarySubstance || [];
    const updated = current.includes(substance)
      ? current.filter(s => s !== substance)
      : [...current, substance];
    updateFormData({ primarySubstance: updated });
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div>
        <h2 className="text-xl md:text-lg font-semibold text-foreground mb-2">Treatment Needs</h2>
        <p className="text-base md:text-sm text-muted-foreground">Help us understand what type of care is needed.</p>
      </div>

      {/* Primary Substance */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Primary substance(s) of concern <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {substanceOptions.map((substance) => (
            <label
              key={substance}
              className={`flex items-center px-4 py-4 md:py-3 border-2 rounded-xl cursor-pointer transition-all active:scale-[0.98] ${
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
              <span className={`text-base ${formData.primarySubstance.includes(substance) ? "text-primary font-medium" : ""}`}>
                {substance}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Level of Care */}
      <div className="space-y-4">
        <Label className="text-base font-medium">What level of care is needed?</Label>
        <RadioGroup
          value={formData.levelOfCare}
          onValueChange={(value) => {
            updateFormData({ levelOfCare: value });
            setErrors(prev => ({ ...prev, levelOfCare: "" }));
          }}
          className="space-y-3"
        >
          {levelOfCareOptions.map((option) => (
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
        {errors.levelOfCare && (
          <p className="text-sm text-destructive">{errors.levelOfCare}</p>
        )}
      </div>

      {/* Dual Diagnosis */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Is there a mental health concern as well?</Label>
        <RadioGroup
          value={formData.dualDiagnosis}
          onValueChange={(value) => updateFormData({ dualDiagnosis: value })}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "not-sure", label: "Not Sure" },
          ].map((option) => (
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
