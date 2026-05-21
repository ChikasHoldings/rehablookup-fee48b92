import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";

interface EscalationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relatedType?: string;
  relatedId?: string;
  defaultSubject?: string;
}

export function EscalationDialog({
  open,
  onOpenChange,
  relatedType,
  relatedId,
  defaultSubject = "",
}: EscalationDialogProps) {
  const { user } = useAdminAuth();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState(defaultSubject);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("medium");

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      const subj = subject.trim();
      const desc = description.trim();
      if (!subj) throw new Error("Subject is required");
      if (!desc) throw new Error("Description is required");

      const { data, error } = await supabase.from("admin_escalations").insert({
        created_by: user.id,
        subject: subj,
        description: desc,
        priority: priority as "low" | "medium" | "high" | "critical",
        related_type: relatedType || null,
        related_id: relatedId || null,
      }).select("id").single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Escalation created", {
        description: "Managers and super admins were notified via the bell menu.",
      });
      // Invalidate both the list + global count caches so the new
      // escalation appears immediately. Realtime would catch it too
      // (admin_escalations is now in the supabase_realtime publication
      // — migration 20260622000000), but invalidating client-side
      // closes the perceived gap on the originating tab.
      queryClient.invalidateQueries({ queryKey: ["admin-escalations"] });
      queryClient.invalidateQueries({ queryKey: ["escalation-counts"] });
      setSubject("");
      setDescription("");
      setPriority("medium");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to create escalation", { description: error.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Escalate Issue
          </DialogTitle>
          <DialogDescription>
            Send this to a manager or super admin for review and resolution.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="esc-subject">Subject *</Label>
            <Input
              id="esc-subject"
              placeholder="Brief summary of the issue..."
              value={subject}
              onChange={(e) => setSubject(e.target.value.slice(0, 200))}
              maxLength={200}
            />
            <p className="text-[11px] text-muted-foreground tabular-nums">{subject.length}/200</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="esc-priority">Priority *</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical — Needs immediate attention</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="esc-desc">Description *</Label>
            <Textarea
              id="esc-desc"
              placeholder="Detailed description of the issue, what you've tried, and what action is needed..."
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
              rows={4}
              maxLength={2000}
            />
            <p className="text-[11px] text-muted-foreground tabular-nums">{description.length}/2000</p>
          </div>

          {relatedType && (
            <p className="text-xs text-muted-foreground">
              Linked to: <span className="font-medium">{relatedType}</span>
              {relatedId && <span className="ml-1 font-mono text-[10px]">({relatedId.slice(0, 8)}...)</span>}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!subject.trim() || !description.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4 mr-2" />
            )}
            Escalate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
