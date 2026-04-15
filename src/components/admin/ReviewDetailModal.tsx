import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAuditLog } from "@/hooks/admin/useAuditLog";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Star,
  User,
  Building2,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Trash2,
  Loader2,
  ThumbsUp,
} from "lucide-react";

interface ReviewData {
  id: string;
  user_id: string;
  facility_id: string;
  rating: number;
  review_text: string | null;
  status: string;
  helpful_count: number;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  facility_name?: string;
  reviewer_name?: string;
  reviewer_city?: string;
  reviewer_state?: string;
}

interface ReviewDetailModalProps {
  review: ReviewData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  pending: { label: "Pending Review", className: "bg-warning/10 text-warning border-warning/30", icon: Clock },
  approved: { label: "Approved", className: "bg-success/10 text-success border-success/30", icon: CheckCircle2 },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive border-destructive/30", icon: XCircle },
  hidden: { label: "Hidden", className: "bg-muted text-muted-foreground", icon: XCircle },
};

export function ReviewDetailModal({ review, open, onOpenChange, onRefresh }: ReviewDetailModalProps) {
  const { isSuperAdmin, adminRole } = useAdminAuth();
  const { log: auditLog } = useAuditLog();
  const queryClient = useQueryClient();
  const canModerate = isSuperAdmin || adminRole === "super_admin" || adminRole === "manager";

  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  if (!review) return null;

  const statusCfg = STATUS_CONFIG[review.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;

  const handleModerate = async (action: "approve" | "reject") => {
    if (action === "reject" && !adminNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setProcessing(true);
    const sanitizedNotes = adminNotes.replace(/<[^>]*>/g, "").replace(/javascript:/gi, "").trim().slice(0, 2000);
    const newStatus = action === "approve" ? "approved" : "rejected";

    const { error } = await supabase
      .from("facility_reviews")
      .update({
        status: newStatus,
        admin_notes: sanitizedNotes || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", review.id);

    setProcessing(false);

    if (error) {
      toast.error(`Failed to ${action} review`);
      return;
    }

    auditLog({
      actionType: `review_${action}d`,
      targetType: "review",
      targetId: review.id,
      details: {
        facility_id: review.facility_id,
        facility_name: review.facility_name,
        rating: review.rating,
        admin_notes: sanitizedNotes || null,
      },
    });

    toast.success(`Review ${action}d`);
    queryClient.invalidateQueries({ queryKey: ["admin-sidebar-counts"] });
    onRefresh();
    onOpenChange(false);
  };

  const handleDelete = async () => {
    setProcessing(true);
    const { error } = await supabase.from("facility_reviews").delete().eq("id", review.id);
    setProcessing(false);
    setDeleteConfirm(false);

    if (error) {
      toast.error("Failed to delete review");
      return;
    }

    auditLog({
      actionType: "review_deleted",
      targetType: "review",
      targetId: review.id,
      details: {
        facility_name: review.facility_name,
        rating: review.rating,
        status_before_delete: review.status,
      },
    });

    toast.success("Review deleted");
    queryClient.invalidateQueries({ queryKey: ["admin-sidebar-counts"] });
    onRefresh();
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-lg">Review Details</DialogTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Submitted {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                </p>
              </div>
              <Badge variant="outline" className={cn("text-xs gap-1 flex-shrink-0", statusCfg.className)}>
                <StatusIcon className="h-3 w-3" />
                {statusCfg.label}
              </Badge>
            </div>
          </DialogHeader>

          <Separator />

          <ScrollArea className="flex-1 px-6 pb-6">
            <div className="space-y-5 mt-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "h-5 w-5",
                        star <= review.rating ? "fill-warning text-warning" : "text-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>
                <span className="text-lg font-bold tabular-nums">{review.rating}/5</span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                  <ThumbsUp className="h-3 w-3" />
                  {review.helpful_count} helpful
                </div>
              </div>

              <div className="p-3 rounded-lg border space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{review.reviewer_name || "Anonymous"}</span>
                </div>
                {(review.reviewer_city || review.reviewer_state) && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {[review.reviewer_city, review.reviewer_state].filter(Boolean).join(", ")}
                  </div>
                )}
              </div>

              <div className="p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{review.facility_name || "Unknown Facility"}</span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Review Content
                </h4>
                {review.review_text ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                    {review.review_text}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No review text provided (rating only)</p>
                )}
              </div>

              {review.admin_notes && (
                <div className="p-3 rounded-lg bg-info/5 border border-info/20">
                  <p className="text-xs font-medium text-info mb-1">Admin Notes</p>
                  <p className="text-sm">{review.admin_notes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Created: {format(new Date(review.created_at), "MMM d, yyyy h:mm a")}
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Updated: {format(new Date(review.updated_at), "MMM d, yyyy h:mm a")}
                </div>
              </div>

              {canModerate && review.status === "pending" && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Moderation</h4>
                    <Textarea
                      placeholder="Admin notes (required for rejection)..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                      className="text-sm"
                      maxLength={2000}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                        onClick={() => handleModerate("approve")}
                        disabled={processing}
                      >
                        {processing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleModerate("reject")}
                        disabled={processing}
                      >
                        {processing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                        Reject
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {canModerate && (
                <div className="pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive w-full justify-center"
                    onClick={() => setDeleteConfirm(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete Review
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {review.rating}-star review for <strong>{review.facility_name}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={processing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {processing ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
