import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { CheckCircle2, Clock, AlertTriangle, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";

const PRIORITY_CONFIG = {
  low: { label: "Low", color: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", color: "bg-warning/10 text-warning" },
  high: { label: "High", color: "bg-destructive/10 text-destructive" },
  critical: { label: "Critical", color: "bg-destructive text-destructive-foreground" },
};

const STATUS_CONFIG = {
  open: { label: "Open", color: "bg-info/10 text-info" },
  in_progress: { label: "In Progress", color: "bg-warning/10 text-warning" },
  resolved: { label: "Resolved", color: "bg-success/10 text-success" },
  closed: { label: "Closed", color: "bg-muted text-muted-foreground" },
};

interface EscalationsListProps {
  filterStatus?: string;
}

export function EscalationsList({ filterStatus = "all" }: EscalationsListProps) {
  const { user, isSuperAdmin } = useAdminAuth();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const { data: escalations, isLoading } = useQuery({
    queryKey: ["admin-escalations", filterStatus],
    queryFn: async () => {
      let query = supabase
        .from("admin_escalations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus as "open" | "in_progress" | "resolved" | "closed");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from("admin_escalations")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Escalation updated");
      queryClient.invalidateQueries({ queryKey: ["admin-escalations"] });
      setExpandedId(null);
      setResolutionNotes("");
    },
    onError: (error: Error) => {
      toast.error("Failed to update", { description: error.message });
    },
  });

  const handleAssignToMe = (id: string) => {
    updateMutation.mutate({
      id,
      updates: { assigned_to: user?.id, status: "in_progress" },
    });
  };

  const handleResolve = (id: string) => {
    updateMutation.mutate({
      id,
      updates: {
        status: "resolved",
        resolution_notes: resolutionNotes || null,
        resolved_at: new Date().toISOString(),
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!escalations?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-success" />
        <p className="font-medium">No escalations</p>
        <p className="text-sm">Everything is running smoothly.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {escalations.map((esc) => {
        const priorityCfg = PRIORITY_CONFIG[esc.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
        const statusCfg = STATUS_CONFIG[esc.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.open;
        const isExpanded = expandedId === esc.id;
        const isAssigned = !!esc.assigned_to;
        const isAssignedToMe = esc.assigned_to === user?.id;

        return (
          <Card
            key={esc.id}
            className={cn(
              "border transition-all",
              esc.priority === "critical" && esc.status === "open" && "border-destructive/50 bg-destructive/5"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="font-medium text-sm truncate">{esc.subject}</h4>
                    <Badge className={cn("text-[10px]", priorityCfg.color)}>{priorityCfg.label}</Badge>
                    <Badge variant="outline" className={cn("text-[10px]", statusCfg.color)}>{statusCfg.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{esc.description}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(esc.created_at), { addSuffix: true })}
                    </span>
                    {esc.related_type && (
                      <span>Related: {esc.related_type}</span>
                    )}
                    {isAssigned && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {isAssignedToMe ? "Assigned to you" : "Assigned"}
                      </span>
                    )}
                  </div>

                  {esc.resolution_notes && (
                    <div className="mt-2 p-2 rounded bg-success/5 border border-success/20 text-xs">
                      <span className="font-medium text-success">Resolution:</span> {esc.resolution_notes}
                    </div>
                  )}
                </div>

                {esc.status !== "resolved" && esc.status !== "closed" && (
                  <div className="flex gap-1.5 shrink-0">
                    {!isAssigned && (isSuperAdmin || true) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAssignToMe(esc.id)}
                        disabled={updateMutation.isPending}
                        className="text-xs"
                      >
                        Claim
                      </Button>
                    )}
                    {(isAssignedToMe || isSuperAdmin) && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => setExpandedId(isExpanded ? null : esc.id)}
                        className="text-xs"
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  <Textarea
                    placeholder="Resolution notes (what was done to resolve this)..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={2}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setExpandedId(null)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleResolve(esc.id)}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Mark Resolved
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
