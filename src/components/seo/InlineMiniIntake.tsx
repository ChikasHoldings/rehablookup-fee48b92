import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Heart, ShieldCheck, ArrowRight } from "lucide-react";
import { z } from "zod";
import { analytics } from "@/lib/analytics";
import { buildConciergeHref } from "@/lib/conciergeHref";
import { emitConciergeFunnelEvent } from "@/lib/conciergeAnalytics";

/**
 * InlineMiniIntake — 3-field above-the-fold capture for SEO landing pages.
 * Submits by routing to /concierge with prefill params (no PII transmitted
 * here; the full intake form on /concierge collects PII under its own
 * validation + RLS rules). Analytics events fire on submit so the funnel
 * can attribute SEO landing → concierge starts in GA4 / Meta Pixel.
 */

const schema = z.object({
  location: z.string().trim().min(2, "Enter a city, state, or zip").max(80),
  levelOfCare: z.string().trim().max(40).optional(),
});

interface InlineMiniIntakeProps {
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

export function InlineMiniIntake({
  source,
  defaultTreatment,
  className,
}: InlineMiniIntakeProps) {
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

    analytics.ctaClick("Inline Mini Intake", source);
    emitConciergeFunnelEvent("concierge_intake_started", {
      source,
      has_location: true,
      has_treatment: Boolean(parsed.data.levelOfCare),
      has_insurance: false,
      applied_any_field: true,
    });

    navigate(
      buildConciergeHref({
        location: parsed.data.location,
        treatment: parsed.data.levelOfCare || undefined,
        source,
      }),
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-xl border border-white/20 bg-white/95 p-4 sm:p-5 shadow-lg backdrop-blur-sm text-foreground ${className ?? ""}`}
      aria-label="Free treatment matching"
    >
      <div className="mb-3 flex items-center gap-2">
        <Heart className="h-4 w-4 text-primary" aria-hidden />
        <p className="text-sm font-semibold">Free, confidential matching — answer 2 quick questions</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1">
          <Label htmlFor="mini-intake-location" className="text-xs text-muted-foreground">
            Your location
          </Label>
          <Input
            id="mini-intake-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, state, or zip"
            autoComplete="address-level2"
            maxLength={80}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mini-intake-care" className="text-xs text-muted-foreground">
            Type of program
          </Label>
          <select
            id="mini-intake-care"
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
          Get Help
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-destructive" role="alert">{error}</p>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
        100% confidential. No obligation. We never sell your information.
      </p>
    </form>
  );
}
