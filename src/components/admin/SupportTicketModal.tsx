import { useState } from "react";
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
  SupportTicket,
  useSupportTicketNotes,
  useUpdateSupportTicket,
  useAssignSupportTicket,
  useAddSupportTicketNote,
  useResolveSupportTicket,
} from "@/hooks/useAdminSupportTickets";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SupportTicketModalProps {
  ticket: SupportTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sourceLabels: Record<string, { label: string; icon: React.ElementType }> = {
  public_contact: { label: "Public Contact Form", icon: Mail },
  provider_support: { label: "Provider Support", icon: Building2 },
  seeker_support: { label: "Seeker Support", icon: User },
};

const statusOptions = [
  { value: "new", label: "New", className: "bg-info/10 text-info" },
  { value: "open", label: "Open", className: "bg-warning/10 text-warning" },
  { value: "in_progress", label: "In Progress", className: "bg-chart-3/10 text-chart-3" },
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
}: SupportTicketModalProps) {
  const { user } = useAdminAuth();
  const [newNote, setNewNote] = useState("");

  const { data: notes = [], isLoading: notesLoading } = useSupportTicketNotes(ticket?.id || "");
  const updateTicket = useUpdateSupportTicket();
  const assignTicket = useAssignSupportTicket();
  const addNote = useAddSupportTicketNote();
  const resolveTicket = useResolveSupportTicket();

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

  if (!ticket) return null;

  const source = sourceLabels[ticket.source];
  const SourceIcon = source?.icon || Mail;

  const handleStatusChange = (status: string) => {
    if (!user?.id) return;
    updateTicket.mutate({
      ticketId: ticket.id,
      updates: { status: status as SupportTicket["status"] },
      currentUserId: user.id,
    });
  };

  const handlePriorityChange = (priority: string) => {
    if (!user?.id) return;
    updateTicket.mutate({
      ticketId: ticket.id,
      updates: { priority: priority as SupportTicket["priority"] },
      currentUserId: user.id,
    });
  };

  const handleAssign = (assigneeId: string) => {
    if (!user?.id) return;
    assignTicket.mutate({
      ticketId: ticket.id,
      assigneeId: assigneeId === "unassigned" ? null : assigneeId,
      currentUserId: user.id,
    });
  };

  const handleAddNote = () => {
    if (!newNote.trim() || !user?.id || addNote.isPending) return;
    addNote.mutate(
      {
        ticketId: ticket.id,
        content: newNote.trim(),
        authorId: user.id,
      },
      {
        onSuccess: () => setNewNote(""),
      }
    );
  };

  const handleResolve = () => {
    if (!user?.id || resolveTicket.isPending) return;
    resolveTicket.mutate({
      ticketId: ticket.id,
      currentUserId: user.id,
    });
  };

  return (
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <div>
                  <p className="font-medium text-foreground text-sm sm:text-base">{ticket.sender_name}</p>
                  <a
                    href={`mailto:${ticket.sender_email}`}
                    className="text-xs sm:text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    {ticket.sender_email}
                    <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  </a>
                </div>
                <Button variant="outline" size="sm" asChild className="self-start sm:self-auto text-xs sm:text-sm h-8 sm:h-9">
                  <a href={`mailto:${ticket.sender_email}?subject=Re: ${ticket.subject || ticket.category}`}>
                    <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                    Reply
                  </a>
                </Button>
              </div>
            </div>

            {/* Message */}
            <div>
              <h4 className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5 sm:mb-2">Message</h4>
              <div className="bg-background border border-border rounded-lg p-3 sm:p-4">
                <p className="text-sm sm:text-base text-foreground/80 whitespace-pre-wrap">{ticket.message}</p>
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

            {/* Internal Notes */}
            <div>
              <h4 className="text-xs sm:text-sm font-medium text-foreground mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Internal Notes ({notes.length})
              </h4>

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
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={2}
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
        <div className="flex-shrink-0 flex justify-between px-4 sm:px-6 py-3 sm:py-4 border-t bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)} size="sm" className="text-xs sm:text-sm h-8 sm:h-9">
            Close
          </Button>
          {ticket.status !== "resolved" && ticket.status !== "closed" && (
            <Button
              onClick={handleResolve}
              disabled={resolveTicket.isPending}
              className="bg-success hover:bg-success/90 text-success-foreground text-xs sm:text-sm h-8 sm:h-9"
              size="sm"
            >
              {resolveTicket.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              )}
              Resolve
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
