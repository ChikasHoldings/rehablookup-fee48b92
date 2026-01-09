import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  { value: "25", label: "Within 25 miles" },
  { value: "50", label: "Within 50 miles" },
  { value: "100", label: "Within 100 miles" },
  { value: "200", label: "Within 200 miles" },
  { value: "0", label: "Anywhere in state" },
  { value: "-1", label: "Anywhere in country" },
];

const TIMELINE_OPTIONS = [
  { value: "today", label: "Today/Immediately", urgent: true },
  { value: "24-48hrs", label: "Within 24-48 hours", urgent: true },
  { value: "1week", label: "Within 1 week", urgent: false },
  { value: "2weeks", label: "Within 2 weeks", urgent: false },
  { value: "flexible", label: "Flexible timeline", urgent: false },
];

const ENVIRONMENT_OPTIONS = [
  { value: "rural", label: "Rural/Secluded", desc: "Peaceful, nature-focused setting" },
  { value: "suburban", label: "Suburban", desc: "Quiet residential areas" },
  { value: "urban", label: "Urban/City", desc: "Near city amenities" },
  { value: "no_preference", label: "No preference", desc: "Open to any environment" },
];

const ASSESSMENT_OPTIONS = [
  { value: "call_first", label: "Phone call first" },
  { value: "virtual", label: "Virtual video assessment" },
  { value: "in_person", label: "In-person assessment" },
];

