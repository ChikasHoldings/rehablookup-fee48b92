import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Loader2, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PhoneVerificationStep } from "@/components/ui/PhoneVerificationStep";
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
 * Step 3 — Find or List, with inline phone verification.
 *
 * Two-part screen per Section 6 of the wizard spec.
 *
 * Top: phone verification card. Skipped entirely when
 * profiles.phone_verified_at is set. Otherwise renders the existing
 * PhoneVerificationStep component (handles send-sms-verification-code
 * + verify-sms-code internally) and collapses to a green check on
 * success.
 *
 * Bottom: single facility-search input. The search is gated behind a
 * verified phone — until the phone is verified, the search section is
 * disabled with a tooltip pointing back to the phone card.
 *
 * Branch actions:
 *   - Select an unclaimed facility row → mode='claim',
 *     selected_facility_id={id}, current_step='plan' → advance.
 *   - "List '{query}' as new facility" → mode='list',
 *     initial_facility_name={query}, current_step='plan' → advance.
 *
 * Pre-seed: when AccountStep (Step 1) stashed selected_facility_id +
 * mode='claim' from a ?intent=claim&facility_id= entry URL, we render
 * the pre-selected facility at the top with a "Continue with this
 * facility" CTA instead of the empty search prompt.
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

function useProviderProfile() {
  return useQuery({
    queryKey: ["provider-onboarding-profile-phone"],
    queryFn: async (): Promise<{
      user_id: string | null;
      phone: string | null;
      phone_verified_at: string | null;
    } | null> => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, phone, phone_verified_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        console.warn("[FindOrList] profile read failed", error);
        return { user_id: userId, phone: null, phone_verified_at: null };
      }
      return (data as unknown as { user_id: string; phone: string | null; phone_verified_at: string | null }) ?? null;
    },
    staleTime: 1000 * 5,
  });
}

function useFacilitySearch(query: string, enabled: boolean) {
  return useQuery({
    queryKey: ["provider-onboarding-facility-search", query],
    enabled: enabled && query.trim().length > 0,
    queryFn: async (): Promise<FacilityRow[]> => {
      const q = query.trim();
      if (q.length === 0) return [];
      // public_facilities view already filters to status='approved' and
      // unsuspended rows + computes is_claimed. We render every match;
      // claimed rows render with a muted "Already claimed" badge.
      const { data, error } = await supabase
        .from("public_facilities")
        .select("id, name, slug, city, state, logo_url, is_claimed")
        .ilike("name", `%${q}%`)
        .order("name", { ascending: true })
        .limit(8);
      if (error) {
        console.warn("[FindOrList] facility search failed", error);
        return [];
      }
      return (data as unknown as FacilityRow[]) ?? [];
    },
    staleTime: 1000 * 30,
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
    staleTime: Infinity,
  });
}

