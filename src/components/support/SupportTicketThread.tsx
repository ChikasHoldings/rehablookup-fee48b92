import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { Loader2, Send, AlertCircle, Headphones, User as UserIcon, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SupportStatusBadge } from "@/components/support/SupportStatusBadge";
import { SupportAttachmentPicker, AttachmentList } from "@/components/support/SupportAttachments";
import {
  useSupportTicket,
  useSupportMessages,
  useSupportReply,
  useMarkSupportRead,
  type SupportMessageRow,
} from "@/lib/support/useSupportTickets";

const REPLY_MAX = 5000;

const CATEGORY_LABELS: Record<string, string> = {
  account: "Account",
  request_help: "Inquiry help",
  technical: "Technical",
  feedback: "Feedback",
  billing: "Billing",
  listing: "Listing",
  leads: "Leads",
  placements: "Concierge Partner",
  other: "Other",
};

type ThreadPanel = "seeker" | "provider" | "admin";

interface SupportTicketThreadProps {
  ticketId: string;
  panel: ThreadPanel;
  /** Optional header back control (mobile master/detail). */
  onBack?: () => void;
  className?: string;
}

export function SupportTicketThread({ ticketId, panel, onBack, className }: SupportTicketThreadProps) {
  const [reply, setReply] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: ticket, isLoading: ticketLoading, isError: ticketError } = useSupportTicket(ticketId);
  const { data: messages, isLoading: messagesLoading } = useSupportMessages(ticketId);
  const sendReply = useSupportReply();
  const markRead = useMarkSupportRead();
  const markReadMutate = markRead.mutate;

  const isAdmin = panel === "admin";
  const isClosedOrResolved = ticket?.status === "resolved" || ticket?.status === "closed";

  // Mark read on mount / when the ticket changes.
  useEffect(() => {
    if (!ticketId) return;
    markReadMutate(ticketId);
    // markReadMutate is stable from react-query; intentionally only re-run per ticket.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  // Auto-scroll to the newest message.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages?.length]);

  const pending = sendReply.isPending;
  const canSend = reply.trim().length > 0 && !pending;

  const handleSend = async () => {
    if (!canSend) return;
    try {
      const result = await sendReply.mutateAsync({ ticketId, body: reply.trim(), files });
      setReply("");
      setFiles([]);
      if (result?.reopened) {
        toast.success("Reply sent — this ticket has been reopened.");
      } else {
        toast.success("Reply sent.");
      }
    } catch (err) {
      // Keep the draft on failure.
      toast.error(err instanceof Error ? err.message : "Couldn't send your reply. Please try again.");
    }
  };

  if (ticketLoading) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <Skeleton className="h-16 w-full rounded-lg mb-3" />
        <div className="space-y-3 flex-1">
          <Skeleton className="h-20 w-3/4 rounded-lg" />
          <Skeleton className="h-20 w-3/4 rounded-lg ml-auto" />
        </div>
      </div>
    );
  }

  if (ticketError || !ticket) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full text-center p-6", className)}>
        <AlertCircle className="h-8 w-8 text-amber-600 mb-2" aria-hidden />
        <p className="text-sm font-medium text-foreground">Couldn't load this ticket</p>
        <p className="text-xs text-muted-foreground mt-1">It may have been removed, or you don't have access.</p>
        {onBack && (
          <Button variant="outline" size="sm" className="mt-3" onClick={onBack}>
            Back
          </Button>
        )}
      </div>
    );
  }

  const categoryLabel = CATEGORY_LABELS[ticket.category] || ticket.category.replace(/_/g, " ");

  return (
    <div className={cn("flex flex-col h-full min-h-0", className)}>
      {/* Header */}
      <div className="flex items-start gap-3 pb-3 border-b border-border shrink-0">
        {onBack && (
          <Button variant="ghost" size="sm" className="lg:hidden -ml-2 shrink-0" onClick={onBack}>
            Back
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold text-foreground truncate">
              {ticket.subject || categoryLabel}
            </h2>
            <SupportStatusBadge status={ticket.status} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {categoryLabel} · Opened {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4">
        {/* Original ticket body as the first "user" message. */}
        <MessageBubble
          role="user"
          isAdmin={isAdmin}
          body={ticket.message}
          createdAt={ticket.created_at}
          senderLabel={isAdmin ? ticket.sender_name || "User" : "You"}
        />

        {messagesLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-3/4 rounded-lg" />
            <Skeleton className="h-16 w-3/4 rounded-lg ml-auto" />
          </div>
        ) : (
          (messages ?? []).map((m) => (
            <MessageBubble
              key={m.id}
              role={m.sender_role}
              isAdmin={isAdmin}
              body={m.body}
              createdAt={m.created_at}
              attachments={m.attachments}
              senderLabel={labelForMessage(m, isAdmin, ticket.sender_name)}
            />
          ))
        )}
      </div>

      {/* Reopen hint for the user side on a resolved/closed ticket. */}
      {isClosedOrResolved && !isAdmin && (
        <div className="shrink-0 rounded-md bg-muted/60 border border-border px-3 py-2 mb-2 flex items-start gap-2">
          <RotateCcw className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" aria-hidden />
          <p className="text-xs text-muted-foreground">
            This request is {ticket.status}. Replying below will reopen it so our team can help again.
          </p>
        </div>
      )}

      {/* Composer — sticky at the bottom of the thread column. */}
      <div className="shrink-0 border-t border-border pt-3 space-y-2 sticky bottom-0 bg-background">
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value.slice(0, REPLY_MAX))}
          placeholder={isAdmin ? "Reply to the user..." : "Write a reply..."}
          rows={3}
          maxLength={REPLY_MAX}
          className="resize-none"
          disabled={pending}
        />
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <SupportAttachmentPicker
            files={files}
            onChange={setFiles}
            onError={(msg) => toast.error(msg)}
            disabled={pending}
            idPrefix="support-reply-attach"
          />
          <Button onClick={handleSend} disabled={!canSend} className="gap-2 ml-auto">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {pending ? "Sending..." : isClosedOrResolved && !isAdmin ? "Reply & reopen" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function labelForMessage(m: SupportMessageRow, isAdmin: boolean, senderName: string | null): string {
  if (isAdmin) {
    return m.sender_role === "admin" ? "You (support)" : senderName || "User";
  }
  return m.sender_role === "admin" ? "Support team" : "You";
}

function MessageBubble({
  role,
  isAdmin,
  body,
  createdAt,
  attachments,
  senderLabel,
}: {
  role: "user" | "admin";
  isAdmin: boolean;
  body: string;
  createdAt: string;
  attachments?: SupportMessageRow["attachments"];
  senderLabel: string;
}) {
  // "Mine" = the side viewing this thread. For the user panels that's the
  // user role; for the admin panel that's the admin role. Mine aligns right.
  const mine = isAdmin ? role === "admin" : role === "user";
  const fromSupport = role === "admin";

  return (
    <div className={cn("flex flex-col gap-1 max-w-[88%] sm:max-w-[80%]", mine ? "ml-auto items-end" : "items-start")}>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-1">
        {fromSupport ? (
          <Headphones className="h-3 w-3" aria-hidden />
        ) : (
          <UserIcon className="h-3 w-3" aria-hidden />
        )}
        <span>{senderLabel}</span>
        <span aria-hidden>·</span>
        <span title={format(new Date(createdAt), "PPpp")}>
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
        </span>
      </div>
      <div
        className={cn(
          "rounded-2xl px-3.5 py-2.5 text-sm break-words whitespace-pre-wrap w-full",
          mine
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm",
        )}
      >
        {body}
        <AttachmentList attachments={attachments} />
      </div>
    </div>
  );
}
