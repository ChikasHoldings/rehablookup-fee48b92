import { formatDistanceToNow } from "date-fns";
import { Ticket, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SupportStatusBadge } from "@/components/support/SupportStatusBadge";
import { hasUnreadForUser, type SupportTicketRow } from "@/lib/support/useSupportTickets";

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

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || category.replace(/_/g, " ");
}

interface SupportTicketListProps {
  tickets: SupportTicketRow[] | undefined;
  onSelect: (ticketId: string) => void;
  isLoading?: boolean;
  selectedTicketId?: string | null;
  /** Pass false to suppress the user-side unread dot (e.g. admin list). */
  showUnread?: boolean;
  emptyHint?: string;
}

export function SupportTicketList({
  tickets,
  onSelect,
  isLoading,
  selectedTicketId,
  showUnread = true,
  emptyHint = "You haven't opened any support requests yet.",
}: SupportTicketListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[68px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Ticket className="h-10 w-10 mx-auto mb-2 opacity-40" aria-hidden />
        <p className="text-sm font-medium text-foreground">No support requests</p>
        <p className="text-xs mt-1">{emptyHint}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {tickets.map((ticket) => {
        const unread = showUnread && hasUnreadForUser(ticket);
        const when = ticket.last_message_at || ticket.created_at;
        const isSelected = selectedTicketId === ticket.id;
        return (
          <li key={ticket.id}>
            <button
              type="button"
              onClick={() => onSelect(ticket.id)}
              className={cn(
                "w-full text-left flex items-center gap-3 p-3 rounded-lg border transition-colors",
                "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected ? "border-primary/40 bg-muted/40" : "border-border bg-card",
              )}
            >
              {unread ? (
                <span
                  className="h-2 w-2 rounded-full bg-primary shrink-0"
                  aria-label="Unread reply"
                />
              ) : (
                <span className="h-2 w-2 shrink-0" aria-hidden />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={cn("text-sm truncate", unread ? "font-semibold text-foreground" : "font-medium text-foreground")}>
                    {ticket.subject || categoryLabel(ticket.category)}
                  </p>
                  <SupportStatusBadge status={ticket.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {categoryLabel(ticket.category)}
                  {" · "}
                  {when ? formatDistanceToNow(new Date(when), { addSuffix: true }) : "just now"}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" aria-hidden />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
