import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sparkles, ShieldCheck, ChevronRight } from "lucide-react";
import { TIER_PRICING } from "@/lib/billingPricing";

/**
 * Admin dashboard widget — adoption + MRR contribution of the two
 * Pro add-ons (Featured $599/mo, Concierge $1,000/mo). Pro itself is
 * already surfaced in the main revenue KPI card; this card breaks
 * out the add-on layer because it's where most of the monetization
 * upside (and ops complexity) lives.
 *
 * Numbers are queried directly from facility_subscriptions and use
 * the canonical TIER_PRICING constants so they stay in sync with
 * any future price change automatically. Renders as a skeleton until
 * the query settles.
 */
export function AddonAdoptionCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-addon-adoption"],
    queryFn: async () => {
      const [proRes, featuredRes, conciergeRes] = await Promise.all([
        supabase
          .from("facility_subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .eq("tier", "pro"),
        supabase
          .from("facility_subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .eq("has_featured", true),
        supabase
          .from("facility_subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .eq("has_concierge_partner", true),
      ]);
      return {
        proCount: proRes.count ?? 0,
        featuredCount: featuredRes.count ?? 0,
        conciergeCount: conciergeRes.count ?? 0,
      };
    },
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });

  const proCount = data?.proCount ?? 0;
  const featuredCount = data?.featuredCount ?? 0;
  const conciergeCount = data?.conciergeCount ?? 0;

  const proMrr = proCount * (TIER_PRICING.pro.monthlyCents / 100);
  const featuredMrr = featuredCount * (TIER_PRICING.featured.monthlyCents / 100);
  const conciergeMrr = conciergeCount * (TIER_PRICING.concierge.monthlyCents / 100);
  const totalMrr = proMrr + featuredMrr + conciergeMrr;

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base font-medium">Subscription & Add-Ons</CardTitle>
            <CardDescription className="text-xs">
              Pro · Featured · Concierge — active counts and indicative MRR
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/subscriptions" className="text-xs">
              Manage <ChevronRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 xs:grid-cols-3 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 xs:grid-cols-3 gap-3">
              <TierTile
                label="Pro"
                price="$99/mo"
                count={proCount}
                mrr={proMrr}
                icon={<ShieldCheck className="h-4 w-4" />}
                color="emerald"
              />
              <TierTile
                label="Featured"
                price="$599/mo"
                count={featuredCount}
                mrr={featuredMrr}
                icon={<Sparkles className="h-4 w-4" />}
                color="amber"
              />
              <TierTile
                label="Concierge"
                price="$1,000/mo"
                count={conciergeCount}
                mrr={conciergeMrr}
                icon={<ShieldCheck className="h-4 w-4" />}
                color="violet"
              />
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">
                Indicative MRR
                <span className="ml-1.5 text-[10px] opacity-70">
                  (sum of {proCount + featuredCount + conciergeCount} active subscriptions × list price; ignores annual prepay discounts)
                </span>
              </span>
              <span className="text-base font-semibold tabular-nums">
                ${totalMrr.toLocaleString()}/mo
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface TierTileProps {
  label: string;
  price: string;
  count: number;
  mrr: number;
  icon: React.ReactNode;
  color: "emerald" | "amber" | "violet";
}

function TierTile({ label, price, count, mrr, icon, color }: TierTileProps) {
  const colorClasses = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
  }[color];
  return (
    <div className={`rounded-lg border ${colorClasses} p-3`}>
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-xs font-semibold">{label}</p>
      </div>
      <p className="text-[10px] opacity-70 mt-0.5">{price}</p>
      <p className="text-xl font-bold tabular-nums mt-1.5">{count}</p>
      <p className="text-[11px] opacity-75 mt-0.5">${mrr.toLocaleString()}/mo</p>
    </div>
  );
}
