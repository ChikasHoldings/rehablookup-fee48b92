import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ConciergeIntakeData } from "@/pages/concierge/ConciergeIntake";

const AGE_RANGES = [
  { value: "under_18", label: "Under 18" },
  { value: "18-25", label: "18-25" },
  { value: "26-35", label: "26-35" },
  { value: "36-45", label: "36-45" },
  { value: "46-55", label: "46-55" },
  { value: "56-65", label: "56-65" },
  { value: "65+", label: "65+" },
];

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_say", label: "Prefer not to say" },
];

const LANGUAGES = [
  { value: "english", label: "English" },
  { value: "spanish", label: "Spanish" },
  { value: "mandarin", label: "Mandarin" },
  { value: "cantonese", label: "Cantonese" },
  { value: "vietnamese", label: "Vietnamese" },
  { value: "korean", label: "Korean" },
  { value: "tagalog", label: "Tagalog" },
  { value: "russian", label: "Russian" },
  { value: "arabic", label: "Arabic" },
  { value: "portuguese", label: "Portuguese" },
  { value: "other", label: "Other" },
];

const RELATIONSHIPS = [
  { value: "self", label: "Myself" },
  { value: "parent", label: "Parent/Guardian" },
  { value: "spouse", label: "Spouse/Partner" },
  { value: "child", label: "Adult Child" },
  { value: "sibling", label: "Sibling" },
  { value: "friend", label: "Friend" },
  { value: "case_manager", label: "Case Manager/Professional" },
];

const LIVING_SITUATIONS = [
  { value: "at_home", label: "At home with family" },
  { value: "independent", label: "Living independently" },
  { value: "sober_living", label: "Sober living" },
  { value: "hospital", label: "Hospital/Medical facility" },
  { value: "jail", label: "Jail/Correctional facility" },
  { value: "homeless", label: "Homeless/Unstable housing" },
  { value: "other", label: "Other" },
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
    <TooltipProvider>
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground border-l-4 border-primary/30 pl-4 py-2 bg-muted/30 rounded-r-lg">
          Help us understand who we're finding care for. This information ensures we match with programs that serve the right demographics.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Age Range */}
          <div className="space-y-2">
            <Label htmlFor="ageRange" className="flex items-center gap-2">
              Age Range *
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Programs often specialize by age group. This helps us find age-appropriate care.</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Select value={data.ageRange} onValueChange={(v) => onChange({ ageRange: v })}>
              <SelectTrigger className={errors.ageRange ? "border-destructive ring-1 ring-destructive" : ""}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGE_RANGES.map((age) => (
                  <SelectItem key={age.value} value={age.value}>{age.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.ageRange && <p className="text-sm text-destructive">{errors.ageRange}</p>}
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label htmlFor="gender" className="flex items-center gap-2">
              Gender *
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Many facilities are gender-specific. This ensures proper matching.</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Select value={data.gender || ""} onValueChange={(v) => onChange({ gender: v })}>
              <SelectTrigger className={errors.gender ? "border-destructive ring-1 ring-destructive" : ""}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.gender && <p className="text-sm text-destructive">{errors.gender}</p>}
          </div>

          {/* Preferred Language */}
          <div className="space-y-2">
            <Label htmlFor="preferredLanguage" className="flex items-center gap-2">
              Preferred Language
            </Label>
            <Select value={data.preferredLanguage || "english"} onValueChange={(v) => onChange({ preferredLanguage: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Current Location */}
        <div className="space-y-4 pt-2">
          <Label className="text-base font-medium">Current Location</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Select value={data.state} onValueChange={(v) => onChange({ state: v })}>
                <SelectTrigger className={errors.state ? "border-destructive ring-1 ring-destructive" : ""}>
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
                className={errors.city ? "border-destructive ring-1 ring-destructive" : ""}
              />
              {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
            </div>
          </div>
        </div>

        {/* Living Situation */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Current Living Situation *
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Understanding their current environment helps us identify urgency and appropriate care settings.</p>
              </TooltipContent>
            </Tooltip>
          </Label>
          <Select value={data.currentLivingSituation || ""} onValueChange={(v) => onChange({ currentLivingSituation: v })}>
            <SelectTrigger className={errors.currentLivingSituation ? "border-destructive ring-1 ring-destructive" : ""}>
              <SelectValue placeholder="Select living situation" />
            </SelectTrigger>
            <SelectContent>
              {LIVING_SITUATIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.currentLivingSituation && <p className="text-sm text-destructive">{errors.currentLivingSituation}</p>}
        </div>

        {/* Relationship */}
        <div className="space-y-3">
          <Label>Your Relationship to the Person Needing Help *</Label>
          <RadioGroup
            value={data.relationship}
            onValueChange={(v) => onChange({ relationship: v })}
            className={`grid grid-cols-2 md:grid-cols-3 gap-3 ${errors.relationship ? "p-2 border border-destructive rounded-lg" : ""}`}
          >
            {RELATIONSHIPS.map((rel) => (
              <div key={rel.value} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                <RadioGroupItem value={rel.value} id={rel.value} />
                <Label htmlFor={rel.value} className="font-normal cursor-pointer flex-1">{rel.label}</Label>
              </div>
            ))}
          </RadioGroup>
          {errors.relationship && <p className="text-sm text-destructive">{errors.relationship}</p>}
        </div>

        {/* Mobility Needs */}
        <div className="space-y-2">
          <Label htmlFor="mobilityNeeds" className="flex items-center gap-2">
            Physical or Mobility Needs
            <span className="text-xs text-muted-foreground">(Optional)</span>
          </Label>
          <Input
            id="mobilityNeeds"
            value={data.mobilityNeeds || ""}
            onChange={(e) => onChange({ mobilityNeeds: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">Describe any physical limitations or accessibility requirements (wheelchair, ADA, etc.)</p>
        </div>
      </div>
    </TooltipProvider>
  );
}
