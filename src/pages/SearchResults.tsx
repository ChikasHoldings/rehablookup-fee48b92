import { useMemo, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateSearchResultsSchema } from "@/components/SEO";
import { SearchResultCard } from "@/components/cards/SearchResultCard";
import { FeaturedRail } from "@/components/featured/FeaturedRail";
import { resolveSearchBucket } from "@/lib/featuredBucket";
import { DataPagination } from "@/components/common/DataPagination";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { scrollToTopSmooth } from "@/hooks/useScrollToTop";
import { SearchResultsForm } from "@/components/search/SearchResultsForm";

import { NoResultsDirectoryCTA } from "@/components/search/NoResultsDirectoryCTA";
import { AreaWaitlistCapture } from "@/components/seo/AreaWaitlistCapture";
import { MapPin, Search, X, ArrowUpDown, ChevronLeft, ChevronRight, Phone, SlidersHorizontal, Building2, Shield, DollarSign, Sparkles, ChevronDown, CreditCard, Share2, Check, AlertCircle, RefreshCw, Scale } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


import { Badge } from "@/components/ui/badge";
import { 
  parseLocationInput, 
  enrichLocationMatchWithZip,
  getProximityTier,
  getNearbyStates,
  PROXIMITY_TIER_ORDER,
  type LocationMatch,
  type ProximityTier
} from "@/lib/proximitySearch";
import {
  describeScope,
  normalizeState,
  parseLocation,
  splitByLocation,
  stateDisplayName,
  stateSlugFor,
  type LocationScope,
} from "@/lib/location";
import { useZipcodeLookup } from "@/hooks/useZipcodeLookup";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getPlanRank } from "@/lib/facilityPlanSort";
import { analytics } from "@/lib/analytics";
import {
  TREATMENT_FILTERS,
  INSURANCE_FILTERS,
  matchesTreatmentFilter,
  matchesInsuranceFilter,
  countTreatmentFacets,
  countInsuranceFacets,
  asSearchableFacility,
} from "@/lib/searchFilters";
import {
  activeFilterCount,
  canonicalizeSearchParams,
  clearAllSearchParams,
  insuranceLabel,
  parsePublicSearchState,
  treatmentLabel,
} from "@/lib/publicSearchState";
import { isMeaningfulQuery, matchesFreeTextQuery, MIN_TOKEN_LENGTH } from "@/lib/publicSearchText";

