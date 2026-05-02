import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { MapPin, Search, Building2, Shield, Navigation } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

/**
 * Treatment options — values mirror the `treatmentTypes` URL-param values
 * already consumed by the SearchResults filter pipeline. Keep in sync.
 */
const TREATMENT_OPTIONS = [
  { value: "detox", label: "Detox" },
  { value: "inpatient", label: "Inpatient" },
  { value: "outpatient", label: "Outpatient" },
  { value: "dual-diagnosis", label: "Dual Diagnosis" },
  { value: "holistic", label: "Holistic" },
] as const;

const INSURANCE_OPTIONS = [
  { value: "aetna", label: "Aetna" },
  { value: "bcbs", label: "Blue Cross Blue Shield" },
  { value: "cigna", label: "Cigna" },
  { value: "united", label: "United Healthcare" },
  { value: "kaiser", label: "Kaiser Permanente" },
  { value: "humana", label: "Humana" },
  { value: "anthem", label: "Anthem" },
  { value: "medicare", label: "Medicare" },
  { value: "medicaid", label: "Medicaid" },
  { value: "tricare", label: "TRICARE" },
] as const;

const DISTANCE_OPTIONS = [
  { value: "10", label: "Within 10 miles" },
  { value: "25", label: "Within 25 miles" },
  { value: "50", label: "Within 50 miles" },
  { value: "100", label: "Within 100 miles" },
] as const;

const ANY_VALUE = "__any__";

/**
 * Inline search form for the /search-results page.
 *
 * Visual structure (desktop):
 *   ┌──────────────────────────────────┬─ refinements ─┬───────┐
 *   │  📍 Location (prominent)         │ Dist · Tx · Ins│ 🔍 Search │
 *   └──────────────────────────────────┴────────────────┴───────┘
 *
 * Location is the hero input; refinement selects are grouped together inside
 * a subtle bordered cluster so users perceive them as "filters" distinct from
 * the primary "where" question. Search button is visually anchored on the right.
 */
