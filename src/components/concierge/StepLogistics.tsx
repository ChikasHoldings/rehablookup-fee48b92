import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { ConciergeIntakeData } from "@/pages/concierge/ConciergeIntake";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming"
];

const RADIUS_OPTIONS = [
  { value: "25", label: "Within 25 miles" },
  { value: "50", label: "Within 50 miles" },
  { value: "100", label: "Within 100 miles" },
  { value: "200", label: "Within 200 miles" },
  { value: "0", label: "Anywhere in state" },
  { value: "-1", label: "Anywhere in country" },
];

const TIMELINE_OPTIONS = [
  { value: "today", label: "🚨 Today/Immediately" },
  { value: "24-48hrs", label: "🚨 Within 24-48 hours" },
  { value: "1week", label: "Within 1 week" },
  { value: "2weeks", label: "Within 2 weeks" },
  { value: "flexible", label: "Flexible timeline" },
];

const ENVIRONMENT_OPTIONS = [
  { value: "rural", label: "Rural/Secluded" },
  { value: "suburban", label: "Suburban" },
  { value: "urban", label: "Urban/City" },
  { value: "no_preference", label: "No preference" },
];

const ASSESSMENT_OPTIONS = [
  { value: "call_first", label: "Phone call first" },
  { value: "virtual", label: "Virtual video assessment" },
  { value: "in_person", label: "In-person assessment" },
];

const AMENITY_OPTIONS = [
  "Private room",
  "Gym/Fitness",
  "Pool",
  "Outdoor activities",
  "Pet-friendly",
  "Luxury amenities",
  "Holistic therapies",
];

interface Props {
  data: ConciergeIntakeData;
  errors: Record<string, string>;
  onChange: (updates: Partial<ConciergeIntakeData>) => void;
}

export function StepLogistics({ data, errors, onChange }: Props) {
  const toggleAmenity = (amenity: string) => {
    const current = data.amenityPreferences || [];
    const updated = current.includes(amenity)
      ? current.filter(a => a !== amenity)
      : [...current, amenity];
    onChange({ amenityPreferences: updated });
  };

  return (
    <div className="space-y-5">
      {/* Preferred Location - State dropdown + optional City */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Preferred Treatment State <span className="text-destructive">*</span>
          </Label>
          <Select 
            value={data.desiredState} 
            onValueChange={(v) => onChange({ desiredState: v })}
          >
            <SelectTrigger className={`h-11 ${errors.desiredState ? "border-destructive ring-1 ring-destructive" : ""}`}>
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent className="bg-popover max-h-[300px]">
              {US_STATES.map((state) => (
                <SelectItem key={state} value={state}>{state}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.desiredState && <p className="text-xs text-destructive">{errors.desiredState}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Preferred City <span className="text-xs text-muted-foreground">(Optional)</span>
          </Label>
          <Input
            value={data.desiredCity || ""}
            onChange={(e) => onChange({ desiredCity: e.target.value.replace(/<[^>]*>/g, "").slice(0, 100) })}
            placeholder="Enter city name (optional)"
            maxLength={100}
            className="h-11"
          />
        </div>
      </div>

      {/* Radius & Environment Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Search Radius</Label>
          <Select 
            value={String(data.radiusMiles)} 
            onValueChange={(v) => onChange({ radiusMiles: Number(v) })}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {RADIUS_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Environment</Label>
          <Select 
            value={data.preferredEnvironment || ""} 
            onValueChange={(v) => onChange({ preferredEnvironment: v })}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {ENVIRONMENT_OPTIONS.map((e) => (
                <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Timeline & Assessment Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Timeline <span className="text-destructive">*</span>
          </Label>
          <Select value={data.timeline} onValueChange={(v) => onChange({ timeline: v })}>
            <SelectTrigger className={`h-11 ${errors.timeline ? "border-destructive ring-1 ring-destructive" : ""}`}>
              <SelectValue placeholder="Urgency" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {TIMELINE_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.timeline && <p className="text-xs text-destructive">{errors.timeline}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Start Process <span className="text-destructive">*</span>
          </Label>
          <Select value={data.assessmentPreference} onValueChange={(v) => onChange({ assessmentPreference: v })}>
            <SelectTrigger className={`h-11 ${errors.assessmentPreference ? "border-destructive ring-1 ring-destructive" : ""}`}>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {ASSESSMENT_OPTIONS.map((a) => (
                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.assessmentPreference && <p className="text-xs text-destructive">{errors.assessmentPreference}</p>}
        </div>
      </div>

      {/* Preferences Section */}
      <div className="space-y-3 p-3 rounded-lg bg-muted/30 border">
        <Label className="text-sm font-medium">Special Preferences</Label>
        <div className="space-y-2.5">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <Checkbox
              checked={data.faithBasedPreference === "yes"}
              onCheckedChange={(checked) => onChange({ faithBasedPreference: checked ? "yes" : "no" })}
            />
            <span className="text-sm">Faith-based/spiritual program</span>
          </label>
          
          <label className="flex items-center gap-2.5 cursor-pointer">
            <Checkbox
              checked={data.holisticInterest || false}
              onCheckedChange={(checked) => onChange({ holisticInterest: !!checked })}
            />
            <span className="text-sm">Holistic therapies (yoga, meditation)</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <Checkbox
              checked={data.needsTransport || false}
              onCheckedChange={(checked) => onChange({ needsTransport: !!checked })}
            />
            <span className="text-sm">Need transportation assistance</span>
          </label>
        </div>
      </div>

      {/* Amenities - Chip Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Desired Amenities <span className="text-xs text-muted-foreground">(Optional)</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {AMENITY_OPTIONS.map((amenity) => (
            <button
              key={amenity}
              type="button"
              onClick={() => toggleAmenity(amenity)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                (data.amenityPreferences || []).includes(amenity) 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "bg-muted/50 hover:bg-muted border-border"
              }`}
            >
              {amenity}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
