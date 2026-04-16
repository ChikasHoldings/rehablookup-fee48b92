import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCaseTransition } from "@/hooks/useCaseTransition";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { EscalationDialog } from "@/components/admin/escalations/EscalationDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Save, XCircle, Loader2, History, AlertTriangle, HandMetal, CheckCircle2, Bell } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { CaseTimelineEvents } from "./CaseTimelineEvents";
import { AdvisorAssignmentCard } from "./AdvisorAssignmentCard";

type ConciergeInquiry = Database["public"]["Tables"]["concierge_inquiries"]["Row"];

interface ConciergeActionsTabProps {
  caseData: ConciergeInquiry;
  onRefresh: () => void;
  onClose: () => void;
  isAdvisor?: boolean;
  onSwitchTab?: (tab: string) => void;
}

import { VALID_TRANSITIONS, PIPELINE_STAGES, CLOSED_STAGE, type PlacementStage, getStageConfig } from "./placementPipelineConfig";

// Build valid status options dynamically based on current status
function getStatusOptions(currentStatus: string, isAdvisor: boolean) {
  const allowed = VALID_TRANSITIONS[currentStatus as PlacementStage] || [];
  // Always include current status so Select has a valid value
  const allKeys = [currentStatus, ...allowed];
  const uniqueKeys = [...new Set(allKeys)];

  const advisorAllowed = new Set([
    "intake_reviewed", "advisor_assigned", "matching_providers",
    "provider_prequalification", "providers_accepted",
    "presented_to_seeker", "seeker_selected", "admission_in_progress",
  ]);

  return uniqueKeys
    .filter(key => !isAdvisor || advisorAllowed.has(key) || key === currentStatus)
    .map(key => {
      const config = getStageConfig(key);
      return { value: key, label: config.label };
    });
}