export function SearchResultsForm() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [location, setLocation] = useState(searchParams.get("location") ?? "");
  const [treatment, setTreatment] = useState<string>(() => {
    const raw = searchParams.get("treatmentTypes") ?? "";
    return raw.split(",").filter(Boolean)[0] ?? "";
  });
  const [insurance, setInsurance] = useState<string>(() => {
    const raw = searchParams.get("insuranceTypes") ?? "";
    return raw.split(",").filter(Boolean)[0] ?? "";
  });
  const [distance, setDistance] = useState<string>(searchParams.get("distance") ?? "");

  useEffect(() => {
    setLocation(searchParams.get("location") ?? "");
    const t = (searchParams.get("treatmentTypes") ?? "").split(",").filter(Boolean)[0] ?? "";
    setTreatment(t);
    const i = (searchParams.get("insuranceTypes") ?? "").split(",").filter(Boolean)[0] ?? "";
    setInsurance(i);
    setDistance(searchParams.get("distance") ?? "");
  }, [searchParams]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);

    const trimmedLocation = location.trim();
    if (trimmedLocation) {
      next.set("location", trimmedLocation);
    } else {
      next.delete("location");
    }

    if (treatment) next.set("treatmentTypes", treatment);
    else next.delete("treatmentTypes");

    if (insurance) next.set("insuranceTypes", insurance);
    else next.delete("insuranceTypes");

    if (distance) next.set("distance", distance);
    else next.delete("distance");

    next.delete("page");
    setSearchParams(next);
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      aria-label="Search rehab centers"
      className="w-full"
    >
      {/* Unified pill container — visually anchors the whole search */}
      <div className="flex flex-col lg:flex-row lg:items-stretch gap-2 lg:gap-0 lg:rounded-full lg:border lg:border-border lg:bg-card lg:shadow-sm lg:p-1.5 lg:focus-within:ring-2 lg:focus-within:ring-primary/20 lg:focus-within:border-primary/40 transition-all">
        {/* PRIMARY: Location — prominent on desktop */}
        <div className="relative w-full lg:flex-1 lg:min-w-[280px] lg:max-w-[360px] lg:w-auto">
          <label
            htmlFor="search-location"
            className="hidden lg:flex items-center gap-1.5 absolute left-5 top-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70 pointer-events-none"
          >
            <MapPin className="h-3 w-3" aria-hidden="true" />
            Location
          </label>
          <MapPin
            className="lg:hidden pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="search-location"
            type="text"
            inputMode="search"
            autoComplete="postal-code"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter ZIP, city, or state"
            aria-label="Location: ZIP code, city, or state"
            className="h-11 pl-9 text-sm lg:h-12 lg:pl-5 lg:pr-4 lg:pt-5 lg:pb-1 lg:text-base lg:font-medium lg:border-0 lg:bg-transparent lg:shadow-none lg:rounded-full lg:focus-visible:ring-0 lg:placeholder:text-muted-foreground/60"
          />
        </div>

        {/* Vertical divider on desktop */}
        <div className="hidden lg:flex items-center px-1">
          <div className="h-7 w-px bg-border" aria-hidden="true" />
        </div>

        {/* GROUPED REFINEMENTS: distance · treatment · insurance */}
        <div
          role="group"
          aria-label="Refine results"
          className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 lg:flex lg:items-center lg:gap-1.5 lg:flex-1 lg:w-auto"
        >
          <Select
            value={distance || ANY_VALUE}
            onValueChange={(v) => setDistance(v === ANY_VALUE ? "" : v)}
          >
            <SelectTrigger
              className="h-11 text-sm px-3 lg:h-10 lg:flex-1 lg:rounded-full lg:border-0 lg:bg-muted/50 hover:lg:bg-muted transition-colors"
              aria-label="Distance from location"
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <Navigation className="hidden md:block h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                <span className="truncate text-left">
                  {distance
                    ? DISTANCE_OPTIONS.find((o) => o.value === distance)?.label ?? "Distance"
                    : "Distance"}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent className="bg-card">
              <SelectItem value={ANY_VALUE}>Any distance</SelectItem>
              {DISTANCE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={treatment || ANY_VALUE}
            onValueChange={(v) => setTreatment(v === ANY_VALUE ? "" : v)}
          >
            <SelectTrigger
              className="h-11 text-sm px-3 lg:h-10 lg:flex-1 lg:rounded-full lg:border-0 lg:bg-muted/50 hover:lg:bg-muted transition-colors"
              aria-label="Treatment type"
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <Building2 className="hidden md:block h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                <span className="truncate text-left">
                  {treatment
                    ? TREATMENT_OPTIONS.find((o) => o.value === treatment)?.label ?? "Treatment"
                    : "Treatment"}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent className="bg-card">
              <SelectItem value={ANY_VALUE}>Any treatment</SelectItem>
              {TREATMENT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={insurance || ANY_VALUE}
            onValueChange={(v) => setInsurance(v === ANY_VALUE ? "" : v)}
          >
            <SelectTrigger
              className="h-11 text-sm px-3 sm:col-span-2 md:col-span-1 lg:h-10 lg:flex-1 lg:rounded-full lg:border-0 lg:bg-muted/50 hover:lg:bg-muted transition-colors"
              aria-label="Insurance (optional)"
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <Shield className="hidden md:block h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                <span className="truncate text-left">
                  {insurance
                    ? INSURANCE_OPTIONS.find((o) => o.value === insurance)?.label ?? "Insurance"
                    : "Insurance"}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent className="bg-card">
              <SelectItem value={ANY_VALUE}>Any insurance</SelectItem>
              {INSURANCE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* SEARCH — anchored CTA */}
        <div className="lg:pl-1.5 lg:flex lg:items-center">
          <Button
            type="submit"
            className="h-11 w-full lg:h-10 lg:w-auto lg:px-5 lg:rounded-full gap-2 font-semibold shadow-sm"
            aria-label="Search rehab centers"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="lg:inline">Search</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
