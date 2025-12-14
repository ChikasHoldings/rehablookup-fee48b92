import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RequestHelpFormData } from "@/pages/RequestHelp";
import { ArrowRight } from "lucide-react";

interface StepWhoNeedsHelpProps {
  formData: RequestHelpFormData;
  updateFormData: (updates: Partial<RequestHelpFormData>) => void;
  onNext: () => void;
}

export function StepWhoNeedsHelp({ formData, updateFormData, onNext }: StepWhoNeedsHelpProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.whoSeekingHelp) {
      newErrors.whoSeekingHelp = "Please select who is seeking help";
    }
    if (!formData.locationZip || !/^\d{5}$/.test(formData.locationZip)) {
      newErrors.locationZip = "Please enter a valid 5-digit ZIP code";
    }
    if (!formData.urgency) {
      newErrors.urgency = "Please select the urgency level";
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
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Who Needs Help?</h2>
        <p className="text-sm text-muted-foreground">Tell us a bit about the situation so we can find the best options.</p>
      </div>

      {/* Who is seeking help */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Who is seeking help?</Label>
        <RadioGroup
          value={formData.whoSeekingHelp}
          onValueChange={(value) => {
            updateFormData({ whoSeekingHelp: value });
            setErrors(prev => ({ ...prev, whoSeekingHelp: "" }));
          }}
          className="grid grid-cols-2 gap-3"
        >
          <label
            className={`flex items-center justify-center px-4 py-3 border rounded-lg cursor-pointer transition-colors ${
              formData.whoSeekingHelp === "self"
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-primary/50"
            }`}
          >
            <RadioGroupItem value="self" className="sr-only" />
            <span className="font-medium">Myself</span>
          </label>
          <label
            className={`flex items-center justify-center px-4 py-3 border rounded-lg cursor-pointer transition-colors ${
              formData.whoSeekingHelp === "loved-one"
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-primary/50"
            }`}
          >
            <RadioGroupItem value="loved-one" className="sr-only" />
            <span className="font-medium">A Loved One</span>
          </label>
        </RadioGroup>
        {errors.whoSeekingHelp && (
          <p className="text-sm text-destructive">{errors.whoSeekingHelp}</p>
        )}
      </div>

      {/* Location */}
      <div className="space-y-3">
        <Label htmlFor="locationZip" className="text-base font-medium">Location</Label>
        <div className="grid grid-cols-2 gap-3">
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
              className={errors.locationZip ? "border-destructive" : ""}
            />
          </div>
          <div>
            <Input
              placeholder="City, State (optional)"
              value={formData.locationCityState}
              onChange={(e) => updateFormData({ locationCityState: e.target.value })}
            />
          </div>
        </div>
        {errors.locationZip && (
          <p className="text-sm text-destructive">{errors.locationZip}</p>
        )}
      </div>

      {/* Urgency */}
      <div className="space-y-3">
        <Label className="text-base font-medium">How urgent is the need?</Label>
        <RadioGroup
          value={formData.urgency}
          onValueChange={(value) => {
            updateFormData({ urgency: value });
            setErrors(prev => ({ ...prev, urgency: "" }));
          }}
          className="space-y-2"
        >
          {[
            { value: "immediate", label: "Immediate — I need help today" },
            { value: "within-week", label: "Within a week" },
            { value: "flexible", label: "Flexible — just exploring options" },
          ].map((option) => (
            <label
              key={option.value}
              className={`flex items-center px-4 py-3 border rounded-lg cursor-pointer transition-colors ${
                formData.urgency === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <RadioGroupItem value={option.value} className="mr-3" />
              <span className={formData.urgency === option.value ? "text-primary font-medium" : ""}>
                {option.label}
              </span>
            </label>
          ))}
        </RadioGroup>
        {errors.urgency && (
          <p className="text-sm text-destructive">{errors.urgency}</p>
        )}
      </div>

      <div className="pt-4">
        <Button onClick={handleNext} className="w-full" size="lg">
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
