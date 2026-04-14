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

      // Leads received this week
      const { count: leadsThisWeek } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("facility_id", facilityId)
        .gte("created_at", weekAgo.toISOString());

      // Leads unlocked this week
      const { count: unlockedThisWeek } = await supabase
        .from("lead_unlocks")
        .select("*", { count: "exact", head: true })
        .eq("facility_id", facilityId)
        .gte("unlocked_at", weekAgo.toISOString());

      // Average response time (time between lead creation and unlock)
      const { data: recentUnlocks } = await supabase
        .from("lead_unlocks")
        .select("lead_id, unlocked_at")
        .eq("facility_id", facilityId)
        .order("unlocked_at", { ascending: false })
        .limit(20);

      let avgResponseMinutes: number | null = null;
      if (recentUnlocks && recentUnlocks.length > 0) {
        const leadIds = recentUnlocks.map(u => u.lead_id);
        const { data: leads } = await supabase
          .from("leads")
          .select("id, created_at")
          .in("id", leadIds);

        if (leads && leads.length > 0) {
          const leadMap = new Map(leads.map(l => [l.id, new Date(l.created_at)]));
          let totalMinutes = 0;
          let count = 0;
          for (const unlock of recentUnlocks) {
            const created = leadMap.get(unlock.lead_id);
            if (created) {
              totalMinutes += (new Date(unlock.unlocked_at).getTime() - created.getTime()) / 60000;
              count++;
            }
          }
          if (count > 0) avgResponseMinutes = Math.round(totalMinutes / count);
        }
      }

      const missedLeads = (leadsThisWeek || 0) - (unlockedThisWeek || 0);

      return {
        leadsThisWeek: leadsThisWeek || 0,
        unlockedThisWeek: unlockedThisWeek || 0,
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
