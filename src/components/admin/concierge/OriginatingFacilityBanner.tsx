import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Pin, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { slugToLabel } from "@/lib/textCase";

interface OriginatingFacilityBannerProps {
  /** The free-tier-redirect inquiry's originating facility id. Null →
   *  banner doesn't render. */
  originatingFacilityId: string | null | undefined;
  /** The inquiry's clinical filters used to flag mismatches. */
  intake: {
    level_of_care?: string | null;
    insurance_provider?: string | null;
    insurance_type?: string | null;
    location_state?: string | null;
  };
}

interface OriginatingFacilityRow {
  id: string;
  name: string;
  city: string;
  state: string;
  slug: string | null;
  services: string[];
  insurance: string[];
}

/**
 * Surfaces the originating facility at the top of a free-tier-redirect
 * inquiry's introductions tab. The originating facility MUST be one of
 * the 3 introductions per the routing commitment — this banner makes
 * that visible and surfaces any clinical mismatch (e.g. they don't
 * take the seeker's insurance) so the advisor can present the mismatch
 * honestly without skipping the facility.
 *
 * The "pinned as Option 1" rule is enforced in the introductions-send
 * flow, not here. This is a non-blocking advisory card.
 */
export function OriginatingFacilityBanner({
  originatingFacilityId,
  intake,
}: OriginatingFacilityBannerProps) {
  const { data: facility, isLoading } = useQuery({
    queryKey: ["originating-facility", originatingFacilityId],
    queryFn: async (): Promise<OriginatingFacilityRow | null> => {
      if (!originatingFacilityId) return null;
      const { data, error } = await supabase
        .from("facilities")
        .select(`
          id, name, city, state, slug,
          facility_services (service_name),
          facility_insurance (insurance_name)
        `)
        .eq("id", originatingFacilityId)
        .maybeSingle();
      if (error || !data) return null;
      return {
        id: data.id as string,
        name: data.name as string,
        city: data.city as string,
        state: data.state as string,
        slug: data.slug as string | null,
        services: ((data.facility_services as Array<{ service_name: string }> | null) ?? []).map((s) => s.service_name),
        insurance: ((data.facility_insurance as Array<{ insurance_name: string }> | null) ?? []).map((i) => i.insurance_name),
      };
    },
    enabled: !!originatingFacilityId,
    staleTime: 1000 * 60 * 5,
  });

  if (!originatingFacilityId || isLoading || !facility) return null;

  // Mismatch detection — surface (non-blocking) so the advisor sees
  // exactly what's off and can decide how to frame it to the seeker.
  const seekerLoC = intake.level_of_care?.trim().toLowerCase() ?? null;
  const seekerInsurance =
    intake.insurance_provider?.trim().toLowerCase() ??
    intake.insurance_type?.trim().toLowerCase() ??
    null;

  const locMatch = !seekerLoC || facility.services.some((s) => {
    const sl = s.toLowerCase();
    return sl.includes(seekerLoC) || seekerLoC.includes(sl);
  });
  const insuranceMatch = !seekerInsurance || facility.insurance.some((i) => {
    const il = i.toLowerCase();
    return il.includes(seekerInsurance) || seekerInsurance.includes(il);
  });
  const hasMismatch = !locMatch || !insuranceMatch;

  return (
    <Card className={hasMismatch ? "border-amber-300 bg-amber-50/40" : "border-emerald-300 bg-emerald-50/30"}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className={hasMismatch ? "h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0" : "h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0"}>
            {hasMismatch ? (
              <AlertTriangle className="h-4 w-4 text-amber-700" aria-hidden />
            ) : (
              <ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Pin className="h-3.5 w-3.5 text-slate-500" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Originating facility — auto-pinned as Option 1
              </span>
              <Badge variant="outline" className="text-[10px]">
                Free tier
              </Badge>
            </div>
            <p className="mt-1 font-semibold text-slate-900">
              {facility.name} <span className="font-normal text-slate-500">— {facility.city}, {facility.state}</span>
            </p>
            <p className="mt-1 text-xs text-slate-700 leading-relaxed">
              The seeker submitted on this facility's listing. Per our routing
              commitment, they must be included as one of the 3 introductions.
              You can't remove them — only pick the 2 alternatives.
            </p>
          </div>
        </div>

        {hasMismatch && (
          <div className="rounded-md bg-white border border-amber-200 p-3 text-xs">
            <p className="font-semibold text-amber-900">
              ⚠️ Clinical mismatch detected
            </p>
            <ul className="mt-1 space-y-0.5 text-amber-800">
              {!locMatch && seekerLoC && (
                <li>
                  Doesn't appear to offer <strong>{slugToLabel(intake.level_of_care)}</strong>.
                </li>
              )}
              {!insuranceMatch && seekerInsurance && (
                <li>
                  Doesn't appear to accept{" "}
                  <strong>{intake.insurance_provider ?? intake.insurance_type}</strong>.
                </li>
              )}
            </ul>
            <p className="mt-2 text-amber-900">
              They still must be presented — surface the mismatch to the seeker
              and emphasise the matching alternatives.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
