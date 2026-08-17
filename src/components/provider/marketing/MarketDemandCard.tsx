import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Gauge,
  Rotate3D,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * MarketDemandCard — live FEATURED slot availability in the provider's market.
 *
 * Surfaces Featured advertising availability for the provider's OWN state/city
 * using the public, owner-callable get_placement_availability RPC. NOT the
 * admin-only get_waitlist_demand_summary.
 *
 * The Concierge availability group was removed in the directory cutover:
 * Concierge Partner is a retired product and must not be marketed to
 * providers. get_concierge_availability still exists server-side (Stage-4
 * debt) but nothing provider-facing calls it any more.
 *
 * Featured is ADVERTISING, sold separately from Pro. This card reports
 * flat-fee slot availability and fair rotation only — never lead volume,
 * per-call or per-admission economics, and never a ranking claim.
 */

// facilities.state is stored as a full name ("Texas"); placement_caps and
// concierge_geo_caps key on the 2-letter code ("TX"). Convert first, or the
// RPCs fall back to a type-average cap and report a market that isn't ours.
const STATE_NAME_TO_CODE: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", "district of columbia": "DC",
  florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL",
  indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA",
  maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN",
  mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI",
  wyoming: "WY",
};
const STATE_CODES = new Set(Object.values(STATE_NAME_TO_CODE));

function toStateCode(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.length === 2 && STATE_CODES.has(t.toUpperCase())) return t.toUpperCase();
  return STATE_NAME_TO_CODE[t.toLowerCase()] ?? null;
}

function slugifyCity(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface AvailRow {
  cap: number;
  used: number;
  remaining: number;
}

interface ScopeAvail {
  key: string;
  product: "featured";
  label: string;
  cap: number;
  used: number;
  remaining: number;
}

function availPill(remaining: number): { label: string; cls: string } {
  if (remaining <= 0) return { label: "Waitlist", cls: "bg-red-100 text-red-700" };
  if (remaining <= 2) return { label: `${remaining} left`, cls: "bg-amber-100 text-amber-700" };
  return { label: `${remaining} open`, cls: "bg-emerald-100 text-emerald-700" };
}

export function MarketDemandCard({
  state,
  city,
}: {
  state: string;
  city: string;
}) {
  const stateCode = toStateCode(state);
  const cityName = city.trim();
  const citySlug = cityName ? slugifyCity(cityName) : "";

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["market-demand", stateCode, cityName],
    enabled: !!stateCode,
    staleTime: 1000 * 60,
    queryFn: async (): Promise<ScopeAvail[]> => {
      if (!stateCode) return [];
      const scopes: ScopeAvail[] = [];
      const push = (
        key: string,
        product: "featured",
        label: string,
        row: AvailRow | null,
      ) => {
        if (row) {
          scopes.push({
            key,
            product,
            label,
            cap: row.cap,
            used: row.used,
            remaining: row.remaining,
          });
        }
      };

      const fState = await supabase.rpc("get_placement_availability", {
        p_type: "state",
        p_value: stateCode,
      });
      if (fState.error) throw fState.error;
      push("f-state", "featured", `${stateCode} state page`, (fState.data as AvailRow[] | null)?.[0] ?? null);

      if (citySlug) {
        const fCity = await supabase.rpc("get_placement_availability", {
          p_type: "city",
          p_value: citySlug,
        });
        if (fCity.error) throw fCity.error;
        push("f-city", "featured", `${cityName} city page`, (fCity.data as AvailRow[] | null)?.[0] ?? null);
      }

      return scopes;
    },
  });

  // Unrecognized / missing state → no market to scope. Render nothing
  // rather than a misleading card.
  if (!stateCode) return null;

  const marketLabel = cityName ? `${cityName}, ${stateCode}` : stateCode;
  const featured = (data ?? []).filter((s) => s.product === "featured");

  return (
    <Card className="border-slate-200">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1B365D]/10">
            <Gauge className="h-5 w-5 text-[#1B365D]" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900">
              Featured availability in your market
            </h3>
            <p className="text-xs text-muted-foreground">
              Featured advertising slots are capped per area for fair rotation —
              never auctioned. Here's what's open near {marketLabel} right now.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : isError ? (
          <div
            className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3"
            role="alert"
          >
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
              Couldn't check live availability.
            </p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <ScopeGroup
            title="Featured placements"
            icon={<Rotate3D className="h-3.5 w-3.5 text-amber-600" aria-hidden />}
            scopes={featured}
            manageTo="/provider/marketing/featured"
            claimLabel="View open slots"
          />
        )}

        <p className="text-xs leading-relaxed text-muted-foreground">
          Featured is advertising, billed separately from your plan. Slots rotate
          fairly among paying facilities and do not change organic directory
          position.
        </p>
      </CardContent>
    </Card>
  );
}

function ScopeGroup({
  title,
  icon,
  scopes,
  manageTo,
  claimLabel,
}: {
  title: string;
  icon: React.ReactNode;
  scopes: ScopeAvail[];
  manageTo: string;
  claimLabel: string;
}) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50/40 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {icon}
        {title}
      </p>
      {scopes.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">No scopes for this market.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {scopes.map((s) => {
            const pill = availPill(s.remaining);
            return (
              <li key={s.key} className="flex items-center justify-between gap-2">
                <span className="truncate text-sm text-slate-700">{s.label}</span>
                <span
                  className={
                    "shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium " + pill.cls
                  }
                >
                  {pill.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="mt-2 h-7 gap-1 px-2 text-xs text-[#1B365D] hover:text-[#142a4a]"
      >
        <Link to={manageTo}>
          {claimLabel}
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </Button>
    </div>
  );
}
