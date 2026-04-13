import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ZipcodeInput } from "@/components/ui/zipcode-input";
import type { ConciergeIntakeData } from "@/pages/concierge/ConciergeIntake";
import { useState } from "react";

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
  { value: "case_manager", label: "Case Manager" },
];

const LIVING_SITUATIONS = [
  { value: "at_home", label: "At home with family" },
  { value: "independent", label: "Living independently" },
  { value: "sober_living", label: "Sober living" },
  { value: "hospital", label: "Hospital/Medical facility" },
  { value: "jail", label: "Correctional facility" },
  { value: "homeless", label: "Homeless/Unstable" },
  { value: "other", label: "Other" },
];

interface Props {
  data: ConciergeIntakeData;
  errors: Record<string, string>;
  onChange: (updates: Partial<ConciergeIntakeData>) => void;
}

export function StepWhoNeedsHelp({ data, errors, onChange }: Props) {
  const [zipcode, setZipcode] = useState("");

  return (
    <div className="space-y-5">
      {/* Demographics Row - 2 columns on mobile, 3 on desktop */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        {/* Age Range */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Age Range <span className="text-destructive">*</span>
          </Label>
          <Select value={data.ageRange} onValueChange={(v) => onChange({ ageRange: v })}>
            <SelectTrigger className={`h-11 ${errors.ageRange ? "border-destructive ring-1 ring-destructive" : ""}`}>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {AGE_RANGES.map((age) => (
                <SelectItem key={age.value} value={age.value}>{age.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.ageRange && <p className="text-xs text-destructive">{errors.ageRange}</p>}
        </div>

        {/* Gender */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Gender <span className="text-destructive">*</span>
          </Label>
          <Select value={data.gender || ""} onValueChange={(v) => onChange({ gender: v })}>
            <SelectTrigger className={`h-11 ${errors.gender ? "border-destructive ring-1 ring-destructive" : ""}`}>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {GENDERS.map((g) => (
                <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.gender && <p className="text-xs text-destructive">{errors.gender}</p>}
        </div>

        {/* Language - Full width on mobile */}
        <div className="space-y-1.5 col-span-2 md:col-span-1">
          <Label className="text-sm font-medium">Language</Label>
          <Select value={data.preferredLanguage || "english"} onValueChange={(v) => onChange({ preferredLanguage: v })}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Location with Zipcode Auto-detection */}
      <ZipcodeInput
        zipcode={zipcode}
        city={data.city}
        state={data.state}
        onZipcodeChange={setZipcode}
        onCityChange={(city) => onChange({ city })}
        onStateChange={(state) => onChange({ state })}
        zipcodeError={errors.state || errors.city ? "Location is required" : undefined}
        layout="compact"
        showLabels={true}
      />

      {/* Situation Row - 2 columns */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {/* Relationship */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Who needs help? <span className="text-destructive">*</span>
          </Label>
          <Select value={data.relationship} onValueChange={(v) => onChange({ relationship: v })}>
            <SelectTrigger className={`h-11 ${errors.relationship ? "border-destructive ring-1 ring-destructive" : ""}`}>
              <SelectValue placeholder="Relationship" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {RELATIONSHIPS.map((rel) => (
                <SelectItem key={rel.value} value={rel.value}>{rel.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.relationship && <p className="text-xs text-destructive">{errors.relationship}</p>}
        </div>

        {/* Living Situation */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Living Situation <span className="text-destructive">*</span>
          </Label>
          <Select value={data.currentLivingSituation || ""} onValueChange={(v) => onChange({ currentLivingSituation: v })}>
            <SelectTrigger className={`h-11 ${errors.currentLivingSituation ? "border-destructive ring-1 ring-destructive" : ""}`}>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {LIVING_SITUATIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.currentLivingSituation && <p className="text-xs text-destructive">{errors.currentLivingSituation}</p>}
        </div>
      </div>

      {/* Mobility Needs - Optional */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Physical/Mobility Needs <span className="text-xs text-muted-foreground">(Optional)</span>
        </Label>
        <Input
          value={data.mobilityNeeds || ""}
          onChange={(e) => onChange({ mobilityNeeds: e.target.value.replace(/<[^>]*>/g, "").slice(0, 200) })}
          placeholder="Wheelchair, ADA, etc."
          maxLength={200}
          className="h-11"
        />
      </div>
    </div>
  );
}
