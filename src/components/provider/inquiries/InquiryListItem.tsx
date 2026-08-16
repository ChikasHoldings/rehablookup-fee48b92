import { formatDistanceToNow, differenceInHours } from "date-fns";
import { MapPin, Phone, MessageSquare, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { InquiryTypeBadge, type InquiryType } from "@/components/provider/InquiryTypeBadge";
import { capitalizeName, slugToLabel } from "@/lib/textCase";

interface InquiryListItemProps {
  inquiry: {
    id: string;
    name: string;
    email: string;
    phone: string;
    location_city_state: string | null;
    level_of_care: string | null;
    urgency: string | null;
    inquiry_type: InquiryType | null;
    provider_response_status: string | null;
    created_at: string;
    message: string | null;
    source: string | null;
  };
  isSelected: boolean;
  onClick: () => void;
  unreadCount?: number;
}

export function InquiryListItem({ inquiry, isSelected, onClick, unreadCount = 0 }: InquiryListItemProps) {
  const hoursOld = differenceInHours(new Date(), new Date(inquiry.created_at));

  const getStatusIndicator = () => {
    switch (inquiry.provider_response_status) {
      case 'contacted':
        return { color: "bg-blue-500", label: "Contacted" };
      case 'responded':
        return { color: "bg-emerald-500", label: "Responded" };
      case 'closed':
        return { color: "bg-slate-400", label: "Closed" };
      default:
        return { color: "bg-amber-500", label: "New" };
    }
  };

  const status = getStatusIndicator();

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex items-start gap-3 p-4 cursor-pointer border-b border-border transition-colors",
        "hover:bg-muted/50",
        isSelected && "bg-primary/5 border-l-2 border-l-primary"
      )}
    >
      {/* Status indicator dot. role + aria-label so screen readers
          announce the status — the colored pill alone is invisible
          to them. */}
      <div className="flex-shrink-0 mt-1.5">
        <div
          className={cn("h-2.5 w-2.5 rounded-full", status.color)}
          title={status.label}
          role="img"
          aria-label={`Status: ${status.label}`}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Header row */}
        <div className="flex items-center gap-2 flex-wrap">
          <InquiryTypeBadge type={inquiry.inquiry_type} size="sm" />
          {/* "Exclusive" / "Shared" badges removed in the Stage-3 cutover.
              They were lead-marketplace semantics: an inquiry now goes to
              exactly one facility — the one the seeker selected — so there is
              no exclusivity window to win and nothing is ever shared. */}
          {inquiry.urgency && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs px-1.5 py-0",
                inquiry.urgency === 'Urgent' && "border-red-300 text-red-600 dark:border-red-800 dark:text-red-400",
                inquiry.urgency === 'This week' && "border-amber-300 text-amber-600 dark:border-amber-800 dark:text-amber-400"
              )}
            >
              {inquiry.urgency}
            </Badge>
          )}
          {unreadCount > 0 && (
            <Badge className="text-xs px-1.5 py-0 gap-1 bg-primary hover:bg-primary">
              <MessageCircle className="h-3 w-3" />
              {unreadCount} new
            </Badge>
          )}
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="truncate">{inquiry.location_city_state || "Location pending"}</span>
        </div>

        {/* Care type */}
        {inquiry.level_of_care && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{slugToLabel(inquiry.level_of_care)}</span>
          </div>
        )}

        {/* Contact preview */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
          <span className="font-medium truncate">{capitalizeName(inquiry.name)}</span>
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {inquiry.phone}
          </span>
        </div>

        {/* Time */}
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(inquiry.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
