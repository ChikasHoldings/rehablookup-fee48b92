import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Send, CheckCircle2, MessageCircle, TrendingUp, AlertCircle } from "lucide-react";

interface ConciergeAnalyticsWidgetProps {
  facilityId: string;
}

interface AnalyticsRow {
  intros_received: number;
  intros_responded: number;
  intros_accepted: number;
  seeker_contacted: number;
  acceptance_rate: number;
  contact_rate: number;
}

const WINDOW_DAYS = 30;

/**
 * Concierge Partner performance summary for the Marketing Hub.
 * Pulls the last 30 days of concierge_introductions and surfaces:
 *   • Intros received        — how often advisors are surfacing this facility
 *   • Intros responded       — provider's own engagement rate
 *   • Intros accepted        — `provider_response === 'interested'`
 *   • Seekers contacted you  — `seeker_contacted = true`
 *
 * The numbers are derived from concierge_introductions only, scoped to
 * the calling provider's facility. EKRA-safe: no per-introduction fee
 * surface, no PII outside what the provider already has access to.
 */
export function ConciergeAnalyticsWidget({ facilityId }: ConciergeAnalyticsWidgetProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["concierge-analytics-provider", facilityId],
    queryFn: async (): Promise<AnalyticsRow> => {
      const since = new Date();
      since.setDate(since.getDate() - WINDOW_DAYS);
      const sinceIso = since.toISOString();

      // One read of the recent intro rows for this facility. RLS scopes
      // the view to facility owners, so the .eq is defence-in-depth
      // rather than the only filter.
      const { data: rows, error } = await supabase
        .from("concierge_introductions")
        .select("provider_response, provider_responded_at, seeker_contacted")
        .eq("facility_id", facilityId)
        .gte("created_at", sinceIso)
        .limit(2000);

      if (error) throw error;

      const totalIntros = rows?.length ?? 0;
      const responded = (rows ?? []).filter(r => !!r.provider_responded_at).length;
      const accepted = (rows ?? []).filter(r => r.provider_response === "interested").length;
      const seekerContacted = (rows ?? []).filter(r => r.seeker_contacted === true).length;

      const acceptanceRate = responded > 0
        ? Math.round((accepted / responded) * 100)
        : 0;
      const contactRate = accepted > 0
        ? Math.round((seekerContacted / accepted) * 100)
        : 0;

      return {
        intros_received: totalIntros,
        intros_responded: responded,
        intros_accepted: accepted,
        seeker_contacted: seekerContacted,
        acceptance_rate: acceptanceRate,
        contact_rate: contactRate,
      };
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">Concierge performance</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Last {WINDOW_DAYS} days · advisor matching activity
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] gap-1 border-violet-200 text-violet-700">
          <TrendingUp className="h-3 w-3" />
          Pro Add-on
        </Badge>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            Couldn't load analytics. Refresh the page to retry.
          </div>
        ) : !data || data.intros_received === 0 ? (
          <div className="text-center py-6 text-sm">
            <p className="font-medium text-slate-900">No advisor introductions yet</p>
            <p className="text-muted-foreground mt-1 max-w-md mx-auto">
              When our advisors match a seeker to one of your covered geographies
              and levels of care, the introduction will appear in your inquiries
              feed and count here.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric
                icon={Send}
                iconBg="bg-blue-500/10"
                iconColor="text-blue-600"
                label="Intros received"
                value={data.intros_received}
              />
              <Metric
                icon={MessageCircle}
                iconBg="bg-amber-500/10"
                iconColor="text-amber-600"
                label="You responded"
                value={data.intros_responded}
                suffix={data.intros_received > 0
                  ? `${Math.round((data.intros_responded / data.intros_received) * 100)}%`
                  : undefined}
              />
              <Metric
                icon={CheckCircle2}
                iconBg="bg-emerald-500/10"
                iconColor="text-emerald-600"
                label="Accepted"
                value={data.intros_accepted}
                suffix={data.acceptance_rate ? `${data.acceptance_rate}%` : undefined}
              />
              <Metric
                icon={TrendingUp}
                iconBg="bg-violet-500/10"
                iconColor="text-violet-600"
                label="Seeker contacted"
                value={data.seeker_contacted}
                suffix={data.contact_rate ? `${data.contact_rate}%` : undefined}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed">
              "Accepted" = you responded "interested" to the advisor. "Seeker
              contacted" = the family then reached out to your admissions line.
              Percentages show conversion at each stage.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  suffix,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      <div className="flex items-center gap-2 mb-1">
        <div className={`h-6 w-6 rounded flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        </div>
        <p className="text-[11px] text-muted-foreground font-medium truncate">{label}</p>
      </div>
      <div className="flex items-baseline gap-1.5">
        <p className="text-xl font-bold text-foreground tabular-nums leading-none">
          {value.toLocaleString()}
        </p>
        {suffix && (
          <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
