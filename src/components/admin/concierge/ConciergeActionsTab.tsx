import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Save, XCircle, Loader2, History } from "lucide-react";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type ConciergeInquiry = Database["public"]["Tables"]["concierge_inquiries"]["Row"];

interface ConciergeActionsTabProps {
  caseData: ConciergeInquiry;
  onRefresh: () => void;
  onClose: () => void;
}

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "matching", label: "Matching" },
  { value: "matched", label: "Matched" },
  { value: "introductions_sent", label: "Introductions Sent" },
  { value: "in_contact", label: "In Contact" },
  { value: "placed", label: "Placed" },
  { value: "closed", label: "Closed" },
];

export function ConciergeActionsTab({ caseData, onRefresh, onClose }: ConciergeActionsTabProps) {
  const [status, setStatus] = useState(caseData.status);
  const [adminNotes, setAdminNotes] = useState(caseData.admin_notes || "");
  const [closeReason, setCloseReason] = useState("");

  const updateCaseMutation = useMutation({
    mutationFn: async (updates: Partial<ConciergeInquiry>) => {
      const { error } = await supabase
        .from("concierge_inquiries")
        .update(updates)
        .eq("id", caseData.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Case updated successfully");
      onRefresh();
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  const handleSaveStatus = () => {
    updateCaseMutation.mutate({ status });
  };

  const handleSaveNotes = () => {
    updateCaseMutation.mutate({ admin_notes: adminNotes });
  };

  const handleCloseCase = () => {
    updateCaseMutation.mutate({
      status: "closed",
      closed_at: new Date().toISOString(),
      admin_notes: adminNotes
        ? `${adminNotes}\n\n[Closed] ${closeReason}`
        : `[Closed] ${closeReason}`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Status Update */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Update Status</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSaveStatus} disabled={updateCaseMutation.isPending}>
              {updateCaseMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Admin Notes */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Admin Notes</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <Textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Add internal notes about this case..."
            rows={4}
          />
          <Button
            className="mt-2"
            variant="outline"
            onClick={handleSaveNotes}
            disabled={updateCaseMutation.isPending}
          >
            {updateCaseMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Notes
          </Button>
        </CardContent>
      </Card>

      {/* Case Timeline */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Case Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="space-y-2 text-sm">
            <TimelineItem
              label="Created"
              date={caseData.created_at}
            />
            {caseData.intake_submitted_at && (
              <TimelineItem
                label="Intake Submitted"
                date={caseData.intake_submitted_at}
              />
            )}
            {caseData.matched_at && (
              <TimelineItem
                label="Matched"
                date={caseData.matched_at}
                detail={`${caseData.match_count || 0} facilities`}
              />
            )}
            {caseData.introductions_sent_at && (
              <TimelineItem
                label="Introductions Sent"
                date={caseData.introductions_sent_at}
                detail={`${caseData.introductions_sent_count || 0} sent`}
              />
            )}
            {caseData.seeker_confirmed_at && (
              <TimelineItem
                label="Seeker Confirmed"
                date={caseData.seeker_confirmed_at}
              />
            )}
            {caseData.placement_confirmed_at && (
              <TimelineItem
                label="Placement Confirmed"
                date={caseData.placement_confirmed_at}
              />
            )}
            {caseData.closed_at && (
              <TimelineItem
                label="Closed"
                date={caseData.closed_at}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Close Case */}
      {caseData.status !== "closed" && (
        <Card className="border-destructive/50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Close Case
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <Label className="text-sm">Reason for closing</Label>
            <Textarea
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              placeholder="Enter reason for closing this case..."
              rows={2}
              className="mt-1"
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="mt-2"
                  disabled={!closeReason.trim()}
                >
                  Close Case
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Close this case?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark the case as closed. The reason will be recorded in the admin notes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCloseCase}>
                    Close Case
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      {/* Seeker Confirmation Info */}
      {(caseData.seeker_confirmed || caseData.seeker_feedback) && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Seeker Feedback</CardTitle>
          </CardHeader>
          <CardContent className="py-2 text-sm">
            {caseData.seeker_rating && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-muted-foreground">Rating:</span>
                <span className="font-medium">{"⭐".repeat(caseData.seeker_rating)}</span>
              </div>
            )}
            {caseData.seeker_feedback && (
              <div>
                <span className="text-muted-foreground">Feedback:</span>
                <p className="mt-1 p-2 bg-muted rounded">{caseData.seeker_feedback}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TimelineItem({ label, date, detail }: { label: string; date: string; detail?: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-l-2 border-primary/30 pl-3 -ml-px">
      <div>
        <span className="font-medium">{label}</span>
        {detail && <span className="text-muted-foreground ml-2">({detail})</span>}
      </div>
      <span className="text-muted-foreground text-xs">
        {format(new Date(date), "MMM d, h:mm a")}
      </span>
    </div>
  );
}
