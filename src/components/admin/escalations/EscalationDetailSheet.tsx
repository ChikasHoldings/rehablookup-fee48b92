import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import {
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Send,
  ShieldCheck,
  ArrowUpRight,
  MessageSquare,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", color: "bg-warning/10 text-warning" },
  high: { label: "High", color: "bg-destructive/10 text-destructive" },
  critical: { label: "Critical", color: "bg-destructive text-destructive-foreground" },
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-info/10 text-info" },
  in_progress: { label: "In Progress", color: "bg-warning/10 text-warning" },
  resolved: { label: "Resolved", color: "bg-success/10 text-success" },
  closed: { label: "Closed", color: "bg-muted text-muted-foreground" },
};

interface EscalationDetailSheetProps {
  escalation: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminNames: Record<string, string>;
}

export function EscalationDetailSheet({
  escalation,
  open,
  onOpenChange,
  adminNames,
}: EscalationDetailSheetProps) {
  const { user, isSuperAdmin } = useAdminAuth();
  const queryClient = useQueryClient();
  const [internalNote, setInternalNote] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");

  // Fetch available managers/admins to assign
  const { data: assignableAdmins } = useQuery({
    queryKey: ["assignable-admins"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_user_profiles")
        .select("user_id, first_name, last_name, display_name, admin_role")
        .in("admin_role", ["super_admin", "manager"]);
      return data || [];
    },
    enabled: open,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!escalation) return;
      const { error } = await supabase
        .from("admin_escalations")
        .update(updates)
        .eq("id", escalation.id);
      if (error) throw error;

      // Audit log
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await supabase.from("admin_audit_log").insert({
          admin_user_id: authUser.id,
          action_type: "escalation_update",
          target_type: "escalation",
          target_id: escalation.id,
          details: updates,
        });
      }
    },
    onSuccess: () => {
      toast.success("Escalation updated");
      queryClient.invalidateQueries({ queryKey: ["admin-escalations"] });
      queryClient.invalidateQueries({ queryKey: ["escalation-counts"] });
      setResolutionNotes("");
      setNewStatus("");
    },
    onError: (error: Error) => {
      toast.error("Update failed: " + error.message);
    },
  });

  if (!escalation) return null;

  const priorityCfg = PRIORITY_MAP[escalation.priority] || PRIORITY_MAP.medium;
  const statusCfg = STATUS_MAP[escalation.status] || STATUS_MAP.open;
  const isAssignedToMe = escalation.assigned_to === user?.id;
  const canAct = escalation.status !== "resolved" && escalation.status !== "closed";
  const creatorName = adminNames[escalation.created_by] || "Unknown";
  const assigneeName = escalation.assigned_to ? (adminNames[escalation.assigned_to] || "Admin") : null;

  const handleStatusChange = (status: string) => {
    const updates: Record<string, any> = { status };
    if (status === "resolved") {
      updates.resolved_at = new Date().toISOString();
      if (resolutionNotes.trim()) {
        updates.resolution_notes = resolutionNotes.trim();
      }
    }
    updateMutation.mutate(updates);
  };

  const handleAssign = (adminId: string) => {
    updateMutation.mutate({
      assigned_to: adminId,
      status: escalation.status === "open" ? "in_progress" : escalation.status,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base leading-tight">{escalation.subject}</SheetTitle>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge className={cn("text-[10px]", priorityCfg.color)}>{priorityCfg.label}</Badge>
                <Badge variant="outline" className={cn("text-[10px]", statusCfg.color)}>{statusCfg.label}</Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Description */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</h4>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{escalation.description}</p>
            </div>

            <Separator />

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Created by</p>
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">{creatorName}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Assigned to</p>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">{assigneeName || "Unassigned"}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Created</p>
                <span className="text-sm">{format(new Date(escalation.created_at), "MMM d, yyyy h:mm a")}</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Last updated</p>
                <span className="text-sm">{formatDistanceToNow(new Date(escalation.updated_at), { addSuffix: true })}</span>
              </div>
              {escalation.related_type && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Related to</p>
                  <div className="flex items-center gap-1.5">
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">{escalation.related_type}</span>
                    {escalation.related_id && (
                      <span className="text-xs text-muted-foreground font-mono">({escalation.related_id.slice(0, 8)}...)</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Resolution */}
            {escalation.resolution_notes && (
              <>
                <Separator />
                <div className="p-3 rounded-xl bg-success/5 border border-success/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-xs font-semibold text-success uppercase tracking-wider">Resolution</span>
                    {escalation.resolved_at && (
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {format(new Date(escalation.resolved_at), "MMM d, yyyy h:mm a")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm">{escalation.resolution_notes}</p>
                </div>
              </>
            )}

            {/* Actions */}
            {canAct && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</h4>

                  {/* Assign */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Assign to</label>
                    <Select
                      value={escalation.assigned_to || "unassigned_sentinel"}
                      onValueChange={(v) => v !== "unassigned_sentinel" && handleAssign(v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select admin..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned_sentinel" disabled>Unassigned</SelectItem>
                        {assignableAdmins?.map((a) => (
                          <SelectItem key={a.user_id} value={a.user_id}>
                            {a.display_name || [a.first_name, a.last_name].filter(Boolean).join(" ") || "Admin"} ({a.admin_role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quick claim */}
                  {!escalation.assigned_to && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => updateMutation.mutate({ assigned_to: user?.id, status: "in_progress" })}
                      disabled={updateMutation.isPending}
                    >
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      Claim & Start Working
                    </Button>
                  )}

                  {/* Resolve */}
                  {(isAssignedToMe || isSuperAdmin) && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Resolution notes</label>
                      <Textarea
                        placeholder="Describe what was done to resolve this..."
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        rows={3}
                        className="text-sm"
                      />
                      <Button
                        className="w-full"
                        onClick={() => handleStatusChange("resolved")}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                        )}
                        Mark as Resolved
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Close option for resolved */}
            {escalation.status === "resolved" && (
              <>
                <Separator />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleStatusChange("open")}
                    disabled={updateMutation.isPending}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Reopen
                  </Button>
                  {isSuperAdmin && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleStatusChange("closed")}
                      disabled={updateMutation.isPending}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Close
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* Reopen closed escalations (Super Admin only) */}
            {escalation.status === "closed" && isSuperAdmin && (
              <>
                <Separator />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleStatusChange("open")}
                  disabled={updateMutation.isPending}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Reopen Escalation
                </Button>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
