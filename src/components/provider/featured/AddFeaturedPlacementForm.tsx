import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
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

type PlacementType =
  | "homepage"
  | "state"
  | "city"
  | "search"
  | "near_me"
  | "treatment"
  | "insurance"
  | "article";

const PLACEMENT_TYPE_OPTIONS: { value: PlacementType; label: string; hint: string }[] = [
  { value: "state", label: "State page", hint: "2-letter code (e.g. TX)" },
  { value: "city", label: "City page", hint: "slug (e.g. austin)" },
  { value: "treatment", label: "Treatment-type page", hint: "slug (e.g. medication-assisted)" },
  { value: "insurance", label: "Insurance page", hint: "slug (e.g. aetna)" },
  { value: "near_me", label: "Near-me page", hint: "2-letter state code" },
  { value: "homepage", label: "Homepage (national pool)", hint: "fixed value: national" },
  { value: "search", label: "Search results (global pool)", hint: "fixed value: global" },
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
  if (type === "state" || type === "near_me") return trimmed.toUpperCase();
  if (type === "homepage") return "national";
  if (type === "search") return "global";
  return slugifyClient(trimmed);
}

interface Props {
  facilityId: string;
  subscriptionId: string;
  onAdded: () => void;
}

export function AddFeaturedPlacementForm({
  facilityId,
  subscriptionId,
  onAdded,
}: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<PlacementType | "">("");
  const [rawValue, setRawValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setType("");
    setRawValue("");
  };

  const valueRequired = type !== "homepage" && type !== "search";

  const resolvedValue = !type
    ? ""
    : !valueRequired
      ? type === "homepage" ? "national" : "global"
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
    (!valueRequired || rawValue.trim().length > 0) &&
    !submitting &&
    !slotsFull;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const placementValue = normalizeValue(type as PlacementType, rawValue);

      const { data: existing } = await supabase
        .from("featured_placements")
        .select("id, active")
        .eq("facility_id", facilityId)
        .eq("placement_type", type)
        .eq("placement_value", placementValue)
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
        ? "This placement scope is full. Pick a different value or contact support to join the waitlist."
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

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 sm:p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          Add a Featured placement
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs font-medium text-slate-700">Page type</Label>
          <Select
            value={type}
            onValueChange={(v) => {
              setType(v as PlacementType);
              if (v === "homepage" || v === "search") setRawValue("");
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
            {!valueRequired && (
              <span className="text-slate-400 font-normal"> (auto)</span>
            )}
          </Label>
          <Input
            value={!valueRequired ? (type === "homepage" ? "national" : "global") : rawValue}
            onChange={(e) => setRawValue(e.target.value)}
            placeholder={activeOption?.hint ?? "Pick a page type first"}
            disabled={submitting || !valueRequired || !type}
            className="mt-1"
          />
          {activeOption && (
            <p className="mt-1 text-[11px] text-slate-500">{activeOption.hint}</p>
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
              <span>
                <strong>Cap reached</strong> — {availability.used} of {availability.cap}{" "}
                slots in use for this scope. Try a different value or join the
                waitlist by contacting support.
              </span>
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
