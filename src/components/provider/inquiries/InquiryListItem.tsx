import { formatDistanceToNow, differenceInHours } from "date-fns";
import { MapPin, Lock, Unlock, Phone, MessageSquare, ShieldCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { InquiryTypeBadge, type InquiryType } from "@/components/provider/InquiryTypeBadge";


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
  isUnlocked: boolean;
  isSelected: boolean;
  onClick: () => void;
}

export function InquiryListItem({ inquiry, isUnlocked, isSelected, onClick }: InquiryListItemProps) {
  const isRedistributed = inquiry.source === "redistributed" || inquiry.source === "rerouted";
  const hoursOld = differenceInHours(new Date(), new Date(inquiry.created_at));
  const isExclusive = !isRedistributed && hoursOld < 24;

  const getStatusIndicator = () => {
    if (!isUnlocked) return { color: "bg-muted-foreground/40", label: "Locked" };
    
    switch (inquiry.provider_response_status) {
      case 'contacted':
        return { color: "bg-blue-500", label: "Contacted" };
      case 'responded':
        return { color: "bg-emerald-500", label: "Responded" };
      case 'closed':
        return { color: "bg-slate-400", label: "Closed" };
      default:
        return { color: "bg-amber-500", label: "Unlocked" };
    }
  };

  const status = getStatusIndicator();

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex items-start gap-3 p-4 cursor-pointer border-b border-border transition-colors",
        "hover:bg-muted/50",
        isSelected && "bg-primary/5 border-l-2 border-l-primary",
        !isUnlocked && "opacity-90"
      )}
    >
      {/* Status indicator dot */}
      <div className="flex-shrink-0 mt-1.5">
        <div className={cn("h-2.5 w-2.5 rounded-full", status.color)} title={status.label} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Header row */}
        <div className="flex items-center gap-2 flex-wrap">
          <InquiryTypeBadge type={inquiry.inquiry_type} size="sm" />
          {isExclusive ? (
            <Badge variant="outline" className="text-xs px-1.5 py-0 border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 gap-1">
              <ShieldCheck className="h-3 w-3" />
              Exclusive
            </Badge>
          ) : isRedistributed ? (
            <Badge variant="outline" className="text-xs px-1.5 py-0 border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400 gap-1">
              <Users className="h-3 w-3" />
              Shared
            </Badge>
          ) : null}
          {isUnlocked ? (
            <Unlock className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          )}
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
            <span className="truncate">{inquiry.level_of_care}</span>
          </div>
        )}

        {/* Contact preview */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
          <span className="font-medium truncate">
            {inquiry.name}
          </span>
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
