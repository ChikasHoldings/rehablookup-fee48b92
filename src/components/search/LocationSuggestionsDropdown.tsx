import { useEffect, useRef } from "react";
import { Building2, Hash, Loader2, MapPin, Navigation, Search } from "lucide-react";
import {
  formatLocationSuggestion,
  type LocationSuggestion,
} from "@/data/locationSuggestions";
import { cn } from "@/lib/utils";

export type ResolvedZip = {
  zip: string;
  city: string;
  stateAbbr: string;
};

export type LocationDropdownProps = {
  /** Current input value (used to drive ZIP hint logic). */
  query: string;
  /** Whether the dropdown should be visible. */
  open: boolean;
  /** City/state suggestions (from `getLocationSuggestions`). */
  suggestions: LocationSuggestion[];
  /** Index of the currently keyboard-highlighted suggestion (-1 = none). */
  highlightedIndex: number;
  /** Async ZIP lookup is in flight. */
  zipLoading?: boolean;
  /** Resolved ZIP (city, state) ready to be inserted. */
  resolvedZip?: ResolvedZip | null;
  /** Lookup returned 404 / failed. */
  zipError?: string | null;
  /** Anchor element width — dropdown spans full width of the input wrapper. */
  className?: string;
  /** Selecting any city/state suggestion. */
  onSelectSuggestion: (suggestion: LocationSuggestion) => void;
  /** Selecting the resolved ZIP — fills "City, ST" into the input. */
  onSelectZip: (zip: ResolvedZip) => void;
  /** Click outside fires this so parent can close. */
  onDismiss: () => void;
  /** Element to ignore in click-outside logic (the input itself). */
  anchorRef?: React.RefObject<HTMLElement | null>;
};

/**
 * Unified autocomplete dropdown for the rehab-centers location input.
 *
 * Handles three suggestion modes from a single component so every search
 * variant (hero / compact-hero / compact / directory) gets identical UX:
 *  - Numeric input < 5 digits → "Type N more digit(s)…" hint row
 *  - Numeric input = 5 digits → "Looking up…" / resolved ZIP / error row
 *  - Non-numeric input        → city/state matches from `getLocationSuggestions`
 */
export function LocationSuggestionsDropdown({
  query,
  open,
  suggestions,
  highlightedIndex,
  zipLoading = false,
  resolvedZip = null,
  zipError = null,
  className,
  onSelectSuggestion,
  onSelectZip,
  onDismiss,
  anchorRef,
}: LocationDropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trimmed = query.trim();
  const digitsOnly = trimmed.replace(/\D/g, "");
  const isNumeric = trimmed.length > 0 && /^\d{1,5}$/.test(trimmed);
  const partialZipLength = isNumeric && digitsOnly.length < 5 ? digitsOnly.length : 0;
  const isCompleteZip = isNumeric && digitsOnly.length === 5;

  // Click-outside dismiss — ignores both the dropdown and the bound anchor.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      onDismiss();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onDismiss, anchorRef]);

  if (!open) return null;

  // Decide what to render: ZIP-mode > city/state matches > nothing.
  const showZipPanel = isNumeric;
  const showCityStatePanel = !showZipPanel && suggestions.length > 0;

  if (!showZipPanel && !showCityStatePanel) return null;

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label="Location suggestions"
      className={cn(
        "absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border/60 bg-card shadow-2xl animate-in fade-in-0 slide-in-from-top-1 duration-150",
        className,
      )}
    >
      <div className="py-1 px-1">
        {showZipPanel && (
          <>
            {partialZipLength > 0 && (
              <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-muted-foreground">
                <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                </div>
                <span className="flex-1">
                  Keep typing — {5 - partialZipLength} more digit
                  {5 - partialZipLength === 1 ? "" : "s"} to look up your ZIP.
                </span>
              </div>
            )}

            {isCompleteZip && zipLoading && (
              <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-muted-foreground">
                <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" aria-hidden="true" />
                </div>
                <span className="flex-1">Looking up ZIP {digitsOnly}…</span>
              </div>
            )}

            {isCompleteZip && !zipLoading && resolvedZip && (
              <button
                type="button"
                role="option"
                aria-selected="true"
                onClick={() => onSelectZip(resolvedZip)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] text-foreground/90 hover:bg-primary/10 transition-colors"
              >
                <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                </div>
                <span className="flex-1 truncate font-medium">
                  {resolvedZip.zip} — {resolvedZip.city}, {resolvedZip.stateAbbr}
                </span>
                <span className="text-xs text-muted-foreground/60 font-semibold uppercase tracking-wider bg-muted/50 px-1.5 py-0.5 rounded">
                  ZIP
                </span>
              </button>
            )}

            {isCompleteZip && !zipLoading && !resolvedZip && zipError && (
              <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-destructive">
                <div className="h-7 w-7 rounded-md bg-destructive/10 flex items-center justify-center shrink-0">
                  <Search className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
                </div>
                <span className="flex-1">{zipError} — try a city or state.</span>
              </div>
            )}
          </>
        )}

        {showCityStatePanel &&
          suggestions.map((suggestion, index) => {
            const key =
              suggestion.type === "state"
                ? `state-${suggestion.abbr}`
                : `city-${suggestion.name}-${suggestion.state}`;
            return (
              <button
                key={key}
                type="button"
                role="option"
                aria-selected={index === highlightedIndex}
                onClick={() => onSelectSuggestion(suggestion)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] transition-all duration-100",
                  index === highlightedIndex
                    ? "bg-primary/10 text-foreground"
                    : "text-foreground/80 hover:bg-muted/50",
                )}
              >
                <div
                  className={cn(
                    "h-7 w-7 rounded-md flex items-center justify-center shrink-0",
                    suggestion.type === "state" ? "bg-primary/10" : "bg-muted",
                  )}
                >
                  {suggestion.type === "state" ? (
                    <Navigation className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  ) : (
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  )}
                </div>
                <span className="flex-1 truncate font-medium">
                  {formatLocationSuggestion(suggestion)}
                </span>
                <span className="text-xs text-muted-foreground/60 font-semibold uppercase tracking-wider bg-muted/50 px-1.5 py-0.5 rounded">
                  {suggestion.type === "state" ? "State" : "City"}
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
