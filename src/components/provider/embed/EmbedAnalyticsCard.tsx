import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  BarChart3,
  Eye,
  Globe,
  Images,
  MessageSquareQuote,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface EmbedAnalyticsCardProps {
  facilityId: string;
}

interface Summary {
  total: number;
  last_30_days: number;
  last_7_days: number;
  last_at: string | null;
  by_widget: Record<string, number>;
  by_size: Record<string, number>;
  top_referrers: Array<{ domain: string; count: number }>;
}

const WIDGET_META: Record<string, { label: string; icon: React.ElementType; tint: string }> = {
  badge:   { label: "Verified Badge", icon: ShieldCheck,        tint: "text-emerald-600 bg-emerald-100" },
  reviews: { label: "Reviews",        icon: MessageSquareQuote, tint: "text-violet-600 bg-violet-100" },
  gallery: { label: "Photo Carousel", icon: Images,             tint: "text-sky-600 bg-sky-100" },
};

/**
 * Live impression-analytics card. Owner-only via the
 * get_widget_impression_summary RPC (which checks user_owns_facility
 * server-side). All numbers come from a single round-trip so the card
 * stays cheap to render.
 */
export function EmbedAnalyticsCard({ facilityId }: EmbedAnalyticsCardProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["embed-analytics", facilityId],
    enabled: !!facilityId,
    queryFn: async (): Promise<Summary | null> => {
      const { data, error } = await supabase.rpc("get_widget_impression_summary", {
        p_facility_id: facilityId,
      });
      if (error) throw error;
      return (data as Summary) ?? null;
    },
    // 60s — widgets log impressions every page view; the card stays
    // fresh enough without hammering the RPC on every re-render.
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const lastSeenLabel = useMemo(() => {
    if (!data?.last_at) return null;
    try {
      return formatDistanceToNow(new Date(data.last_at), { addSuffix: true });
    } catch {
      return null;
    }
  }, [data?.last_at]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden />
          Embed analytics
        </CardTitle>
        <CardDescription>
          Where your embedded widgets have been loaded over the last 30 days.
          Counts include every page view that rendered the widget.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="grid grid-cols-1 xs:grid-cols-3 gap-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : isError ? (
          <div className="text-sm text-muted-foreground">
            Couldn't load impression stats.{" "}
            <button
              type="button"
              onClick={() => refetch()}
              className="text-[#1B365D] underline-offset-2 hover:underline"
            >
              Try again
            </button>
            .
          </div>
        ) : !data || data.total === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 p-5 text-center text-sm text-muted-foreground">
            <Eye className="h-6 w-6 mx-auto mb-2 opacity-50" aria-hidden />
            <p className="font-medium text-foreground">No impressions yet</p>
            <p className="mt-1 text-xs max-w-sm mx-auto">
              Numbers will appear here within minutes of your snippet rendering
              on a real page. The widget logs an impression every time the
              iframe loads.
            </p>
          </div>
        ) : (
          <>
            {/* Headline metrics */}
            <div className="grid grid-cols-1 xs:grid-cols-3 gap-3">
              <Metric label="Last 7 days"  value={data.last_7_days} />
              <Metric label="Last 30 days" value={data.last_30_days} highlight />
              <Metric label="All-time"     value={data.total} />
            </div>

            {/* By-widget breakdown */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                By widget (last 30 days)
              </p>
              <div className="space-y-1.5">
                {Object.keys(data.by_widget).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No activity in the last 30 days.</p>
                ) : (
                  Object.entries(data.by_widget)
                    .sort(([, a], [, b]) => b - a)
                    .map(([widget, count]) => {
                      const meta = WIDGET_META[widget] || { label: widget, icon: Eye, tint: "text-slate-600 bg-slate-100" };
                      const Icon = meta.icon;
                      const pct = data.last_30_days > 0
                        ? Math.round((count / data.last_30_days) * 100)
                        : 0;
                      return (
                        <div key={widget} className="flex items-center gap-3">
                          <div className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${meta.tint}`}>
                            <Icon className="h-3.5 w-3.5" aria-hidden />
                          </div>
                          <span className="text-sm font-medium text-foreground flex-1 truncate">
                            {meta.label}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="hidden sm:block w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full bg-[#1B365D]"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-sm tabular-nums text-foreground min-w-12 text-right">
                              {count.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Top referrer domains */}
            {data.top_referrers.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Top referrers (last 30 days)
                </p>
                <div className="space-y-1.5">
                  {data.top_referrers.slice(0, 5).map((row) => (
                    <div
                      key={row.domain}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
                        <span className="truncate text-foreground">{row.domain}</span>
                      </div>
                      <span className="tabular-nums text-muted-foreground shrink-0">
                        {row.count.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {data.top_referrers.length > 5 && (
                    <p className="text-[11px] text-muted-foreground/70 pt-1">
                      + {data.top_referrers.length - 5} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {lastSeenLabel && (
              <p className="text-xs text-muted-foreground pt-1 flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] py-0 px-1.5">Latest</Badge>
                Last impression {lastSeenLabel}.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-lg border p-3 " +
        (highlight ? "border-[#1B365D]/30 bg-[#1B365D]/5" : "border-border bg-card")
      }
    >
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold text-foreground tabular-nums leading-none">
        {value.toLocaleString()}
      </p>
    </div>
  );
}
