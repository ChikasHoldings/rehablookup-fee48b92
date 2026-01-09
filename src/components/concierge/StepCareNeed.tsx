import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import type { ConciergeIntakeData } from "@/pages/concierge/ConciergeIntake";

const PRIMARY_CONCERNS = [
  { value: "alcohol", label: "Alcohol" },
  { value: "opioids", label: "Opioids (heroin, fentanyl, prescription painkillers)" },
  { value: "stimulants", label: "Stimulants (cocaine, meth, Adderall)" },
  { value: "benzos", label: "Benzodiazepines (Xanax, Valium, Klonopin)" },
  { value: "polysubstance", label: "Multiple substances" },
  { value: "other", label: "Other" },
];

const LEVELS_OF_CARE = [
  { value: "detox", label: "Medical Detox" },
  { value: "residential", label: "Residential/Inpatient" },
  { value: "php", label: "Partial Hospitalization (PHP)" },
  { value: "iop", label: "Intensive Outpatient (IOP)" },
  { value: "outpatient", label: "Standard Outpatient" },
  { value: "mat", label: "Medication-Assisted Treatment (MAT)" },
  { value: "unsure", label: "Not sure, need guidance" },
];

const CO_OCCURRING = [
  "Depression", "Anxiety", "PTSD/Trauma", "Bipolar Disorder", 
  "Eating Disorder", "ADHD", "Personality Disorder", "Other"
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
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Primary concern *</Label>
        <Select value={data.primaryConcern} onValueChange={(v) => onChange({ primaryConcern: v })}>
          <SelectTrigger className={errors.primaryConcern ? "border-destructive" : ""}>
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

      <div className="space-y-2">
        <Label>Level of care needed *</Label>
        <Select value={data.levelOfCare} onValueChange={(v) => onChange({ levelOfCare: v })}>
          <SelectTrigger className={errors.levelOfCare ? "border-destructive" : ""}>
            <SelectValue placeholder="Select level of care" />
          </SelectTrigger>
          <SelectContent>
            {LEVELS_OF_CARE.map((l) => (
              <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.levelOfCare && <p className="text-sm text-destructive">{errors.levelOfCare}</p>}
      </div>

      <div className="space-y-3">
        <Label>Has this person received treatment before? *</Label>
        <RadioGroup
          value={data.priorTreatment === null ? "" : data.priorTreatment ? "yes" : "no"}
          onValueChange={(v) => onChange({ priorTreatment: v === "yes" })}
          className={errors.priorTreatment ? "border border-destructive rounded-md p-2" : ""}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="prior-yes" />
            <Label htmlFor="prior-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="prior-no" />
            <Label htmlFor="prior-no" className="font-normal">No</Label>
          </div>
        </RadioGroup>
        {errors.priorTreatment && <p className="text-sm text-destructive">{errors.priorTreatment}</p>}
        
        {data.priorTreatment && (
          <Textarea
            placeholder="Brief description of prior treatment (optional)"
            value={data.priorTreatmentNotes}
            onChange={(e) => onChange({ priorTreatmentNotes: e.target.value })}
            className="mt-2"
          />
        )}
      </div>

      <div className="space-y-3">
        <Label>Co-occurring mental health concerns (select all that apply)</Label>
        <div className="grid grid-cols-2 gap-2">
          {CO_OCCURRING.map((concern) => (
            <div key={concern} className="flex items-center space-x-2">
              <Checkbox
                id={concern}
                checked={data.coOccurringConcerns?.includes(concern)}
                onCheckedChange={() => toggleCoOccurring(concern)}
              />
              <Label htmlFor={concern} className="font-normal text-sm">{concern}</Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
