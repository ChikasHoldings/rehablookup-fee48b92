import { Lock, Sparkles, Phone, Mail, Clock, Zap, Building2, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { UnlockLeadButton } from "@/components/provider/UnlockLeadButton";
import { useLeadCountdown } from "@/hooks/useLeadCountdown";

interface LockedLeadCardProps {
  leadId: string;
  facilityId: string;
  name: string;
  createdAt: string;
  urgency?: string | null;
  source?: string | null;
  facilityName?: string;
  showFacility?: boolean;
  onClick?: () => void;
  isSelected?: boolean;
  onUnlockSuccess?: () => void;
}

export function LockedLeadCard({
  leadId,
  facilityId,
  name,
  createdAt,
  urgency,
  source,
  facilityName,
  showFacility,
  onClick,
  isSelected,
  onUnlockSuccess,
}: LockedLeadCardProps) {
  const initial = name.charAt(0).toUpperCase();
  const blurredName = `${initial}${"●".repeat(Math.min(name.length - 1, 8))}`;
  const countdown = useLeadCountdown(createdAt);

  return (
    <div
      className={cn(
        "relative group p-4 border rounded-lg transition-all",
        "bg-muted/30 hover:bg-muted/50 border-muted-foreground/20",
        isSelected && "ring-2 ring-primary bg-primary/5"
      )}
    >
      {/* Locked overlay badge */}
      <div className="absolute top-2 right-2">
        <Badge 
          variant="secondary" 
          className="gap-1 bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700"
        >
          <Lock className="h-3 w-3" />
          Locked
        </Badge>
      </div>
      
      <div className="flex items-start gap-3">
        {/* Blurred avatar */}
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 blur-[2px]">
          <span className="text-sm font-semibold text-muted-foreground">
            {initial}
          </span>
        </div>
        
        <div className="flex-1 min-w-0 pt-0.5">
          {/* Blurred name */}
          <p className="font-medium text-foreground/60 blur-[3px] select-none">
            {blurredName}
          </p>
          
          {/* Blurred contact info */}
          <div className="flex items-center gap-3 mt-1.5 text-muted-foreground/50">
            <span className="flex items-center gap-1 text-xs blur-[2px]">
              <Phone className="h-3 w-3" />
              (●●●) ●●●-●●●●
            </span>
            <span className="flex items-center gap-1 text-xs blur-[2px]">
              <Mail className="h-3 w-3" />
              ●●●@●●●.com
            </span>
          </div>
          
          {/* Visible metadata */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {showFacility && facilityName && (
              <Badge variant="outline" className="h-5 text-[10px] px-1.5 border-primary/30 bg-primary/5 text-primary font-medium">
                <Building2 className="h-2.5 w-2.5 mr-0.5" />
                {facilityName.length > 12 ? facilityName.slice(0, 12) + "..." : facilityName}
              </Badge>
            )}
            
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </span>
            
            {source === "Request Help Page" && (
              <Badge className="bg-primary/10 text-primary border-0 h-5 text-[10px] px-1.5">
                <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                Qualified
              </Badge>
            )}
            
            {urgency === "immediate" && (
              <Badge variant="destructive" className="h-5 text-[10px] px-1.5 animate-pulse">
                <Zap className="h-2.5 w-2.5 mr-0.5" />
                Urgent
              </Badge>
            )}
          </div>

          {/* Countdown Timer */}
          <div className={cn(
            "mt-2.5 flex items-center gap-1.5 text-xs font-mono font-semibold rounded-md px-2 py-1 w-fit",
            countdown.urgencyTier === "critical" && "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 animate-pulse",
            countdown.urgencyTier === "warning" && "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
            countdown.urgencyTier === "safe" && "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
          )}>
            <Timer className="h-3.5 w-3.5" />
            {countdown.isExpired 
              ? "Expired — redistributing"
              : `⏳ Exclusive access expires in ${countdown.formatted}`
            }
          </div>
        </div>
      </div>
      
      {/* Unlock CTA on hover */}
      <UnlockLeadButton
        leadId={leadId}
        facilityId={facilityId}
        leadName={blurredName}
        variant="card"
        onUnlockSuccess={onUnlockSuccess}
      />
    </div>
  );
}
