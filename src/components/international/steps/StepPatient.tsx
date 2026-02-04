import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SEEKING_OPTIONS = [
  { value: "self", label: "For Myself", icon: User, description: "I'm looking for treatment for myself" },
  { value: "loved-one", label: "For Someone Else", icon: Users, description: "I'm helping a family member or friend" },
];

const AGE_RANGE_OPTIONS = [
  { value: "18-25", label: "18-25 years" },
  { value: "26-35", label: "26-35 years" },
  { value: "36-45", label: "36-45 years" },
  { value: "46-55", label: "46-55 years" },
  { value: "56+", label: "56+ years" },
];

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non-binary", label: "Non-binary" },
  { value: "prefer-not-say", label: "Prefer not to say" },
];

interface StepPatientProps {
  data: { seeking_for: string; age_range: string; gender: string };
  onChange: (data: { seeking_for: string; age_range: string; gender: string }) => void;
}

export function StepPatient({ data, onChange }: StepPatientProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5 md:space-y-6"
    >
      <div className="text-center mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-1.5 md:mb-2">
          Tell us about the patient
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">
          This helps us find the right programs
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-5 md:space-y-6 px-1">
        {/* Who needs help - Keep as cards for visual distinction */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Who needs treatment?</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SEEKING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...data, seeking_for: opt.value })}
                className={cn(
                  "p-4 rounded-lg border text-left transition-all",
                  data.seeking_for === opt.value
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                )}
              >
                <opt.icon className={cn(
                  "h-5 w-5 mb-2",
                  data.seeking_for === opt.value ? "text-primary" : "text-muted-foreground"
                )} />
                <p className="font-medium text-foreground text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Age Range - Dropdown */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Age Range</Label>
          <Select
            value={data.age_range}
            onValueChange={(value) => onChange({ ...data, age_range: value })}
          >
            <SelectTrigger className="w-full h-12 text-base">
              <SelectValue placeholder="Select age range..." />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {AGE_RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="cursor-pointer">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Gender - Dropdown */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Gender</Label>
          <Select
            value={data.gender}
            onValueChange={(value) => onChange({ ...data, gender: value })}
          >
            <SelectTrigger className="w-full h-12 text-base">
              <SelectValue placeholder="Select gender..." />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {GENDER_OPTIONS.map((opt) => (
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
