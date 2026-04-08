import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { EscalationsList } from "@/components/admin/escalations/EscalationsList";

export default function AdminEscalations() {
  const [filter, setFilter] = useState("open");

  const { data: counts } = useQuery({
    queryKey: ["escalation-counts"],
    queryFn: async () => {
      const [open, inProgress, resolved] = await Promise.all([
        supabase.from("admin_escalations").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("admin_escalations").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
        supabase.from("admin_escalations").select("id", { count: "exact", head: true }).eq("status", "resolved"),
      ]);
      return {
        open: open.count || 0,
        in_progress: inProgress.count || 0,
        resolved: resolved.count || 0,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-warning to-destructive flex items-center justify-center shadow-lg">
          <AlertTriangle className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Escalations</h1>
          <p className="text-sm text-muted-foreground">Review and resolve escalated issues from staff</p>
        </div>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="open" className="gap-1.5">
            Open
            {counts?.open ? <Badge variant="secondary" className="text-[10px] px-1.5">{counts.open}</Badge> : null}
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="gap-1.5">
            In Progress
            {counts?.in_progress ? <Badge variant="secondary" className="text-[10px] px-1.5">{counts.in_progress}</Badge> : null}
          </TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <EscalationsList filterStatus={filter} />
    </div>
  );
}
