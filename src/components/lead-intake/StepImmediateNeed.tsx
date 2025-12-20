import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, User, Users, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { LeadIntakeFormData, URGENCY_OPTIONS } from "./types";
import { useZipcodeLookup } from "@/hooks/useZipcodeLookup";
import { cn } from "@/lib/utils";

interface StepImmediateNeedProps {
  formData: LeadIntakeFormData;
  updateFormData: (updates: Partial<LeadIntakeFormData>) => void;
  onNext: () => void;
}

export function StepImmediateNeed({ formData, updateFormData, onNext }: StepImmediateNeedProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { data: zipcodeData, isLoading: isLookingUp, error: lookupError, lookup } = useZipcodeLookup();
  const [hasAutoFilled, setHasAutoFilled] = useState(false);
  const [lookupTimeout, setLookupTimeout] = useState<NodeJS.Timeout | null>(null);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.whoSeekingHelp) {
      newErrors.whoSeekingHelp = "Please select who is seeking help";
    }
    if (!formData.locationZip || !/^\d{5}$/.test(formData.locationZip)) {
      newErrors.locationZip = "Please enter a valid 5-digit ZIP code";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  // Handle zipcode change with debounced lookup
  const handleZipcodeChange = useCallback((value: string) => {
    const cleanValue = value.replace(/\D/g, "").slice(0, 5);
    updateFormData({ locationZip: cleanValue });
    setErrors(prev => ({ ...prev, locationZip: "" }));
    setHasAutoFilled(false);

    // Clear previous timeout
    if (lookupTimeout) {
      clearTimeout(lookupTimeout);
    }

    // Trigger lookup when 5 digits entered
    if (cleanValue.length === 5) {
      const timeout = setTimeout(() => {
        lookup(cleanValue);
      }, 300);
      setLookupTimeout(timeout);
    }
  }, [updateFormData, lookup, lookupTimeout]);

  // Auto-fill city/state when zipcode data is available
  useEffect(() => {
    if (zipcodeData && !hasAutoFilled) {
      updateFormData({ 
        locationCityState: `${zipcodeData.city}, ${zipcodeData.stateAbbr}` 
      });
      setHasAutoFilled(true);
    }
  }, [zipcodeData, hasAutoFilled, updateFormData]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (lookupTimeout) {
        clearTimeout(lookupTimeout);
      }
    };
  }, [lookupTimeout]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Who is seeking help - compact cards */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Who is seeking help? <span className="text-destructive">*</span>
        </Label>
        <RadioGroup
          value={formData.whoSeekingHelp}
          onValueChange={(value) => {
            updateFormData({ whoSeekingHelp: value });
            setErrors(prev => ({ ...prev, whoSeekingHelp: "" }));
          }}
          className="grid grid-cols-2 gap-3"
        >
          <label
            className={`relative flex items-center gap-3 px-4 py-3 border rounded-xl cursor-pointer transition-all duration-200 ${
              formData.whoSeekingHelp === "self"
                ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            <RadioGroupItem value="self" className="sr-only" />
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
              formData.whoSeekingHelp === "self" 
                ? "bg-primary text-primary-foreground shadow-md" 
                : "bg-muted text-muted-foreground"
            }`}>
              <User className="w-4 h-4" />
            </div>
            <span className={`font-medium text-sm ${formData.whoSeekingHelp === "self" ? "text-primary" : ""}`}>
              Myself
            </span>
          </label>
          <label
            className={`relative flex items-center gap-3 px-4 py-3 border rounded-xl cursor-pointer transition-all duration-200 ${
              formData.whoSeekingHelp === "loved-one"
                ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            <RadioGroupItem value="loved-one" className="sr-only" />
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
              formData.whoSeekingHelp === "loved-one" 
                ? "bg-primary text-primary-foreground shadow-md" 
                : "bg-muted text-muted-foreground"
            }`}>
              <Users className="w-4 h-4" />
            </div>
            <span className={`font-medium text-sm ${formData.whoSeekingHelp === "loved-one" ? "text-primary" : ""}`}>
              A Loved One
            </span>
          </label>
        </RadioGroup>
        {errors.whoSeekingHelp && (
          <p className="text-xs text-destructive">{errors.whoSeekingHelp}</p>
        )}
      </div>

      {/* Enhanced Location Input */}
      <div className="space-y-2">
        <Label htmlFor="locationZip" className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          Your Location <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <Input
              id="locationZip"
              placeholder="ZIP Code"
              value={formData.locationZip}
              onChange={(e) => handleZipcodeChange(e.target.value)}
              className={cn(
                "h-11 text-sm pr-10 transition-all duration-200",
                errors.locationZip || lookupError 
                  ? "border-destructive focus-visible:ring-destructive" 
                  : hasAutoFilled 
                    ? "border-green-300 focus-visible:ring-green-300"
                    : ""
              )}
              inputMode="numeric"
              maxLength={5}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isLookingUp ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : hasAutoFilled ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <MapPin className="h-4 w-4 text-muted-foreground/50" />
              )}
            </div>
          </div>
          <Input
            placeholder={isLookingUp ? "Detecting..." : "City, State"}
            value={formData.locationCityState}
            onChange={(e) => {
              updateFormData({ locationCityState: e.target.value });
              setHasAutoFilled(false);
            }}
            className={cn(
              "h-11 text-sm transition-all duration-200",
              hasAutoFilled && "bg-green-50/50 border-green-200 dark:bg-green-950/20"
            )}
            disabled={isLookingUp}
          />
        </div>
        {errors.locationZip && (
          <p className="text-xs text-destructive">{errors.locationZip}</p>
        )}
        {lookupError && !errors.locationZip && (
          <p className="text-xs text-amber-600">Could not auto-detect location. Please enter manually.</p>
        )}
        {hasAutoFilled && !lookupError && (
          <p className="text-xs text-green-600 flex items-center gap-1 animate-fade-in">
            <CheckCircle2 className="h-3 w-3" />
            Location detected automatically
          </p>
        )}
      </div>

      {/* Urgency - enhanced dropdown */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          How urgent is the need?
        </Label>
        <Select
          value={formData.urgency}
          onValueChange={(value) => updateFormData({ urgency: value })}
        >
          <SelectTrigger className="h-11 text-sm">
            <SelectValue placeholder="Select urgency level" />
          </SelectTrigger>
          <SelectContent>
            {URGENCY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value} className="py-2.5">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleNext} className="w-full h-12 text-sm font-medium rounded-xl" size="lg">
        Continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
