import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowRight } from "lucide-react";
import { LeadIntakeFormData, WHO_SEEKING_OPTIONS, URGENCY_OPTIONS } from "./types";

interface StepImmediateNeedProps {
  formData: LeadIntakeFormData;
  updateFormData: (updates: Partial<LeadIntakeFormData>) => void;
  onNext: () => void;
}

export function StepImmediateNeed({ formData, updateFormData, onNext }: StepImmediateNeedProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.whoSeekingHelp) {
      newErrors.whoSeekingHelp = "Please select who is seeking help";
    }
    if (!formData.locationZip || !/^\d{5}$/.test(formData.locationZip)) {
      newErrors.locationZip = "Please enter a valid 5-digit ZIP code";
    }
    // Urgency is optional - don't require it

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
        <h2 className="text-xl md:text-lg font-semibold text-foreground mb-2">
          Let's Get You Started
        </h2>
        <p className="text-base md:text-sm text-muted-foreground">
          Tell us a bit about your situation so we can find the best options for you.
        </p>
      </div>

      {/* Who is seeking help */}
      <div className="space-y-4">
        <Label className="text-base md:text-base font-medium">
          Who is seeking help? <span className="text-destructive">*</span>
        </Label>
        <RadioGroup
          value={formData.whoSeekingHelp}
          onValueChange={(value) => {
            updateFormData({ whoSeekingHelp: value });
            setErrors(prev => ({ ...prev, whoSeekingHelp: "" }));
          }}
          className="grid grid-cols-2 gap-3 md:gap-3"
        >
          {WHO_SEEKING_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-center justify-center px-4 py-4 md:py-3 border-2 rounded-xl cursor-pointer transition-all active:scale-[0.98] ${
                formData.whoSeekingHelp === option.value
                  ? "border-primary bg-primary/5 text-primary shadow-sm"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <RadioGroupItem value={option.value} className="sr-only" />
              <span className="font-medium text-base">{option.label}</span>
            </label>
          ))}
        </RadioGroup>
        {errors.whoSeekingHelp && (
          <p className="text-sm text-destructive">{errors.whoSeekingHelp}</p>
        )}
      </div>

      {/* Location */}
      <div className="space-y-4">
        <Label htmlFor="locationZip" className="text-base font-medium">
          Location <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Input
              id="locationZip"
              placeholder="ZIP Code"
              value={formData.locationZip}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 5);
                updateFormData({ locationZip: value });
                setErrors(prev => ({ ...prev, locationZip: "" }));
              }}
              className={`h-12 md:h-10 text-base ${errors.locationZip ? "border-destructive" : ""}`}
            />
          </div>
          <div>
            <Input
              placeholder="City, State (optional)"
              value={formData.locationCityState}
              onChange={(e) => updateFormData({ locationCityState: e.target.value })}
              className="h-12 md:h-10 text-base"
            />
          </div>
        </div>
        {errors.locationZip && (
          <p className="text-sm text-destructive">{errors.locationZip}</p>
        )}
      </div>

      {/* Urgency */}
      <div className="space-y-4">
        <Label className="text-base font-medium">
          How urgent is the need? <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <RadioGroup
          value={formData.urgency}
          onValueChange={(value) => updateFormData({ urgency: value })}
          className="space-y-3"
        >
          {URGENCY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-center px-4 py-4 md:py-3 border-2 rounded-xl cursor-pointer transition-all active:scale-[0.99] ${
                formData.urgency === option.value
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <RadioGroupItem value={option.value} className="mr-3 h-5 w-5" />
              <span className={`text-base ${formData.urgency === option.value ? "text-primary font-medium" : ""}`}>
                {option.label}
              </span>
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Privacy note */}
      <p className="text-sm text-muted-foreground text-center bg-muted/50 rounded-lg p-3">
        🔒 Your information is confidential and only shared with matching treatment providers.
      </p>

      <div className="pt-4 md:pt-4">
        <Button onClick={handleNext} className="w-full h-14 md:h-12 text-base" size="lg">
          Continue
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
