import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Search, Lock, ArrowRight, TrendingUp } from "lucide-react";

interface FreeTierValueTeaserProps {
  facilityId: string;
}

/**
 * Quantified upgrade teaser for FREE providers. Profile views and search
 * impressions are tracked for every listing (tier-agnostic), so we can show a
 * free provider the demand their listing is ALREADY getting — then frame the
 * value they're leaving on the table without Pro / Featured / Concierge.
 * Renders nothing until there's measurable interest (avoids an empty brag).
 */
export function FreeTierValueTeaser({ facilityId }: FreeTierValueTeaserProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["free-tier-value-teaser", facilityId],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const sinceIso = since.toISOString();
      const [viewRes, imprRes] = await Promise.all([
        supabase
          .from("provider_events")
          .select("id", { count: "exact", head: true })
          .eq("facility_id", facilityId)
          .eq("event_type", "profile_view")
          .eq("is_internal", false)
          .eq("is_bot", false)
          .gte("created_at", sinceIso),
        supabase
          .from("provider_events")
          .select("id", { count: "exact", head: true })
          .eq("facility_id", facilityId)
          .eq("event_type", "listing_impression")
          .eq("is_internal", false)
          .eq("is_bot", false)
          .gte("created_at", sinceIso),
      ]);
      return {
        views: viewRes.count ?? 0,
        impressions: imprRes.count ?? 0,
      };
    },
    enabled: !!facilityId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;
  // Nothing to brag about yet — stay quiet rather than show zeros.
  if (!data || (data.views === 0 && data.impressions === 0)) return null;

  return (
    <Card className="border-2 border-amber-300/70 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40">
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
            <TrendingUp className="h-4 w-4 text-amber-600" aria-hidden />
          </div>
          <p className="text-sm font-semibold text-slate-900">Families are already finding you</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white/70 border border-amber-200/60 p-3 text-center">
            <Eye className="h-4 w-4 text-amber-600 mx-auto mb-1" aria-hidden />
            <p className="text-xl font-bold text-slate-900 tabular-nums">{data.views.toLocaleString()}</p>
            <p className="text-[11px] text-slate-600">profile views · 30 days</p>
          </div>
          <div className="rounded-lg bg-white/70 border border-amber-200/60 p-3 text-center">
            <Search className="h-4 w-4 text-amber-600 mx-auto mb-1" aria-hidden />
            <p className="text-xl font-bold text-slate-900 tabular-nums">{data.impressions.toLocaleString()}</p>
            <p className="text-[11px] text-slate-600">search appearances · 30 days</p>
          </div>
        </div>

        <div className="mt-3 rounded-lg bg-amber-100/50 p-3">
          <p className="text-xs font-medium text-amber-900 flex items-center gap-1.5">
            <Lock className="h-3 w-3" aria-hidden />
            What you're missing on the free plan
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-amber-800/90">
            <li>• Every inquiry's contact details delivered to your inbox (Pro)</li>
            <li>• See who's calling, clicking your website, and where (Pro analytics)</li>
            <li>• Priority placement + the Verified badge (Pro)</li>
            <li>• Featured rotation in your area, and advisor introductions to families (Featured / Concierge)</li>
          </ul>
        </div>

        <Button asChild className="mt-3 w-full gap-1.5 bg-[#1B365D] hover:bg-[#142a4a]">
          <Link to="/provider/billing?upgrade=pro">
            See what Pro unlocks <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
