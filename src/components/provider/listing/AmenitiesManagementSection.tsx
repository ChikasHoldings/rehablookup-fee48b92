import { useMemo, useState } from "react";
import { Plus, Star, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ProAuthorNotice } from "./ProAuthorNotice";
import {
  useFacilityAmenities,
  AMENITY_SUGGESTIONS,
} from "@/hooks/useFacilityAmenities";

interface AmenitiesManagementSectionProps {
  facilityId: string;
  isPro: boolean;
}

const AMENITY_MAX_LEN = 60;
const HIGHLIGHT_CAP = 6;

/**
 * Amenity manager. Tag-style — providers type or pick from suggestions
 * and tap to add. Up to 6 amenities can be "highlighted" so the public
 * profile can render them as a small featured row (Pro-only on the
 * public side via public_facility_amenities view).
 */
export function AmenitiesManagementSection({ facilityId, isPro }: AmenitiesManagementSectionProps) {
  const { amenities, isLoading, addAmenity, updateAmenity, removeAmenity } =
    useFacilityAmenities(facilityId);
  const [input, setInput] = useState("");

  const currentNamesLower = useMemo(
    () => new Set(amenities.map((a) => a.amenity_name.toLowerCase())),
    [amenities],
  );

  const filteredSuggestions = useMemo(
    () =>
      AMENITY_SUGGESTIONS.filter((s) => !currentNamesLower.has(s.toLowerCase())),
    [currentNamesLower],
  );

  const handleAdd = (name: string) => {
    const trimmed = name.trim().slice(0, AMENITY_MAX_LEN);
    if (!trimmed) return;
    addAmenity.mutate({ facility_id: facilityId, amenity_name: trimmed });
    setInput("");
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (input.trim().length > 0) handleAdd(input);
    }
  };

  const highlightCount = amenities.filter((a) => a.is_highlighted).length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Amenities</h2>
        <p className="text-sm text-muted-foreground">
          What sets your facility apart day-to-day. Add as many as you like —
          star up to {HIGHLIGHT_CAP} to feature them prominently on your
          public profile.
        </p>
      </div>

      {!isPro && <ProAuthorNotice feature="Amenities" />}

      <div className="space-y-2">
        <Label htmlFor="amenity-input">Add an amenity</Label>
        <div className="flex gap-2">
          <Input
            id="amenity-input"
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, AMENITY_MAX_LEN))}
            onKeyDown={handleInputKeyDown}
            placeholder="e.g., Private Rooms, Yoga Studio…"
            maxLength={AMENITY_MAX_LEN}
            className="flex-1"
          />
          <Button
            onClick={() => handleAdd(input)}
            disabled={input.trim().length === 0 || addAmenity.isPending}
            className="bg-[#1B365D] hover:bg-[#142a4a] gap-1.5"
          >
            {addAmenity.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Press Enter to add, or pick from the suggestions below.
        </p>
      </div>

      {filteredSuggestions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Suggestions
          </p>
          <div className="flex flex-wrap gap-1.5">
            {filteredSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleAdd(s)}
                disabled={addAmenity.isPending}
                className="text-xs px-2.5 py-1 rounded-full border border-dashed border-slate-300 text-slate-600 hover:border-[#1B365D] hover:text-[#1B365D] hover:bg-[#1B365D]/5 transition-colors"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Your amenities
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {highlightCount} / {HIGHLIGHT_CAP} highlighted
          </p>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : amenities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            <p className="text-sm">No amenities yet.</p>
            <p className="text-xs mt-1">Pick from the suggestions above or type your own.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {amenities.map((a) => {
              const canStillHighlight = highlightCount < HIGHLIGHT_CAP || a.is_highlighted;
              return (
                <div
                  key={a.id}
                  className={cn(
                    "group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors",
                    a.is_highlighted
                      ? "bg-amber-50 border-amber-300 text-amber-900"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!canStillHighlight) return;
                      updateAmenity.mutate({
                        id: a.id,
                        data: { is_highlighted: !a.is_highlighted },
                      });
                    }}
                    disabled={!canStillHighlight}
                    aria-label={
                      a.is_highlighted ? `Unhighlight ${a.amenity_name}` : `Highlight ${a.amenity_name}`
                    }
                    title={
                      !canStillHighlight && !a.is_highlighted
                        ? `Max ${HIGHLIGHT_CAP} highlighted amenities reached.`
                        : undefined
                    }
                    className={cn(
                      "inline-flex items-center justify-center h-5 w-5 rounded-full transition-colors",
                      a.is_highlighted ? "text-amber-600" : "text-slate-400 hover:text-amber-600",
                      !canStillHighlight && !a.is_highlighted && "opacity-30 cursor-not-allowed hover:text-slate-400"
                    )}
                  >
                    <Star className={cn("h-3.5 w-3.5", a.is_highlighted && "fill-current")} />
                  </button>
                  <span className="font-medium">{a.amenity_name}</span>
                  <button
                    type="button"
                    onClick={() => removeAmenity.mutate(a.id)}
                    aria-label={`Remove ${a.amenity_name}`}
                    className="inline-flex items-center justify-center h-5 w-5 rounded-full text-slate-400 hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
