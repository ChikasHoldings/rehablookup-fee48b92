import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DollarSign, Sparkles, Building2, Crown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      className="space-y-5 md:space-y-6"
    >
      <div className="text-center mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-1.5 md:mb-2">
          Treatment Preferences
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Help us find the perfect fit for your needs
        </p>
      </div>

      <div className="max-w-lg mx-auto space-y-5 md:space-y-6 px-1">
        {/* Budget Range - Dropdown */}
        <div>
          <Label className="text-sm font-medium mb-2 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Budget Range
          </Label>
          <Select
            value={data.budget_range}
            onValueChange={(value) => onChange({ ...data, budget_range: value })}
          >
            <SelectTrigger className="w-full h-12 text-base">
              <SelectValue placeholder="Select budget range..." />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {BUDGET_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="cursor-pointer">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Rehab Style - Keep as cards for rich visual */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Program Style</Label>
          <div className="grid gap-3">
            {REHAB_STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...data, rehab_style: opt.value })}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border text-left transition-all",
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
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground text-sm md:text-base">{opt.label}</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{opt.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Duration - Dropdown */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Preferred Duration</Label>
          <Select
            value={data.treatment_duration}
            onValueChange={(value) => onChange({ ...data, treatment_duration: value })}
          >
            <SelectTrigger className="w-full h-12 text-base">
              <SelectValue placeholder="Select duration..." />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {DURATION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="cursor-pointer">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </motion.div>
  );
}
