import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowRight, User, Users, Zap, Calendar, Search, MapPin, Shield } from "lucide-react";
import { LeadIntakeFormData, WHO_SEEKING_OPTIONS, URGENCY_OPTIONS } from "./types";

interface StepImmediateNeedProps {
  formData: LeadIntakeFormData;
  updateFormData: (updates: Partial<LeadIntakeFormData>) => void;
  onNext: () => void;
}

const URGENCY_ICONS: Record<string, React.ReactNode> = {
  "immediate": <Zap className="w-5 h-5" />,
  "within-week": <Calendar className="w-5 h-5" />,
  "flexible": <Search className="w-5 h-5" />,
};

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Let's Get You Started
        </h2>
        <p className="text-muted-foreground">
          Tell us a bit about your situation so we can find the best options for you.
        </p>
      </div>

      {/* Who is seeking help */}
      <div className="space-y-4">
        <Label className="text-base font-medium">
          Who is seeking help? <span className="text-destructive">*</span>
        </Label>
        <RadioGroup
          value={formData.whoSeekingHelp}
          onValueChange={(value) => {
            updateFormData({ whoSeekingHelp: value });
            setErrors(prev => ({ ...prev, whoSeekingHelp: "" }));
          }}
          className="grid grid-cols-2 gap-4"
        >
          <label
            className={`relative flex flex-col items-center justify-center gap-3 px-4 py-6 border-2 rounded-2xl cursor-pointer transition-all hover:shadow-md ${
              formData.whoSeekingHelp === "self"
                ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                : "border-border hover:border-primary/50 bg-card"
            }`}
          >
            <RadioGroupItem value="self" className="sr-only" />
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              formData.whoSeekingHelp === "self" 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            }`}>
              <User className="w-6 h-6" />
            </div>
            <span className={`font-medium text-base ${formData.whoSeekingHelp === "self" ? "text-primary" : ""}`}>
              Myself
            </span>
          </label>
          <label
            className={`relative flex flex-col items-center justify-center gap-3 px-4 py-6 border-2 rounded-2xl cursor-pointer transition-all hover:shadow-md ${
              formData.whoSeekingHelp === "loved-one"
                ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                : "border-border hover:border-primary/50 bg-card"
            }`}
          >
            <RadioGroupItem value="loved-one" className="sr-only" />
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              formData.whoSeekingHelp === "loved-one" 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            }`}>
              <Users className="w-6 h-6" />
            </div>
            <span className={`font-medium text-base ${formData.whoSeekingHelp === "loved-one" ? "text-primary" : ""}`}>
              A Loved One
            </span>
          </label>
        </RadioGroup>
        {errors.whoSeekingHelp && (
          <p className="text-sm text-destructive">{errors.whoSeekingHelp}</p>
        )}
      </div>

      {/* Location */}
      <div className="space-y-4">
        <Label htmlFor="locationZip" className="text-base font-medium flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
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
              className={`h-12 text-base rounded-xl ${errors.locationZip ? "border-destructive" : ""}`}
            />
          </div>
          <div>
            <Input
              placeholder="City, State (optional)"
              value={formData.locationCityState}
              onChange={(e) => updateFormData({ locationCityState: e.target.value })}
              className="h-12 text-base rounded-xl"
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
          How urgent is the need? <span className="text-muted-foreground font-normal text-sm">(optional)</span>
        </Label>
        <RadioGroup
          value={formData.urgency}
          onValueChange={(value) => updateFormData({ urgency: value })}
          className="space-y-3"
        >
          {URGENCY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-center gap-4 px-4 py-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-sm ${
                formData.urgency === option.value
                  ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                  : "border-border hover:border-primary/50 bg-card"
              }`}
            >
              <RadioGroupItem value={option.value} className="sr-only" />
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                formData.urgency === option.value 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              }`}>
                {URGENCY_ICONS[option.value]}
              </div>
              <span className={`text-base ${formData.urgency === option.value ? "text-primary font-medium" : ""}`}>
                {option.label}
              </span>
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Privacy note */}
      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl border border-border/50">
        <Shield className="w-5 h-5 text-primary shrink-0" />
        <p className="text-sm text-muted-foreground">
          Your information is confidential and only shared with matching treatment providers.
        </p>
      </div>

      <Button onClick={handleNext} className="w-full h-14 text-base rounded-xl" size="lg">
        Continue
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );
}
