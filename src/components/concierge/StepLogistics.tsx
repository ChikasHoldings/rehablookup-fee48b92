import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { ConciergeIntakeData } from "@/pages/concierge/ConciergeIntake";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
  "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
  "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
  "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

const RADIUS_OPTIONS = [
  { value: 25, label: "Within 25 miles" },
  { value: 50, label: "Within 50 miles" },
  { value: 100, label: "Within 100 miles" },
  { value: 200, label: "Within 200 miles" },
  { value: 0, label: "Anywhere in state" },
];

const TIMELINE_OPTIONS = [
  { value: "today", label: "Today/Immediately" },
  { value: "24-48hrs", label: "Within 24-48 hours" },
  { value: "1week", label: "Within 1 week" },
  { value: "flexible", label: "Flexible timeline" },
];

const ASSESSMENT_OPTIONS = [
  { value: "call_first", label: "Phone call first" },
  { value: "virtual", label: "Virtual assessment" },
  { value: "in_person", label: "In-person assessment" },
];

interface Props {
  data: ConciergeIntakeData;
  errors: Record<string, string>;
  onChange: (updates: Partial<ConciergeIntakeData>) => void;
}

export function StepLogistics({ data, errors, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Preferred treatment location (state) *</Label>
        <Select value={data.desiredState} onValueChange={(v) => onChange({ desiredState: v })}>
          <SelectTrigger className={errors.desiredState ? "border-destructive" : ""}>
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent>
            {US_STATES.map((state) => (
              <SelectItem key={state} value={state}>{state}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.desiredState && <p className="text-sm text-destructive">{errors.desiredState}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="desiredCity">Preferred city (optional)</Label>
        <Input
          id="desiredCity"
          value={data.desiredCity}
          onChange={(e) => onChange({ desiredCity: e.target.value })}
          placeholder="Enter city"
        />
      </div>

      <div className="space-y-2">
        <Label>Search radius *</Label>
        <Select 
          value={String(data.radiusMiles)} 
          onValueChange={(v) => onChange({ radiusMiles: Number(v) })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select radius" />
          </SelectTrigger>
          <SelectContent>
            {RADIUS_OPTIONS.map((r) => (
              <SelectItem key={r.value} value={String(r.value)}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label>Timeline/Urgency *</Label>
        <RadioGroup
          value={data.timeline}
          onValueChange={(v) => onChange({ timeline: v })}
          className={errors.timeline ? "border border-destructive rounded-md p-2" : ""}
        >
          {TIMELINE_OPTIONS.map((t) => (
            <div key={t.value} className="flex items-center space-x-2">
              <RadioGroupItem value={t.value} id={t.value} />
              <Label htmlFor={t.value} className="font-normal">{t.label}</Label>
            </div>
          ))}
        </RadioGroup>
        {errors.timeline && <p className="text-sm text-destructive">{errors.timeline}</p>}
      </div>

      <div className="space-y-3">
        <Label>Need help with transportation?</Label>
        <RadioGroup
          value={data.needsTransport ? "yes" : "no"}
          onValueChange={(v) => onChange({ needsTransport: v === "yes" })}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="transport-yes" />
            <Label htmlFor="transport-yes" className="font-normal">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="transport-no" />
            <Label htmlFor="transport-no" className="font-normal">No</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-3">
        <Label>How would you prefer to start the process? *</Label>
        <RadioGroup
          value={data.assessmentPreference}
          onValueChange={(v) => onChange({ assessmentPreference: v })}
          className={errors.assessmentPreference ? "border border-destructive rounded-md p-2" : ""}
        >
          {ASSESSMENT_OPTIONS.map((a) => (
            <div key={a.value} className="flex items-center space-x-2">
              <RadioGroupItem value={a.value} id={a.value} />
              <Label htmlFor={a.value} className="font-normal">{a.label}</Label>
            </div>
          ))}
        </RadioGroup>
        {errors.assessmentPreference && <p className="text-sm text-destructive">{errors.assessmentPreference}</p>}
      </div>
    </div>
  );
}