// Restore user ID from localStorage to avoid getSession/getUser deadlocks
function getStoredUserId(): string | null {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const projectRef = supabaseUrl?.split('//')[1]?.split('.')[0] || 'mldbxpntzcjalgjmwnqa';
    const storageKey = `sb-${projectRef}-auth-token`;
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    const session = parsed?.currentSession || parsed;
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

const ITEMS_PER_PAGE = 12;

type SortOption = "proximity" | "featured" | "rating-high" | "rating-low" | "name-asc" | "name-desc";

// The internal key stays "proximity" (it is what `getProximityTier`
// returns and what every URL already carries). The PUBLIC label may not
// say "Nearest" / "Closest" / "Distance": with no latitude or longitude
// in the catalogue we order by categorical location match — same ZIP,
// then same city, then same state, then a neighbouring state — which is
// a relevance ordering, not a measured one.
const sortOptions: { value: SortOption; label: string }[] = [
  { value: "proximity", label: "Location Match" },
  { value: "featured", label: "Featured First" },
  { value: "rating-high", label: "Highest Rated" },
  { value: "rating-low", label: "Lowest Rated" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
];

// Treatment + insurance filter options live in `src/lib/searchFilters.ts`
// (shared with `RehabCenters.tsx`) so a change to a `matches` array only has
// to happen in one place. Imported above as TREATMENT_FILTERS / INSURANCE_FILTERS.

// NO DISTANCE FILTERS. The `facilities` table has city, state, zip_code
// and address — no latitude and no longitude. "Within 25 miles" was
// implemented by mapping the mile value onto the categorical proximity
// tier (exact / city / state / neighbouring state), which is not a
// distance and cannot be made into one without coordinates. The control,
// the chip and the filtering step are all gone; `?distance=` on an old
// bookmark is read by nothing and narrows nothing. Restoring a radius
// filter requires real coordinates first.

/**
 * Crawler-facing wording for ONE resolved location scope.
 *
 * The result set on this page is exact-only: `splitByLocation` keeps
 * `exact` and `nearby` in separate buckets, and only `exact` is counted,
 * paginated and headed ("N facilities in <describeScope(...)>"). The
 * <title> and meta description have to describe that same set. They used
 * to say "Rehab Centers Near Los Angeles, CA", which promises a measured
 * proximity the catalogue cannot support — `facilities` carries city,
 * state, zip_code and address and no coordinates, so there is no radius,
 * no distance, and therefore no "near" / "nearby" / "nearest" /
 * "closest" / "within X miles" on an exact-scope page.
 *
 * `describeScope` stays the single source of the place label — this is
 * NOT a second location parser. The only per-type work here is grammar:
 * `title` slots into "Rehab Centers in <title>" and `sentence` into
 * "...listings in <sentence>", and a state reads better under its
 * canonical full name than under the bare abbreviation `describeScope`
 * returns.
 *
 * Returns null for the two scopes that must never be phrased as "in
 * <place>":
 *   county     — no facility→county data exists, so the county branch
 *                writes its own qualified copy instead of a claim.
 *   unresolved — we never learned which place the string meant, so
 *                neutral search wording is the only truthful option.
 */
function seoScopeWording(
  scope: LocationScope | null,
): { title: string; sentence: string } | null {
  if (!scope) return null;
  switch (scope.type) {
    case "city":
    case "zip": {
      // "Los Angeles, CA" / "ZIP 21215" — already title-shaped.
      const label = describeScope(scope);
      return { title: label, sentence: label };
    }
    case "state": {
      const label = stateDisplayName(scope.state) ?? scope.state;
      return { title: label, sentence: label };
    }
    case "city-any-state":
      // A bare "Springfield" is EVERY Springfield in the country. The
      // copy has to reveal that span, or it names one town while listing
      // several states' worth. `describeScope` writes it as a
      // mid-sentence fragment ("cities named Springfield across the
      // U.S."), which is exactly what the description needs; the title
      // says the same thing in title case.
      return {
        title: `Cities Named ${scope.city} Across the U.S.`,
        sentence: describeScope(scope),
      };
    default:
      return null;
  }
}

// NO AMENITIES FILTER. Private Rooms / Fitness Center / Swimming Pool /
// Meditation were never structured attributes — the canonical facility
// dataset exposes none — so the filter INFERRED them by substring over the
// description and the treatment-type strings: "pool" matched "pooling",
// "private" + "room" matched a sentence about privacy in a room, and
// "meditation" matched any facility whose narrative used the word
// "holistic". That publishes an inference as a fact about a facility, which
// is the same class of claim the distance filter was removed for. The
// control, the chips and the membership step are gone; a stale
// `?amenities=pool` narrows nothing. It is still counted by
// `hasSearchParams` (so an old filtered URL does not become newly indexable
// merely because we stopped honouring its filter) and is deleted from the
// URL on the next user interaction. Restoring an amenities filter requires
// structured amenity data first.


// ── SHARED FILTER PANEL ───────────────────────────────────────────────────
//
// One component, rendered by BOTH the desktop sidebar and the mobile sheet,
// declared at module scope. Previously these lived inside the SearchResults
// function body, which made them a new component TYPE on every render: React
// tore down and rebuilt the whole panel after each filter click, dropping
// keyboard focus and closing the accordion mid-interaction. Module scope also
// makes desktop/mobile parity structural rather than a convention — there is
// only one implementation of the values, counts, disabled states and
// clear-all behaviour, so they cannot drift.

interface FilterSectionProps {
  id: string;
  icon: ReactNode;
  label: string;
  children: ReactNode;
  count?: number;
  openSection: string | null;
  onToggleSection: (section: string) => void;
}

/** Collapsible filter section. Hairline-divided rows (no per-section
 *  border/rounded box) — each section is a button-header + collapsible body
 *  separated from siblings by the divide-y on the parent. */
const FilterSection = ({
  id,
  icon,
  label,
  children,
  count,
  openSection,
  onToggleSection,
}: FilterSectionProps) => {
  const isOpen = openSection === id;
  const bodyId = `filter-section-${id}`;
  return (
    <div>
      <button
        type="button"
        onClick={() => onToggleSection(id)}
        className="w-full flex items-center justify-between py-3.5 text-sm font-semibold text-foreground hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded"
        aria-expanded={isOpen}
        aria-controls={bodyId}
      >
        <span className="flex items-center gap-2.5">
          <span className="text-muted-foreground">{icon}</span>
          {label}
          {count && count > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground tabular-nums">{count}</span>
          ) : null}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      <div
        id={bodyId}
        hidden={!isOpen}
        className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="pb-4 pt-0">
          {children}
        </div>
      </div>
    </div>
  );
};

interface FilterToggleRowProps {
  active: boolean;
  disabled: boolean;
  count?: number;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  activeClassName?: string;
  /** Filter group this row belongs to — surfaced for parity assertions. */
  group: string;
  /** Canonical filter value — surfaced for parity assertions. */
  value: string;
}

/** One multi-select filter row. Selecting several rows inside one group is
 *  an OR; the groups AND together. A row that is ACTIVE is never disabled,
 *  even when its recomputed count is zero — the user must always be able to
 *  undo the choice that emptied the result set. */
const FilterToggleRow = ({
  active,
  disabled,
  count,
  label,
  icon,
  onClick,
  activeClassName,
  group,
  value,
}: FilterToggleRowProps) => (
  <button
    type="button"
    onClick={() => { if (!disabled) onClick(); }}
    aria-pressed={active}
    aria-disabled={disabled}
    disabled={disabled}
    // Machine-readable mirror of everything this row asserts, so the
    // desktop/mobile parity suite can compare the two rendered panels
    // field by field instead of eyeballing two screenshots.
    data-testid="filter-option"
    data-group={group}
    data-value={value}
    data-count={count}
    data-active={active ? "true" : "false"}
    data-disabled={disabled ? "true" : "false"}
    className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
      active
        ? activeClassName ?? "bg-primary/10 text-primary font-medium border border-primary/20"
        : disabled
        ? "text-muted-foreground/50 border border-transparent cursor-not-allowed"
        : "text-foreground hover:bg-secondary/60 border border-transparent"
    }`}
  >
    <span className="flex items-center gap-2 min-w-0">
      {icon}
      <span className="truncate">{label}</span>
    </span>
    <span className="flex items-center gap-2 shrink-0">
      {typeof count === "number" && (
        <span className="text-xs text-muted-foreground tabular-nums">({count.toLocaleString()})</span>
      )}
      {active && <X className="h-3.5 w-3.5" aria-hidden="true" />}
    </span>
  </button>
);

export interface FilterSidebarProps {
  sortParam: SortOption;
  onSortChange: (value: SortOption) => void;
  openSection: string | null;
  onToggleSection: (section: string) => void;
  activeTreatment: string[];
  activeInsurance: string[];
  treatmentFacets: Record<string, number>;
  insuranceFacets: Record<string, number>;
  verifiedOnly: boolean;
  featuredOnly: boolean;
  verifiedFacetCount: number;
  featuredFacetCount: number;
  onToggleTreatment: (value: string) => void;
  onToggleInsurance: (value: string) => void;
  onToggleBoolean: (paramName: string, currentValue: boolean) => void;
  activeFiltersCount: number;
  onClearAll: () => void;
  /** "desktop" | "mobile" — identifies which panel rendered these rows. */
  panel: string;
}

const FilterSidebar = ({
  sortParam,
  onSortChange,
  openSection,
  onToggleSection,
  activeTreatment,
  activeInsurance,
  treatmentFacets,
  insuranceFacets,
  verifiedOnly,
  featuredOnly,
  verifiedFacetCount,
  featuredFacetCount,
  onToggleTreatment,
  onToggleInsurance,
  onToggleBoolean,
  activeFiltersCount,
  onClearAll,
  panel,
}: FilterSidebarProps) => (
  <div className="divide-y divide-border/70" data-testid="filter-panel" data-panel={panel}>
    {/* Sort — same FilterSection chrome as everything else so the
        sidebar reads as one consistent column. */}
    <FilterSection
      id="sort"
      icon={<ArrowUpDown className="h-3.5 w-3.5" />}
      label="Sort by"
      openSection={openSection}
      onToggleSection={onToggleSection}
    >
      <Select value={sortParam} onValueChange={(v) => onSortChange(v as SortOption)}>
        <SelectTrigger className="w-full h-10 text-sm border-border bg-background" aria-label="Sort results by">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent className="bg-card border-border shadow-lg">
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-sm cursor-pointer">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FilterSection>

    {/* Treatment type — MULTI-select, OR within the group. Was a
        single-value <Select> bound to `selectedTreatmentTypes[0]`, which
        rendered a multi-value URL as if only the first value were active.
        Counts are self-excluding: each number is the size of the result set
        the user would get by picking that option, with every OTHER active
        constraint (location, free text, payment, quick filters) applied. */}
    <FilterSection
      id="treatment"
      icon={<Building2 className="h-3.5 w-3.5" />}
      label="Treatment type"
      count={activeTreatment.length}
      openSection={openSection}
      onToggleSection={onToggleSection}
    >
      <div className="space-y-1.5" role="group" aria-label="Treatment type filters">
        {TREATMENT_FILTERS.map((filter) => {
          const active = activeTreatment.includes(filter.value);
          const count = treatmentFacets[filter.value] ?? 0;
          return (
            <FilterToggleRow
              key={filter.value}
              group="treatment"
              value={filter.value}
              active={active}
              disabled={count === 0 && !active}
              count={count}
              label={filter.label}
              icon={<Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
              onClick={() => onToggleTreatment(filter.value)}
            />
          );
        })}
      </div>
    </FilterSection>

    {/* No Distance section — see the note beside `sortOptions`. */}
    {/* No Amenities section — see the note beside the removed registry. */}

    {/* PAYMENT & INSURANCE. The group is NOT called "Insurance": the options
        include Self-Pay / Private Pay and Sliding Scale / Financial
        Assistance, which are payment methods, not carriers. Calling the
        whole group "Insurance" told the user every option was a plan the
        facility is in network with — a claim the underlying records do not
        establish. Individual option labels are unchanged. */}
    <FilterSection
      id="insurance"
      icon={<Shield className="h-3.5 w-3.5" />}
      label="Payment & insurance"
      count={activeInsurance.length}
      openSection={openSection}
      onToggleSection={onToggleSection}
    >
      <div className="space-y-1.5" role="group" aria-label="Payment and insurance filters">
        {INSURANCE_FILTERS.map((filter) => {
          const active = activeInsurance.includes(filter.value);
          const count = insuranceFacets[filter.value] ?? 0;
          return (
            <FilterToggleRow
              key={filter.value}
              group="insurance"
              value={filter.value}
              active={active}
              disabled={count === 0 && !active}
              count={count}
              label={filter.label}
              icon={filter.logo ? (
                <img
                  src={filter.logo}
                  alt=""
                  aria-hidden="true"
                  className="h-3.5 w-4 object-contain shrink-0"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <CreditCard className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              onClick={() => onToggleInsurance(filter.value)}
            />
          );
        })}
      </div>
    </FilterSection>

    {/* Quick filters. Both are structured booleans on the facility record —
        `verified === true` and `featured === true` — so their counts are as
        truthful as the other groups' and are shown the same way. Each
        self-excludes: the Verified count applies every constraint except
        Verified itself. */}
    <FilterSection
      id="quick"
      icon={<Sparkles className="h-3.5 w-3.5" />}
      label="Quick filters"
      count={(verifiedOnly ? 1 : 0) + (featuredOnly ? 1 : 0)}
      openSection={openSection}
      onToggleSection={onToggleSection}
    >
      <div className="space-y-1.5" role="group" aria-label="Quick filters">
        <FilterToggleRow
          group="quick"
          value="verified"
          active={verifiedOnly}
          disabled={verifiedFacetCount === 0 && !verifiedOnly}
          count={verifiedFacetCount}
          label="Verified only"
          icon={<Shield className="h-4 w-4 shrink-0" aria-hidden="true" />}
          onClick={() => onToggleBoolean("verified", verifiedOnly)}
        />
        <FilterToggleRow
          group="quick"
          value="featuredOnly"
          active={featuredOnly}
          disabled={featuredFacetCount === 0 && !featuredOnly}
          count={featuredFacetCount}
          label="Featured only"
          icon={<Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />}
          onClick={() => onToggleBoolean("featuredOnly", featuredOnly)}
          activeClassName="bg-amber-50 text-amber-700 font-medium border border-amber-200"
        />
      </div>
    </FilterSection>

    {/* Clear-all — appears at the bottom of the divider stack as
        its own row when any filter is active. */}
    {activeFiltersCount > 0 && (
      <div className="pt-3">
        <button
          type="button"
          onClick={onClearAll}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Clear all filters ({activeFiltersCount})
        </button>
      </div>
    )}
  </div>
);

// Directory helper CTA — rendered OUTSIDE the FilterSidebar component so
// it sits below the divider stack with its own breathing room. Was
// previously the last child of FilterSidebar which made it inherit
// the new divide-y rule and stack visually adjacent to the filter
// sections; the standalone block reads more like a contextual
// affordance, less like another filter.
const DirectoryHelperCTA = () => (
  <div className="mt-5 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 border border-primary/15">
    <div className="flex items-center gap-3 mb-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10 shrink-0">
        <Scale className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground">Narrowed it down?</p>
        <p className="text-xs text-muted-foreground">Compare your shortlist side by side</p>
      </div>
    </div>
    <Link to="/compare">
      <Button size="sm" className="w-full gap-2 text-xs">
        <Scale className="h-3.5 w-3.5" />
        Compare Facilities
      </Button>
    </Link>
  </div>
);


const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [shareCopied, setShareCopied] = useState(false);
  
  // ── ONE CANONICAL FILTER STATE ──────────────────────────────────────
  // Every treatment/payment refinement on this page is read from here and
  // nowhere else. `parsePublicSearchState` collapses the three treatment
  // spellings (`treatmentTypes`, legacy `treatment`, legacy `type` preset)
  // and the two payment spellings (`insuranceTypes`, legacy `insurance`) by
  // PRECEDENCE into two canonical arrays. They used to be AND-ed together as
  // independent constraints, so `?treatment=detox&treatmentTypes=outpatient`
  // silently required both while the sidebar showed one. Counts, chips,
  // cards and the URL now describe the same set because they read the same
  // arrays.
  const searchState = useMemo(
    () => parsePublicSearchState(searchParams),
    [searchParams],
  );
  const activeTreatmentFilters = searchState.treatment.values;
  const activeInsuranceFilters = searchState.insurance.values;

  // Basic search params
  const location = searchState.location;
  const stateParam = searchState.stateParam; // Support direct state filtering from near-me pages
  const queryParam = searchState.query; // Free-text search from header/seeker
  // Raw legacy params. Read ONLY for the Featured-rail bucket, the analytics
  // payloads and `hasSearchParams` — never for membership, which goes
  // through `searchState` above.
  const rawTreatmentParam = searchParams.get("treatment") || "";
  const rawInsuranceParam = searchParams.get("insurance") || "";
  const rawTypeParam = searchParams.get("type") || "";
  // A query that carries no usable token ("x", "!", "  ") cannot be honoured.
  // It is NOT a no-op filter: returning the whole catalogue under the heading
  // `Results for "x"` would present thousands of facilities as matches for
  // something that matched nothing. The result set stays empty and the empty
  // state says why.
  const unusableQuery = !!queryParam && !isMeaningfulQuery(queryParam);
  // A non-numeric ?page= (mangled external link) used to parse to NaN, which
  // survived the clamp below and made the grid slice(NaN, NaN) → zero cards
  // rendered under a non-zero result count.
  const parsedPage = parseInt(searchParams.get("page") || "1", 10);
  const currentPage = Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
  // Normalize unknown/removed sorts (e.g. a stale ?sort=reviews bookmark — the
  // review sort was removed pending review-count data on public_facilities) to
  // the default, so the Select doesn't render blank and the switch doesn't hit
  // a no-op.
  const rawSort = searchParams.get("sort");
  const sortParam: SortOption = sortOptions.some((o) => o.value === rawSort)
    ? (rawSort as SortOption)
    : "proximity";
  
  // Resolve the Featured rail's placement bucket from the active
  // filters. The memo only depends on the params the resolver reads;
  // a different treatment OR state filter re-renders the rail with
  // the right pool.
  const featuredBucket = useMemo(
    () => resolveSearchBucket({
      state: stateParam || null,
      citySlug: location && stateParam ? location : null,
      // Featured placement resolution is unchanged — it keeps reading the
      // legacy `?treatment=` slug it has always read. Featured architecture
      // is out of scope for this phase.
      treatmentSlug: rawTreatmentParam || null,
    }),
    [stateParam, location, rawTreatmentParam],
  );

  // Raw param presence, for `hasSearchParams` only. The indexability
  // expression must keep its exact pre-Phase-3A composition — including the
  // now-inert `amenities` — so that no URL changes its noindex verdict.
  const treatmentTypesParam = searchParams.get("treatmentTypes") || "";
  const amenitiesParam = searchParams.get("amenities") || "";
  const insuranceTypesParam = searchParams.get("insuranceTypes") || "";
  const verifiedOnly = searchState.verifiedOnly;
  const featuredOnly = searchState.featuredOnly;

  const { data: approvedFacilities = [], isLoading, error: facilitiesError, refetch: refetchFacilities } = useStaticFacilities();
  const geo = useGeoLocation();
  const { lookup: lookupZipcode } = useZipcodeLookup();
  
  // Resolved ZIP data for enriching location match
  const [resolvedZipData, setResolvedZipData] = useState<{ city: string; state: string; stateAbbr: string } | null>(null);

  // Get seeker profile location for proximity when no explicit location is searched
  const storedUserId = getStoredUserId();
  const { data: seekerProfile } = useQuery({
    queryKey: ["seeker-profile-location-search", storedUserId],
    queryFn: async () => {
      if (!storedUserId) return null;
      const { data } = await supabase
        .from("seeker_profiles")
        .select("state, city")
        .eq("user_id", storedUserId)
        .maybeSingle();
      return data;
    },
    enabled: !!storedUserId,
    staleTime: 1000 * 60 * 10,
  });

  // Resolve ZIP codes to city/state for better proximity matching
  useEffect(() => {
    const parsed = parseLocationInput(location);
    if (parsed.isZipcode && parsed.zipcode) {
      lookupZipcode(parsed.zipcode)
        .then((result) => {
          if (result) {
            setResolvedZipData(result);
          }
        })
        .catch((err) => {
          // Zip lookup failure is non-fatal — proximity sort just
          // falls back to the raw input. Log so we notice systemic
          // outages but don't block the search.
          console.error("[SearchResults] lookupZipcode failed:", err);
        });
    } else {
      setResolvedZipData(null);
    }
  }, [location, lookupZipcode]);

  // Determine effective location for proximity sorting
  // Priority: explicit location → seeker profile → geo-IP
  const effectiveLocation = useMemo(() => {
    if (location) return location;
    if (seekerProfile?.city && seekerProfile?.state) {
      return `${seekerProfile.city}, ${seekerProfile.state}`;
    }
    if (seekerProfile?.state) return seekerProfile.state;
    // Geo-IP fallback
    if (!geo.isLoading && geo.regionCode && geo.isUS) {
      if (geo.city) return `${geo.city}, ${geo.regionCode}`;
      return geo.region || "";
    }
    return "";
  }, [location, seekerProfile, geo.isLoading, geo.city, geo.regionCode, geo.region, geo.isUS]);

  const allCenters = approvedFacilities;

  // ── CANONICAL URL WRITERS ───────────────────────────────────────────
  // Every deliberate interaction routes through `canonicalizeSearchParams`,
  // which rewrites both dimensions in their canonical form, deletes the
  // legacy `treatment` / `insurance` / `type` spellings, drops the inert
  // `distance` / `amenities` leftovers and resets `page`. That converges the
  // URL onto ONE representation: after any interaction the address bar means
  // exactly what the filter panel shows, with no second hidden constraint
  // and no stale unsupported value left to be re-read on the next visit.

  const setTreatmentFilters = useCallback((values: string[]) => {
    setSearchParams(canonicalizeSearchParams(searchParams, { treatment: values }));
  }, [searchParams, setSearchParams]);

  const setInsuranceFilters = useCallback((values: string[]) => {
    setSearchParams(canonicalizeSearchParams(searchParams, { insurance: values }));
  }, [searchParams, setSearchParams]);

  const toggleTreatmentFilter = useCallback((value: string) => {
    setTreatmentFilters(
      activeTreatmentFilters.includes(value)
        ? activeTreatmentFilters.filter((v) => v !== value)
        : [...activeTreatmentFilters, value],
    );
  }, [activeTreatmentFilters, setTreatmentFilters]);

  const toggleInsuranceFilter = useCallback((value: string) => {
    setInsuranceFilters(
      activeInsuranceFilters.includes(value)
        ? activeInsuranceFilters.filter((v) => v !== value)
        : [...activeInsuranceFilters, value],
    );
  }, [activeInsuranceFilters, setInsuranceFilters]);

  // Toggle boolean filter (Verified Only / Featured Only)
  const toggleBooleanFilter = useCallback((paramName: string, currentValue: boolean) => {
    const newParams = canonicalizeSearchParams(searchParams);

    if (currentValue) {
      newParams.delete(paramName);
    } else {
      newParams.set(paramName, "true");
    }
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const {
    filteredCenters,
    nearbyCenters,
    locationScope: activeLocationScope,
    treatmentFacetPool,
    insuranceFacetPool,
    verifiedFacetCount,
    featuredFacetCount,
  } = useMemo(() => {
    let results = [...allCenters];
    // The geographic scope the user actually asked for, or null when no
    // location was supplied.
    let locationScope: LocationScope | null = null;
    // IDs of the facilities that are genuinely inside `locationScope`.
    // `null` means no location scope is active, so everything surviving
    // the other filters is "exact" by default.
    let exactIds: Set<string> | null = null;

    // Direct state filter from URL param (e.g. from near-me pages: ?state=FL).
    // Canonical state normalization — exactly that state, never its
    // neighbours, and DC-aware.
    if (stateParam) {
      const wantState = normalizeState(stateParam);
      results = wantState
        ? results.filter((c) => normalizeState(c.state) === wantState)
        : [];
    }

    // ---- CANONICAL LOCATION SCOPE -------------------------------------
    // Geographic membership is decided by @/lib/location and nothing else.
    // EXACT results are the only ones counted or labelled with the place
    // name; same-state-different-city facilities go to a separate NEARBY
    // bucket that is rendered under its own heading.
    let locationMatch: LocationMatch | null = null;
    const locationForFilter = location; // Only filter by explicit location
    const locationForSort = effectiveLocation; // Sort by effective (includes profile/geo fallback)

    if (locationForFilter) {
      locationMatch = parseLocationInput(locationForFilter);
      // ZIP enrichment stays available for SORTING and labels, but it no
      // longer widens the FILTER: an exact ZIP query keeps matching that
      // ZIP, not the whole city/state the ZIP happens to sit in.
      if (resolvedZipData) {
        locationMatch = enrichLocationMatchWithZip(locationMatch, resolvedZipData);
      }

      const scope = parseLocation(locationForFilter);
      const split = splitByLocation(results, scope);

      // No auto-expand. A location that matches nothing returns nothing.
      // Previously a zero-match location silently disabled the location
      // filter entirely and returned the whole nationwide catalogue still
      // labelled with the user's search term.
      //
      // Exact and nearby travel together through the REMAINING filters
      // (query, treatment, payment/insurance, ...) so both buckets are
      // narrowed by the same criteria, then are separated again at the
      // end. They are never merged for counting: the split below is by
      // identity, so a nearby facility cannot leak into the exact set.
      locationScope = scope;
      exactIds = new Set(split.exact.map((c) => c.id));
      results = [...split.exact, ...split.nearby];
    }

    // ---- FREE TEXT ----------------------------------------------------
    // One pure matcher in @/lib/publicSearchText. Field-by-field word and
    // word-prefix matching, never the old concatenated-haystack substring
    // scan that let `q=mat` match "traumatic" and `q=x` match the whole
    // catalogue. A query with no usable token matches NOTHING and the page
    // says why, rather than presenting every facility as a match for it.
    if (queryParam) {
      results = results.filter((c) => matchesFreeTextQuery(c, queryParam));
    }

    // ---- GROUP PREDICATES ---------------------------------------------
    // Within a group: OR (Detox OR Outpatient).
    // Across groups:  AND (location AND treatment AND payment AND quick).
    // Both dimensions read the ONE canonical filter state, so there is no
    // longer a legacy param applying a second, invisible constraint.
    const treatmentOk = (c: (typeof results)[number]) =>
      activeTreatmentFilters.length === 0 ||
      activeTreatmentFilters.some((v) => matchesTreatmentFilter(asSearchableFacility(c), v));

    const insuranceOk = (c: (typeof results)[number]) =>
      activeInsuranceFilters.length === 0 ||
      activeInsuranceFilters.some((v) => matchesInsuranceFilter(asSearchableFacility(c), v));

    const verifiedOk = (c: (typeof results)[number]) =>
      !verifiedOnly || c.verified === true;

    const featuredOk = (c: (typeof results)[number]) =>
      !featuredOnly || c.featured === true;

    // NO AMENITIES STEP. See the note beside the removed `amenityFilters`
    // registry: the four options were inferred from narrative text against a
    // dataset that carries no structured amenity attribute, so a stale
    // `?amenities=pool` narrows nothing here.

    // ---- SELF-EXCLUDING FACET POOLS -----------------------------------
    // A facet count must answer "how many results would I get if I picked
    // this option?" — so each group's counts apply every OTHER active
    // constraint and skip its own. Previously the pool was snapshotted
    // before BOTH multi-select groups, so treatment counts ignored the
    // active payment selection (and vice versa) and neither reflected the
    // quick filters at all. Facet scope is exact-only: the same-state
    // bucket is not part of the counted set and must not inflate a count.
    const exactBase = exactIds ? results.filter((c) => exactIds!.has(c.id)) : results;
    const treatmentFacetSource = exactBase.filter(
      (c) => insuranceOk(c) && verifiedOk(c) && featuredOk(c),
    );
    const insuranceFacetSource = exactBase.filter(
      (c) => treatmentOk(c) && verifiedOk(c) && featuredOk(c),
    );
    const verifiedCount = exactBase.filter(
      (c) => treatmentOk(c) && insuranceOk(c) && featuredOk(c) && c.verified === true,
    ).length;
    const featuredCount = exactBase.filter(
      (c) => treatmentOk(c) && insuranceOk(c) && verifiedOk(c) && c.featured === true,
    ).length;

    results = results.filter(
      (c) => treatmentOk(c) && insuranceOk(c) && verifiedOk(c) && featuredOk(c),
    );

    // NO DISTANCE STEP. This is where "Within N miles" used to translate
    // a mile radius into the categorical proximity tier — 10 mi meant
    // "same city", 100 mi meant "or a neighbouring state". Those tiers
    // are not miles: two facilities in the same city can be 30 miles
    // apart, and two facilities in adjacent states can be 600. With no
    // coordinates in the catalogue there is no honest radius to compute,
    // so the filter is gone rather than approximated. A stale
    // `?distance=25` is inert: nothing below reads it, exact membership
    // is untouched, and the result set is identical with or without it.

    // Build proximity scoring using the enriched location match
    const getProximityScore = (center: { city: string; state: string; zipCode?: string }): number => {
      const sortLoc = locationForSort || locationForFilter;
      if (!sortLoc) return 4; // No location = all equal
      
      let match = locationMatch;
      if (!match) {
        match = parseLocationInput(sortLoc);
        // Also enrich sort-only location with geo data
        if (resolvedZipData) {
          match = enrichLocationMatchWithZip(match, resolvedZipData);
        }
      }
      
      const { tier } = getProximityTier(center, match);
      return PROXIMITY_TIER_ORDER[tier];
    };

    // Sort results with stable tiebreakers
    results.sort((a, b) => {
      if (sortParam === "proximity") {
        const proxA = getProximityScore(a);
        const proxB = getProximityScore(b);
        if (proxA !== proxB) return proxA - proxB;
        // Secondary: 4-tier organic rank (Featured → Pro → free-claimed → unclaimed)
        const rankA = getPlanRank(a);
        const rankB = getPlanRank(b);
        if (rankA !== rankB) return rankA - rankB;
        // Tertiary: ranking score
        const rA = a.calculatedRankingScore || 0;
        const rB = b.calculatedRankingScore || 0;
        if (rA !== rB) return rB - rA;
        // Final: stable by ID
        return a.id.localeCompare(b.id);
      }

      if (sortParam === "featured") {
        if (locationForSort) {
          const proxA = getProximityScore(a);
          const proxB = getProximityScore(b);
          if (proxA !== proxB) return proxA - proxB;
        }
        const rankA = getPlanRank(a);
        const rankB = getPlanRank(b);
        if (rankA !== rankB) return rankA - rankB;
        // Tie-break on ranking score before ID for consistency with proximity.
        const rA = a.calculatedRankingScore || 0;
        const rB = b.calculatedRankingScore || 0;
        if (rA !== rB) return rB - rA;
        return a.id.localeCompare(b.id);
      }

      // For other sorts, 4-tier organic rank first then the chosen secondary
      const rankA = getPlanRank(a);
      const rankB = getPlanRank(b);
      if (rankA !== rankB) return rankA - rankB;

      switch (sortParam) {
        case "rating-high": {
          const diff = (b.calculatedRankingScore || 0) - (a.calculatedRankingScore || 0);
          return diff !== 0 ? diff : a.id.localeCompare(b.id);
        }
        case "rating-low": {
          const diff = (a.calculatedRankingScore || 0) - (b.calculatedRankingScore || 0);
          return diff !== 0 ? diff : a.id.localeCompare(b.id);
        }
        case "name-asc": return a.name.localeCompare(b.name);
        case "name-desc": return b.name.localeCompare(a.name);
        default: return 0;
      }
    });

    // Attach the location-relation tier for the card badge — ONLY when the
    // user explicitly entered or selected a location.
    //
    // The badge used to be attached off `locationForSort`, which falls back
    // to the seeker profile and then to geo-IP. A visitor who searched
    // nothing therefore saw "Exact Match" / "In Your City" badges derived
    // from an IP lookup, on a result set that geo-IP never filtered — a
    // claim about the user's own location, made from an inference, about
    // cards that were not selected for it. Geo-IP still informs the
    // ORDERING below (`getProximityScore` is unchanged); it may not label a
    // card. `locationForFilter` is the explicit search and nothing else.
    if (locationForFilter) {
      let match = locationMatch || parseLocationInput(locationForFilter);
      if (resolvedZipData) {
        match = enrichLocationMatchWithZip(match, resolvedZipData);
      }
      results.forEach((r) => {
        const { tier, reason } = getProximityTier(r, match!);
        const annotated = r as typeof r & { _proximityTier?: ProximityTier; _proximityReason?: string };
        annotated._proximityTier = tier;
        annotated._proximityReason = reason;
      });
    }

    // Separate the two buckets. Sort order established above is
    // preserved within each. `filteredCenters` — the set that drives the
    // visible count, pagination and the SEO description — is exact only.
    const exactOnly = exactIds ? results.filter((c) => exactIds!.has(c.id)) : results;
    const nearbyOnly = exactIds ? results.filter((c) => !exactIds!.has(c.id)) : [];
    return {
      filteredCenters: exactOnly,
      nearbyCenters: nearbyOnly,
      locationScope,
      treatmentFacetPool: treatmentFacetSource,
      insuranceFacetPool: insuranceFacetSource,
      verifiedFacetCount: verifiedCount,
      featuredFacetCount: featuredCount,
    };
  }, [allCenters, location, effectiveLocation, stateParam, queryParam, sortParam, activeTreatmentFilters, activeInsuranceFilters, verifiedOnly, featuredOnly, resolvedZipData]);

  // Active refinement count — canonical, so a URL carrying three spellings
  // of one treatment dimension counts once and an unsupported value counts
  // zero (it narrows nothing, so it is not an active filter).
  const activeFiltersCount = activeFilterCount(searchState);

  const totalPages = Math.max(1, Math.ceil(filteredCenters.length / ITEMS_PER_PAGE));
  // F11 clamp: ?page=99 against a 6-page result set previously rendered an
  // empty grid; now we slice from the last available page instead.
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedCenters = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return filteredCenters.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCenters, safePage]);

  // SAME-STATE — a separate, explicitly labelled bucket. These facilities
  // are in the same state as the searched city but in a DIFFERENT city,
  // so they are never counted in the exact total and never rendered under
  // the exact heading. Capped for page weight; the cap is stated in the
  // copy so the section never implies it is the complete set.
  //
  // The heading says "Other facilities in <state>", NOT "Nearby
  // facilities". The catalogue carries no latitude/longitude, so we
  // cannot prove that a Redding facility is near Los Angeles — both are
  // in California and that is the whole of what the data supports.
  // Same-state is a fact; nearby, at 500 miles, would be a lie. No
  // mileage, radius, "nearest" or "close by" claim may appear here
  // unless coordinates exist. The internal variable stays `nearby`
  // (that is `relateToScope`'s vocabulary); only the public copy is
  // constrained.
  const NEARBY_LIMIT = 12;
  const nearbySection = useMemo(() => {
    if (!nearbyCenters.length || !activeLocationScope) return null;
    if (activeLocationScope.type !== "city") return null;
    const shown = nearbyCenters.slice(0, NEARBY_LIMIT);
    const stateLabel = stateDisplayName(activeLocationScope.state) ?? activeLocationScope.state;
    return (
      <section className="mt-12 border-t border-border pt-8" aria-labelledby="nearby-heading">
        <h2 id="nearby-heading" className="font-display text-lg font-bold text-foreground">
          Other facilities in {stateLabel}
        </h2>
        <p className="text-sm text-muted-foreground mt-1 mb-5">
          {nearbyCenters.length.toLocaleString()}{" "}
          {nearbyCenters.length === 1 ? "facility" : "facilities"} elsewhere in {stateLabel}
          {nearbyCenters.length > shown.length ? ` — showing the first ${shown.length}` : ""}.
          These are not in {activeLocationScope.city}, and we do not hold
          the coordinates needed to say how far away they are.
        </p>
        <div className="space-y-4">
          {shown.map((center) => (
            <SearchResultCard key={`nearby-${center.id}`} center={center} featured={center.featured} />
          ))}
        </div>
      </section>
    );
  }, [nearbyCenters, activeLocationScope]);

  // COUNTY SCOPE — a CAPABILITY limitation, not a zero-facility fact.
  //
  // `matchesExactly` returns false for every facility against a county
  // scope, and that is correct: the `facilities` table has city, state,
  // zip_code and address and no county column, so there is no
  // facility→county mapping to match on. The canonical layer refuses to
  // infer one (a facility in the city of Orange is not evidence about
  // Orange County).
  //
  // What must NOT follow is the sentence "no facilities found in Cook
  // County, IL". Zero exact matches here means we cannot evaluate the
  // question, not that we checked and the answer is none. Cook County
  // certainly has treatment facilities; RehabLookup just cannot tell you
  // which of its listings sit inside it. The county branch below says
  // that instead, and offers the searches we CAN answer truthfully.
  const countyScope = activeLocationScope?.type === "county" ? activeLocationScope : null;
  const countyStateName = countyScope
    ? stateDisplayName(countyScope.state) ?? countyScope.state
    : null;
  const countyStateSlug = countyScope ? stateSlugFor(countyScope.state) : null;

  // Facet counts — SELF-EXCLUDING. Each group is counted against every other
  // active constraint (location, state, free text, the OTHER filter group,
  // and both quick filters) but not against itself, so the number beside an
  // option is the size of the result set the user would get by picking it.
  // Both pools are exact-scope only: the same-state bucket is never counted.
  const treatmentFacets = useMemo(
    () => countTreatmentFacets(treatmentFacetPool.map(asSearchableFacility)),
    [treatmentFacetPool],
  );
  const insuranceFacets = useMemo(
    () => countInsuranceFacets(insuranceFacetPool.map(asSearchableFacility)),
    [insuranceFacetPool],
  );

  const handlePageChange = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", page.toString());
    setSearchParams(newParams);
    scrollToTopSmooth();
  };

  // Clear-all removes EVERY public refinement by name — location, free
  // text, state, both canonical dimensions, the legacy `treatment` /
  // `insurance` / `type` spellings, both quick filters, the inert
  // `distance` / `amenities` leftovers, page and sort. Enumerating them
  // means a hidden legacy param cannot survive a "Clear all".
  const clearAllFilters = useCallback(() => {
    setSearchParams(clearAllSearchParams(searchParams));
  }, [searchParams, setSearchParams]);

  // Drop just the free-text query, keeping every other refinement.
  const clearQuery = useCallback(() => {
    const next = canonicalizeSearchParams(searchParams);
    next.delete("q");
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  // The saved-search snapshot (criteria / suggested name / deep-link URL)
  // was removed with the consumer account product — nothing consumes it now
  // that /account/saved-searches is retired. Filter state still round-trips
  // through the URL, which is what Share copies.

  // Build a shareable URL that preserves all current filters/location/sort/page
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    // Same contract as the <title>: a shared link travels further than
    // the page it came from, so it may not carry a proximity claim the
    // result set cannot back. `describeScope` names the exact scope.
    const shareScope = seoScopeWording(activeLocationScope);
    const shareTitle = shareScope
      ? `Rehab Centers in ${shareScope.title} — RehabLookup`
      : queryParam
      ? `Rehab Centers matching "${queryParam}" — RehabLookup`
      : "Rehab Centers Search — RehabLookup";

    // Try Web Share API first (mobile-friendly)
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: shareTitle, url });
        return;
      } catch (err) {
        // User cancelled or share failed — fall through to clipboard
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      toast({
        title: "Link copied",
        description: "Shareable search link copied to your clipboard.",
      });
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      toast({
        title: "Couldn't copy link",
        description: "Copy this URL manually from your address bar.",
        variant: "destructive",
      });
    }
  }, [activeLocationScope, queryParam, toast]);

  const handleSortChange = (value: SortOption) => {
    const newParams = canonicalizeSearchParams(searchParams);
    if (value === "proximity") {
      newParams.delete("sort");
    } else {
      newParams.set("sort", value);
    }
    setSearchParams(newParams);
  };

  // Determine if this is a search with query params (should be noindexed).
  //
  // COMPOSITION FROZEN. This expression reads RAW param presence, exactly as
  // it did before Phase 3A — including the now-inert `amenities`. An old
  // filtered URL must not become newly indexable merely because we stopped
  // honouring one of its filters, and no URL may newly acquire a noindex it
  // did not have. Adding or removing a term here changes the indexability of
  // live URLs; do not.
  const hasSearchParams = !!(location || rawTreatmentParam || rawInsuranceParam || rawTypeParam || stateParam || queryParam || treatmentTypesParam || amenitiesParam || insuranceTypesParam);
  const shouldNoindex = hasSearchParams || filteredCenters.length === 0;

  // Zero-result tracking for queries that originated on the 404 page
  // (NotFound submits with ?from=404). Captures intent we couldn't fulfill
  // so admins can add redirects or content for the top dead-end queries.
  const fromParam = searchParams.get("from") || "";
  const reportedZeroQueryRef = useRef<string | null>(null);
  useEffect(() => {
    if (fromParam !== "404") return;
    if (isLoading) return;
    if (filteredCenters.length !== 0) return;
    // Build a stable key per query so we only fire once per unique search.
    const key = `${location}|${rawTreatmentParam}|${rawInsuranceParam}`;
    if (reportedZeroQueryRef.current === key) return;
    reportedZeroQueryRef.current = key;

    analytics.notFoundSearchZeroResults({
      location: location || undefined,
      treatment: rawTreatmentParam || undefined,
      insurance: rawInsuranceParam || undefined,
      resultsCount: 0,
      sourcePath: "/search-results",
      referrer: typeof document !== "undefined" ? document.referrer : undefined,
      viewport:
        typeof window !== "undefined"
          ? `${window.innerWidth}x${window.innerHeight}`
          : undefined,
      sessionId:
        typeof window !== "undefined"
          ? window.sessionStorage?.getItem("rl_session_id") ?? null
          : null,
    });
  }, [fromParam, isLoading, filteredCenters.length, location, rawTreatmentParam, rawInsuranceParam]);

  // Phase 4: generic funnel event — fire `search_performed` and
  // `search_zero_results` for every search (not just /404 referrals) so we
  // can measure conversion drop-off across the whole funnel.
  const reportedSearchKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (isLoading) return;
    const key = `${location}|${rawTreatmentParam}|${rawInsuranceParam}|${queryParam}`;
    if (reportedSearchKeyRef.current === key) return;
    reportedSearchKeyRef.current = key;

    analytics.search(queryParam || location || "(empty)", filteredCenters.length);
    // Analytics provider removed — zero-result searches tracked via analytics.search() above.
  }, [isLoading, filteredCenters.length, location, rawTreatmentParam, rawInsuranceParam, queryParam]);

  // Crawler-facing scope wording, derived from the SAME canonical scope
  // the result set was filtered to. Null for county (its own qualified
  // copy below), unresolved input, and no-location searches.
  const seoScope = seoScopeWording(activeLocationScope);
  // The trimmed, whitespace-collapsed form of a location we could not
  // place. Taken off the scope rather than off the raw `?location=` so a
  // padded or doubled-space query does not leak into the meta strings.
  const unresolvedLocation =
    activeLocationScope?.type === "unresolved" ? activeLocationScope.raw : "";

  // The search <title>. Nothing renders this on the page — the heading
  // above the cards is built straight from `describeScope` — so it is
  // read by crawlers and the share sheet only, and it has to make the
  // same claim the listing does.
  //
  //   city           → Rehab Centers in Los Angeles, CA
  //   zip            → Rehab Centers in ZIP 21215
  //   state          → Rehab Centers in California
  //   city-any-state → Rehab Centers in Cities Named Springfield Across the U.S.
  //   county         → <county> County Treatment Facility Search — County
  //                    Data Unavailable. NOT "Rehab Centers in Cook
  //                    County": every county search returns zero exact
  //                    matches because the catalogue has no county
  //                    column, so a title that promised county listings
  //                    would promise a filter we cannot run.
  //   unresolved     → neutral search wording. We do not know what place
  //                    the string meant, so nothing may be described as
  //                    being "in" or "near" it.
  const searchDisplayTitle = queryParam
    ? `Results for "${queryParam}"`
    : countyScope
      ? `${countyScope.county} County Treatment Facility Search — County Data Unavailable`
      : seoScope
        ? `Rehab Centers in ${seoScope.title}`
        : unresolvedLocation
          ? `Rehab Center Search — ${unresolvedLocation}`
          : "Find Treatment Centers";

  // Build a unique-per-variant SEO title and self-canonical for indexable
  // (i.e. unfiltered) paginated variants so page 2+ isn't deduped against
  // page 1. Filtered/empty variants stay noindexed but still ship unique
  // meta to crawlers that ignore noindex hints.
  const seoTitleSuffix = currentPage > 1 ? ` — Page ${currentPage}` : "";
  const seoTitle = `${searchDisplayTitle}${seoTitleSuffix}`;
  const seoCanonical = !shouldNoindex && currentPage > 1
    ? `/search-results?page=${currentPage}`
    : "/search-results";
  // The count describes how many LISTINGS matched the filters — never how many
  // of them are verified. `verified` is per-facility earned state (a handful of
  // records carry it); attaching it to a directory-wide result count is the
  // exact misstatement check-public-directory-truth exists to stop.
  //
  // The location clause names the EXACT scope ("in Los Angeles, CA", "in
  // ZIP 21215", "in cities named Springfield across the U.S.") because
  // `filteredCenters.length` counts exactly that set. "near <location>"
  // described a radius the catalogue cannot measure, and — worse —
  // attached it to a count that was never a radius count.
  //
  // County scope gets its own sentence. `filteredCenters.length` is 0 for
  // every county search because the catalogue has no county column, and
  // "Browse 0 listings in Cook County, IL" would publish that 0 as a
  // finding. It is a gap in our data, so the description says so.
  //
  // An unresolved location gets neutral search wording — never "in" or
  // "near" a place we could not identify.
  const seoDescription = countyScope
    ? `RehabLookup does not currently have facility-level county assignments, so ${
        countyScope.county
      } County${countyStateName ? `, ${countyStateName}` : ""} cannot be filtered accurately yet. Browse the state directory, or search by city or ZIP code for exact matches.`
    : `Browse ${filteredCenters.length} addiction treatment center listings${
        seoScope
          ? ` in ${seoScope.sentence}`
          : queryParam
            ? ` matching "${queryParam}"`
            : unresolvedLocation
              ? ` for the search "${unresolvedLocation}"`
              : ""
      }${currentPage > 1 ? ` (page ${currentPage} of ${totalPages})` : ""}. Compare rehab programs, review insurance information, and contact facilities directly.`;

  // rel="prev"/"next" — only emit on indexable paginated views so crawlers
  // can stitch the sequence together without us advertising filtered/noindex
  // variants.
  const seoPrevUrl = !shouldNoindex && currentPage > 1
    ? (currentPage - 1 === 1 ? "/search-results" : `/search-results?page=${currentPage - 1}`)
    : undefined;
  const seoNextUrl = !shouldNoindex && currentPage < totalPages
    ? `/search-results?page=${currentPage + 1}`
    : undefined;

  // Mobile filter sidebar open state
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Accordion state — only one section open at a time, all collapsed by default
  const [openFilterSection, setOpenFilterSection] = useState<string | null>(null);

  // Hide-on-scroll-down for the sticky results header — frees vertical
  // space for the listing cards once the user has committed to
  // browsing (mirrors the Yelp / Healthgrades sticky-bar pattern).
  // Hide-on-scroll behavior removed in the 2026-05-23 directory-style
  // rebuild — modern directory pages keep the search bar visible at
  // the top of the page (non-sticky) and use a separate sticky toolbar
  // for sort + filters. Auto-hiding chrome on scroll felt jittery and
  // hid the inline search form right when the user might want it.

  const toggleFilterSection = useCallback((section: string) => {
    setOpenFilterSection(prev => prev === section ? null : section);
  }, []);

  // FilterSection / FilterSidebar / DirectoryHelperCTA are declared at MODULE
  // scope (above) rather than inline here. Declaring a component inside the
  // render body creates a new component TYPE on every render, so React
  // unmounted and remounted the entire filter panel after every single
  // filter click — which destroyed keyboard focus and collapsed the open
  // accordion mid-interaction. Desktop and mobile render the SAME component
  // with the SAME props below, so their values, counts, disabled states and
  // clear-all behaviour cannot drift apart.
  const filterSidebarProps: Omit<FilterSidebarProps, "panel"> = {
    sortParam,
    onSortChange: handleSortChange,
    openSection: openFilterSection,
    onToggleSection: toggleFilterSection,
    activeTreatment: activeTreatmentFilters,
    activeInsurance: activeInsuranceFilters,
    treatmentFacets,
    insuranceFacets,
    verifiedOnly,
    featuredOnly,
    verifiedFacetCount,
    featuredFacetCount,
    onToggleTreatment: toggleTreatmentFilter,
    onToggleInsurance: toggleInsuranceFilter,
    onToggleBoolean: toggleBooleanFilter,
    activeFiltersCount,
    onClearAll: clearAllFilters,
  };

  return (
    <Layout>
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonical={seoCanonical}
        prevUrl={seoPrevUrl}
        nextUrl={seoNextUrl}
        noindex={shouldNoindex}
        structuredData={!shouldNoindex ? generateSearchResultsSchema({
          query: queryParam || undefined,
          location: location || undefined,
          resultCount: filteredCenters.length,
          canonicalUrl: seoCanonical,
          currentPage,
          totalPages,
          pageSize: ITEMS_PER_PAGE,
          prevUrl: seoPrevUrl,
          nextUrl: seoNextUrl,
          facilities: paginatedCenters.slice(0, 10).map(c => ({
            name: c.name,
            city: c.city,
            state: c.state,
            slug: 'slug' in c ? c.slug ?? undefined : undefined,
          })),
        }) : undefined}
      />

      {/* DIRECTORY HERO — top of the page, non-sticky. Replaces the old
          Healthgrades-style sticky header that crammed back-link +
          count-chip + filter pills + save + share + filter-toggle +
          search form into one bar. New layout puts the SEARCH FORM
          front-and-center (the page's primary affordance), then a
          single line announcing the result count + location context.
          Save / Share / Sort / Filters all live in a separate toolbar
          inside the results column (rebuilt below). */}
      <section className="border-b border-border bg-gradient-to-b from-secondary/30 via-secondary/15 to-background py-4 sm:py-5 md:py-7">
        <div className="container">
          {/* Back link — small, secondary, on its own row above the
              search form so it doesn't compete for prominence. */}
          <div className="mb-3 flex items-center gap-3">
            <Link
              to="/rehab-centers"
              className="group inline-flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
              aria-label="Back to all centers"
            >
              <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="font-medium">All centers</span>
            </Link>
          </div>

          {/* Search form — the page's primary affordance, hero-treated
              with full-width prominence. */}
          <SearchResultsForm />

          {/* Location subtitle. Single quiet line under the search form,
              and the LAST public surface that still said "Near <city,
              state>".

              It cannot. The catalogue has city, state, zip_code and
              address and no coordinates, so "near" promises a measured
              proximity nothing here can compute — the same reason the
              <title>, the meta description, the distance filter and the
              same-state bucket heading were rewritten earlier in this
              phase. This line now names the SAME canonical scope the
              results were filtered to, via the SAME `seoScopeWording`
              helper the crawler copy uses. No second parser, no second
              formatter, and no place label that the result set does not
              actually mean:

                Los Angeles, CA → Results in Los Angeles, CA
                21215          → Results in ZIP 21215
                California     → Results in California
                Springfield    → Results in cities named Springfield
                                 across the U.S.

              A typed ZIP keeps its own label rather than being swapped
              for the Zippopotam-resolved city, matching the exact-ZIP
              behaviour fixed earlier: the lookup is presentation detail,
              never the scope.

              Two cases deliberately do NOT get "Results in <place>".
              County and unresolved input return null from
              `seoScopeWording` — there is no facility→county data, and
              an unplaceable string never became a place — so the line
              states what was searched without claiming the listing sits
              inside it. And a location the USER never typed (seeker
              profile or geo-IP, via `effectiveLocation`) is contextual
              only: it informs the sort, it did not filter the results,
              so it reads as a neutral "Location:" label. Presenting it
              as "Near Chicago" would claim both a proximity and a
              search the page never performed. */}
          {(location || effectiveLocation) && (
            <p
              data-testid="hero-location-subtitle"
              className="mt-4 text-xs sm:text-sm text-muted-foreground inline-flex items-center gap-1.5"
            >
              <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary shrink-0" aria-hidden />
              {location ? (
                seoScope ? (
                  <>
                    Results in{" "}
                    <span className="font-semibold text-foreground">{seoScope.sentence}</span>
                  </>
                ) : (
                  <>
                    Searched{" "}
                    <span className="font-semibold text-foreground">
                      {unresolvedLocation || location}
                    </span>
                  </>
                )
              ) : (
                <>
                  Location:{" "}
                  <span className="font-semibold text-foreground">{effectiveLocation}</span>
                </>
              )}
            </p>
          )}
        </div>
      </section>

      {/* Mobile Filter Overlay */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileFiltersOpen(false)} />
          {/* Flex column with overflow-hidden so the sticky header + scrollable
              middle + sticky footer all coexist correctly. Previously the whole
              panel scrolled which meant the "Show results" footer couldn't sit
              fixed at the bottom of the viewport. */}
          <div className="absolute right-0 top-0 h-full w-[320px] max-w-[85vw] bg-card border-l border-border shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-card shrink-0">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                Filters & Sort
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setMobileFiltersOpen(false)} aria-label="Close filters">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <FilterSidebar {...filterSidebarProps} panel="mobile" />
              <DirectoryHelperCTA />
            </div>
            {/* Sticky "Show results" footer — closes the sheet and confirms the
                filter set is applied. Matches iOS / Android filter-sheet
                pattern. (Phase 6C) */}
            <div className="shrink-0 p-3 border-t border-border bg-card pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <Button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full h-11 font-semibold"
              >
                {filteredCenters.length === 0
                  ? "No matches — adjust filters"
                  : `Show ${filteredCenters.length} ${filteredCenters.length === 1 ? "result" : "results"}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Split Screen Layout */}
      <div className="bg-gradient-to-b from-secondary/20 to-background min-h-screen">
        <div className="container py-6">
          <div className="flex gap-6 xl:gap-8">
            {/* Left Sidebar — Desktop Only.
                Sticky `top-[88px]` aligns the sidebar's top with the
                viewport area just below the global nav (~68 px) +
                a small breathing buffer. Previous `top-[188px]` was
                inherited from the old sticky directory header which
                no longer exists, so the sidebar started awkwardly
                far down the page.

                Visual chrome simplified: single hairline card
                (`border` + `rounded-2xl` only — no shadow stack)
                with a tighter header that drops the "Narrow your
                results" filler subtitle. The sidebar now reads as a
                clean controls panel, not a card-on-card. */}
            <aside className="hidden lg:block w-[290px] xl:w-[320px] shrink-0">
              <div className="sticky top-[88px] max-h-[calc(100vh-110px)] overflow-y-auto scrollbar-thin">
                <div className="rounded-2xl border border-border bg-card p-5">
                  {/* Sidebar header — compact, single-line */}
                  <div className="flex items-center justify-between mb-2 pb-3 border-b border-border">
                    <h2 className="text-sm font-bold text-foreground inline-flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 text-primary" />
                      Filters
                    </h2>
                    {activeFiltersCount > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground tabular-nums">
                        {activeFiltersCount}
                      </span>
                    )}
                  </div>
                  <FilterSidebar {...filterSidebarProps} panel="desktop" />
                </div>
                <DirectoryHelperCTA />
              </div>
            </aside>

            {/* Right Content — Results */}
            <main className="flex-1 min-w-0">
              {/* Auto-detected-location banner removed per the
                  2026-05-23 cleanup. The geo-IP detection itself
                  still runs (effectiveLocation feeds the categorical
                  location-match sort) — the chrome around it is gone.
                  The hero's "Location: <city, state>" subtitle is the
                  only surface that hints at the detected location, and
                  it is labelled as context rather than as a search:
                  a detected location has never filtered this page. */}

              {/* Featured rail — bucket resolved from current filters.
                  city+state → (city, slug); state only → (state, abbr);
                  treatment only → (treatment, slug); otherwise national.
                  Silent absence when bucket pool is empty. */}
              {featuredBucket && (
                <FeaturedRail
                  placement_type={featuredBucket.placement_type}
                  placement_value={featuredBucket.placement_value}
                  className="mb-6"
                />
              )}

              {/* Hold the result list during the brief window between page
                  load and geo-IP resolution. Without this guard, default-sort
                  ("proximity") sees no location → every facility gets the
                  "nationwide" tier (equal score 4) → falls back to plan
                  priority + ranking score → user sees out-of-state featured
                  centers before re-ordering kicks in. Only applies when the
                  user hasn't typed a location AND has no profile location;
                  once cached in localStorage (7-day TTL) repeat visits skip
                  this window entirely. */}
              {isLoading || (
                !location &&
                !seekerProfile?.state &&
                geo.isLoading &&
                sortParam === "proximity"
              ) ? (
                <SearchResultsLoading count={6} />
              ) : facilitiesError ? (
                // Distinguish a backend failure from a genuinely empty result —
                // otherwise an outage looks like "no rehabs exist."
                <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center space-y-3">
                  <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
                  <p className="text-sm font-medium text-foreground">
                    We couldn't load treatment centers right now.
                  </p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    This is a temporary issue on our end — your search is fine. Please try again in a moment.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => refetchFacilities()} className="gap-1.5">
                    <RefreshCw className="h-4 w-4" /> Try again
                  </Button>
                </div>
              ) : paginatedCenters.length > 0 ? (
                <>
                  {/* Exact-scope heading. The number here is the exact
                      matched set and nothing else — no statewide or
                      neighbouring-state facilities are folded into it. */}
                  {location && activeLocationScope && (
                    <div className="mb-5">
                      <p className="text-sm font-medium text-foreground">
                        {filteredCenters.length.toLocaleString()}{" "}
                        {filteredCenters.length === 1 ? "facility" : "facilities"} in{" "}
                        {describeScope(activeLocationScope)}
                      </p>
                    </div>
                  )}

                  {/* TOOLBAR — directory-style controls row. Unifies the
                      old mobile-only chip strip + desktop-only filter
                      pills + results-summary header + action buttons
                      into ONE row. Renders above the cards on every
                      breakpoint. On lg+ it sits under the FeaturedRail
                      (or directly under the hero if no featured pool).

                      Layout:
                        LEFT  — page indicator (N of M, range chip)
                                + active filter chips (horizontally
                                scrollable on mobile when overflowing)
                                + "Clear all" pill when any filter is set
                        RIGHT — Filters trigger (mobile only), Save,
                                Share. Sort lives inside the filter
                                sidebar (and the mobile sheet) so it
                                doesn't compete here.

                      `sticky top-[68px] z-20` keeps the toolbar pinned
                      to the top of the main scroll area on lg+ so the
                      controls remain reachable during long-list scroll.
                      On mobile the toolbar is in normal flow — the
                      browser scroll-to-top is the recovery affordance. */}
                  <div className="mb-4 lg:sticky lg:top-[68px] lg:z-20 lg:bg-background/95 lg:backdrop-blur-sm lg:py-2 lg:-mx-2 lg:px-2">
                    <div className="flex items-center justify-between gap-3">
                      {/* LEFT cluster: range + chips */}
                      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                        <span className="inline-flex shrink-0 items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20 tabular-nums">
                          {(safePage - 1) * ITEMS_PER_PAGE + 1}–
                          {Math.min(safePage * ITEMS_PER_PAGE, filteredCenters.length)}
                          {" "}of {filteredCenters.length.toLocaleString()}
                        </span>

                        {/* Active filter chips — single horizontal
                            row, scrollable on overflow. Replaces both
                            the old desktop pills and mobile chip
                            strip (which were redundant). */}
                        {activeFiltersCount > 0 && (
                          <div
                            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -my-1 py-1"
                            style={{
                              WebkitOverflowScrolling: "touch",
                              maskImage: "linear-gradient(to right, black calc(100% - 24px), transparent)",
                              WebkitMaskImage: "linear-gradient(to right, black calc(100% - 24px), transparent)",
                            }}
                          >
                            {/* Chips read the SAME canonical filter state as
                                the sidebar and the result grid, and render the
                                human LABEL rather than the raw slug. An
                                unsupported URL value produces no chip because
                                it produces no constraint. No Amenities chip —
                                the filter is gone. No Distance chip — there is
                                no distance. */}
                            {activeTreatmentFilters.map((value) => (
                              <button
                                key={`tt-${value}`}
                                type="button"
                                onClick={() => toggleTreatmentFilter(value)}
                                className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
                                aria-label={`Remove treatment filter ${treatmentLabel(value)}`}
                              >
                                <span className="truncate max-w-[140px]">{treatmentLabel(value)}</span>
                                <X className="h-3 w-3" aria-hidden="true" />
                              </button>
                            ))}
                            {activeInsuranceFilters.map((value) => (
                              <button
                                key={`ins-${value}`}
                                type="button"
                                onClick={() => toggleInsuranceFilter(value)}
                                className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
                                aria-label={`Remove payment or insurance filter ${insuranceLabel(value)}`}
                              >
                                <span className="truncate max-w-[140px]">{insuranceLabel(value)}</span>
                                <X className="h-3 w-3" aria-hidden="true" />
                              </button>
                            ))}
                            {verifiedOnly && (
                              <button
                                type="button"
                                onClick={() => toggleBooleanFilter("verified", true)}
                                className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
                                aria-label="Remove verified-only filter"
                              >
                                <span>Verified</span>
                                <X className="h-3 w-3" aria-hidden="true" />
                              </button>
                            )}
                            {featuredOnly && (
                              <button
                                type="button"
                                onClick={() => toggleBooleanFilter("featuredOnly", true)}
                                className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
                                aria-label="Remove featured-only filter"
                              >
                                <span>Featured</span>
                                <X className="h-3 w-3" aria-hidden="true" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={clearAllFilters}
                              className="shrink-0 inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                              aria-label="Clear all filters"
                            >
                              Clear all
                            </button>
                          </div>
                        )}
                      </div>

                      {/* RIGHT cluster: Filters (mobile) · Share.
                          "Save search" is gone — it was the one control on
                          this page that required a consumer account, and
                          consumer accounts are retired. Share still gives
                          the user a durable, filter-preserving link to come
                          back to, with no sign-in. */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="lg:hidden gap-1.5"
                          onClick={() => setMobileFiltersOpen(true)}
                          aria-label="Open filters and sort"
                        >
                          <SlidersHorizontal className="h-4 w-4" />
                          <span className="hidden xs:inline">Filters</span>
                          {activeFiltersCount > 0 && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-primary text-primary-foreground">
                              {activeFiltersCount}
                            </Badge>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={handleShare}
                          aria-label="Copy a shareable link to this search"
                          title="Share this search"
                        >
                          {shareCopied ? <Check className="h-4 w-4 text-primary" /> : <Share2 className="h-4 w-4" />}
                          <span className="hidden sm:inline">{shareCopied ? "Copied" : "Share"}</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Results List */}
                  <div className="space-y-4">
                    {paginatedCenters.map((center) => (
                      <SearchResultCard
                        key={center.id}
                        center={center}
                        featured={center.featured}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  <DataPagination
                    currentPage={safePage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    className="mt-10 justify-center"
                  />

                  {nearbySection}

                  {/* End-of-results helper bands. Two compact sections
                      that catch the visitor who scrolled the full list
                      without clicking through:
                       (1) "What to do next" — widen the search + cost
                           estimator + insurance verification — three
                           lateral actions that don't require picking a
                           specific facility yet.
                       (2) "Common questions about this search" — short
                           plain-English answers tied to the things
                           seekers ask after browsing (verified means
                           what, who pays, how fast). */}
                  <section className="mt-14 border-t border-border pt-10">
                    <header className="mb-6 text-center max-w-2xl mx-auto">
                      <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                        Not seeing the right fit?
                      </span>
                      <h2 className="mt-1.5 font-display text-xl md:text-2xl font-bold text-foreground tracking-tight">
                        What to do next
                      </h2>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        Three options that don't require picking a specific facility yet —
                        sometimes the right next step is a phone call, an insurance check,
                        or a clear sense of cost.
                      </p>
                    </header>

                    <div className="grid gap-4 md:grid-cols-3">
                      <Link to="/search-results"
                        className="group flex flex-col rounded-2xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 mb-3">
                          <Search className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold text-foreground text-base mb-1.5 group-hover:text-primary transition-colors">
                          Widen your search
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                          Drop the level-of-care or insurance filter, or look at other
                          cities in the same state — many people travel for the right
                          program.
                        </p>
                        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
                          Browse all centers
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </Link>

                      <Link
                        to="/insurance"
                        className="group flex flex-col rounded-2xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 mb-3">
                          <Shield className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold text-foreground text-base mb-1.5 group-hover:text-primary transition-colors">
                          Verify your insurance
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                          Most major plans cover addiction treatment by federal parity law.
                          See which carriers we work with and check your specific benefits
                          before you commit.
                        </p>
                        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
                          Check coverage
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </Link>

                      <Link
                        to="/cost-estimator"
                        className="group flex flex-col rounded-2xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 mb-3">
                          <DollarSign className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold text-foreground text-base mb-1.5 group-hover:text-primary transition-colors">
                          Estimate the cost
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                          Inpatient, outpatient, and detox cost ranges with and without
                          insurance — plus payment-without-insurance routes if you don't
                          have coverage.
                        </p>
                        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
                          See cost ranges
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </Link>
                    </div>
                  </section>

                  <section className="mt-12 mb-2 rounded-2xl border border-border bg-muted/30 p-6 md:p-8">
                    <header className="mb-5 max-w-2xl">
                      <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                        Quick answers
                      </span>
                      <h2 className="mt-1.5 font-display text-xl md:text-2xl font-bold text-foreground tracking-tight">
                        About these search results
                      </h2>
                    </header>
                    <dl className="grid gap-5 md:grid-cols-2">
                      <div>
                        <dt className="font-semibold text-foreground text-[15px] mb-1.5 flex items-center gap-2">
                          <Check className="h-4 w-4 text-emerald-600" />
                          What does &ldquo;verified&rdquo; mean?
                        </dt>
                        <dd className="text-sm text-muted-foreground leading-relaxed pl-6">
                          A verified facility is one that has either been claimed and
                          ownership-verified by its operator, or admin-approved after a
                          provider sign-up. Unclaimed SAMHSA-sourced records are listed
                          but not marked as verified.
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-foreground text-[15px] mb-1.5 flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-amber-600" />
                          Do you charge me to use this?
                        </dt>
                        <dd className="text-sm text-muted-foreground leading-relaxed pl-6">
                          No. RehabLookup is free for seekers and families. We don't take
                          placement fees to rank facilities higher in organic results.
                          Featured Placements are clearly labeled when they appear.
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-foreground text-[15px] mb-1.5 flex items-center gap-2">
                          <Shield className="h-4 w-4 text-blue-600" />
                          Is my browsing private?
                        </dt>
                        <dd className="text-sm text-muted-foreground leading-relaxed pl-6">
                          Yes. Substance-use treatment records are protected by 42 CFR
                          Part 2 — stronger than HIPAA. Our directory does not share
                          your search or inquiry data with employers, family members,
                          or the public.
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-foreground text-[15px] mb-1.5 flex items-center gap-2">
                          <Phone className="h-4 w-4 text-rose-600" />
                          What if I'm in crisis right now?
                        </dt>
                        <dd className="text-sm text-muted-foreground leading-relaxed pl-6">
                          Call <strong>911</strong> for a medical emergency. For mental-
                          health or suicide crisis, call or text <strong>988</strong>.
                          For substance-use help 24/7, call SAMHSA at{" "}
                          <strong>1-800-662-4357</strong>.
                        </dd>
                      </div>
                    </dl>
                  </section>
                </>
              ) : countyScope ? (
                /* COUNTY — capability limitation, NOT a zero-facility claim.
                   Rendered instead of the generic empty state because every
                   line of that state ("No matching centers", "No facilities
                   found in Cook County, IL", "No listings match those filters
                   in Cook County, IL") asserts a count we have no basis for.
                   Nothing here is labelled a Cook County facility, and no
                   statewide facility is relabelled as one. */
                <div
                  className="flex flex-col items-center justify-center py-12 px-4 animate-fade-in"
                  data-testid="county-limitation"
                >
                  <div className="w-full max-w-2xl mx-auto rounded-2xl border border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800/50 p-6 md:p-8">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                        <AlertCircle className="h-6 w-6 text-amber-700 dark:text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-2">
                          We can&rsquo;t filter by county yet
                        </h2>
                        <p className="text-sm text-foreground/80 leading-relaxed">
                          RehabLookup does not currently have facility-level
                          county assignments, so we can&rsquo;t filter{" "}
                          <strong>
                            {countyScope.county} County
                            {countyStateName ? `, ${countyStateName}` : ""}
                          </strong>{" "}
                          accurately yet. Our listings record a city, state and
                          ZIP code &mdash; not a county &mdash; and we will not
                          guess which county a city sits in.
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                          This is a gap in our data, not a statement about
                          treatment in {countyScope.county} County. We are not
                          telling you there are no facilities there &mdash; we
                          are telling you we cannot yet identify which of our
                          listings are inside it.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 border-t border-amber-300/50 dark:border-amber-800/40 pt-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-foreground mb-3">
                        What we can search accurately
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {countyStateSlug && countyStateName && (
                          <Link
                            to={`/rehab-centers/${countyStateSlug}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium hover:border-primary hover:text-primary transition-colors"
                          >
                            <MapPin className="h-3.5 w-3.5" />
                            Browse the {countyStateName} directory
                          </Link>
                        )}
                        <Link
                          to={`/search-results?location=${encodeURIComponent(countyScope.state)}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium hover:border-primary hover:text-primary transition-colors"
                        >
                          <Search className="h-3.5 w-3.5" />
                          Search all of {countyStateName ?? countyScope.state}
                        </Link>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Searching a city inside the county &mdash; or a ZIP code
                        &mdash; returns exact matches. Those are the geographies
                        our listings actually carry.
                      </p>
                    </div>
                  </div>

                  {/* Notify-me capture — county-level coverage is a real
                      roadmap item, so the waitlist is an honest offer here. */}
                  <div className="w-full mt-6">
                    <AreaWaitlistCapture
                      areaSlug={`county-${countyScope.county.toLowerCase().replace(/\s+/g, "-")}-${countyScope.state.toLowerCase()}`}
                      areaLabel={`${countyScope.county} County, ${countyScope.state}`}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 mt-8">
                    <Button onClick={clearAllFilters} variant="outline" className="gap-2">
                      <X className="h-4 w-4" />
                      Clear All Filters
                    </Button>
                    <Link to="/rehab-centers">
                      <Button className="gap-2">Browse All Centers</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-12 px-4 animate-fade-in">
                  {/* Zero-result recovery CTA — widen the search */}
                  <NoResultsDirectoryCTA
                    location={location}
                    treatmentTypes={activeTreatmentFilters}
                    insuranceTypes={activeInsuranceFilters}
                    source="search_results"
                  />

                  {/* Secondary: notify-me capture for users not ready to engage */}
                  <div className="w-full mt-6">
                    <AreaWaitlistCapture
                      areaSlug={`search-${(location || "any").toLowerCase().replace(/\s+/g, "-")}`}
                      areaLabel={location || undefined}
                    />
                  </div>

                  <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mt-10 mb-5 ring-1 ring-border">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>

                  {/* ZERO IS ZERO. Nothing below widens the search, drops a
                      filter automatically, or relabels a non-match as a
                      match. What the empty state owes the user is the TRUTH
                      about which refinements are active and a deterministic
                      way to relax any one of them. */}
                  {unusableQuery ? (
                    <>
                      <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-2">
                        Enter at least {MIN_TOKEN_LENGTH} characters
                      </h2>
                      <p className="text-muted-foreground text-center max-w-md mb-6">
                        &ldquo;{queryParam}&rdquo; is too short to search on. A
                        one-character query would match almost every listing in
                        the directory, and calling those matches would not be
                        true. Try a facility name, a city, a ZIP code, or a
                        service such as &ldquo;detox&rdquo;.
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-2">No matching centers</h2>
                      <p className="text-muted-foreground text-center max-w-md mb-6">
                        {queryParam
                          ? `No treatment centers match "${queryParam}". Try a different search term or adjust the filters below.`
                          : location && activeLocationScope
                            ? `No facilities found in ${describeScope(activeLocationScope)}. Try a different location or remove a filter below.`
                            : location
                              ? `No facilities found for "${location}". Try a different location or remove a filter below.`
                              : "We couldn't find any treatment centers matching your criteria. Try one of the suggestions below."}
                      </p>
                    </>
                  )}

                  {/* Suggested filter changes — one-tap removal of each ACTIVE
                      refinement, read from the canonical state. The old list
                      only covered `treatmentTypes` / `insuranceTypes`, so a
                      zero result caused by a legacy `?treatment=`, a `?type=`
                      preset or an `?amenities=` value offered no way to relax
                      the filter that actually caused it. */}
                  {(activeTreatmentFilters.length > 0 || activeInsuranceFilters.length > 0 || verifiedOnly || featuredOnly || queryParam) && (
                    <div className="w-full max-w-md mb-6 rounded-xl border border-border bg-card p-4">
                      <p className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">
                        Active filters — remove one to widen the search
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {queryParam && (
                          <button
                            onClick={clearQuery}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-primary hover:text-primary transition-colors"
                          >
                            <X className="h-3 w-3" aria-hidden="true" />
                            Search: {queryParam}
                          </button>
                        )}
                        {activeTreatmentFilters.map((t) => (
                          <button
                            key={`rm-t-${t}`}
                            onClick={() =>
                              setTreatmentFilters(activeTreatmentFilters.filter((x) => x !== t))
                            }
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-primary hover:text-primary transition-colors"
                          >
                            <X className="h-3 w-3" aria-hidden="true" />
                            Treatment: {treatmentLabel(t)}
                          </button>
                        ))}
                        {activeInsuranceFilters.map((i) => (
                          <button
                            key={`rm-i-${i}`}
                            onClick={() =>
                              setInsuranceFilters(activeInsuranceFilters.filter((x) => x !== i))
                            }
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-primary hover:text-primary transition-colors"
                          >
                            <X className="h-3 w-3" aria-hidden="true" />
                            Payment: {insuranceLabel(i)}
                          </button>
                        ))}
                        {verifiedOnly && (
                          <button
                            onClick={() => toggleBooleanFilter("verified", true)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-primary hover:text-primary transition-colors"
                          >
                            <X className="h-3 w-3" aria-hidden="true" />
                            Verified only
                          </button>
                        )}
                        {featuredOnly && (
                          <button
                            onClick={() => toggleBooleanFilter("featuredOnly", true)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-primary hover:text-primary transition-colors"
                          >
                            <X className="h-3 w-3" aria-hidden="true" />
                            Featured only
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Try a different treatment type */}
                  {activeTreatmentFilters.length > 0 && (
                    <div className="w-full max-w-md mb-6">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide text-center">
                        Or try a different treatment type
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {TREATMENT_FILTERS
                          .filter((opt) => !activeTreatmentFilters.includes(opt.value))
                          .slice(0, 4)
                          .map((opt) => (
                            <button
                              key={`alt-${opt.value}`}
                              onClick={() => setTreatmentFilters([opt.value])}
                              className="rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-primary hover:text-primary transition-colors"
                            >
                              {opt.label}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Nearby states (when location resolves to a state) */}
                  {location && (() => {
                    const parsed = parseLocationInput(location);
                    const nearbyAbbrs = parsed.stateAbbr ? getNearbyStates(parsed.stateAbbr) : [];
                    return nearbyAbbrs.length > 0 ? (
                      <div className="flex flex-wrap justify-center items-center gap-2 mb-6">
                        <span className="text-xs text-muted-foreground">Try neighboring states:</span>
                        {nearbyAbbrs.slice(0, 4).map((abbr) => (
                          <Link
                            key={abbr}
                            to={`/search-results?location=${abbr}`}
                            className="text-xs text-primary hover:underline font-medium"
                          >
                            {abbr}
                          </Link>
                        ))}
                      </div>
                    ) : null;
                  })()}

                  {/* Example locations — always offered as a quick reset path */}
                  <div className="flex flex-wrap justify-center items-center gap-2 mb-6">
                    <span className="text-xs text-muted-foreground">Try a popular location:</span>
                    {[
                      { label: "Los Angeles, CA", q: "Los Angeles, CA" },
                      { label: "Miami, FL", q: "Miami, FL" },
                      { label: "Houston, TX", q: "Houston, TX" },
                      { label: "New York, NY", q: "New York, NY" },
                      { label: "ZIP 90210", q: "90210" },
                    ].map((ex) => (
                      <Link
                        key={ex.label}
                        to={`/search-results?location=${encodeURIComponent(ex.q)}`}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        {ex.label}
                      </Link>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={clearAllFilters} variant="outline" className="gap-2">
                      <X className="h-4 w-4" />
                      Clear All Filters
                    </Button>
                    <Link to="/rehab-centers">
                      <Button className="gap-2">Browse All Centers</Button>
                    </Link>
                    <Link to="/search-results">
                      <Button variant="secondary" className="gap-2">
                        <Search className="h-4 w-4" />
                        Search Treatment Centers
                      </Button>
                    </Link>
                  </div>

                  {/* Zero exact matches still means zero. If the state has
                      facilities in OTHER cities we offer them here, under
                      their own heading, rather than silently relabelling
                      them as matches for the searched city. */}
                  <div className="w-full text-left">{nearbySection}</div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SearchResults;
