import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

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
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          Clinical Information
        </h2>
        <p className="text-muted-foreground">
          Help us match you with specialized programs
        </p>
      </div>

      <div className="max-w-lg mx-auto space-y-6">
        {/* Primary Concern */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Primary Concern</Label>
          <div className="flex flex-wrap gap-2">
            {PRIMARY_CONCERN_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...data, primary_concern: opt.value })}
                className={cn(
                  "px-3 py-2 rounded-full border text-sm font-medium transition-all",
                  data.primary_concern === opt.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/50 text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Co-occurring Conditions */}
        <div>
          <Label className="text-sm font-medium mb-3 block">
            Co-occurring Conditions <span className="text-muted-foreground font-normal">(select all that apply)</span>
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

        {/* Previous Treatment */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Previous Treatment History</Label>
          <div className="grid gap-2">
            {PREVIOUS_TREATMENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...data, previous_treatment: opt.value })}
                className={cn(
                  "px-4 py-3 rounded-lg border text-sm font-medium transition-all text-left",
                  data.previous_treatment === opt.value
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
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