function FacilityRowItem({
  facility,
  isOwn,
  busy,
  onSelect,
}: {
  facility: FacilityRow;
  isOwn: boolean;
  busy: boolean;
  onSelect: () => void;
}) {
  const blocked = facility.is_claimed && !isOwn;
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        disabled={blocked || busy}
        title={blocked ? "This listing is already managed by another provider. Contact support to dispute." : undefined}
        className={cn(
          "w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
          blocked
            ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
            : "border-slate-200 bg-white hover:border-[#1B365D]/40 hover:bg-[#1B365D]/5",
        )}
      >
        {facility.logo_url ? (
          <img
            src={facility.logo_url}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 rounded-md object-cover bg-slate-100 flex-shrink-0"
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
          <p className="text-sm font-medium text-slate-900 truncate">{facility.name}</p>
          <p className="text-xs text-slate-500 truncate">
            {facility.city}, {facility.state}
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
  const queryClient = useQueryClient();
  const { data: profile, refetch: refetchProfile } = useProviderProfile();
  const { data: stateRow, advance } = useProviderOnboardingState();
  const phoneVerified = !!profile?.phone_verified_at;

  const [query, setQuery] = useState("");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  // Pre-selected facility if Step 1 stashed selected_facility_id from
  // the ?intent=claim entry URL.
  const seededId = stateRow?.selected_facility_id ?? null;
  const { data: seededFacility } = useSeedFacility(seededId);

  const { data: results = [], isFetching: searchLoading } = useFacilitySearch(
    debouncedQuery,
    phoneVerified,
  );

  useEffect(() => {
    if (profile?.phone && profile.phone !== phone) setPhone(profile.phone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.phone]);

  async function handlePhoneVerified() {
    // The verify-sms-code edge fn writes profiles.phone + phone_verified_at
    // server-side. Invalidate so the search section unlocks.
    await queryClient.invalidateQueries({ queryKey: ["provider-onboarding-profile-phone"] });
    await refetchProfile();
    toast.success("Phone verified.");
  }

  async function handleSelectExisting(facilityId: string) {
    if (busy) return;
    setBusy(true);
    try {
      await advance({
        mode: "claim",
        selected_facility_id: facilityId,
        current_step: "plan",
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
        // Make sure a stale claim-mode pre-seed doesn't leak into the
        // list-new branch when the user pivots after seeing search
        // results.
        selected_facility_id: null,
        current_step: "plan",
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

  const showZeroResults = useMemo(
    () => phoneVerified && debouncedQuery.trim().length > 0 && !searchLoading && results.length === 0,
    [phoneVerified, debouncedQuery, searchLoading, results.length],
  );

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
          Verify your phone, then search to claim an existing listing or list a new one.
        </p>
      </header>

      {/* Phone verification card */}
      <section
        className={cn(
          "rounded-xl border p-4 sm:p-5",
          phoneVerified
            ? "border-emerald-200 bg-emerald-50/40"
            : "border-slate-200 bg-white",
        )}
        aria-label="Phone verification"
      >
        {phoneVerified ? (
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-medium text-emerald-900">Phone verified</p>
              <p className="text-xs text-emerald-700 truncate">{profile?.phone}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-2.5 mb-3">
              <ShieldCheck className="h-5 w-5 text-[#1B365D] flex-shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="text-sm font-medium text-slate-900">Verify your phone to continue</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  We use this to coordinate claim verifications and lead handoffs. Standard message rates apply.
                </p>
              </div>
            </div>
            <PhoneVerificationStep
              phone={phone}
              onPhoneChange={setPhone}
              userId={profile?.user_id ?? undefined}
              userType="provider"
              isVerified={false}
              onVerified={handlePhoneVerified}
            />
          </>
        )}
      </section>

      {/* Facility search section — gated on phone verification */}
      <section
        className={cn("space-y-3", !phoneVerified && "opacity-50 pointer-events-none select-none")}
        aria-disabled={!phoneVerified}
      >
        {/* Pre-seeded claim-intent facility */}
        {seededFacility && phoneVerified && (
          <div className="rounded-lg border-2 border-[#1B365D]/30 bg-[#1B365D]/5 p-3.5">
            <p className="text-xs uppercase tracking-wide text-[#1B365D] font-semibold mb-2">
              Continue with this facility
            </p>
            <ul className="space-y-2">
              <FacilityRowItem
                facility={seededFacility}
                isOwn={false}
                busy={busy}
                onSelect={() => handleSelectExisting(seededFacility.id)}
              />
            </ul>
          </div>
        )}

        <div>
          <label
            htmlFor="facility-search"
            className="block text-xs font-medium text-slate-700 mb-1.5"
          >
            Search for your facility by name
          </label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
            <Input
              id="facility-search"
              type="search"
              autoComplete="off"
              placeholder={phoneVerified ? "e.g. Sunrise Recovery Center" : "Verify your phone first"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={!phoneVerified}
              className="pl-9 h-10"
            />
          </div>
        </div>

        {/* Results */}
        <div className="min-h-[60px]">
          {!phoneVerified ? (
            <p className="text-xs text-slate-500">
              The search will activate once your phone is verified above.
            </p>
          ) : query.trim().length === 0 ? (
            <p className="text-xs text-slate-500">
              Start typing your facility name to see matches.
            </p>
          ) : searchLoading ? (
            <ul className="space-y-2">
              {[0, 1, 2].map((i) => (
                <li key={i}>
                  <Skeleton className="h-12 w-full rounded-lg" />
                </li>
              ))}
            </ul>
          ) : results.length > 0 ? (
            <ul className="space-y-2">
              {results
                .filter((r) => r.id !== seededFacility?.id)
                .map((r) => (
                  <FacilityRowItem
                    key={r.id}
                    facility={r}
                    isOwn={false}
                    busy={busy}
                    onSelect={() => handleSelectExisting(r.id)}
                  />
                ))}
            </ul>
          ) : showZeroResults ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="text-sm text-slate-700">
                We couldn't find a facility matching{" "}
                <span className="font-medium text-slate-900">"{debouncedQuery}"</span>.
              </p>
              <p className="text-xs text-slate-500 mt-1">You can list it as a new facility.</p>
              <Button
                size="sm"
                onClick={() => handleListNew(debouncedQuery)}
                disabled={busy}
                className="mt-3 bg-[#1B365D] hover:bg-[#142a4a] gap-1.5"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                List "{debouncedQuery}" as new facility
              </Button>
            </div>
          ) : null}
        </div>

        {/* Bottom List-new affordance — always available when there's a query */}
        {phoneVerified && query.trim().length > 0 && results.length > 0 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => handleListNew(query)}
              disabled={busy}
              className="text-xs text-[#1B365D] hover:underline font-medium"
            >
              Don't see your facility? List "{query}" as new
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
