import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import type { Database } from "@/integrations/supabase/types";
import { CaseTimelineEvents } from "./CaseTimelineEvents";
import { AdminConfirmPlacement } from "./AdminConfirmPlacement";
import { AdvisorAssignmentCard } from "./AdvisorAssignmentCard";

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
  const queryClient = useQueryClient();
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

      // Log status change event
      if (updates.status && updates.status !== caseData.status) {
        await supabase.from("concierge_case_events").insert({
          inquiry_id: caseData.id,
          event_type: "status_changed",
          event_data: { from: caseData.status, to: updates.status },
          actor_type: "admin",
        });
      }
    },
    onSuccess: () => {
      toast.success("Case updated successfully");
      queryClient.invalidateQueries({ queryKey: ["case-events", caseData.id] });
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
      {/* Advisor Assignment */}
      <AdvisorAssignmentCard caseData={caseData} onRefresh={onRefresh} />

      {/* Admin Confirm Placement - ONLY admins can confirm */}
      <AdminConfirmPlacement caseData={caseData} onRefresh={onRefresh} />

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

      {/* Case Timeline - Now with real events */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Case Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <ScrollArea className="h-[250px]">
            <CaseTimelineEvents caseData={caseData} />
          </ScrollArea>
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
