import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, ShieldCheck, ArrowRight } from "lucide-react";
import { z } from "zod";
import { analytics } from "@/lib/analytics";

/**
 * InlineMiniSearch — 2-field above-the-fold directory search for SEO
 * landing pages.
 *
 * Replaces the former InlineMiniIntake, which fed the retired concierge
 * placement funnel (directory cutover stage 1). It never collected PII
 * then and does not now: the two inputs are pre-filled search filters
 * that route straight to /search-results, which already understands
 * `location` and `treatment`.
 */

const schema = z.object({
  location: z.string().trim().min(2, "Enter a city, state, or zip").max(80),
  levelOfCare: z.string().trim().max(40).optional(),
});

interface InlineMiniSearchProps {
  source: string;
  defaultTreatment?: string;
  className?: string;
}

const LEVEL_OF_CARE_OPTIONS = [
  { value: "", label: "Any program" },
  { value: "detox", label: "Detox" },
  { value: "inpatient", label: "Inpatient / Residential" },
  { value: "outpatient", label: "Outpatient (PHP/IOP)" },
  { value: "dual-diagnosis", label: "Dual Diagnosis" },
];

export function InlineMiniSearch({
  source,
  defaultTreatment,
  className,
}: InlineMiniSearchProps) {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [levelOfCare, setLevelOfCare] = useState(defaultTreatment ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ location, levelOfCare });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please enter your location");
      return;
    }
    setError(null);

    analytics.ctaClick("Inline Mini Search", source);

    const params = new URLSearchParams();
    params.set("location", parsed.data.location);
    if (parsed.data.levelOfCare) params.set("treatment", parsed.data.levelOfCare);
    navigate(`/search-results?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-xl border border-white/20 bg-white/95 p-4 sm:p-5 shadow-lg backdrop-blur-sm text-foreground ${className ?? ""}`}
      aria-label="Search treatment centers"
    >
      <div className="mb-3 flex items-center gap-2">
        <Search className="h-4 w-4 text-primary" aria-hidden />
        <p className="text-sm font-semibold">Search treatment centers by location and level of care</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1">
          <Label htmlFor="mini-search-location" className="text-xs text-muted-foreground">
            Location
          </Label>
          <Input
            id="mini-search-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, state, or zip"
            autoComplete="address-level2"
            maxLength={80}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mini-search-care" className="text-xs text-muted-foreground">
            Type of program
          </Label>
          <select
            id="mini-search-care"
            value={levelOfCare}
            onChange={(e) => setLevelOfCare(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {LEVEL_OF_CARE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <Button type="submit" size="lg" className="gap-1.5">
          Search
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-destructive" role="alert">{error}</p>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
        Browsing is free and anonymous — no account required.
      </p>
    </form>
  );
}
