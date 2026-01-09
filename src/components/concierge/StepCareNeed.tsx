import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { HelpCircle, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ConciergeIntakeData } from "@/pages/concierge/ConciergeIntake";

const PRIMARY_CONCERNS = [
  { value: "alcohol", label: "Alcohol" },
  { value: "opioids", label: "Opioids (heroin, fentanyl, prescription painkillers)" },
  { value: "stimulants", label: "Stimulants (cocaine, meth, Adderall)" },
  { value: "benzos", label: "Benzodiazepines (Xanax, Valium, Klonopin)" },
  { value: "cannabis", label: "Cannabis/Marijuana" },
  { value: "polysubstance", label: "Multiple substances" },
  { value: "behavioral", label: "Behavioral addiction (gambling, gaming, etc.)" },
  { value: "other", label: "Other" },
];

const LEVELS_OF_CARE = [
  { value: "detox", label: "Medical Detox", desc: "24/7 medical supervision for withdrawal" },
  { value: "residential", label: "Residential/Inpatient", desc: "Full-time live-in treatment (30-90+ days)" },
  { value: "php", label: "Partial Hospitalization (PHP)", desc: "6-8 hours/day, 5-7 days/week" },
  { value: "iop", label: "Intensive Outpatient (IOP)", desc: "3-4 hours/day, 3-5 days/week" },
  { value: "outpatient", label: "Standard Outpatient", desc: "1-2 hours/week" },
  { value: "mat", label: "Medication-Assisted Treatment (MAT)", desc: "Suboxone, Methadone, Vivitrol" },
  { value: "unsure", label: "Not sure, need guidance", desc: "We'll help determine the right level" },
];

const USE_FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "several_weekly", label: "Several times per week" },
  { value: "weekly", label: "Once a week" },
  { value: "occasionally", label: "Occasionally" },
  { value: "in_recovery", label: "Currently in recovery (relapse prevention)" },
];

const USE_DURATIONS = [
  { value: "less_1_year", label: "Less than 1 year" },
  { value: "1_3_years", label: "1-3 years" },
  { value: "3_5_years", label: "3-5 years" },
  { value: "5_10_years", label: "5-10 years" },
  { value: "over_10_years", label: "Over 10 years" },
];

const CO_OCCURRING = [
  "Depression", "Anxiety", "PTSD/Trauma", "Bipolar Disorder", 
  "Eating Disorder", "ADHD", "Schizophrenia", "OCD",
  "Personality Disorder", "Chronic Pain", "Other"
];

interface Props {
  data: ConciergeIntakeData;
  errors: Record<string, string>;
  onChange: (updates: Partial<ConciergeIntakeData>) => void;
}

