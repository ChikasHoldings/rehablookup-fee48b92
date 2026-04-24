import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { MapPin, Search, Building2, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Treatment options — values mirror the `treatmentTypes` URL-param values
 * already consumed by the SearchResults filter pipeline (see
 * `treatmentTypeFilters` in SearchResults.tsx). Keep in sync.
 */
const TREATMENT_OPTIONS = [
  { value: "detox", label: "Detox" },
  { value: "inpatient", label: "Inpatient" },
  { value: "outpatient", label: "Outpatient" },
  { value: "dual-diagnosis", label: "Dual Diagnosis" },
  { value: "holistic", label: "Holistic" },
] as const;

/**
 * Insurance options — values mirror the `insuranceTypes` URL-param values
 * already consumed by the SearchResults filter pipeline (see
 * `insuranceFilters` in SearchResults.tsx). Keep in sync.
 */
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

const ANY_VALUE = "__any__";

/**
 * Inline search form for the /search-results page.
 *
 * - Location field accepts ZIP, "City, State", state name/abbrev, or city
 *   (parsed downstream by `parseLocationInput`).
 * - Treatment dropdown is single-select and writes a single value to the
 *   `treatmentTypes` param (the param itself is comma-separated and the
 *   sidebar still supports multi-select).
 * - Insurance dropdown is optional and writes to the `insuranceTypes` param
 *   the same way.
 * - Submitting writes to URL search params; the SearchResults page reacts
 *   automatically. Resets pagination to page 1.
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

  // Keep the form in sync if URL params change elsewhere (e.g. sidebar pills).
  useEffect(() => {
    setLocation(searchParams.get("location") ?? "");
    const t = (searchParams.get("treatmentTypes") ?? "").split(",").filter(Boolean)[0] ?? "";
    setTreatment(t);
    const i = (searchParams.get("insuranceTypes") ?? "").split(",").filter(Boolean)[0] ?? "";
    setInsurance(i);
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

    if (treatment) {
      next.set("treatmentTypes", treatment);
    } else {
      next.delete("treatmentTypes");
    }

    if (insurance) {
      next.set("insuranceTypes", insurance);
    } else {
      next.delete("insuranceTypes");
    }

    // Reset pagination on a fresh search.
    next.delete("page");
    setSearchParams(next);
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      aria-label="Search rehab centers"
      className="grid grid-cols-1 gap-2 sm:grid-cols-12"
    >
      {/* Location */}
      <div className="relative sm:col-span-5">
        <MapPin
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="text"
          inputMode="search"
          autoComplete="postal-code"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="ZIP, city, or state"
          aria-label="Location: ZIP code, city, or state"
          className="h-10 pl-9 text-sm"
        />
      </div>

      {/* Treatment type */}
      <div className="sm:col-span-3">
        <Select
          value={treatment || ANY_VALUE}
          onValueChange={(v) => setTreatment(v === ANY_VALUE ? "" : v)}
        >
          <SelectTrigger
            className="h-10 text-sm"
            aria-label="Treatment type"
          >
            <span className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <SelectValue placeholder="Treatment type" />
            </span>
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
      </div>

      {/* Insurance (optional) */}
      <div className="sm:col-span-3">
        <Select
          value={insurance || ANY_VALUE}
          onValueChange={(v) => setInsurance(v === ANY_VALUE ? "" : v)}
        >
          <SelectTrigger
            className="h-10 text-sm"
            aria-label="Insurance (optional)"
          >
            <span className="flex items-center gap-2 truncate">
              <Shield className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <SelectValue placeholder="Insurance (optional)" />
            </span>
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

      {/* Submit */}
      <div className="sm:col-span-1">
        <Button
          type="submit"
          className="h-10 w-full gap-2"
          aria-label="Search rehab centers"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          <span className="sm:hidden">Search</span>
        </Button>
      </div>
    </form>
  );
}
