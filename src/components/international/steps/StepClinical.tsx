import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRIMARY_CONCERN_OPTIONS = [
  { value: "alcohol", label: "Alcohol" },
  { value: "opioids", label: "Opioids / Painkillers" },
  { value: "cocaine", label: "Cocaine / Stimulants" },
  { value: "benzodiazepines", label: "Benzodiazepines" },
  { value: "cannabis", label: "Cannabis" },
  { value: "multiple", label: "Multiple Substances" },
  { value: "mental-health", label: "Mental Health (Primary)" },
  { value: "other", label: "Other" },
];

const CO_OCCURRING_OPTIONS = [
  { value: "anxiety", label: "Anxiety" },
  { value: "depression", label: "Depression" },
  { value: "ptsd", label: "PTSD / Trauma" },
  { value: "bipolar", label: "Bipolar Disorder" },
  { value: "eating-disorder", label: "Eating Disorder" },
  { value: "adhd", label: "ADHD" },
  { value: "none", label: "None / Not Sure" },
];

const PREVIOUS_TREATMENT_OPTIONS = [
  { value: "none", label: "No previous treatment" },
  { value: "once", label: "One prior treatment" },
  { value: "multiple", label: "Multiple treatment attempts" },
];

interface StepClinicalProps {
  data: { 
    primary_concern: string; 
    co_occurring_conditions: string[]; 
    previous_treatment: string;
  };
  onChange: (data: { 
    primary_concern: string; 
    co_occurring_conditions: string[]; 
    previous_treatment: string;
  }) => void;
}

export function StepClinical({ data, onChange }: StepClinicalProps) {
  const toggleCondition = (value: string) => {
    if (value === "none") {
      onChange({ ...data, co_occurring_conditions: ["none"] });
    } else {
      const filtered = data.co_occurring_conditions.filter(c => c !== "none");
      if (filtered.includes(value)) {
        onChange({ ...data, co_occurring_conditions: filtered.filter(c => c !== value) });
      } else {
        onChange({ ...data, co_occurring_conditions: [...filtered, value] });
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5 md:space-y-6"
    >
      <div className="text-center mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-1.5 md:mb-2">
          Clinical Information
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Help us connect you with specialized programs
        </p>
      </div>

      <div className="max-w-lg mx-auto space-y-5 md:space-y-6 px-1">
        {/* Primary Concern - Dropdown */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Primary Concern</Label>
          <Select
            value={data.primary_concern}
            onValueChange={(value) => onChange({ ...data, primary_concern: value })}
          >
            <SelectTrigger className="w-full h-12 text-base">
              <SelectValue placeholder="Select primary concern..." />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {PRIMARY_CONCERN_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="cursor-pointer">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Co-occurring Conditions - Multi-select chips */}
        <div>
          <Label className="text-sm font-medium mb-3 block">
            Co-occurring Conditions <span className="text-muted-foreground font-normal text-xs">(select all that apply)</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {CO_OCCURRING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleCondition(opt.value)}
                className={cn(
                  "px-3 py-2 rounded-full border text-sm font-medium transition-all inline-flex items-center gap-1.5",
                  data.co_occurring_conditions.includes(opt.value)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/50 text-foreground"
                )}
              >
                {data.co_occurring_conditions.includes(opt.value) && (
                  <Check className="h-3.5 w-3.5" />
                )}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Previous Treatment - Dropdown */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Previous Treatment History</Label>
          <Select
            value={data.previous_treatment}
            onValueChange={(value) => onChange({ ...data, previous_treatment: value })}
          >
            <SelectTrigger className="w-full h-12 text-base">
              <SelectValue placeholder="Select treatment history..." />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {PREVIOUS_TREATMENT_OPTIONS.map((opt) => (
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