export function StepCareNeed({ data, errors, onChange }: Props) {
  const toggleCoOccurring = (concern: string) => {
    const current = data.coOccurringConcerns || [];
    const updated = current.includes(concern)
      ? current.filter(c => c !== concern)
      : [...current, concern];
    onChange({ coOccurringConcerns: updated });
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground border-l-4 border-primary/30 pl-4 py-2 bg-muted/30 rounded-r-lg">
          The more details you provide about care needs, the better we can match you with programs that specialize in treating these specific conditions.
        </p>

        {/* Primary Concern */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Primary Substance Concern *
          </Label>
          <Select value={data.primaryConcern} onValueChange={(v) => onChange({ primaryConcern: v })}>
            <SelectTrigger className={errors.primaryConcern ? "border-destructive ring-1 ring-destructive" : ""}>
              <SelectValue placeholder="Select primary concern" />
            </SelectTrigger>
            <SelectContent>
              {PRIMARY_CONCERNS.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.primaryConcern && <p className="text-sm text-destructive">{errors.primaryConcern}</p>}
        </div>

        {/* Frequency & Duration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Current Use Frequency *
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Helps determine appropriate level of care and detox needs.</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Select value={data.substanceUseFrequency || ""} onValueChange={(v) => onChange({ substanceUseFrequency: v })}>
              <SelectTrigger className={errors.substanceUseFrequency ? "border-destructive ring-1 ring-destructive" : ""}>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {USE_FREQUENCIES.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.substanceUseFrequency && <p className="text-sm text-destructive">{errors.substanceUseFrequency}</p>}
          </div>

          <div className="space-y-2">
            <Label>Duration of Use</Label>
            <Select value={data.substanceUseDuration || ""} onValueChange={(v) => onChange({ substanceUseDuration: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {USE_DURATIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Detox Needed */}
        <div className="space-y-3 p-4 border rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <Label className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            Is Medical Detox Needed? *
          </Label>
          <RadioGroup
            value={data.detoxNeeded || ""}
            onValueChange={(v) => onChange({ detoxNeeded: v })}
            className={errors.detoxNeeded ? "border border-destructive rounded-md p-2" : ""}
          >
            <div className="flex items-center space-x-2 p-2 rounded hover:bg-amber-100/50 dark:hover:bg-amber-900/30">
              <RadioGroupItem value="yes" id="detox-yes" />
              <Label htmlFor="detox-yes" className="font-normal cursor-pointer">Yes, likely needs detox supervision</Label>
            </div>
            <div className="flex items-center space-x-2 p-2 rounded hover:bg-amber-100/50 dark:hover:bg-amber-900/30">
              <RadioGroupItem value="no" id="detox-no" />
              <Label htmlFor="detox-no" className="font-normal cursor-pointer">No, already stable</Label>
            </div>
            <div className="flex items-center space-x-2 p-2 rounded hover:bg-amber-100/50 dark:hover:bg-amber-900/30">
              <RadioGroupItem value="unsure" id="detox-unsure" />
              <Label htmlFor="detox-unsure" className="font-normal cursor-pointer">Unsure, need assessment</Label>
            </div>
          </RadioGroup>
          {errors.detoxNeeded && <p className="text-sm text-destructive">{errors.detoxNeeded}</p>}
        </div>

        {/* Level of Care */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            Level of Care Needed *
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">If unsure, select "Not sure, need guidance" and we'll help determine the right level.</p>
              </TooltipContent>
            </Tooltip>
          </Label>
          <RadioGroup
            value={data.levelOfCare}
            onValueChange={(v) => onChange({ levelOfCare: v })}
            className={errors.levelOfCare ? "border border-destructive rounded-md p-2" : "space-y-2"}
          >
            {LEVELS_OF_CARE.map((l) => (
              <div key={l.value} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                <RadioGroupItem value={l.value} id={l.value} className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor={l.value} className="font-medium cursor-pointer">{l.label}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{l.desc}</p>
                </div>
              </div>
            ))}
          </RadioGroup>
          {errors.levelOfCare && <p className="text-sm text-destructive">{errors.levelOfCare}</p>}
        </div>

        {/* Prior Treatment */}
        <div className="space-y-3">
          <Label>Has this person received treatment before? *</Label>
          <RadioGroup
            value={data.priorTreatment === null ? "" : data.priorTreatment ? "yes" : "no"}
            onValueChange={(v) => onChange({ priorTreatment: v === "yes" })}
            className={errors.priorTreatment ? "border border-destructive rounded-md p-2" : ""}
          >
            <div className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50">
              <RadioGroupItem value="yes" id="prior-yes" />
              <Label htmlFor="prior-yes" className="font-normal cursor-pointer">Yes</Label>
            </div>
            <div className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50">
              <RadioGroupItem value="no" id="prior-no" />
              <Label htmlFor="prior-no" className="font-normal cursor-pointer">No, this is first time seeking treatment</Label>
            </div>
          </RadioGroup>
          {errors.priorTreatment && <p className="text-sm text-destructive">{errors.priorTreatment}</p>}
          
          {data.priorTreatment && (
            <Textarea
              placeholder="Brief description of prior treatment (what type, when, outcome)"
              value={data.priorTreatmentNotes}
              onChange={(e) => onChange({ priorTreatmentNotes: e.target.value })}
              className="mt-2"
              rows={3}
            />
          )}
        </div>

        {/* Current Medications */}
        <div className="space-y-2">
          <Label htmlFor="currentMedications" className="flex items-center gap-2">
            Current Medications
            <span className="text-xs text-muted-foreground">(Optional)</span>
          </Label>
          <Input
            id="currentMedications"
            value={data.currentMedications || ""}
            onChange={(e) => onChange({ currentMedications: e.target.value })}
            placeholder="List any current medications"
          />
          <p className="text-xs text-muted-foreground">Helps ensure program can accommodate medication needs</p>
        </div>

        {/* Co-occurring Concerns */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            Co-occurring Mental Health Concerns
            <span className="text-xs text-muted-foreground">(Select all that apply)</span>
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {CO_OCCURRING.map((concern) => (
              <div 
                key={concern} 
                className={`flex items-center space-x-2 p-2.5 rounded-lg border transition-colors cursor-pointer ${
                  data.coOccurringConcerns?.includes(concern) 
                    ? "bg-primary/10 border-primary/50" 
                    : "hover:bg-muted/50"
                }`}
                onClick={() => toggleCoOccurring(concern)}
              >
                <Checkbox
                  id={concern}
                  checked={data.coOccurringConcerns?.includes(concern)}
                  onCheckedChange={() => toggleCoOccurring(concern)}
                />
                <Label htmlFor={concern} className="font-normal text-sm cursor-pointer">{concern}</Label>
              </div>
            ))}
          </div>
        </div>

        {/* Suicide History - Sensitive */}
        <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
          <Label className="flex items-center gap-2">
            History of Self-Harm or Suicidal Thoughts
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">This helps ensure placement at a facility with appropriate crisis support capabilities.</p>
              </TooltipContent>
            </Tooltip>
          </Label>
          <RadioGroup
            value={data.suicideHistory || ""}
            onValueChange={(v) => onChange({ suicideHistory: v })}
          >
            <div className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50">
              <RadioGroupItem value="yes" id="suicide-yes" />
              <Label htmlFor="suicide-yes" className="font-normal cursor-pointer">Yes, history of self-harm or suicidal thoughts</Label>
            </div>
            <div className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50">
              <RadioGroupItem value="no" id="suicide-no" />
              <Label htmlFor="suicide-no" className="font-normal cursor-pointer">No</Label>
            </div>
            <div className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50">
              <RadioGroupItem value="prefer_not_say" id="suicide-prefer" />
              <Label htmlFor="suicide-prefer" className="font-normal cursor-pointer">Prefer not to say</Label>
            </div>
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            Your response is confidential and helps us match with appropriate support services.
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}
