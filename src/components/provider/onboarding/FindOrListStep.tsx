import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Loader2,
  RefreshCcw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { trackEvent } from "@/lib/analytics";
import {
  useProviderOnboardingState,
  type ProviderOnboardingStateRow,
} from "@/hooks/useProviderOnboardingState";

interface FindOrListStepProps {
  onAdvance: () => void;
  onBack: () => void;
}

/**
 * Step 3 — Find or List.
 *
 * The provider searches the directory (3,800+ SAMHSA-sourced approved
 * facilities + every claimed listing) to pick one to claim, or types a
 * new facility name to list from scratch.
 *
 * Search hardening (round 25):
 *   - Server: `search_provider_facilities` RPC with multi-token + fuzzy
 *     (pg_trgm) matching, weighted scoring (exact > starts-with >
 *     substring > token-in-city > trigram), wildcard sanitization, and
 *     a length-bounded query (≥2 chars, ≤100 chars). Returns up to 20
 *     ranked results plus a total_matches count.
 *   - Client: 2-char minimum, 300ms debounce, input sanitization,
 *     keyboard navigation (↑/↓ to highlight, Enter to select), match
 *     highlighting in results, retry on failure, "showing N of M" copy
 *     when the result set is truncated, and a persistent "List as new"
 *     affordance regardless of whether the search returned matches.
 *
 * Phone verification was removed from this step (round 23) to reduce
 * mid-funnel friction. Verification now auto-triggers in the listing
 * details step the moment the provider enters a valid facility phone.
 *
 * Pre-seed: when AccountStep stashed selected_facility_id from a
 * ?intent=claim&facility_id=… entry URL, we render the pre-selected
 * facility at the top with a "Continue with this facility" CTA.
 */

interface FacilityRow {
  id: string;
  name: string;
  slug: string | null;
  city: string;
  state: string;
  logo_url: string | null;
  is_claimed: boolean | null;
}

interface SearchResultRow extends FacilityRow {
  match_score: number;
  total_matches: number;
}

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;
const DISPLAY_LIMIT = 20;

/** Defensive client-side sanitization. The RPC sanitizes too, but
 *  stripping wildcards + control chars at the boundary avoids round-trips
 *  for queries that have nothing to match. */
function sanitizeQuery(raw: string): string {
  return raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f%_\n\r]/g, "")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

function useFacilitySearch(query: string) {
  return useQuery({
    queryKey: ["provider-onboarding-facility-search", query],
    enabled: sanitizeQuery(query).length >= MIN_QUERY_LENGTH,
    queryFn: async (): Promise<SearchResultRow[]> => {
      const q = sanitizeQuery(query);
      if (q.length < MIN_QUERY_LENGTH) return [];
      const { data, error } = await supabase.rpc("search_provider_facilities", {
        p_query: q,
        p_limit: DISPLAY_LIMIT,
      });
      if (error) {
        console.warn("[FindOrList] search RPC failed", error);
        throw error;
      }
      return (data as unknown as SearchResultRow[]) ?? [];
    },
    staleTime: 1000 * 30,
    retry: 1,
    retryDelay: 500,
  });
}

function useSeedFacility(facilityId: string | null) {
  return useQuery({
    queryKey: ["provider-onboarding-seed-facility", facilityId],
    enabled: !!facilityId,
    queryFn: async (): Promise<FacilityRow | null> => {
      if (!facilityId) return null;
      const { data, error } = await supabase
        .from("public_facilities")
        .select("id, name, slug, city, state, logo_url, is_claimed")
        .eq("id", facilityId)
        .maybeSingle();
      if (error) {
        console.warn("[FindOrList] seed facility read failed", error);
        return null;
      }
      return (data as unknown as FacilityRow) ?? null;
    },
    // Capped at 5 minutes — long enough that returning to this step
    // mid-onboarding re-uses the same fetch, short enough that if the
    // selected facility's name/slug changed (admin edit) or it was
    // deprecated (status flip), the next mount picks up the fresh
    // copy instead of rendering a stale label that conflicts with
    // what the user sees on the live profile. Previously Infinity,
    // which masked deletes / renames until a hard reload.
    staleTime: 5 * 60 * 1000,
  });
}

