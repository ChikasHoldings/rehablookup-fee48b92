import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Zap, TrendingUp, Clock, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ProviderPerformanceFeedbackProps {
  facilityId: string;
}

export function ProviderPerformanceFeedback({ facilityId }: ProviderPerformanceFeedbackProps) {
  // Fetch performance stats
  const { data: stats } = useQuery({
    queryKey: ["provider-performance-feedback", facilityId],
    queryFn: async () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // EKRA flat-fee: lead_unlocks table retired; "responded to" is the
      // meaningful engagement signal. A lead counts as "responded" when
      // provider_response_status is set to a non-pending value (the leads
      // table is what InquiryDetailPanel writes to).
      const weekIso = weekAgo.toISOString();
      const { data: weekLeads } = await (supabase as any)
        .from("leads_provider_view")
        .select("id, created_at, provider_response_status, provider_responded_at")
        .eq("facility_id", facilityId)
        .gte("created_at", weekIso)
        .limit(2000);

      const leadsThisWeek = weekLeads?.length ?? 0;
      const respondedThisWeek = (weekLeads ?? []).filter(
        (l: { provider_response_status?: string | null }) =>
          l.provider_response_status && l.provider_response_status !== "pending"
      );
      const unlockedThisWeek = respondedThisWeek.length;

      let avgResponseMinutes: number | null = null;
      if (respondedThisWeek.length > 0) {
        const samples = respondedThisWeek
          .filter((l: { created_at?: string; provider_responded_at?: string | null }) => l.provider_responded_at)
          .map((l: { created_at: string; provider_responded_at: string }) =>
            (new Date(l.provider_responded_at).getTime() - new Date(l.created_at).getTime()) / 60000,
          );
        if (samples.length > 0) {
          avgResponseMinutes = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
        }
      }

      const missedLeads = leadsThisWeek - unlockedThisWeek;

      return {
        leadsThisWeek,
        unlockedThisWeek,
        missedLeads: Math.max(missedLeads, 0),
        avgResponseMinutes,
      };
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 5,
  });

  if (!stats || (stats.leadsThisWeek === 0 && !stats.avgResponseMinutes)) return null;

  const insights: { icon: React.ElementType; text: string; type: "warning" | "tip" | "success" }[] = [];

  // Missed leads warning
  if (stats.missedLeads > 0) {
    insights.push({
      icon: AlertTriangle,
      text: `You missed ${stats.missedLeads} lead${stats.missedLeads !== 1 ? "s" : ""} this week`,
      type: "warning",
    });
  }

  // Response time feedback
  if (stats.avgResponseMinutes !== null) {
    if (stats.avgResponseMinutes <= 30) {
      insights.push({
        icon: Trophy,
        text: `Great! Your avg response: ${stats.avgResponseMinutes}min`,
        type: "success",
      });
    } else {
      insights.push({
        icon: Clock,
        text: "Top providers respond within 10 minutes",
        type: "tip",
      });
    }
  } else if (stats.leadsThisWeek > 0) {
    insights.push({
      icon: Clock,
      text: "Top providers respond within 10 minutes",
      type: "tip",
    });
  }

  // Conversion encouragement
  if (stats.missedLeads > 0 || (stats.avgResponseMinutes && stats.avgResponseMinutes > 30)) {
    insights.push({
      icon: TrendingUp,
      text: "Faster response = higher admissions",
      type: "tip",
    });
  }

  // Perfect week
  if (stats.leadsThisWeek > 0 && stats.missedLeads === 0) {
    insights.push({
      icon: Zap,
      text: `All ${stats.unlockedThisWeek} leads unlocked this week — keep it up!`,
      type: "success",
    });
  }

  if (insights.length === 0) return null;

  return (
    <Card className="border-border/40 overflow-hidden">
      <CardHeader className="p-3.5 pb-2 border-b">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Performance Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2.5">
        <div className="space-y-1.5">
          {insights.map((insight, i) => {
            const Icon = insight.icon;
            return (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-2.5 p-2.5 rounded-lg text-sm",
                  insight.type === "warning" && "bg-warning/10 text-warning",
                  insight.type === "tip" && "bg-primary/5 text-primary",
                  insight.type === "success" && "bg-success/10 text-success",
                )}
              >
                <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="font-medium leading-snug">{insight.text}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