export function ConciergeActionsTab({ caseData, onRefresh, onClose, isAdvisor = false, onSwitchTab }: ConciergeActionsTabProps) {
  const { user } = useAdminAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(caseData.status);
  const [adminNotes, setAdminNotes] = useState(caseData.admin_notes || "");
  const [closeReason, setCloseReason] = useState("");

  // Sync state when caseData changes
  useEffect(() => {
    setStatus(caseData.status);
    setAdminNotes(caseData.admin_notes || "");
    setCloseReason("");
  }, [caseData.id, caseData.status, caseData.admin_notes]);

  const caseTransition = useCaseTransition();

  const updateCaseMutation = useMutation({
    mutationFn: async (updates: Partial<ConciergeInquiry>) => {
      // For status changes, delegate to the centralized transition hook
      if (updates.status && updates.status !== caseData.status) {
      if ((caseData.status === 'admitted' || caseData.status === 'completed') && updates.status !== 'closed') {
          throw new Error("Cannot change status of a confirmed placement. Close the case instead.");
        }
        // Use transition hook via mutateAsync so we get optimistic locking
        await caseTransition.mutateAsync({
          caseId: caseData.id,
          fromStatus: caseData.status,
          toStatus: updates.status,
          extraFields: (() => {
            const extra: Record<string, unknown> = {};
            if (updates.admin_notes !== undefined) extra.admin_notes = updates.admin_notes;
            if (updates.closed_at) extra.closed_at = updates.closed_at;
            return Object.keys(extra).length ? extra : undefined;
          })(),
          via: "actions_tab",
          onSuccess: onRefresh,
        });
        return;
      }

      // Non-status updates (notes only)
      const { error } = await supabase
        .from("concierge_inquiries")
        .update(updates)
        .eq("id", caseData.id);
      if (error) throw error;

      // Log notes changes
      if (updates.admin_notes !== undefined && updates.admin_notes !== caseData.admin_notes) {
        await supabase.from("concierge_case_events").insert({
          inquiry_id: caseData.id,
          event_type: "notes_updated",
          event_data: {},
          actor_id: user?.id || null,
          actor_type: isAdvisor ? "advisor" : "admin",
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
    if (status === caseData.status) return;
    updateCaseMutation.mutate({ status });
  };

  const handleSaveNotes = () => {
    if (adminNotes === (caseData.admin_notes || "")) return;
    updateCaseMutation.mutate({ admin_notes: adminNotes });
  };

  const handleCloseCase = async () => {
    await updateCaseMutation.mutateAsync({
      status: "closed",
      closed_at: new Date().toISOString(),
      admin_notes: adminNotes
        ? `${adminNotes}\n\n[Closed] ${closeReason}`
        : `[Closed] ${closeReason}`,
    });

    // Notify seeker that their case was closed by admin
    try {
      await supabase.functions.invoke("send-concierge-notifications", {
        body: {
          type: "case_closed_by_admin",
          inquiryId: caseData.id,
          metadata: { reason: closeReason },
        },
      });
    } catch (e) {
      console.error("Close notification error:", e);
    }
  };

  // Self-assign for advisors
  const selfAssignMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      
      // Race-condition guard: only claim if still unassigned
      const { data: updated, error } = await supabase
        .from("concierge_inquiries")
        .update({ assigned_advisor_id: user.id })
        .eq("id", caseData.id)
        .is("assigned_advisor_id", null)
        .select("id")
        .maybeSingle();
        
      if (error) throw error;
      if (!updated) throw new Error("This case was already claimed by another advisor. Please refresh.");

      await supabase.from("concierge_case_events").insert({
        inquiry_id: caseData.id,
        event_type: "advisor_assigned",
        event_data: { advisor_id: user.id, self_assigned: true },
        actor_id: user.id,
        actor_type: "advisor",
      });

      // Notify other admins/advisors
      try {
        await supabase.functions.invoke("send-concierge-notifications", {
          body: {
            type: "advisor_claimed",
            inquiryId: caseData.id,
            metadata: { advisor_id: user.id, advisor_name: user.email, self_assigned: true },
          },
        });
      } catch (e) { console.error("Notification error:", e); }
    },
    onSuccess: () => {
      toast.success("Case assigned to you — starting placement workflow");
      queryClient.invalidateQueries({ queryKey: ["case-events", caseData.id] });
      onRefresh();
      onSwitchTab?.("providers");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to self-assign");
      onRefresh(); // Refresh to show current state
    },
  });

  const isUnpaid = caseData.payment_status !== 'paid' && caseData.payment_status !== 'succeeded';
  const statusOptions = getStatusOptions(caseData.status, isAdvisor);
  const isAssignedToMe = caseData.assigned_advisor_id === user?.id;
  const isUnassigned = !caseData.assigned_advisor_id;

  return (
    <div className="space-y-4">
      {/* Unpaid Warning */}
      {isUnpaid && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Payment Not Received</AlertTitle>
          <AlertDescription>
            This case has not been paid ($29 intake fee). Avoid sending introductions until payment is confirmed.
          </AlertDescription>
        </Alert>
      )}

      {/* Self-assign card for advisors on unassigned cases */}
      {isAdvisor && isUnassigned && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">This case is unassigned</p>
                <p className="text-xs text-muted-foreground mt-0.5">Claim it to start working on this placement</p>
              </div>
              <Button 
                onClick={() => selfAssignMutation.mutate()}
                disabled={selfAssignMutation.isPending}
                size="sm"
              >
                {selfAssignMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <HandMetal className="h-4 w-4 mr-1.5" />
                )}
                Claim Case
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advisor assignment - only for non-advisors (admins/managers) */}
      {!isAdvisor && (
        <AdvisorAssignmentCard caseData={caseData} onRefresh={onRefresh} />
      )}

      {/* Notify Client — Send provider options for review */}
      {(caseData.status === "presented_to_seeker" || caseData.status === "providers_accepted") && !caseData.seeker_confirmed && (
        <NotifyClientCard caseData={caseData} onRefresh={onRefresh} />
      )}

      {/* Seeker confirmed indicator for admin */}
      {caseData.seeker_confirmed && !["admitted", "completed", "billed", "closed"].includes(caseData.status) && (
        <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="font-medium text-emerald-800 dark:text-emerald-400">Client Confirmed</p>
                <p className="text-sm text-muted-foreground">
                  {caseData.seeker_confirmed_at
                    ? `Confirmed on ${new Date(caseData.seeker_confirmed_at).toLocaleDateString()}`
                    : "The client has confirmed their preferred facility. You can now finalize the placement."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSaveStatus} disabled={updateCaseMutation.isPending || status === caseData.status}>
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
          <CardTitle className="text-sm font-medium">
            {isAdvisor ? "Advisor Notes" : "Admin Notes"}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <Textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder={isAdvisor ? "Add notes about this case..." : "Add internal notes about this case..."}
            rows={4}
          />
          <Button
            className="mt-2"
            variant="outline"
            onClick={handleSaveNotes}
            disabled={updateCaseMutation.isPending || adminNotes === (caseData.admin_notes || "")}
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
          <ScrollArea className="h-[250px]">
            <CaseTimelineEvents caseData={caseData} />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Escalate Case */}
      {isAdvisor && caseData.status !== "closed" && (
        <EscalateCardInline caseData={caseData} />
      )}

      {/* Close Case - only for non-advisors */}
      {!isAdvisor && caseData.status !== "closed" && (
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
            <CardTitle className="text-sm font-medium">Client Feedback</CardTitle>
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

function NotifyClientCard({ caseData, onRefresh }: { caseData: ConciergeInquiry; onRefresh: () => void }) {
  const [sending, setSending] = useState(false);
  const sendGuard = useRef(false);

  const handleNotifyClient = async () => {
    if (sendGuard.current) return;
    sendGuard.current = true;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.functions.invoke("send-concierge-notifications", {
        body: {
          type: "facilities_ready_for_review",
          inquiryId: caseData.id,
        },
      });

      await supabase.from("concierge_case_events").insert({
        inquiry_id: caseData.id,
        event_type: "seeker_notified_options",
        event_data: {},
        actor_id: user?.id || null,
        actor_type: "admin",
      });

      toast.success("Client has been notified to review provider options.");
      onRefresh();
    } catch {
      toast.error("Failed to notify seeker.");
    } finally {
      setSending(false);
      // Allow re-send after 10 seconds cooldown
      setTimeout(() => { sendGuard.current = false; }, 10000);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Notify Client of Options</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Send email + in-app notification asking the seeker to review and choose from interested facilities.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNotifyClient}
            disabled={sending}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Bell className="h-4 w-4 mr-1.5" />
            )}
            Notify Client
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EscalateCardInline({ caseData }: { caseData: ConciergeInquiry }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card className="border-orange-300/50">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Need help with this case?</p>
              <p className="text-xs text-muted-foreground mt-0.5">Escalate to a Manager or Super Admin</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              <AlertTriangle className="h-4 w-4 mr-1.5" />
              Escalate
            </Button>
          </div>
        </CardContent>
      </Card>
      <EscalationDialog
        open={open}
        onOpenChange={setOpen}
        relatedType="concierge_inquiry"
        relatedId={caseData.id}
        defaultSubject={`Escalation: Case #${caseData.id.slice(0, 8)} — ${caseData.user_name}`}
      />
    </>
  );
}
