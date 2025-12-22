import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, MapPin, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { LeadIntakeData, WHO_SEEKING_OPTIONS, URGENCY_OPTIONS } from "./types";
import { useZipcodeLookup } from "@/hooks/useZipcodeLookup";
import { cn } from "@/lib/utils";

interface StepSituationProps {
  formData: LeadIntakeData;
  updateFormData: (updates: Partial<LeadIntakeData>) => void;
  onNext: () => void;
}

export function StepSituation({ formData, updateFormData, onNext }: StepSituationProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { data: zipcodeData, isLoading: isLookingUp, lookup } = useZipcodeLookup();
  const [hasAutoFilled, setHasAutoFilled] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.whoSeekingHelp) {
      newErrors.whoSeekingHelp = "Please select who is seeking help";
    }
    if (!formData.locationZip || !/^\d{5}$/.test(formData.locationZip)) {
      newErrors.locationZip = "Please enter a valid 5-digit ZIP code";
    }
    if (!formData.urgency) {
      newErrors.urgency = "Please select how soon you need help";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  const handleZipcodeChange = useCallback((value: string) => {
    const cleanValue = value.replace(/\D/g, "").slice(0, 5);
    updateFormData({ locationZip: cleanValue });
    setErrors(prev => ({ ...prev, locationZip: "" }));
    setHasAutoFilled(false);

    if (cleanValue.length === 5) {
      lookup(cleanValue);
    }
  }, [updateFormData, lookup]);

  useEffect(() => {
    if (zipcodeData && !hasAutoFilled) {
      updateFormData({ 
        locationCityState: `${zipcodeData.city}, ${zipcodeData.stateAbbr}` 
      });
      setHasAutoFilled(true);
    }
  }, [zipcodeData, hasAutoFilled, updateFormData]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Section: Who is seeking help */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">
            Who is seeking treatment? <span className="text-destructive">*</span>
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            This helps us personalize your experience
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {WHO_SEEKING_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                updateFormData({ whoSeekingHelp: option.value });
                setErrors(prev => ({ ...prev, whoSeekingHelp: "" }));
              }}
              className={cn(
                "relative flex flex-col items-center p-5 rounded-xl border-2 transition-all duration-200",
                "hover:border-primary/50 hover:bg-primary/5",
                formData.whoSeekingHelp === option.value
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border bg-card"
              )}
            >
              <span className="text-3xl mb-2">{option.emoji}</span>
              <span className="font-semibold text-foreground">{option.label}</span>
              <span className="text-xs text-muted-foreground mt-1 text-center">{option.description}</span>
              {formData.whoSeekingHelp === option.value && (
                <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-primary" />
              )}
            </button>
          ))}
        </div>
        {errors.whoSeekingHelp && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {errors.whoSeekingHelp}
          </p>
        )}
      </div>

      {/* Section: Location */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">
            Where are you located? <span className="text-destructive">*</span>
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            We'll find treatment options near you
          </p>
        </div>
        
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Enter ZIP code"
            value={formData.locationZip}
            onChange={(e) => handleZipcodeChange(e.target.value)}
            className={cn(
              "pl-10 pr-10 h-12 text-lg",
              errors.locationZip && "border-destructive"
            )}
          />
          {isLookingUp && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground animate-spin" />
          )}
          {formData.locationCityState && !isLookingUp && (
            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
          )}
        </div>
        
        {formData.locationCityState && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {formData.locationCityState}
          </p>
        )}
        
        {errors.locationZip && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {errors.locationZip}
          </p>
        )}
      </div>

      {/* Section: Urgency */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">
            How soon do you need help? <span className="text-destructive">*</span>
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            This helps us prioritize your request
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          {URGENCY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                updateFormData({ urgency: option.value });
                setErrors(prev => ({ ...prev, urgency: "" }));
              }}
              className={cn(
                "relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left",
                "hover:border-primary/50 hover:bg-primary/5",
                formData.urgency === option.value
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border bg-card"
              )}
            >
              <span className="text-2xl">{option.emoji}</span>
              <div className="flex-1">
                <span className="font-semibold text-foreground block">{option.label}</span>
                <span className="text-sm text-muted-foreground">{option.description}</span>
              </div>
              {formData.urgency === option.value && (
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
        {errors.urgency && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {errors.urgency}
          </p>
        )}
      </div>

      {/* Navigation */}
      <div className="pt-4">
        <Button 
          onClick={handleNext} 
          size="lg" 
          className="w-full gap-2 h-12 text-base"
        >
          Continue
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