const AMENITY_OPTIONS = [
  "Private room",
  "Gym/Fitness center",
  "Pool",
  "Outdoor activities",
  "Pet-friendly",
  "Executive/Luxury amenities",
  "Chef-prepared meals",
  "Holistic therapies (yoga, meditation)",
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
    <TooltipProvider>
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground border-l-4 border-primary/30 pl-4 py-2 bg-muted/30 rounded-r-lg">
          Where would you like to receive treatment? Consider whether staying local for family support or traveling for privacy and a fresh start works best.
        </p>

        {/* Preferred Location */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Preferred Treatment Location</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="desiredState">State *</Label>
              <Select value={data.desiredState} onValueChange={(v) => onChange({ desiredState: v })}>
                <SelectTrigger className={errors.desiredState ? "border-destructive ring-1 ring-destructive" : ""}>
                  <SelectValue placeholder="Select preferred state" />
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
              <Label htmlFor="desiredCity">Preferred City <span className="text-muted-foreground text-xs">(Optional)</span></Label>
              <Input
                id="desiredCity"
                value={data.desiredCity}
                onChange={(e) => onChange({ desiredCity: e.target.value })}
                placeholder="Enter city"
              />
            </div>
          </div>
        </div>

        {/* Search Radius */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Search Radius
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">A wider radius means more program options to choose from.</p>
              </TooltipContent>
            </Tooltip>
          </Label>
          <Select 
            value={String(data.radiusMiles)} 
            onValueChange={(v) => onChange({ radiusMiles: Number(v) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select search radius" />
            </SelectTrigger>
            <SelectContent>
              {RADIUS_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Environment Preference */}
        <div className="space-y-3">
          <Label>Preferred Environment</Label>
          <RadioGroup
            value={data.preferredEnvironment || ""}
            onValueChange={(v) => onChange({ preferredEnvironment: v })}
            className="grid grid-cols-2 gap-3"
          >
            {ENVIRONMENT_OPTIONS.map((env) => (
              <div 
                key={env.value} 
                className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  data.preferredEnvironment === env.value ? "bg-primary/5 border-primary/50" : "hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value={env.value} id={`env-${env.value}`} className="mt-0.5" />
                <div>
                  <Label htmlFor={`env-${env.value}`} className="font-medium cursor-pointer">{env.label}</Label>
                  <p className="text-xs text-muted-foreground">{env.desc}</p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Timeline */}
        <div className="space-y-3">
          <Label>Timeline/Urgency *</Label>
          <RadioGroup
            value={data.timeline}
            onValueChange={(v) => onChange({ timeline: v })}
            className={errors.timeline ? "border border-destructive rounded-md p-2" : "space-y-2"}
          >
            {TIMELINE_OPTIONS.map((t) => (
              <div 
                key={t.value} 
                className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  t.urgent ? "border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20" : ""
                } ${data.timeline === t.value ? "ring-1 ring-primary" : "hover:bg-muted/50"}`}
              >
                <RadioGroupItem value={t.value} id={t.value} />
                <Label htmlFor={t.value} className="font-normal cursor-pointer flex-1">
                  {t.label}
                  {t.urgent && <span className="ml-2 text-xs text-orange-600 dark:text-orange-400">(Priority)</span>}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {errors.timeline && <p className="text-sm text-destructive">{errors.timeline}</p>}
        </div>

        {/* Special Preferences */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
          <Label className="text-base font-medium">Special Preferences</Label>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="faith-based"
                checked={data.faithBasedPreference === "yes"}
                onCheckedChange={(checked) => onChange({ faithBasedPreference: checked ? "yes" : "no" })}
              />
              <Label htmlFor="faith-based" className="font-normal cursor-pointer">
                Interested in faith-based/spiritual program
              </Label>
            </div>
            
            <div className="flex items-center space-x-3">
              <Checkbox
                id="holistic"
                checked={data.holisticInterest || false}
                onCheckedChange={(checked) => onChange({ holisticInterest: !!checked })}
              />
              <Label htmlFor="holistic" className="font-normal cursor-pointer">
                Interested in holistic/alternative therapies (yoga, acupuncture, meditation)
              </Label>
            </div>
          </div>
        </div>

        {/* Amenity Preferences */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            Desired Amenities
            <span className="text-xs text-muted-foreground">(Optional - may affect pricing)</span>
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {AMENITY_OPTIONS.map((amenity) => (
              <div 
                key={amenity} 
                className={`flex items-center space-x-2 p-2.5 rounded-lg border transition-colors cursor-pointer ${
                  (data.amenityPreferences || []).includes(amenity) 
                    ? "bg-primary/10 border-primary/50" 
                    : "hover:bg-muted/50"
                }`}
                onClick={() => toggleAmenity(amenity)}
              >
                <Checkbox
                  id={amenity}
                  checked={(data.amenityPreferences || []).includes(amenity)}
                  onCheckedChange={() => toggleAmenity(amenity)}
                />
                <Label htmlFor={amenity} className="font-normal text-sm cursor-pointer">{amenity}</Label>
              </div>
            ))}
          </div>
        </div>

        {/* Transportation */}
        <div className="space-y-3">
          <Label>Need help with transportation to facility?</Label>
          <RadioGroup
            value={data.needsTransport ? "yes" : "no"}
            onValueChange={(v) => onChange({ needsTransport: v === "yes" })}
          >
            <div className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50">
              <RadioGroupItem value="yes" id="transport-yes" />
              <Label htmlFor="transport-yes" className="font-normal cursor-pointer">Yes, will need transportation assistance</Label>
            </div>
            <div className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50">
              <RadioGroupItem value="no" id="transport-no" />
              <Label htmlFor="transport-no" className="font-normal cursor-pointer">No, we can arrange our own transportation</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Assessment Preference */}
        <div className="space-y-3">
          <Label>How would you prefer to start the process? *</Label>
          <RadioGroup
            value={data.assessmentPreference}
            onValueChange={(v) => onChange({ assessmentPreference: v })}
            className={errors.assessmentPreference ? "border border-destructive rounded-md p-2" : "space-y-2"}
          >
            {ASSESSMENT_OPTIONS.map((a) => (
              <div key={a.value} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                <RadioGroupItem value={a.value} id={a.value} />
                <Label htmlFor={a.value} className="font-normal cursor-pointer">{a.label}</Label>
              </div>
            ))}
          </RadioGroup>
          {errors.assessmentPreference && <p className="text-sm text-destructive">{errors.assessmentPreference}</p>}
        </div>
      </div>
    </TooltipProvider>
  );
}
