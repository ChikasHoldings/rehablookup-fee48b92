import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JoinAddonWaitlistButton } from "@/components/provider/JoinAddonWaitlistButton";

const US_STATE_ABBRS: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
];

const LOC_OPTIONS: { value: string; label: string }[] = [
  { value: "detox", label: "Detox" },
  { value: "inpatient", label: "Inpatient" },
  { value: "residential", label: "Residential" },
  { value: "php", label: "PHP" },
  { value: "iop", label: "IOP" },
  { value: "outpatient", label: "Outpatient" },
  { value: "sober_living", label: "Sober Living" },
];

interface AddConciergeGeoFormProps {
  facilityId: string;
  subscriptionId: string;
  /** Refresh-key for the parent's geos table after a successful add. */
  onAdded: () => void;
}

export function AddConciergeGeoForm({
  facilityId,
  subscriptionId,
  onAdded,
}: AddConciergeGeoFormProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [locs, setLocs] = useState<Set<string>>(new Set());
  const [ekraAck, setEkraAck] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep-link claim: arriving from a waitlist "Claim slot" link
  // (?claim=concierge&cstate=<abbr>&ccity=<city>) auto-opens the dialog with
  // the invited geography pre-filled. Levels of care + the EKRA acknowledgement
  // still require an explicit choice. Consumes the params so the dialog doesn't
  // re-open on later renders. Runs once on mount.
  useEffect(() => {
    if (searchParams.get("claim") !== "concierge") return;
    const cstate = searchParams.get("cstate");
    const ccity = searchParams.get("ccity");
    if (cstate && US_STATE_ABBRS.some((s) => s.code === cstate)) {
      setState(cstate);
      if (ccity) setCity(ccity);
      setOpen(true);
    }
    const next = new URLSearchParams(searchParams);
    next.delete("claim");
    next.delete("cstate");
    next.delete("ccity");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: availability, isFetching: availabilityLoading } = useQuery({
    queryKey: ["concierge-availability", state, city.trim()],
    enabled: state.length === 2,
    queryFn: async (): Promise<{ cap: number; used: number; remaining: number } | null> => {
      const { data, error } = await supabase.rpc("get_concierge_availability", {
        p_state: state,
        p_city: city.trim().length > 0 ? city.trim() : null,
      });
      if (error) {
        console.warn("[AddConciergeGeoForm] availability lookup failed", error);
        return null;
      }
      const row = (data as { cap: number; used: number; remaining: number }[] | null)?.[0];
      return row ?? null;
    },
    staleTime: 1000 * 15,
  });

  const slotsFull = availability !== null && availability !== undefined && availability.remaining <= 0;

  const canSubmit =
    state.length === 2 && locs.size > 0 && ekraAck && !submitting && !slotsFull;

  const reset = () => {
    setState("");
    setCity("");
    setLocs(new Set());
    setEkraAck(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const trimmedCity = city.trim();
      const normalizedCity = trimmedCity.length > 0 ? trimmedCity : null;

      const { data: existing } = await supabase
        .from("concierge_partner_facilities")
        .select("id, active")
        .eq("facility_id", facilityId)
        .eq("geo_state", state)
        .eq("geo_city", normalizedCity as never)
        .maybeSingle();

      if (existing && (existing as { active: boolean }).active === true) {
        toast.error(
          "This geography is already active for your facility. Pick a different state or city.",
        );
        return;
      }

      if (existing) {
        const { error } = await supabase
          .from("concierge_partner_facilities")
          .update({
            subscription_id: subscriptionId,
            level_of_care: Array.from(locs),
            active: true,
            activated_at: new Date().toISOString(),
            deactivated_at: null,
          })
          .eq("id", (existing as { id: string }).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("concierge_partner_facilities")
          .insert({
            facility_id: facilityId,
            subscription_id: subscriptionId,
            geo_state: state,
            geo_city: normalizedCity,
            level_of_care: Array.from(locs),
            active: true,
            activated_at: new Date().toISOString(),
          });
        if (error) throw error;
      }

      toast.success("Geography added — you'll appear in advisor matching for this market.");
      reset();
      setOpen(false);
      onAdded();
      queryClient.invalidateQueries({ queryKey: ["concierge-geos", subscriptionId] });
    } catch (err) {
      console.error("[AddConciergeGeoForm] add failed", err);
      const msg = err instanceof Error ? err.message : "Failed to add geo";
      const friendly = msg.includes("Concierge partner cap reached")
        ? "This geography just filled up. Pick a different city or join the waitlist."
        : msg;
      toast.error(friendly);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLoc = (value: string) => {
    setLocs((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
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
        Add a geography
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          Add a Concierge Partner geography
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
          <Label className="text-xs font-medium text-slate-700">State</Label>
          <Select value={state} onValueChange={setState} disabled={submitting}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Pick a state" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {US_STATE_ABBRS.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {s.name} ({s.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-700">
            City <span className="text-slate-400 font-normal">(optional — leave blank for statewide)</span>
          </Label>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Austin"
            className="mt-1"
            disabled={submitting}
          />
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium text-slate-700">
          Levels of care you want advisor matches for
        </Label>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LOC_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 cursor-pointer hover:bg-slate-50"
            >
              <Checkbox
                checked={locs.has(opt.value)}
                onCheckedChange={() => toggleLoc(opt.value)}
                disabled={submitting}
              />
              <span className="text-sm text-slate-700">{opt.label}</span>
            </label>
          ))}
        </div>
        {locs.size === 0 && (
          <p className="mt-1.5 text-[11px] text-slate-500">Pick at least one level of care.</p>
        )}
      </div>

      {state.length === 2 && (
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
                  partner slots in use for {state}
                  {city.trim().length > 0 ? `, ${city.trim()}` : ""}.
                </p>
                <JoinAddonWaitlistButton
                  addonType="concierge"
                  facilityId={facilityId}
                  geoState={state}
                  geoCity={city.trim().length > 0 ? city.trim() : null}
                  levelOfCare={Array.from(locs)}
                />
              </div>
            ) : (
              <span>
                <strong>{availability.remaining}</strong> of {availability.cap} partner
                slots available for {state}
                {city.trim().length > 0 ? `, ${city.trim()}` : ""} ({availability.used}{" "}
                currently in use).
              </span>
            )
          ) : (
            <span className="text-slate-500">Cap data unavailable; submit will still try.</span>
          )}
        </div>
      )}

      <div className="rounded-md border border-violet-200 bg-violet-50/40 p-3">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <Checkbox
            checked={ekraAck}
            onCheckedChange={(c) => setEkraAck(c === true)}
            disabled={submitting}
            className="mt-0.5"
          />
          <span className="text-xs text-slate-800 leading-relaxed">
            <ShieldCheck className="inline h-3.5 w-3.5 -mt-0.5 mr-1 text-violet-700" aria-hidden />
            <strong>EKRA acknowledgement.</strong> I understand Concierge Partner is a
            flat subscription fee for prominent surfacing in advisor matches — never
            per-call, per-lead, or per-admission. Calls route directly to my
            facility's admissions team. Advisors will present at least two
            non-partner alternatives alongside my listing for every match.
          </span>
        </label>
      </div>

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
          Add geography
        </Button>
      </div>
    </form>
  );
}