/** Highlight tokens from the query inside a label. Splits on whitespace
 *  and punctuation, lowercase-folds, and wraps matched substrings in
 *  <mark> tags. Pure string → JSX; safe (no innerHTML). */
function HighlightedText({ text, query }: { text: string; query: string }) {
  const tokens = useMemo(() => {
    const sanitized = sanitizeQuery(query).toLowerCase();
    if (sanitized.length < MIN_QUERY_LENGTH) return [] as string[];
    const parts = sanitized.split(/[\s,/.\-]+/).filter((t) => t.length >= 2);
    // Always include the full sanitized query so "denver recovery"
    // also highlights the contiguous phrase if it appears.
    return [sanitized, ...parts];
  }, [query]);

  if (tokens.length === 0) {
    return <>{text}</>;
  }

  // Build a non-overlapping list of ranges that match any token.
  const lower = text.toLowerCase();
  const ranges: Array<[number, number]> = [];
  for (const tok of tokens) {
    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(tok, from);
      if (idx === -1) break;
      ranges.push([idx, idx + tok.length]);
      from = idx + tok.length;
    }
  }
  if (ranges.length === 0) return <>{text}</>;

  // Sort + merge overlapping ranges.
  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: Array<[number, number]> = [];
  for (const [s, e] of ranges) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) {
      last[1] = Math.max(last[1], e);
    } else {
      merged.push([s, e]);
    }
  }

  // Emit JSX fragments.
  const out: Array<{ text: string; hit: boolean }> = [];
  let cursor = 0;
  for (const [s, e] of merged) {
    if (s > cursor) out.push({ text: text.slice(cursor, s), hit: false });
    out.push({ text: text.slice(s, e), hit: true });
    cursor = e;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), hit: false });

  return (
    <>
      {out.map((frag, i) =>
        frag.hit ? (
          <mark key={i} className="bg-amber-100 text-slate-900 rounded px-0.5">
            {frag.text}
          </mark>
        ) : (
          <span key={i}>{frag.text}</span>
        ),
      )}
    </>
  );
}

