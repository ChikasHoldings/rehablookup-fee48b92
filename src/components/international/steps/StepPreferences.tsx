import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DollarSign, Sparkles, Building2, Crown } from "lucide-react";

const BUDGET_OPTIONS = [
  { value: "under-25k", label: "Under $25,000/month" },
  { value: "25k-50k", label: "$25,000 - $50,000/month" },
  { value: "50k-100k", label: "$50,000 - $100,000/month" },
  { value: "over-100k", label: "$100,000+/month" },
  { value: "flexible", label: "Flexible / Need Guidance" },
];

const REHAB_STYLE_OPTIONS = [
  { 
    value: "standard", 
    label: "Standard Clinical", 
    icon: Building2,
    description: "Focus on quality treatment over amenities" 
  },
  { 
    value: "luxury", 
    label: "Luxury Residential", 
    icon: Sparkles,
    description: "Upscale amenities, private rooms, premium service" 
  },
  { 
    value: "executive", 
    label: "Executive / VIP", 
    icon: Crown,
    description: "Maximum privacy, business-friendly, concierge service" 
  },
];

const DURATION_OPTIONS = [
  { value: "30-days", label: "30 days" },
  { value: "60-days", label: "60 days" },
  { value: "90-days", label: "90 days" },
  { value: "6-months", label: "6+ months" },
  { value: "flexible", label: "Flexible" },
];

interface StepPreferencesProps {
  data: { 
    budget_range: string; 
    rehab_style: string;
    treatment_duration: string;
  };
  onChange: (data: { 
    budget_range: string; 
    rehab_style: string;
    treatment_duration: string;
  }) => void;
}

export function StepPreferences({ data, onChange }: StepPreferencesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          Treatment Preferences
        </h2>
        <p className="text-muted-foreground">
          Help us find the perfect fit for your needs
        </p>
      </div>

      <div className="max-w-lg mx-auto space-y-6">
        {/* Budget Range */}
        <div>
          <Label className="text-sm font-medium mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Budget Range
          </Label>
          <div className="grid gap-2">
            {BUDGET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...data, budget_range: opt.value })}
                className={cn(
                  "px-4 py-3 rounded-lg border text-sm font-medium transition-all text-left",
                  data.budget_range === opt.value
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rehab Style */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Program Style</Label>
          <div className="grid gap-3">
            {REHAB_STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...data, rehab_style: opt.value })}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-lg border text-left transition-all",
                  data.rehab_style === opt.value
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  data.rehab_style === opt.value ? "bg-primary/10" : "bg-muted"
                )}>
                  <opt.icon className={cn(
                    "h-5 w-5",
                    data.rehab_style === opt.value ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <p className="font-medium text-foreground">{opt.label}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{opt.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Preferred Duration</Label>
          <div className="flex flex-wrap gap-2">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...data, treatment_duration: opt.value })}
                className={cn(
                  "px-4 py-2.5 rounded-full border text-sm font-medium transition-all",
                  data.treatment_duration === opt.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/50 text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
