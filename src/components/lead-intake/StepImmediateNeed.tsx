import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, User, Users, MapPin, Loader2, CheckCircle2, Calendar, UserCircle } from "lucide-react";
import { 
  LeadIntakeFormData, 
  URGENCY_OPTIONS, 
  AGE_RANGE_OPTIONS, 
  GENDER_OPTIONS,
  RELATIONSHIP_OPTIONS 
} from "./types";
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
    if (formData.whoSeekingHelp === "loved-one" && !formData.relationshipToPatient) {
      newErrors.relationshipToPatient = "Please select your relationship";
    }
    if (!formData.locationZip || !/^\d{5}$/.test(formData.locationZip)) {
      newErrors.locationZip = "Please enter a valid 5-digit ZIP code";
    }
    if (!formData.ageRange) {
      newErrors.ageRange = "Please select an age range";
    }
    if (!formData.gender) {
      newErrors.gender = "Please select a gender";
    }
    if (!formData.urgency) {
      newErrors.urgency = "Please select urgency level";
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

  // Auto-set relationship when "self" is selected
  useEffect(() => {
    if (formData.whoSeekingHelp === "self" && formData.relationshipToPatient !== "self") {
      updateFormData({ relationshipToPatient: "self" });
    }
  }, [formData.whoSeekingHelp, formData.relationshipToPatient, updateFormData]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Section Header */}
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-foreground">Tell us about your situation</h2>
        <p className="text-sm text-muted-foreground mt-1">This helps us find the best treatment options for you.</p>
      </div>

      {/* Who is seeking help - compact cards */}
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
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
            className={cn(
              "relative flex items-center gap-3 px-4 py-4 border-2 rounded-xl cursor-pointer transition-all duration-200",
              formData.whoSeekingHelp === "self"
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            )}
          >
            <RadioGroupItem value="self" className="sr-only" />
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
              formData.whoSeekingHelp === "self" 
                ? "bg-primary text-primary-foreground shadow-md" 
                : "bg-muted text-muted-foreground"
            )}>
              <User className="w-5 h-5" />
            </div>
            <div>
              <span className={cn(
                "font-semibold text-sm block",
                formData.whoSeekingHelp === "self" ? "text-primary" : "text-foreground"
              )}>
                Myself
              </span>
              <span className="text-xs text-muted-foreground">I need help</span>
            </div>
          </label>
          <label
            className={cn(
              "relative flex items-center gap-3 px-4 py-4 border-2 rounded-xl cursor-pointer transition-all duration-200",
              formData.whoSeekingHelp === "loved-one"
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            )}
          >
            <RadioGroupItem value="loved-one" className="sr-only" />
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
              formData.whoSeekingHelp === "loved-one" 
                ? "bg-primary text-primary-foreground shadow-md" 
                : "bg-muted text-muted-foreground"
            )}>
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className={cn(
                "font-semibold text-sm block",
                formData.whoSeekingHelp === "loved-one" ? "text-primary" : "text-foreground"
              )}>
                A Loved One
              </span>
              <span className="text-xs text-muted-foreground">Helping someone else</span>
            </div>
          </label>
        </RadioGroup>
        {errors.whoSeekingHelp && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <span className="h-1 w-1 rounded-full bg-destructive" />
            {errors.whoSeekingHelp}
          </p>
        )}
      </div>

      {/* Relationship to Patient - Show only when helping loved one */}
      {formData.whoSeekingHelp === "loved-one" && (
        <div className="space-y-3 animate-fade-in">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Your relationship to the patient <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.relationshipToPatient}
            onValueChange={(value) => {
              updateFormData({ relationshipToPatient: value });
              setErrors(prev => ({ ...prev, relationshipToPatient: "" }));
            }}
          >
            <SelectTrigger className={cn("h-12 text-sm", errors.relationshipToPatient && "border-destructive")}>
              <SelectValue placeholder="Select relationship" />
            </SelectTrigger>
            <SelectContent>
              {RELATIONSHIP_OPTIONS.filter(o => o.value !== "self").map((option) => (
                <SelectItem key={option.value} value={option.value} className="py-3">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.relationshipToPatient && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-destructive" />
              {errors.relationshipToPatient}
            </p>
          )}
        </div>
      )}

      {/* Location Input - Streamlined */}
      <div className="space-y-3">
        <Label htmlFor="locationZip" className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Your Location <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-2 relative">
            <Input
              id="locationZip"
              placeholder="ZIP Code"
              value={formData.locationZip}
              onChange={(e) => handleZipcodeChange(e.target.value)}
              className={cn(
                "h-12 text-sm pr-10 transition-all duration-200 font-medium",
                errors.locationZip || lookupError 
                  ? "border-destructive focus-visible:ring-destructive" 
                  : hasAutoFilled 
                    ? "border-green-400 bg-green-50/50"
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
                <MapPin className="h-4 w-4 text-muted-foreground/40" />
              )}
            </div>
          </div>
          <div className="col-span-3">
            <Input
              placeholder={isLookingUp ? "Detecting..." : "City, State"}
              value={formData.locationCityState}
              onChange={(e) => {
                updateFormData({ locationCityState: e.target.value });
                setHasAutoFilled(false);
              }}
              className={cn(
                "h-12 text-sm transition-all duration-200",
                hasAutoFilled && "bg-green-50/50 border-green-400"
              )}
              disabled={isLookingUp}
            />
          </div>
        </div>
        {errors.locationZip && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <span className="h-1 w-1 rounded-full bg-destructive" />
            {errors.locationZip}
          </p>
        )}
        {lookupError && !errors.locationZip && (
          <p className="text-xs text-amber-600">Could not auto-detect. Please enter manually.</p>
        )}
        {hasAutoFilled && !lookupError && (
          <p className="text-xs text-green-600 flex items-center gap-1.5 animate-fade-in">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Location detected
          </p>
        )}
      </div>

      {/* Age Range & Gender - Side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Patient's Age Range <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.ageRange}
            onValueChange={(value) => updateFormData({ ageRange: value })}
          >
            <SelectTrigger className="h-12 text-sm">
              <SelectValue placeholder="Select age range" />
            </SelectTrigger>
            <SelectContent>
              {AGE_RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="py-3">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <UserCircle className="h-4 w-4 text-primary" />
            Patient's Gender <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.gender}
            onValueChange={(value) => updateFormData({ gender: value })}
          >
            <SelectTrigger className="h-12 text-sm">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              {GENDER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="py-3">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Urgency - Enhanced */}
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-primary" />
          How urgent is the need? <span className="text-destructive">*</span>
        </Label>
        <Select
          value={formData.urgency}
          onValueChange={(value) => {
            updateFormData({ urgency: value });
            setErrors(prev => ({ ...prev, urgency: "" }));
          }}
        >
          <SelectTrigger className={cn("h-12 text-sm", errors.urgency && "border-destructive")}>
            <SelectValue placeholder="Select urgency level" />
          </SelectTrigger>
          <SelectContent>
            {URGENCY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value} className="py-3">
                <span className="flex items-center gap-2">
                  {option.value === "immediate" && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                  {option.value === "within-week" && <span className="h-2 w-2 rounded-full bg-amber-500" />}
                  {option.value === "flexible" && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                  {option.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.urgency && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <span className="h-1 w-1 rounded-full bg-destructive" />
            {errors.urgency}
          </p>
        )}
      </div>

      <Button onClick={handleNext} className="w-full h-14 text-base font-semibold rounded-xl shadow-sm" size="lg">
        Continue
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );
}