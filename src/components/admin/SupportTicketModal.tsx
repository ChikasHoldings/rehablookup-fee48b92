import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Mail,
  Building2,
  User,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Send,
  Loader2,
  Trash2,
  AlertTriangle,
  UserCheck,
  Lock,
  Headphones,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  SupportTicket,
  useSupportTicketNotes,
  useAssignSupportTicket,
  useAddSupportTicketNote,
} from "@/hooks/useAdminSupportTickets";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { logAdminAction, AdminAuditActions } from "@/hooks/useAdminAuditLog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useSupportMessages,
  useSupportReply,
  useMarkSupportRead,
  useAdminSupportStatus,
  type SupportTicketStatus,
} from "@/lib/support/useSupportTickets";
import { SupportAttachmentPicker, AttachmentList } from "@/components/support/SupportAttachments";
import { SupportStatusBadge } from "@/components/support/SupportStatusBadge";

interface SupportTicketModalProps {
  ticket: SupportTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

const sourceLabels: Record<string, { label: string; icon: React.ElementType }> = {
  public_contact: { label: "Public Contact Form", icon: Mail },
  provider_support: { label: "Provider Support", icon: Building2 },
  seeker_support: { label: "Client Support", icon: User },
};

const statusOptions = [
  { value: "open", label: "Open", className: "bg-info/10 text-info" },
  { value: "in_progress", label: "In Progress", className: "bg-chart-3/10 text-chart-3" },
  { value: "waiting_on_user", label: "Waiting on User", className: "bg-warning/10 text-warning" },
  { value: "waiting_on_admin", label: "Waiting on Support", className: "bg-warning/10 text-warning" },
  { value: "resolved", label: "Resolved", className: "bg-success/10 text-success" },
  { value: "closed", label: "Closed", className: "bg-muted text-muted-foreground" },
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export function SupportTicketModal({
  ticket,
  open,
  onOpenChange,
  onDeleted,
}: SupportTicketModalProps) {
  const { user } = useAdminAuth();
  const [newNote, setNewNote] = useState("");
  const [reply, setReply] = useState("");
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [escalating, setEscalating] = useState(false);

  const { data: notes = [], isLoading: notesLoading } = useSupportTicketNotes(ticket?.id || "");
  const { data: messages = [], isLoading: messagesLoading } = useSupportMessages(ticket?.id || null);
  const assignTicket = useAssignSupportTicket();
  const addNote = useAddSupportTicketNote();
  // Status/priority/category/assignment/resolution route through the
  // support-ticket-status edge function so the user is notified on
  // resolve/close/reopen (a direct table update would skip that).
  const adminStatus = useAdminSupportStatus();
  const sendReply = useSupportReply();
  const markRead = useMarkSupportRead();
  const markReadMutate = markRead.mutate;

  const { data: adminStaff = [] } = useQuery({
    queryKey: ["admin-staff-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_user_profiles")
        .select("user_id, display_name, avatar_url")
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  // Mark the ticket read for the admin side when the modal opens.
  const ticketId = ticket?.id;
  useEffect(() => {
    if (open && ticketId) markReadMutate(ticketId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ticketId]);

  if (!ticket) return null;

  const source = sourceLabels[ticket.source];
  const SourceIcon = source?.icon || Mail;

  const handleStatusChange = (status: string) => {
    if (!user?.id) return;
    adminStatus.mutate(
      { ticketId: ticket.id, status: status as SupportTicketStatus },
      {
        onSuccess: () => toast.success("Status updated"),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update status"),
      },
    );
  };

  const handlePriorityChange = (priority: string) => {
    if (!user?.id) return;
    adminStatus.mutate(
      { ticketId: ticket.id, priority },
      {
        onSuccess: () => toast.success("Priority updated"),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update priority"),
      },
    );
  };

  const handleAssign = (assigneeId: string) => {
    if (!user?.id) return;
    assignTicket.mutate({
      ticketId: ticket.id,
      assigneeId: assigneeId === "unassigned" ? null : assigneeId,
      currentUserId: user.id,
    });
  };

  const handleSendReply = async () => {
    if (!reply.trim() || sendReply.isPending) return;
    try {
      await sendReply.mutateAsync({ ticketId: ticket.id, body: reply.trim(), files: replyFiles });
      setReply("");
      setReplyFiles([]);
      toast.success("Reply sent to the user");
    } catch (err) {
      // Keep the draft on failure.
      toast.error(err instanceof Error ? err.message : "Failed to send reply");
    }
  };

  const handleAddNote = () => {
    if (!newNote.trim() || !user?.id || addNote.isPending) return;
    // Sanitize note content
    const sanitized = newNote
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .trim()
      .slice(0, 5000);
    if (!sanitized) return;
    addNote.mutate(
      {
        ticketId: ticket.id,
        content: sanitized,
        authorId: user.id,
      },
      {
        onSuccess: () => setNewNote(""),
      }
    );
  };

  const handleResolve = () => {
    if (!user?.id || adminStatus.isPending) return;
    adminStatus.mutate(
      { ticketId: ticket.id, status: "resolved" },
      {
        onSuccess: () => toast.success("Ticket resolved — the user has been notified"),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to resolve ticket"),
      },
    );
  };

  const handleDelete = async () => {
    if (!ticket) return;
    setDeleting(true);
    try {
      // Delete notes first. If this fails, surface the error and bail
      // so we don't leave the ticket with stale notes still attached.
      const { error: notesErr } = await supabase
        .from("support_ticket_notes")
        .delete()
        .eq("ticket_id", ticket.id);
      if (notesErr) throw new Error(`Notes delete failed: ${notesErr.message}`);

      const { error } = await supabase.from("support_tickets").delete().eq("id", ticket.id);
      if (error) throw error;
      // Audit destructive admin action
      await logAdminAction({
        actionType: AdminAuditActions.SUPPORT_TICKET_DELETED,
        targetType: "support_ticket",
        targetId: ticket.id,
        details: {
          subject: ticket.subject,
          source: ticket.source,
          status_before_delete: ticket.status,
          sender_email: ticket.sender_email,
        },
      });
      toast.success("Ticket deleted");
      onOpenChange(false);
      onDeleted?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Delete ticket failed:", err);
      toast.error(`Failed to delete ticket: ${msg}`);
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  // Auto-claim: assign to current user when opened if unassigned.
  // The assign mutation owns the success/error toast (its onSuccess/onError).
  // Firing a synchronous "claimed" toast here would double-toast on success
  // and show a false success if the assignment actually failed.
  const handleClaimTicket = () => {
    if (!user?.id || ticket.assigned_to) return;
    assignTicket.mutate({
      ticketId: ticket.id,
      assigneeId: user.id,
      currentUserId: user.id,
    });
  };

  const handleEscalateToManager = async () => {
    if (!user?.id) return;
    setEscalating(true);
    try {
      // Step 1: create the escalation row. If this fails the ticket
      // status stays unchanged — escalation failed cleanly.
      const { error } = await supabase.from("admin_escalations").insert({
        subject: `Support Ticket: ${ticket.subject || ticket.category}`,
        description: `Escalated from support ticket.\n\nSender: ${ticket.sender_name} (${ticket.sender_email})\nMessage: ${ticket.message?.slice(0, 500)}`,
        priority: ticket.priority === "urgent" ? "critical" : ticket.priority === "high" ? "high" : "medium",
        created_by: user.id,
        related_type: "support_ticket",
        related_id: ticket.id,
        status: "open",
      });
      if (error) throw error;

      // Step 2: mark the ticket as in_progress (via the status edge fn).
      // Failure here is a soft warning — the escalation exists, the ticket
      // just didn't get its status bumped, so we surface that explicitly
      // instead of a generic success toast.
      try {
        await adminStatus.mutateAsync({ ticketId: ticket.id, status: "in_progress" });
        toast.success("Escalated to management");
      } catch (statusErr) {
        const msg = statusErr instanceof Error ? statusErr.message : String(statusErr);
        toast.warning(`Escalated, but couldn't update ticket status: ${msg}`);
      }
    } catch (err) {
      toast.error("Failed to escalate: " + (err as Error).message);
    } finally {
      setEscalating(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-2xl h-[90vh] sm:h-[85vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground mb-1">
              <SourceIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>{source?.label}</span>
              <span>·</span>
              <span className="hidden sm:inline">{format(new Date(ticket.created_at), "MMM d, yyyy h:mm a")}</span>
              <span className="sm:hidden">{format(new Date(ticket.created_at), "MMM d, h:mm a")}</span>
            </div>
            <DialogTitle className="text-lg sm:text-xl">
              {ticket.subject || ticket.category}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 px-4 sm:px-6">
            <div className="space-y-4 sm:space-y-6 pb-4">
              {/* Sender Info */}
              <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground text-sm sm:text-base">{ticket.sender_name}</p>
                      <SupportStatusBadge status={ticket.status} />
                    </div>
                    <a
                      href={`mailto:${ticket.sender_email}`}
                      className="text-xs sm:text-sm text-primary hover:underline flex items-center gap-1 mt-0.5"
                    >
                      {ticket.sender_email}
                      <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Conversation thread (in-app replies). The original ticket
                  body is the first user message; subsequent messages come
                  from support_ticket_messages. Admins reply in-thread below. */}
              <div>
                <h4 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Conversation
                </h4>
                <div className="space-y-3">
                  <AdminMessageBubble
                    role="user"
                    senderLabel={ticket.sender_name || "User"}
                    body={ticket.message}
                    createdAt={ticket.created_at}
                  />
                  {messagesLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-14 w-3/4 rounded-lg" />
                      <Skeleton className="h-14 w-3/4 rounded-lg ml-auto" />
                    </div>
                  ) : (
                    messages.map((m) => (
                      <AdminMessageBubble
                        key={m.id}
                        role={m.sender_role}
                        senderLabel={m.sender_role === "admin" ? "Support" : ticket.sender_name || "User"}
                        body={m.body}
                        createdAt={m.created_at}
                        attachments={m.attachments}
                      />
                    ))
                  )}
                </div>

                {/* Admin reply composer */}
                <div className="mt-3 rounded-lg border border-border bg-background p-3 space-y-2">
                  <Textarea
                    placeholder="Reply to the user… (sends an in-app message + notification)"
                    value={reply}
                    onChange={(e) => setReply(e.target.value.slice(0, 5000))}
                    rows={3}
                    maxLength={5000}
                    className="resize-none text-xs sm:text-sm"
                    disabled={sendReply.isPending}
                  />
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <SupportAttachmentPicker
                      files={replyFiles}
                      onChange={setReplyFiles}
                      onError={(msg) => toast.error(msg)}
                      disabled={sendReply.isPending}
                      idPrefix="admin-support-reply"
                    />
                    <Button
                      size="sm"
                      onClick={handleSendReply}
                      disabled={!reply.trim() || sendReply.isPending}
                      className="gap-1.5 ml-auto"
                    >
                      {sendReply.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      Send reply
                    </Button>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 sm:mb-1.5 block">
                    Status
                  </label>
                  <Select value={ticket.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="h-9 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <Badge variant="outline" className={cn("mr-2 text-[10px] sm:text-xs", status.className)}>
                            {status.label}
                          </Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 sm:mb-1.5 block">
                    Priority
                  </label>
                  <Select value={ticket.priority} onValueChange={handlePriorityChange}>
                    <SelectTrigger className="h-9 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((priority) => (
                        <SelectItem key={priority.value} value={priority.value}>
                          {priority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 sm:mb-1.5 block">
                    Assigned To
                  </label>
                  <Select
                    value={ticket.assigned_to || "unassigned"}
                    onValueChange={handleAssign}
                  >
                    <SelectTrigger className="h-9 text-xs sm:text-sm">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {adminStaff.map((staff) => (
                        <SelectItem key={staff.user_id} value={staff.user_id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-4 w-4 sm:h-5 sm:w-5">
                              <AvatarImage src={staff.avatar_url || undefined} />
                              <AvatarFallback className="text-[8px] sm:text-[10px]">
                                {staff.display_name
                                  ?.split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs sm:text-sm">{staff.display_name || "Unknown"}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Internal Notes — admin-only, never shown to the user. */}
              <div className="rounded-lg border border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-900/10 p-3">
                <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-1.5 sm:gap-2">
                    <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" />
                    Internal notes ({notes.length})
                  </h4>
                  <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-100/60 dark:text-amber-300 dark:border-amber-800">
                    Internal — not visible to the user
                  </Badge>
                </div>

                {notesLoading ? (
                  <div className="space-y-2 mb-3">
                    <Skeleton className="h-16 w-full rounded-lg" />
                    <Skeleton className="h-16 w-full rounded-lg" />
                  </div>
                ) : notes.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="bg-muted/50 rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm"
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                          <Avatar className="h-4 w-4 sm:h-5 sm:w-5">
                            <AvatarImage src={note.author?.avatar_url || undefined} />
                            <AvatarFallback className="text-[8px] sm:text-[10px]">
                              {note.author?.display_name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground/80 text-xs sm:text-sm">
                            {note.author?.display_name || "Unknown"}
                          </span>
                          <span className="text-muted-foreground text-[10px] sm:text-xs">
                            {format(new Date(note.created_at), "MMM d, h:mm a")}
                          </span>
                        </div>
                        <p className="text-muted-foreground whitespace-pre-wrap text-xs sm:text-sm">{note.content}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add an internal note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value.slice(0, 5000))}
                    rows={2}
                    maxLength={5000}
                    className="resize-none text-xs sm:text-sm"
                  />
                  <Button
                    size="icon"
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || addNote.isPending}
                    className="h-9 w-9 shrink-0"
                  >
                    {addNote.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Resolution Info */}
              {ticket.resolved_at && (
                <>
                  <Separator />
                  <div className="bg-success/5 border border-success/20 rounded-lg p-3 sm:p-4">
                    <h4 className="text-xs sm:text-sm font-medium text-success flex items-center gap-1.5 mb-1">
                      <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Resolved
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(ticket.resolved_at), "MMM d, yyyy h:mm a")}
                    </p>
                    {ticket.resolution_notes && (
                      <p className="text-xs sm:text-sm text-foreground/70 mt-1.5 whitespace-pre-wrap">
                        {ticket.resolution_notes}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-t bg-background gap-2 flex-wrap">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} size="sm" className="text-xs sm:text-sm h-8 sm:h-9">
                Close
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="text-xs sm:text-sm h-8 sm:h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete
              </Button>
            </div>
            <div className="flex gap-2">
              {/* Claim button if unassigned */}
              {!ticket.assigned_to && ticket.status !== "resolved" && ticket.status !== "closed" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClaimTicket}
                  disabled={assignTicket.isPending}
                  className="text-xs sm:text-sm h-8 sm:h-9"
                >
                  <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                  Claim
                </Button>
              )}
              {/* Escalate button */}
              {ticket.status !== "resolved" && ticket.status !== "closed" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEscalateToManager}
                  disabled={escalating}
                  className="text-xs sm:text-sm h-8 sm:h-9 text-warning hover:text-warning hover:bg-warning/10"
                >
                  {escalating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />}
                  Escalate
                </Button>
              )}
              {/* Resolve button */}
              {ticket.status !== "resolved" && ticket.status !== "closed" && (
                <Button
                  onClick={handleResolve}
                  disabled={adminStatus.isPending}
                  className="bg-success hover:bg-success/90 text-success-foreground text-xs sm:text-sm h-8 sm:h-9"
                  size="sm"
                >
                  {adminStatus.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Resolve
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the ticket and all its notes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * One message in the admin conversation view. Admin replies align right
 * (the admin is the viewer here); user messages align left.
 */
function AdminMessageBubble({
  role,
  senderLabel,
  body,
  createdAt,
  attachments,
}: {
  role: "user" | "admin";
  senderLabel: string;
  body: string;
  createdAt: string;
  attachments?: { path: string; name: string; type: string; size: number }[] | null;
}) {
  const mine = role === "admin";
  return (
    <div className={cn("flex flex-col gap-1 max-w-[90%]", mine ? "ml-auto items-end" : "items-start")}>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-1">
        {mine ? <Headphones className="h-3 w-3" aria-hidden /> : <User className="h-3 w-3" aria-hidden />}
        <span>{senderLabel}</span>
        <span aria-hidden>·</span>
        <span>{format(new Date(createdAt), "MMM d, h:mm a")}</span>
      </div>
      <div
        className={cn(
          "rounded-2xl px-3.5 py-2.5 text-sm break-words whitespace-pre-wrap w-full",
          mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm",
        )}
      >
        {body}
        <AttachmentList attachments={attachments} />
      </div>
    </div>
  );
}
