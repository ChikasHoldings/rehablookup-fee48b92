import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Plus, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JoinAddonWaitlistButton } from "@/components/provider/JoinAddonWaitlistButton";
import { STATE_COORDINATES } from "@/utils/proximityRanking";

type PlacementType =
  | "homepage"
  | "state"
  | "city"
  | "search"
  | "near_me"
  | "treatment"
  | "insurance"
  | "international"
  | "article";

type Mode = "featured" | "concierge";

// Geo placement types that, in Featured mode, are locked to the facility's
// own address (derived below) so a facility only ever Features in its real
// operating geography. In Concierge mode these become free-form (the partner
// pays for national reach and may target any geography).
const GEO_TYPES: ReadonlySet<string> = new Set(["state", "city", "near_me"]);

// Types whose placement_value is fixed (no user input) — homepage is always
// "national", search/international are always "global".
const FIXED_VALUE: Record<string, string> = {
  homepage: "national",
  search: "global",
  international: "global",
};

// Featured is LOCAL/REGIONAL only: the provider can rotate on their own
// state / city / near-me pages (+ treatment/insurance/article). Homepage
// (national), the international pages, and the global search pool are reserved
// for the Concierge Partner upgrade, so they are NOT offered in Featured mode.
const FEATURED_OPTIONS: { value: PlacementType; label: string; hint: string }[] = [
  { value: "state", label: "State page", hint: "Your facility's state (from its address)" },
  { value: "city", label: "City page", hint: "Your facility's city (from its address)" },
  { value: "near_me", label: "Near-me page", hint: "Your facility's state (from its address)" },
  { value: "treatment", label: "Treatment-type page", hint: "slug (e.g. medication-assisted)" },
  { value: "insurance", label: "Insurance page", hint: "slug (e.g. aetna)" },
  { value: "article", label: "Article rotation", hint: "article slug" },
];

// Concierge is the national upgrade: homepage + international fixed slots, plus
// manual state/city/near-me entry for ANY geography (not address-locked).
const CONCIERGE_OPTIONS: { value: PlacementType; label: string; hint: string }[] = [
  { value: "homepage", label: "Homepage (national)", hint: "National homepage rotation" },
  { value: "international", label: "International pages", hint: "Global international rotation" },
  { value: "state", label: "State page", hint: "Any US state (e.g. California)" },
  { value: "city", label: "City page", hint: "Any city (e.g. Los Angeles)" },
  { value: "near_me", label: "Near-me page", hint: "2-letter state abbr (e.g. CA)" },
  { value: "treatment", label: "Treatment-type page", hint: "slug (e.g. medication-assisted)" },
  { value: "insurance", label: "Insurance page", hint: "slug (e.g. aetna)" },
  { value: "article", label: "Article rotation", hint: "article slug" },
];

