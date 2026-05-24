import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import { Loader2, Globe, FileText, Archive, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

export type BulkBlogAction =
  | "publish"
  | "unpublish"
  | "archive"
  | "feature"
  | "unfeature"
  | "delete";

interface BulkBlogArticleActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: BulkBlogAction;
  selectedIds: Set<string>;
  onSuccess: () => void;
}

const ACTION_CONFIG: Record<BulkBlogAction, {
  title: string;
  verb: string;
  icon: React.ElementType;
  danger?: boolean;
  description: string;
  endpoint: "update_status" | "set_featured" | "delete";
  payload?: Record<string, unknown>;
}> = {
  publish: {
    title: "Publish articles",
    verb: "Publish",
    icon: Globe,
    description: "Sets every selected article to status=published. Already-published articles are skipped. First publish stamps published_at.",
    endpoint: "update_status",
    payload: { newStatus: "published" },
  },
  unpublish: {
    title: "Unpublish (back to draft)",
    verb: "Unpublish",
    icon: FileText,
    description: "Moves every selected article back to status=draft. Already-draft articles are skipped. published_at is preserved.",
    endpoint: "update_status",
    payload: { newStatus: "draft" },
  },
  archive: {
    title: "Archive articles",
    verb: "Archive",
    icon: Archive,
    description: "Sets every selected article to status=archived. Already-archived articles are skipped.",
    endpoint: "update_status",
    payload: { newStatus: "archived" },
  },
  feature: {
    title: "Feature articles",
    verb: "Feature",
    icon: Star,
    description: "Sets featured=true on every selected article. Already-featured articles are skipped.",
    endpoint: "set_featured",
    payload: { featured: true },
  },
  unfeature: {
    title: "Unfeature articles",
    verb: "Unfeature",
    icon: Star,
    description: "Sets featured=false on every selected article. Already-not-featured articles are skipped.",
    endpoint: "set_featured",
    payload: { featured: false },
  },
  delete: {
    title: "Delete articles",
    verb: "Delete",
    icon: Trash2,
    danger: true,
    description: "Permanently deletes the selected articles. Super-admin only. Cannot be undone.",
    endpoint: "delete",
  },
};

/**
 * Wraps admin-bulk-update-blog-articles (deployed v1). Admin-gated to
 * super_admin + manager; delete restricted to super_admin. Partial-
 * success summary, per-row audit.
 */
export function BulkBlogArticleActionDialog({
  open, onOpenChange, action, selectedIds, onSuccess,
}: BulkBlogArticleActionDialogProps) {
  const [reason, setReason] = useState("");

  const config = ACTION_CONFIG[action];
  const Icon = config.icon;

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const body: Record<string, unknown> = {
        articleIds: Array.from(selectedIds),
        action: config.endpoint,
        reason: reason.trim() || undefined,
        ...(config.payload || {}),
      };

      const { data, error } = await supabase.functions.invoke("admin-bulk-update-blog-articles", {
        body,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { succeeded: number; skipped: number; errored: number };
    },
    onSuccess: (res) => {
      const noun = res.succeeded === 1 ? "article" : "articles";
      if (res.errored === 0 && res.skipped === 0) {
        toast.success(`${config.verb}ed ${res.succeeded} ${noun}`);
      } else {
        toast.success(`${config.verb}ed ${res.succeeded} · ${res.skipped} skipped · ${res.errored} errored`);
      }
      handleOpenChange(false);
      onSuccess();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Bulk action failed"),
  });

  const handleOpenChange = (next: boolean) => {
    if (mutation.isPending) return;
    if (!next) setReason("");
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {config.title} — {selectedIds.size} {selectedIds.size === 1 ? "article" : "articles"}
          </DialogTitle>
          <DialogDescription className={config.danger ? "text-destructive" : undefined}>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="bulk-blog-reason" className="text-sm">
              Audit reason <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="bulk-blog-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder={action === "delete" ? "e.g. Stale test articles cleanup" : "e.g. Quarterly content refresh"}
              rows={2}
              disabled={mutation.isPending}
              className="resize-none"
            />
            <p className="text-[11px] text-muted-foreground tabular-nums">{reason.length}/500</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            variant={config.danger ? "destructive" : "default"}
            className="gap-2"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
            {config.verb} {selectedIds.size}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