function FacilityRowItem({
  facility,
  isOwn,
  busy,
  query,
  active,
  onSelect,
  onHover,
}: {
  facility: FacilityRow;
  isOwn: boolean;
  busy: boolean;
  query: string;
  active: boolean;
  onSelect: () => void;
  onHover?: () => void;
}) {
  const blocked = facility.is_claimed && !isOwn;
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        onMouseEnter={onHover}
        disabled={blocked || busy}
        aria-disabled={!!blocked || busy}
        title={blocked ? "This listing is already managed by another provider. Contact support to dispute." : undefined}
        className={cn(
          "w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
          blocked
            ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
            : active
              ? "border-[#1B365D] bg-[#1B365D]/5 ring-1 ring-[#1B365D]/30"
              : "border-slate-200 bg-white hover:border-[#1B365D]/40 hover:bg-[#1B365D]/5",
        )}
      >
        {facility.logo_url ? (
          <img
            src={facility.logo_url}
            alt=""
            width={36}
            height={36}
            loading="lazy"
            className="h-9 w-9 rounded-md object-cover bg-slate-100 flex-shrink-0"
            onError={(e) => {
              // Hide broken images so we fall back to the initials avatar.
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div
            aria-hidden
            className="h-9 w-9 rounded-md bg-[#1B365D]/10 text-[#1B365D] flex items-center justify-center text-xs font-bold flex-shrink-0"
          >
            {facility.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900 truncate">
            <HighlightedText text={facility.name} query={query} />
          </p>
          <p className="text-xs text-slate-500 truncate">
            <HighlightedText text={`${facility.city}, ${facility.state}`} query={query} />
          </p>
        </div>
        {blocked ? (
          <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-300 flex-shrink-0">
            Already claimed
          </Badge>
        ) : (
          <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0" aria-hidden />
        )}
      </button>
    </li>
  );
}

export function FindOrListStep({ onAdvance, onBack }: FindOrListStepProps) {
  const { data: stateRow, advance } = useProviderOnboardingState();

  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Pre-selected facility if AccountStep stashed selected_facility_id
  // from the ?intent=claim entry URL.
  const seededId = stateRow?.selected_facility_id ?? null;
  const { data: seededFacility } = useSeedFacility(seededId);

  const sanitizedDebounced = sanitizeQuery(debouncedQuery);
  const canSearch = sanitizedDebounced.length >= MIN_QUERY_LENGTH;

  const {
    data: allResults = [],
    isFetching: searchLoading,
    isError,
    refetch,
  } = useFacilitySearch(debouncedQuery);

  // Hide the pre-seeded facility from the result list (rendered separately).
  const results = useMemo(
    () => allResults.filter((r) => r.id !== seededFacility?.id),
    [allResults, seededFacility?.id],
  );

  const totalMatches = allResults[0]?.total_matches ?? 0;
  const showZeroResults =
    canSearch && !searchLoading && !isError && allResults.length === 0;

  // Reset highlighted row whenever the result set changes.
  useEffect(() => {
    setActiveIdx(-1);
  }, [results.length, sanitizedDebounced]);

  async function handleSelectExisting(facilityId: string) {
    if (busy) return;
    // Guard: refuse to advance into the claim flow for a facility that's
    // already owned by another provider. The seeded-facility card and
    // the search-result list both surface the "already claimed" warning
    // banner, but the row click handler used to advance anyway —
    // ClaimWizard would then dead-end with a 403 at the verification
    // step. Bouncing here keeps the user in find/list with a clear toast.
    const candidate =
      seededFacility?.id === facilityId
        ? seededFacility
        : results.find((r) => r.id === facilityId);
    if (candidate?.is_claimed) {
      toast.error("This facility was already claimed by another provider.");
      return;
    }
    setBusy(true);
    try {
      await advance({
        mode: "claim",
        selected_facility_id: facilityId,
        current_step: "build",
      } as Partial<ProviderOnboardingStateRow>);
      trackEvent("provider_onboarding_step_submit", {
        step_name: "find_or_list",
        mode: "claim",
        plan: null,
        has_facility_match: true,
      });
      onAdvance();
    } catch (e) {
      console.error("[FindOrList] select-facility failed", e);
      toast.error("Couldn't save that selection. Please try again.");
      setBusy(false);
    }
  }

  async function handleListNew(name: string) {
    const trimmed = name.trim();
    if (busy || trimmed.length === 0) return;
    setBusy(true);
    try {
      await advance({
        mode: "list",
        initial_facility_name: trimmed,
        // Clear a stale claim-mode pre-seed so the wizard's list-new
        // branch doesn't inherit a different facility_id.
        selected_facility_id: null,
        current_step: "build",
      } as Partial<ProviderOnboardingStateRow>);
      trackEvent("provider_onboarding_step_submit", {
        step_name: "find_or_list",
        mode: "list",
        plan: null,
        has_facility_match: false,
      });
      onAdvance();
    } catch (e) {
      console.error("[FindOrList] list-new failed", e);
      toast.error("Couldn't save that selection. Please try again.");
      setBusy(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (activeIdx >= 0 && activeIdx < results.length) {
        e.preventDefault();
        const r = results[activeIdx];
        if (!r.is_claimed) void handleSelectExisting(r.id);
      }
    } else if (e.key === "Escape") {
      setActiveIdx(-1);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-[#1B365D] font-semibold mb-1">
          <Building2 className="h-3.5 w-3.5" aria-hidden />
          Step 3 of 5
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">
          Find or list your facility
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Search 3,800+ verified treatment facilities by name, city, or state.
          If we don't have your facility yet, you can list it as new.
        </p>
      </header>

      {/* Facility search section */}
      <section className="space-y-3">
        {/* Pre-seeded claim-intent facility */}
        {seededFacility && (
          <div className="rounded-lg border-2 border-[#1B365D]/30 bg-[#1B365D]/5 p-3.5">
            <p className="text-xs uppercase tracking-wide text-[#1B365D] font-semibold mb-2">
              Continue with this facility
            </p>
            {seededFacility.is_claimed && (
              // Round-30 audit fix: deep-link to an already-claimed
              // facility used to dead-end inside ClaimWizard. Surface
              // it here so the user can search for theirs instead.
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mb-2">
                Heads-up — this facility was already claimed by another
                provider. You can still search for the right one below.
              </p>
            )}
            <ul className="space-y-2">
              <FacilityRowItem
                facility={seededFacility}
                isOwn={false}
                busy={busy}
                query=""
                active={false}
                onSelect={() => handleSelectExisting(seededFacility.id)}
              />
            </ul>
          </div>
        )}
        {seededId && !seededFacility && (
          // Deep link with a facility_id that doesn't resolve in
          // public_facilities (deleted, unapproved, RLS-blocked).
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5">
            <p className="text-sm text-amber-900">
              We couldn't find the facility you were trying to claim. It
              may have been removed or is awaiting approval. Search below
              to find the correct one, or list a new facility.
            </p>
          </div>
        )}

        <div>
          <label
            htmlFor="facility-search"
            className="block text-xs font-medium text-slate-700 mb-1.5"
          >
            Search by facility name, city, or state
          </label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
            <Input
              ref={inputRef}
              id="facility-search"
              type="search"
              autoComplete="off"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="facility-search-results"
              aria-activedescendant={
                activeIdx >= 0 && activeIdx < results.length
                  ? `facility-result-${results[activeIdx].id}`
                  : undefined
              }
              placeholder='e.g. "Sunrise Recovery" or "Denver, CO"'
              value={query}
              maxLength={MAX_QUERY_LENGTH}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9 h-10"
            />
            {searchLoading && canSearch && (
              <Loader2
                className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin"
                aria-label="Searching"
              />
            )}
          </div>
          {query.trim().length > 0 && query.trim().length < MIN_QUERY_LENGTH && (
            <p className="mt-1 text-[11px] text-slate-500">
              Keep typing — we search once you have at least {MIN_QUERY_LENGTH} characters.
            </p>
          )}
        </div>

        {/* Results */}
        <div className="min-h-[60px]" id="facility-search-results" role="listbox">
          {!canSearch ? (
            <p className="text-xs text-slate-500">
              {query.trim().length === 0
                ? "Start typing your facility name to see matches."
                : null}
            </p>
          ) : isError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" aria-hidden />
                <div className="flex-1">
                  <p className="text-sm font-medium text-rose-900">Search failed</p>
                  <p className="text-xs text-rose-700 mt-0.5">
                    We couldn't reach the directory. Check your connection and try again.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void refetch()}
                    className="mt-2 h-7 gap-1.5 text-xs"
                  >
                    <RefreshCcw className="h-3 w-3" aria-hidden />
                    Retry
                  </Button>
                </div>
              </div>
            </div>
          ) : searchLoading ? (
            <ul className="space-y-2">
              {[0, 1, 2].map((i) => (
                <li key={i}>
                  <Skeleton className="h-12 w-full rounded-lg" />
                </li>
              ))}
            </ul>
          ) : results.length > 0 ? (
            <>
              <ul className="space-y-2">
                {results.map((r, i) => (
                  <FacilityRowItem
                    key={r.id}
                    facility={r}
                    isOwn={false}
                    busy={busy}
                    query={sanitizedDebounced}
                    active={i === activeIdx}
                    onSelect={() => handleSelectExisting(r.id)}
                    onHover={() => setActiveIdx(i)}
                  />
                ))}
              </ul>
              {totalMatches > results.length && (
                <p className="text-[11px] text-slate-500 mt-2">
                  Showing top {results.length} of {totalMatches.toLocaleString()} matches.
                  Refine your search with a city or state to narrow down.
                </p>
              )}
            </>
          ) : showZeroResults ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="text-sm text-slate-700">
                We couldn't find a facility matching{" "}
                <span className="font-medium text-slate-900">"{sanitizedDebounced}"</span>.
              </p>
              <p className="text-xs text-slate-500 mt-1">You can list it as a new facility.</p>
              <Button
                size="sm"
                onClick={() => handleListNew(sanitizedDebounced)}
                disabled={busy}
                className="mt-3 bg-[#1B365D] hover:bg-[#142a4a] gap-1.5"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                List "{sanitizedDebounced}" as new facility
              </Button>
            </div>
          ) : null}
        </div>

        {/* Always-available "list as new" affordance — even when there
            are matches, the user might be looking for a facility we
            don't have yet that happens to share keywords with existing
            listings. */}
        {canSearch && results.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => handleListNew(sanitizedDebounced)}
              disabled={busy}
              className="text-xs text-[#1B365D] hover:underline font-medium disabled:opacity-50"
            >
              Don't see your facility? List "{sanitizedDebounced}" as new
            </button>
          </div>
        )}
      </section>

      <div className="flex items-center justify-start pt-1">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </Button>
      </div>
    </div>
  );
}
