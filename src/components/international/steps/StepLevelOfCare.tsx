import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  Hospital, 
  Building2, 
  Clock, 
  CalendarDays, 
  Home,
  HelpCircle 
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LEVEL_OF_CARE_OPTIONS = [
  { 
    value: "detox", 
    label: "Medical Detox", 
    icon: Hospital,
    description: "Medically supervised withdrawal management" 
  },
  { 
    value: "inpatient", 
    label: "Inpatient / Residential", 
    icon: Building2,
    description: "24/7 care in a treatment facility" 
  },
  { 
    value: "php", 
    label: "Partial Hospitalization (PHP)", 
    icon: Clock,
    description: "Intensive day program, 5-7 days/week" 
  },
  { 
    value: "iop", 
    label: "Intensive Outpatient (IOP)", 
    icon: CalendarDays,
    description: "Structured program, 3-5 days/week" 
  },
  { 
    value: "sober-living", 
    label: "Sober Living / Extended Care", 
    icon: Home,
    description: "Structured living environment for long-term recovery" 
  },
  { 
    value: "not-sure", 
    label: "Not Sure — I Need Guidance", 
    icon: HelpCircle,
    description: "Our advisors will help determine the right level" 
  },
];

interface StepLevelOfCareProps {
  data: { level_of_care: string };
  onChange: (data: { level_of_care: string }) => void;
}

export function StepLevelOfCare({ data, onChange }: StepLevelOfCareProps) {
  const selectedOption = LEVEL_OF_CARE_OPTIONS.find(opt => opt.value === data.level_of_care);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5 md:space-y-6"
    >
      <div className="text-center mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-1.5 md:mb-2">
          What level of care is needed?
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Select the treatment intensity that fits your situation
        </p>
      </div>

      <div className="max-w-lg mx-auto px-1">
        {/* Mobile: Dropdown | Desktop: Cards */}
        <div className="block md:hidden">
          <Label className="text-sm font-medium mb-2 block">Level of Care</Label>
          <Select
            value={data.level_of_care}
            onValueChange={(value) => onChange({ level_of_care: value })}
          >
            <SelectTrigger className="w-full h-12 text-base">
              <SelectValue placeholder="Select level of care..." />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {LEVEL_OF_CARE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="cursor-pointer">
                  <div className="flex flex-col py-1">
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Selected option description */}
          {selectedOption && (
            <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2">
                <selectedOption.icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{selectedOption.label}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{selectedOption.description}</p>
            </div>
          )}
        </div>

        {/* Desktop: Card grid */}
        <div className="hidden md:grid gap-3">
          {LEVEL_OF_CARE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ level_of_care: opt.value })}
              className={cn(
                "flex items-start gap-4 p-4 rounded-lg border text-left transition-all",
                data.level_of_care === opt.value
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                data.level_of_care === opt.value ? "bg-primary/10" : "bg-muted"
              )}>
                <opt.icon className={cn(
                  "h-5 w-5",
                  data.level_of_care === opt.value ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-foreground text-base">{opt.label}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{opt.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
