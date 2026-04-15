import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserCheck, Headphones, TrendingUp, Target } from "lucide-react";

interface StaffMember {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  admin_role: string;
  status: string;
  casesActive: number;
  casesPlaced: number;
  ticketsResolved: number;
}

export function ManagerTeamPerformance() {
  const { data: teamPerformance, isLoading } = useQuery({
    queryKey: ["manager-team-performance"],
    queryFn: async () => {
      // Get all advisors and reps
      const { data: staff } = await supabase
        .from("admin_user_profiles")
        .select("user_id, display_name, first_name, last_name, admin_role, status")
        .in("admin_role", ["advisor", "customer_rep"])
        .eq("status", "active");

      if (!staff || staff.length === 0) return [];

      const advisorIds = staff.filter(s => s.admin_role === "advisor").map(s => s.user_id);
      const repIds = staff.filter(s => s.admin_role === "customer_rep").map(s => s.user_id);

      // Fetch advisor placement stats
      const advisorStats: Record<string, { active: number; placed: number }> = {};
      if (advisorIds.length > 0) {
        const { data: cases } = await supabase
          .from("concierge_inquiries")
          .select("assigned_advisor_id, status")
          .in("assigned_advisor_id", advisorIds);

        cases?.forEach(c => {
          if (!c.assigned_advisor_id) return;
          if (!advisorStats[c.assigned_advisor_id]) advisorStats[c.assigned_advisor_id] = { active: 0, placed: 0 };
          if (["admitted", "billed", "completed"].includes(c.status)) advisorStats[c.assigned_advisor_id].placed++;
          else if (!["closed"].includes(c.status)) advisorStats[c.assigned_advisor_id].active++;
        });
      }

      // Fetch rep ticket stats
      const repStats: Record<string, number> = {};
      if (repIds.length > 0) {
        const { data: tickets } = await supabase
          .from("support_tickets")
          .select("assigned_to, status")
          .in("assigned_to", repIds)
          .eq("status", "resolved");

        tickets?.forEach(t => {
          if (!t.assigned_to) return;
          repStats[t.assigned_to] = (repStats[t.assigned_to] || 0) + 1;
        });
      }

      return staff.map(s => ({
        ...s,
        casesActive: advisorStats[s.user_id]?.active || 0,
        casesPlaced: advisorStats[s.user_id]?.placed || 0,
        ticketsResolved: repStats[s.user_id] || 0,
      })) as StaffMember[];
    },
    staleTime: 60 * 1000,
  });

  const advisors = teamPerformance?.filter(s => s.admin_role === "advisor") || [];
  const reps = teamPerformance?.filter(s => s.admin_role === "customer_rep") || [];

  function getName(s: StaffMember) {
    if (s.first_name && s.last_name) return `${s.first_name} ${s.last_name}`;
    return s.display_name || "Staff";
  }

  function getInitials(s: StaffMember) {
    if (s.first_name && s.last_name) return `${s.first_name[0]}${s.last_name[0]}`;
    return s.display_name?.slice(0, 2).toUpperCase() || "??";
  }

  if (isLoading) {
    return (
      <Card className="border shadow-sm">
        <CardHeader><CardTitle className="text-base">Team Performance</CardTitle></CardHeader>
        <CardContent><div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div></CardContent>
      </Card>
    );
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <div>
            <CardTitle className="text-base font-medium">Team Performance</CardTitle>
            <CardDescription>Individual staff metrics</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Advisors */}
        {advisors.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <UserCheck className="h-3 w-3" /> Placement Advisors
            </p>
            <div className="space-y-2">
              {advisors.map(a => {
                const total = a.casesActive + a.casesPlaced;
                const rate = total > 0 ? Math.round((a.casesPlaced / total) * 100) : 0;
                return (
                  <div key={a.user_id} className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/30">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(a)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{getName(a)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{a.casesActive} active</Badge>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-success/10 text-success">{a.casesPlaced} placed</Badge>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold tabular-nums">{rate}%</p>
                      <p className="text-[10px] text-muted-foreground">conv. rate</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Customer Reps */}
        {reps.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Headphones className="h-3 w-3" /> Customer Reps
            </p>
            <div className="space-y-2">
              {reps.map(r => (
                <div key={r.user_id} className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/30">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-success/10 text-success">{getInitials(r)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{getName(r)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold tabular-nums">{r.ticketsResolved}</p>
                    <p className="text-[10px] text-muted-foreground">resolved</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {advisors.length === 0 && reps.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">No active staff members</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
