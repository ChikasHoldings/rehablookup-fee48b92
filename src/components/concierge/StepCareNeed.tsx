import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";
import type { ConciergeIntakeData } from "@/pages/concierge/ConciergeIntake";

const PRIMARY_CONCERNS = [
  { value: "alcohol", label: "Alcohol" },
  { value: "opioids", label: "Opioids (heroin, fentanyl, pills)" },
  { value: "stimulants", label: "Stimulants (cocaine, meth)" },
  { value: "benzos", label: "Benzodiazepines (Xanax, etc.)" },
  { value: "cannabis", label: "Cannabis/Marijuana" },
  { value: "polysubstance", label: "Multiple substances" },
  { value: "behavioral", label: "Behavioral addiction" },
  { value: "other", label: "Other" },
];

const LEVELS_OF_CARE = [
  { value: "detox", label: "Medical Detox (24/7 supervision)" },
  { value: "residential", label: "Residential/Inpatient (30-90+ days)" },
  { value: "php", label: "Partial Hospitalization (6-8 hrs/day)" },
  { value: "iop", label: "Intensive Outpatient (3-4 hrs/day)" },
  { value: "outpatient", label: "Standard Outpatient (1-2 hrs/wk)" },
  { value: "mat", label: "Medication-Assisted Treatment" },
  { value: "unsure", label: "Not sure - need guidance" },
];

const USE_FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "several_weekly", label: "Several times per week" },
  { value: "weekly", label: "Once a week" },
  { value: "occasionally", label: "Occasionally" },
  { value: "in_recovery", label: "In recovery (relapse prevention)" },
];

const USE_DURATIONS = [
  { value: "less_1_year", label: "Less than 1 year" },
  { value: "1_3_years", label: "1-3 years" },
  { value: "3_5_years", label: "3-5 years" },
  { value: "5_10_years", label: "5-10 years" },
  { value: "over_10_years", label: "Over 10 years" },
];

const DETOX_OPTIONS = [
  { value: "yes", label: "Yes, likely needs detox" },
  { value: "no", label: "No, already stable" },
  { value: "unsure", label: "Unsure - need assessment" },
];

const PRIOR_TREATMENT_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No - first time" },
];

const CO_OCCURRING = [
  "Depression", "Anxiety", "PTSD/Trauma", "Bipolar", 
  "Eating Disorder", "ADHD", "Chronic Pain", "Other"
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
    <div className="space-y-5">
      {/* Primary Concern & Level of Care - Most important */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Primary Concern <span className="text-destructive">*</span>
          </Label>
          <Select value={data.primaryConcern} onValueChange={(v) => onChange({ primaryConcern: v })}>
            <SelectTrigger className={`h-11 ${errors.primaryConcern ? "border-destructive ring-1 ring-destructive" : ""}`}>
              <SelectValue placeholder="Select substance" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {PRIMARY_CONCERNS.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.primaryConcern && <p className="text-xs text-destructive">{errors.primaryConcern}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Level of Care <span className="text-destructive">*</span>
          </Label>
          <Select value={data.levelOfCare} onValueChange={(v) => onChange({ levelOfCare: v })}>
            <SelectTrigger className={`h-11 ${errors.levelOfCare ? "border-destructive ring-1 ring-destructive" : ""}`}>
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {LEVELS_OF_CARE.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.levelOfCare && <p className="text-xs text-destructive">{errors.levelOfCare}</p>}
        </div>
      </div>

      {/* Frequency & Duration Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Use Frequency <span className="text-destructive">*</span>
          </Label>
          <Select value={data.substanceUseFrequency || ""} onValueChange={(v) => onChange({ substanceUseFrequency: v })}>
            <SelectTrigger className={`h-11 ${errors.substanceUseFrequency ? "border-destructive ring-1 ring-destructive" : ""}`}>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {USE_FREQUENCIES.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.substanceUseFrequency && <p className="text-xs text-destructive">{errors.substanceUseFrequency}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Duration</Label>
          <Select value={data.substanceUseDuration || ""} onValueChange={(v) => onChange({ substanceUseDuration: v })}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {USE_DURATIONS.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Detox & Prior Treatment Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            Detox Needed? <span className="text-destructive">*</span>
          </Label>
          <Select value={data.detoxNeeded || ""} onValueChange={(v) => onChange({ detoxNeeded: v })}>
            <SelectTrigger className={`h-11 ${errors.detoxNeeded ? "border-destructive ring-1 ring-destructive" : ""}`}>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {DETOX_OPTIONS.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.detoxNeeded && <p className="text-xs text-destructive">{errors.detoxNeeded}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Prior Treatment? <span className="text-destructive">*</span>
          </Label>
          <Select 
            value={data.priorTreatment === null ? "" : data.priorTreatment ? "yes" : "no"} 
            onValueChange={(v) => onChange({ priorTreatment: v === "yes" })}
          >
            <SelectTrigger className={`h-11 ${errors.priorTreatment ? "border-destructive ring-1 ring-destructive" : ""}`}>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {PRIOR_TREATMENT_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.priorTreatment && <p className="text-xs text-destructive">{errors.priorTreatment}</p>}
        </div>
      </div>

      {/* Prior Treatment Notes - Conditional */}
      {data.priorTreatment && (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Prior Treatment Details</Label>
          <Textarea
            value={data.priorTreatmentNotes}
            onChange={(e) => onChange({ priorTreatmentNotes: e.target.value.replace(/<[^>]*>/g, "").slice(0, 500) })}
            rows={2}
            maxLength={500}
            placeholder="What type, when, outcome"
            className="resize-none"
          />
        </div>
      )}

      {/* Current Medications */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Current Medications <span className="text-xs text-muted-foreground">(Optional)</span>
        </Label>
        <Input
          value={data.currentMedications || ""}
          onChange={(e) => onChange({ currentMedications: e.target.value.replace(/<[^>]*>/g, "").slice(0, 500) })}
          placeholder="List any current medications"
          maxLength={500}
          className="h-11"
        />
      </div>

      {/* Co-occurring Concerns - Chip Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Mental Health Concerns <span className="text-xs text-muted-foreground">(Select all)</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {CO_OCCURRING.map((concern) => (
            <button
              key={concern}
              type="button"
              onClick={() => toggleCoOccurring(concern)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                data.coOccurringConcerns?.includes(concern) 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "bg-muted/50 hover:bg-muted border-border"
              }`}
            >
              {concern}
            </button>
          ))}
        </div>
      </div>

      {/* Suicide History - Dropdown for sensitivity */}
      <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border">
        <Label className="text-sm font-medium">History of Self-Harm or Suicidal Thoughts?</Label>
        <Select value={data.suicideHistory || ""} onValueChange={(v) => onChange({ suicideHistory: v })}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Select (confidential)" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="yes">Yes</SelectItem>
            <SelectItem value="no">No</SelectItem>
            <SelectItem value="prefer_not_say">Prefer not to say</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Helps match with appropriate support services</p>
      </div>
    </div>
  );
}
