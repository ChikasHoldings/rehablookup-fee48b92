import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { ConciergeIntakeData } from "@/pages/concierge/ConciergeIntake";

const AGE_RANGES = ["Under 18", "18-25", "26-35", "36-45", "46-55", "56-65", "65+"];
const RELATIONSHIPS = [
  { value: "self", label: "Myself" },
  { value: "parent", label: "Parent/Guardian" },
  { value: "spouse", label: "Spouse/Partner" },
  { value: "child", label: "Adult Child" },
  { value: "friend", label: "Friend" },
  { value: "case_manager", label: "Case Manager/Professional" },
];

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
  "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
  "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
  "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

interface Props {
  data: ConciergeIntakeData;
  errors: Record<string, string>;
  onChange: (updates: Partial<ConciergeIntakeData>) => void;
}

export function StepWhoNeedsHelp({ data, errors, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="ageRange">Age of person needing help *</Label>
        <Select value={data.ageRange} onValueChange={(v) => onChange({ ageRange: v })}>
          <SelectTrigger className={errors.ageRange ? "border-destructive" : ""}>
            <SelectValue placeholder="Select age range" />
          </SelectTrigger>
          <SelectContent>
            {AGE_RANGES.map((age) => (
              <SelectItem key={age} value={age}>{age}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.ageRange && <p className="text-sm text-destructive">{errors.ageRange}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="state">Current state *</Label>
        <Select value={data.state} onValueChange={(v) => onChange({ state: v })}>
          <SelectTrigger className={errors.state ? "border-destructive" : ""}>
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent>
            {US_STATES.map((state) => (
              <SelectItem key={state} value={state}>{state}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.state && <p className="text-sm text-destructive">{errors.state}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">City *</Label>
        <Input
          id="city"
          value={data.city}
          onChange={(e) => onChange({ city: e.target.value })}
          placeholder="Enter city"
          className={errors.city ? "border-destructive" : ""}
        />
        {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="relationship">Your relationship to the person needing help *</Label>
        <Select value={data.relationship} onValueChange={(v) => onChange({ relationship: v })}>
          <SelectTrigger className={errors.relationship ? "border-destructive" : ""}>
            <SelectValue placeholder="Select relationship" />
          </SelectTrigger>
          <SelectContent>
            {RELATIONSHIPS.map((rel) => (
              <SelectItem key={rel.value} value={rel.value}>{rel.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.relationship && <p className="text-sm text-destructive">{errors.relationship}</p>}
      </div>
    </div>
  );
}
