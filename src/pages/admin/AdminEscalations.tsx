import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Search,
  Filter,
  LayoutGrid,
  List,
} from "lucide-react";
import { EscalationsList } from "@/components/admin/escalations/EscalationsList";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default function AdminEscalations() {
  const [filter, setFilter] = useState("open");
  const [priorityFilter, setPriorityFilter] = useState("all_priorities");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "compact">("cards");

  const { data: counts } = useQuery({
    queryKey: ["escalation-counts"],
    queryFn: async () => {
      const [open, inProgress, resolved, closed] = await Promise.all([
        supabase.from("admin_escalations").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("admin_escalations").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
        supabase.from("admin_escalations").select("id", { count: "exact", head: true }).eq("status", "resolved"),
        supabase.from("admin_escalations").select("id", { count: "exact", head: true }).eq("status", "closed"),
      ]);
      return {
        open: open.count || 0,
        in_progress: inProgress.count || 0,
        resolved: resolved.count || 0,
        closed: closed.count || 0,
        total: (open.count || 0) + (inProgress.count || 0) + (resolved.count || 0) + (closed.count || 0),
      };
    },
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={AlertTriangle}
        iconGradient="bg-gradient-to-br from-warning to-destructive"
        title="Escalations"
        subtitle={`${counts?.total ?? 0} total · ${counts?.open ?? 0} open · ${counts?.in_progress ?? 0} in progress`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "cards" ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("cards")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "compact" ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("compact")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Open", value: counts?.open ?? 0, color: "text-info", bg: "bg-info/10" },
          { label: "In Progress", value: counts?.in_progress ?? 0, color: "text-warning", bg: "bg-warning/10" },
          { label: "Resolved", value: counts?.resolved ?? 0, color: "text-success", bg: "bg-success/10" },
          { label: "Closed", value: counts?.closed ?? 0, color: "text-muted-foreground", bg: "bg-muted" },
        ].map((stat) => (
          <button
            key={stat.label}
            onClick={() => setFilter(stat.label.toLowerCase().replace(" ", "_"))}
            className={`p-3 rounded-xl border text-left transition-all hover:shadow-sm ${
              filter === stat.label.toLowerCase().replace(" ", "_")
                ? "ring-2 ring-primary/30 border-primary/50"
                : ""
            }`}
          >
            <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
            <p className={`text-2xl font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search escalations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="h-9">
            <TabsTrigger value="open" className="text-xs px-3">Open</TabsTrigger>
            <TabsTrigger value="in_progress" className="text-xs px-3">In Progress</TabsTrigger>
            <TabsTrigger value="resolved" className="text-xs px-3">Resolved</TabsTrigger>
            <TabsTrigger value="closed" className="text-xs px-3">Closed</TabsTrigger>
            <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_priorities">All Priorities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Escalations List */}
      <EscalationsList
        filterStatus={filter}
        filterPriority={priorityFilter === "all_priorities" ? undefined : priorityFilter}
        searchQuery={searchQuery}
        viewMode={viewMode}
      />
    </div>
  );
}
