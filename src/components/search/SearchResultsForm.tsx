import { useEffect, useState, useRef, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { MapPin, Search, Building2, Shield, Loader2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { TREATMENT_FILTERS, INSURANCE_FILTERS } from "@/lib/searchFilters";
import { useZipcodeLookup } from "@/hooks/useZipcodeLookup";

// Treatment + insurance options come from the canonical filter library so
// the sticky refinement form, the sidebar multi-select, and the
// /rehab-centers browse dropdowns stay in lockstep. Adding a new option in
// one place propagates everywhere; matchers in src/lib/searchFilters.ts
// guarantee the URL values resolve to data regardless of cosmetic
// whitespace / casing.
const TREATMENT_OPTIONS = TREATMENT_FILTERS;
const INSURANCE_OPTIONS = INSURANCE_FILTERS;

// No distance options. The catalogue carries no latitude/longitude, so a
// "Within 25 miles" control could only ever be a guess dressed up as a
// measurement. The field is gone from the form and `?distance=` is inert
// everywhere it is still read. See src/pages/SearchResults.tsx.

const ANY_VALUE = "__any__";

/**
 * Inline search form for the /search-results page.
 *
 * Visual structure (desktop):
 *   ┌──────────────────────────────────┬─ refinements ─┬───────┐
 *   │  📍 Location (prominent)         │  Tx  ·  Ins    │ 🔍 Search │
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
  // ZIP-code autocomplete: when the user types a 5-digit numeric in the
  // location field, debounce-lookup the ZIP and surface the resolved
  // city/state as inline feedback.
  //
  // PRESENTATION ONLY. The resolved "City, ST" is shown next to the
  // input and announced to screen readers; it is never substituted into
  // the submitted query. A user who types 21215 gets `?location=21215`
  // and a `{ type: "zip", zip: "21215" }` filter — not every facility in
  // Baltimore. Widening an exact ZIP into its city is the exact failure
  // this form used to ship.
  const { data: zipcodeData, isLoading: isZipLookupLoading, lookup: lookupZipcode, reset: resetZipLookup } = useZipcodeLookup();
  const lookupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocation(searchParams.get("location") ?? "");
    const t = (searchParams.get("treatmentTypes") ?? "").split(",").filter(Boolean)[0] ?? "";
    setTreatment(t);
    const i = (searchParams.get("insuranceTypes") ?? "").split(",").filter(Boolean)[0] ?? "";
    setInsurance(i);
  }, [searchParams]);

  // Debounced ZIP detection — runs whenever the location string changes.
  useEffect(() => {
    if (lookupTimeoutRef.current) {
      clearTimeout(lookupTimeoutRef.current);
      lookupTimeoutRef.current = null;
    }
    const cleanZip = location.trim().replace(/\D/g, "");
    if (cleanZip.length === 5 && /^\d{5}$/.test(location.trim())) {
      lookupTimeoutRef.current = setTimeout(() => {
        lookupZipcode(cleanZip);
      }, 300);
    } else {
      resetZipLookup();
    }
    return () => {
      if (lookupTimeoutRef.current) {
        clearTimeout(lookupTimeoutRef.current);
        lookupTimeoutRef.current = null;
      }
    };
  }, [location, lookupZipcode, resetZipLookup]);

  const isCompleteZipcode = /^\d{5}$/.test(location.trim());

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);

    // The user's location string goes to the URL verbatim. A ZIP stays a
    // ZIP: `21215` submits as `location=21215`, which the canonical
    // parser resolves to `{ type: "zip", zip: "21215" }` and matches on
    // the 5-digit code alone (ZIP+4 folds to its base in the normalizer).
    // The Zippopotam lookup above informs the on-screen label and nothing
    // else — a successful lookup must never widen the query.
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

    // Drop any stale `?distance=` a bookmark or old link carried in.
    // Nothing reads it any more, but leaving it in the URL implies a
    // radius filter is active.
    next.delete("distance");

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
            aria-describedby={isCompleteZipcode ? "zip-resolved" : undefined}
            className="h-11 pl-9 pr-9 text-sm lg:h-12 lg:pl-5 lg:pr-9 lg:pt-5 lg:pb-1 lg:text-base lg:font-medium lg:border-0 lg:bg-transparent lg:shadow-none lg:rounded-full lg:focus-visible:ring-0 lg:placeholder:text-muted-foreground/60"
          />
          {/* ZIP-resolution indicator: spinner while in flight, check
              when resolved. The resolved city/state is announced via the
              aria-describedby slot for screen readers. */}
          {isCompleteZipcode && isZipLookupLoading && (
            <Loader2
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          )}
          {isCompleteZipcode && !isZipLookupLoading && zipcodeData?.city && (
            <CheckCircle2
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500"
              aria-hidden="true"
            />
          )}
          {isCompleteZipcode && zipcodeData?.city && zipcodeData?.stateAbbr && (
            <p
              id="zip-resolved"
              className="mt-1 text-xs text-emerald-700 dark:text-emerald-400 lg:absolute lg:left-5 lg:bottom-0 lg:translate-y-full lg:mt-0 lg:pt-0.5"
            >
              <span className="lg:hidden">ZIP {location.trim()} is in </span>
              <span className="font-medium">{zipcodeData.city}, {zipcodeData.stateAbbr}</span>
              <span className="lg:hidden"> — searching ZIP {location.trim()}</span>
            </p>
          )}
        </div>

        {/* Vertical divider on desktop */}
        <div className="hidden lg:flex items-center px-1">
          <div className="h-7 w-px bg-border" aria-hidden="true" />
        </div>

        {/* GROUPED REFINEMENTS: treatment · insurance */}
        <div
          role="group"
          aria-label="Refine results"
          className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 lg:flex lg:items-center lg:gap-1.5 lg:flex-1 lg:w-auto"
        >
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
              className="h-11 text-sm px-3 lg:h-10 lg:flex-1 lg:rounded-full lg:border-0 lg:bg-muted/50 hover:lg:bg-muted transition-colors"
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
