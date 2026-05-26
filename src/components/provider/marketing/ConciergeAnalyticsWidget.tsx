import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Send, CheckCircle2, MessageCircle, TrendingUp, AlertCircle, DollarSign } from "lucide-react";
import { TIER_PRICING } from "@/lib/billingPricing";
import { cn } from "@/lib/utils";

interface ConciergeAnalyticsWidgetProps {
  facilityId: string;
}

type Range = "7d" | "30d" | "90d";

const RANGE_DAYS: Record<Range, number> = { "7d": 7, "30d": 30, "90d": 90 };
const RANGE_LABEL: Record<Range, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days" };

const MONTHLY_COST_DOLLARS = TIER_PRICING.concierge.monthlyCents / 100;

interface AnalyticsRow {
  intros_received: number;
  intros_responded: number;
  intros_accepted: number;
  seeker_contacted: number;
  acceptance_rate: number;
  contact_rate: number;
}

export function ConciergeAnalyticsWidget({ facilityId }: ConciergeAnalyticsWidgetProps) {
  const [range, setRange] = useState<Range>("30d");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["concierge-analytics-provider", facilityId, range],
    queryFn: async (): Promise<AnalyticsRow> => {
      const since = new Date();
      since.setDate(since.getDate() - RANGE_DAYS[range]);
      const sinceIso = since.toISOString();

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

  const costPerIntro =
    data && data.intros_received > 0
      ? (MONTHLY_COST_DOLLARS / data.intros_received).toFixed(0)
      : null;
  const costPerAccepted =
    data && data.intros_accepted > 0
      ? (MONTHLY_COST_DOLLARS / data.intros_accepted).toFixed(0)
      : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 flex-wrap gap-2">
        <div>
          <CardTitle className="text-base">Concierge performance</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Advisor matching activity
          </p>
        </div>
        <div className="flex items-center gap-1">
          {(["7d", "30d", "90d"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                range === r
                  ? "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {r}
            </button>
          ))}
        </div>
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
            <p className="font-medium text-slate-900">No advisor introductions yet in this window</p>
            <p className="text-muted-foreground mt-1 max-w-md mx-auto">
              When our advisors match a client to one of your covered geographies
              and levels of care, we'll notify your admissions team by email and
              the introduction will count here.
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
                label="Client contacted"
                value={data.seeker_contacted}
                suffix={data.contact_rate ? `${data.contact_rate}%` : undefined}
              />
            </div>

            {/* ROI cost context */}
            {(costPerIntro || costPerAccepted) && (
              <div className="mt-3 rounded-lg border border-violet-200/60 bg-violet-50/40 p-3 space-y-1">
                <p className="text-[11px] font-semibold text-violet-900 flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3" aria-hidden />
                  Cost efficiency — {RANGE_LABEL[range]}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                  {costPerIntro && (
                    <span className="text-xs text-violet-800">
                      <span className="font-semibold">${costPerIntro}</span> per intro received
                    </span>
                  )}
                  {costPerAccepted && (
                    <span className="text-xs text-violet-800">
                      <span className="font-semibold">${costPerAccepted}</span> per accepted intro
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-violet-700/70">
                  Based on ${MONTHLY_COST_DOLLARS.toLocaleString()}/mo subscription cost
                </p>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
              "Accepted" = you responded "interested" to the advisor. "Client
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
