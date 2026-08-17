import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Search, ArrowRight, TrendingUp } from "lucide-react";

interface FreeTierValueTeaserProps {
  facilityId: string;
}

/**
 * "Your listing is getting attention" — 30-day profile views + search
 * appearances for a FREE facility. Both events are tracked tier-agnostically,
 * so this is real demand the listing already has.
 *
 * It used to double as a second upgrade pitch, and the pitch was wrong on three
 * counts: it listed inquiry contact details, "priority placement" and the
 * "Verified badge" as things Pro buys. Inquiries are not a paid entitlement,
 * organic position is never for sale, and verification is earned. The card is
 * now a demand signal that routes to Performance; the dashboard carries exactly
 * one Pro CTA, in the Plan section.
 *
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
  // Nothing to show yet — stay quiet rather than render zeros.
  if (!data || (data.views === 0 && data.impressions === 0)) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b py-3.5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="h-4 w-4 text-[#1B365D]" aria-hidden />
          Families are finding your listing
        </CardTitle>
        <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs text-[#1B365D]">
          <Link to="/provider/analytics">
            Performance <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Search className="h-3.5 w-3.5" aria-hidden />
              <span className="text-[11px] font-medium uppercase tracking-wide">
                Search appearances
              </span>
            </div>
            <p className="mt-1.5 font-display text-2xl font-bold leading-none tabular-nums text-slate-900">
              {data.impressions.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">last 30 days</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Eye className="h-3.5 w-3.5" aria-hidden />
              <span className="text-[11px] font-medium uppercase tracking-wide">
                Profile views
              </span>
            </div>
            <p className="mt-1.5 font-display text-2xl font-bold leading-none tabular-nums text-slate-900">
              {data.views.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">last 30 days</p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Your listing appears in the directory on the Free plan, and eligible facilities
          receive inquiries from it at no cost.
        </p>
      </CardContent>
    </Card>
  );
}
