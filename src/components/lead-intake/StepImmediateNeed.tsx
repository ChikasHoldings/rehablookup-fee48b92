import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, User, Users } from "lucide-react";
import { LeadIntakeFormData, URGENCY_OPTIONS } from "./types";

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

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
            className={`relative flex items-center gap-3 px-4 py-3 border rounded-lg cursor-pointer transition-all ${
              formData.whoSeekingHelp === "self"
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border hover:border-primary/50"
            }`}
          >
            <RadioGroupItem value="self" className="sr-only" />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              formData.whoSeekingHelp === "self" 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            }`}>
              <User className="w-4 h-4" />
            </div>
            <span className={`font-medium text-sm ${formData.whoSeekingHelp === "self" ? "text-primary" : ""}`}>
              Myself
            </span>
          </label>
          <label
            className={`relative flex items-center gap-3 px-4 py-3 border rounded-lg cursor-pointer transition-all ${
              formData.whoSeekingHelp === "loved-one"
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border hover:border-primary/50"
            }`}
          >
            <RadioGroupItem value="loved-one" className="sr-only" />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              formData.whoSeekingHelp === "loved-one" 
                ? "bg-primary text-primary-foreground" 
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

      {/* Location - inline */}
      <div className="space-y-2">
        <Label htmlFor="locationZip" className="text-sm font-medium">
          Your ZIP Code <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="locationZip"
            placeholder="ZIP Code"
            value={formData.locationZip}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(0, 5);
              updateFormData({ locationZip: value });
              setErrors(prev => ({ ...prev, locationZip: "" }));
            }}
            className={`h-10 text-sm ${errors.locationZip ? "border-destructive" : ""}`}
          />
          <Input
            placeholder="City, State (optional)"
            value={formData.locationCityState}
            onChange={(e) => updateFormData({ locationCityState: e.target.value })}
            className="h-10 text-sm"
          />
        </div>
        {errors.locationZip && (
          <p className="text-xs text-destructive">{errors.locationZip}</p>
        )}
      </div>

      {/* Urgency - dropdown */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          How urgent is the need?
        </Label>
        <Select
          value={formData.urgency}
          onValueChange={(value) => updateFormData({ urgency: value })}
        >
          <SelectTrigger className="h-10 text-sm">
            <SelectValue placeholder="Select urgency level" />
          </SelectTrigger>
          <SelectContent>
            {URGENCY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleNext} className="w-full h-11 text-sm" size="lg">
        Continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