function slugifyClient(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeValue(type: PlacementType, raw: string): string {
  const trimmed = raw.trim();
  // near_me matches the public near-me pages, which pass a 2-letter abbr.
  if (type === "near_me") return trimmed.toUpperCase();
  if (type in FIXED_VALUE) return FIXED_VALUE[type];
  // state + city match the dedicated state/city pages, which pass a slug
  // (StatePage/CityPage pass stateData.slug / cityData.slug). Treatment /
  // insurance / article are slugs too.
  return slugifyClient(trimmed);
}

interface Props {
  facilityId: string;
  subscriptionId: string;
  onAdded: () => void;
  /**
   * "featured" (default): geo placements are derived from + locked to the
   * facility address, and only local/regional page types are offered.
   * "concierge": national homepage + international are unlocked and the
   * provider may target ANY state/city manually (national upgrade tier).
   */
  mode?: Mode;
}

export function AddFeaturedPlacementForm({
  facilityId,
  subscriptionId,
  onAdded,
  mode = "featured",
}: Props) {
  const queryClient = useQueryClient();
  const isConcierge = mode === "concierge";
  const PLACEMENT_TYPE_OPTIONS = isConcierge ? CONCIERGE_OPTIONS : FEATURED_OPTIONS;
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<PlacementType | "">("");
  const [rawValue, setRawValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep-link claim: arriving from a waitlist "Claim slot" link
  // (?claim=featured&ctype=<type>&cvalue=<value>) auto-opens the dialog with
  // the invited scope pre-selected so the provider confirms in one step. We
  // consume the params (replace, no history entry) so the dialog doesn't
  // re-open on later renders. Runs once on mount.
  useEffect(() => {
    if (isConcierge) return; // the Featured surface handles claim=featured only
    if (searchParams.get("claim") !== "featured") return;
    const ctype = searchParams.get("ctype");
    const cvalue = searchParams.get("cvalue");
    if (ctype && PLACEMENT_TYPE_OPTIONS.some((o) => o.value === ctype)) {
      setType(ctype as PlacementType);
      // Geo types are address-locked (value auto-derives); fixed-value types
      // need no input. Only seed rawValue for free-text types (treatment/insurance).
      if (cvalue && !GEO_TYPES.has(ctype) && !(ctype in FIXED_VALUE)) {
        setRawValue(cvalue);
      }
      setOpen(true);
    }
    const next = new URLSearchParams(searchParams);
    next.delete("claim");
    next.delete("ctype");
    next.delete("cvalue");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // In Featured mode the facility's own address drives every geo placement —
  // we never let the provider hand-type a state/city, so they can't Feature in
  // a geography they aren't located in. Concierge mode pays for national reach,
  // so that lock is lifted and the address lookup isn't needed.
  const { data: facilityGeo, isLoading: geoLoading } = useQuery({
    queryKey: ["facility-geo-for-featured", facilityId],
    enabled: !!facilityId && !isConcierge,
    queryFn: async (): Promise<{ state: string | null; city: string | null } | null> => {
      const { data, error } = await supabase
        .from("facilities")
        .select("state, city")
        .eq("id", facilityId)
        .maybeSingle();
      if (error) {
        console.warn("[AddFeaturedPlacementForm] facility geo lookup failed", error);
        return null;
      }
      return (data as { state: string | null; city: string | null } | null) ?? null;
    },
    staleTime: 1000 * 60 * 5,
  });

  const facilityStateSlug = facilityGeo?.state ? slugifyClient(facilityGeo.state) : "";
  const facilityStateAbbr = facilityStateSlug
    ? (STATE_COORDINATES[facilityStateSlug]?.abbr ?? "")
    : "";
  const facilityCitySlug = facilityGeo?.city ? slugifyClient(facilityGeo.city) : "";

  // Derived, address-locked value for each geo placement type. Already in the
  // normalized form the public pages match on (slug for state/city, abbr for
  // near_me), so it doesn't pass back through normalizeValue.
  const derivedGeoValue = (t: string): string =>
    t === "state"
      ? facilityStateSlug
      : t === "city"
        ? facilityCitySlug
        : t === "near_me"
          ? facilityStateAbbr
          : "";

  // state / near_me need a resolvable state; city needs a city.
  const geoReady = (t: string): boolean =>
    t === "city" ? !!facilityCitySlug : !!facilityStateAbbr;

  // Geo types are address-locked only in Featured mode.
  const isLockedGeoType = (t: string): boolean => !isConcierge && GEO_TYPES.has(t);
  const isFixedValueType = (t: string): boolean => t in FIXED_VALUE;

  const reset = () => {
    setType("");
    setRawValue("");
  };

  const valueRequired = !!type && !isFixedValueType(type);

  const resolvedValue = !type
    ? ""
    : isLockedGeoType(type)
      ? derivedGeoValue(type)
      : isFixedValueType(type)
        ? FIXED_VALUE[type]
        : rawValue.trim().length > 0
          ? normalizeValue(type as PlacementType, rawValue)
          : "";

  const { data: availability, isFetching: availabilityLoading } = useQuery({
    queryKey: ["placement-availability", type, resolvedValue],
    enabled: !!type && resolvedValue.length > 0,
    queryFn: async (): Promise<{ cap: number; used: number; remaining: number } | null> => {
      const { data, error } = await supabase.rpc("get_placement_availability", {
        p_type: type,
        p_value: resolvedValue,
      });
      if (error) {
        console.warn("[AddFeaturedPlacementForm] availability lookup failed", error);
        return null;
      }
      const row = (data as { cap: number; used: number; remaining: number }[] | null)?.[0];
      return row ?? null;
    },
    staleTime: 1000 * 15,
  });

  const slotsFull = availability !== null && availability !== undefined && availability.remaining <= 0;

  const canSubmit =
    type !== "" &&
    (!valueRequired ||
      (isLockedGeoType(type) ? geoReady(type) : rawValue.trim().length > 0)) &&
    !submitting &&
    !slotsFull;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const placementValue = resolvedValue;
      if (!placementValue) {
        toast.error("Couldn't resolve a value for this placement. Try again.");
        return;
      }

      // Deterministically pick the most relevant existing row (active first,
      // else most recently activated). A bare .maybeSingle() errored with
      // PGRST116 when historic duplicate rows existed, and the ignored error
      // left `existing` null → the code fell through and INSERTed a new
      // duplicate. .limit(1) makes the lookup single-row-safe.
      const { data: existing } = await supabase
        .from("featured_placements")
        .select("id, active")
        .eq("facility_id", facilityId)
        .eq("placement_type", type)
        .eq("placement_value", placementValue)
        .order("active", { ascending: false })
        .order("activated_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (existing && (existing as { active: boolean }).active === true) {
        toast.error("This placement is already active.");
        return;
      }

      if (existing) {
        const { error } = await supabase
          .from("featured_placements")
          .update({
            subscription_id: subscriptionId,
            active: true,
            activated_at: new Date().toISOString(),
            deactivated_at: null,
          })
          .eq("id", (existing as { id: string }).id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("featured_placements").insert({
          facility_id: facilityId,
          subscription_id: subscriptionId,
          placement_type: type,
          placement_value: placementValue,
          active: true,
          activated_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      toast.success("Placement added — you'll rotate on this page from now on.");
      reset();
      setOpen(false);
      onAdded();
      queryClient.invalidateQueries({
        queryKey: ["featured-placements", subscriptionId],
      });
    } catch (err) {
      console.error("[AddFeaturedPlacementForm] add failed", err);
      const msg = err instanceof Error ? err.message : "Failed to add placement";
      // Surface the trigger's cap-exceeded raise cleanly. PostgREST
      // wraps the SQL message; trim to the meaningful prefix.
      const friendly = msg.includes("Featured slot cap reached")
        ? "This placement scope just filled up. Pick a different value or join the waitlist."
        : msg;
      toast.error(friendly);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Plus className="h-4 w-4" />
        Add a placement
      </Button>
    );
  }

  const activeOption = PLACEMENT_TYPE_OPTIONS.find((o) => o.value === type);
  const lockedGeo = isLockedGeoType(type);
  const fixedValue = isFixedValueType(type);

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 sm:p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          {isConcierge ? "Add an advertising placement" : "Add a Featured placement"}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>

      {/* Location context — in Featured mode every geo placement is scoped to
          this address. Concierge mode targets any geography, so we instead
          explain the national reach. */}
      {isConcierge ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden />
          Concierge Partner — feature nationally, internationally, and in any
          state or city you choose.
        </p>
      ) : (
        facilityGeo && (facilityGeo.state || facilityGeo.city) && (
          <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden />
            Featuring for{" "}
            <strong className="text-slate-700">
              {[facilityGeo.city, facilityGeo.state].filter(Boolean).join(", ")}
            </strong>
          </p>
        )
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs font-medium text-slate-700">Page type</Label>
          <Select
            value={type}
            onValueChange={(v) => {
              setType(v as PlacementType);
              // Geo types derive their value from the address (Featured) or
              // expect manual entry (Concierge); reset the input either way.
              setRawValue("");
            }}
            disabled={submitting}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Pick a page type" />
            </SelectTrigger>
            <SelectContent>
              {PLACEMENT_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-700">
            Value
            {(fixedValue || lockedGeo) && (
              <span className="text-slate-400 font-normal"> (auto)</span>
            )}
          </Label>
          {lockedGeo ? (
            geoLoading ? (
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Loading your facility location…
              </div>
            ) : geoReady(type) ? (
              <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {type === "state" && <>State page — <strong>{facilityGeo?.state}</strong></>}
                {type === "city" && (
                  <>City page — <strong>{facilityGeo?.city}{facilityStateAbbr ? `, ${facilityStateAbbr}` : ""}</strong></>
                )}
                {type === "near_me" && (
                  <>Near-me searches in <strong>{facilityGeo?.state} ({facilityStateAbbr})</strong></>
                )}
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Locked to your facility&apos;s address.
                </p>
              </div>
            ) : (
              <div className="mt-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Add your facility&apos;s {type === "city" ? "city" : "state"} on its
                listing to enable this placement.
              </div>
            )
          ) : (
            <>
              <Input
                value={fixedValue ? FIXED_VALUE[type] : rawValue}
                onChange={(e) => setRawValue(e.target.value)}
                placeholder={activeOption?.hint ?? "Pick a page type first"}
                disabled={submitting || fixedValue || !type}
                className="mt-1"
              />
              {activeOption && (
                <p className="mt-1 text-[11px] text-slate-500">{activeOption.hint}</p>
              )}
            </>
          )}
        </div>
      </div>

      {type && resolvedValue && (
        <div
          className={
            "rounded-md border px-3 py-2 text-xs " +
            (slotsFull
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-slate-200 bg-slate-50 text-slate-700")
          }
        >
          {availabilityLoading ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              Checking availability…
            </span>
          ) : availability ? (
            slotsFull ? (
              <div className="space-y-2">
                <p>
                  <strong>Cap reached</strong> — {availability.used} of {availability.cap}{" "}
                  slots in use for this scope.
                </p>
                <JoinAddonWaitlistButton
                  addonType="featured"
                  facilityId={facilityId}
                  scopeType={type as string}
                  scopeValue={resolvedValue}
                />
              </div>
            ) : (
              <span>
                <strong>{availability.remaining}</strong> of {availability.cap} slots
                available for this scope ({availability.used} currently in use).
              </span>
            )
          ) : (
            <span className="text-slate-500">Cap data unavailable; submit will still try.</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="submit"
          disabled={!canSubmit}
          className="bg-[#1B365D] hover:bg-[#142a4a] gap-2"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add placement
        </Button>
      </div>
    </form>
  );
}
