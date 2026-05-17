import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, BellRing, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Props =
  | {
      addonType: "featured";
      facilityId: string;
      scopeType: string;
      scopeValue: string;
    }
  | {
      addonType: "concierge";
      facilityId: string;
      geoState: string;
      geoCity: string | null;
      levelOfCare: string[];
    };

/**
 * Shared "Join the waitlist" CTA. Looks up whether the caller already
 * has an open waitlist entry for the requested scope, shows a confirmed
 * state if so, otherwise lets them opt in. Opt-in writes to
 * addon_waitlist under the caller's JWT (RLS gates requested_by=auth.uid()).
 */
export function JoinAddonWaitlistButton(props: Props) {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const queryKey =
    props.addonType === "featured"
      ? ["addon-waitlist-mine", props.facilityId, "featured", props.scopeType, props.scopeValue]
      : ["addon-waitlist-mine", props.facilityId, "concierge", props.geoState, props.geoCity ?? "*"];

  const { data: existing, isFetching } = useQuery({
    queryKey,
    queryFn: async (): Promise<{ id: string; status: string } | null> => {
      let q = supabase
        .from("addon_waitlist")
        .select("id, status")
        .eq("facility_id", props.facilityId)
        .eq("addon_type", props.addonType)
        .in("status", ["waiting", "invited"]);
      if (props.addonType === "featured") {
        q = q.eq("scope_type", props.scopeType).eq("scope_value", props.scopeValue);
      } else {
        q = q.eq("geo_state", props.geoState);
        if (props.geoCity == null) {
          q = q.is("geo_city", null);
        } else {
          q = q.eq("geo_city", props.geoCity);
        }
      }
      const { data, error } = await q.maybeSingle();
      if (error && error.code !== "PGRST116") {
        console.warn("[JoinAddonWaitlistButton] lookup failed", error);
        return null;
      }
      return (data as { id: string; status: string } | null) ?? null;
    },
    staleTime: 1000 * 30,
  });

  async function handleJoin() {
    setSubmitting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess.session?.user.id;
      if (!userId) {
        toast.error("Sign in to join the waitlist.");
        return;
      }
      const row: Record<string, unknown> = {
        addon_type: props.addonType,
        facility_id: props.facilityId,
        requested_by: userId,
      };
      if (props.addonType === "featured") {
        row.scope_type = props.scopeType;
        row.scope_value = props.scopeValue;
      } else {
        row.geo_state = props.geoState;
        row.geo_city = props.geoCity;
        row.level_of_care = props.levelOfCare;
      }
      const { error } = await supabase.from("addon_waitlist").insert(row);
      if (error) {
        if (error.code === "23505") {
          toast.info("You're already on the waitlist for this scope.");
        } else if (error.message?.includes("violates row-level security")) {
          toast.error("Sign in as the facility owner to join the waitlist.");
        } else {
          throw error;
        }
        return;
      }
      toast.success("Added to the waitlist. An admin will reach out when a slot frees.");
      queryClient.invalidateQueries({ queryKey });
    } catch (err) {
      console.error("[JoinAddonWaitlistButton] join failed", err);
      toast.error(err instanceof Error ? err.message : "Failed to join the waitlist");
    } finally {
      setSubmitting(false);
    }
  }

  if (isFetching) {
    return (
      <Button size="sm" variant="ghost" disabled className="h-7 gap-1.5 text-xs">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Checking…
      </Button>
    );
  }

  if (existing) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <Check className="h-3.5 w-3.5" aria-hidden />
        {existing.status === "invited"
          ? "Invited — check your email for next steps"
          : "On the waitlist — we'll be in touch"}
      </span>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleJoin}
      disabled={submitting}
      className="h-7 gap-1.5 text-xs border-red-300 text-red-800 hover:bg-red-100"
    >
      {submitting ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <BellRing className="h-3.5 w-3.5" />
      )}
      Join the waitlist
    </Button>
  );
}
