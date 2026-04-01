import { useState, useRef, useCallback, TouchEvent, memo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Phone,
  Mail,
  Sparkles,
  AlertTriangle,
  Clock,
  ShieldCheck,
  MessageSquare,
  Building2,
  Check,
  X,
  Share2,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LeadStatusBadge, type LeadStatus } from "./LeadStatusBadge";
import type { Lead } from "./LeadDetailPanel";

interface MobileLeadCardProps {
  lead: Lead & { facility_name?: string };
  isSelected: boolean;
  isLocked: boolean;
  isQualified: boolean;
  showFacility: boolean;
  exclusivity?: 'shared' | 'exclusive' | null;
  onSelect: () => void;
  onCall: () => void;
  onEmail: () => void;
  onMarkContacted: () => void;
}

// Comparison function for memo - only re-render if relevant props changed
function arePropsEqual(
  prevProps: MobileLeadCardProps,
  nextProps: MobileLeadCardProps
): boolean {
  return (
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isLocked === nextProps.isLocked &&
    prevProps.isQualified === nextProps.isQualified &&
    prevProps.showFacility === nextProps.showFacility &&
    prevProps.lead.id === nextProps.lead.id &&
    prevProps.lead.name === nextProps.lead.name &&
    prevProps.lead.status === nextProps.lead.status &&
    prevProps.lead.urgency === nextProps.lead.urgency &&
    prevProps.lead.email_verified === nextProps.lead.email_verified &&
    prevProps.lead.created_at === nextProps.lead.created_at &&
    prevProps.lead.facility_name === nextProps.lead.facility_name
  );
}

export const MobileLeadCard = memo(function MobileLeadCard({
  lead,
  isSelected,
  isLocked,
  isQualified,
  showFacility,
  exclusivity,
  onSelect,
  onCall,
  onEmail,
  onMarkContacted,
}: MobileLeadCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipeRevealed, setIsSwipeRevealed] = useState<'left' | 'right' | null>(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const SWIPE_THRESHOLD = 80;
  const MAX_SWIPE = 160;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isLocked) return;
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
  }, [isLocked]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isLocked) return;
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchCurrentX.current - touchStartX.current;
    
    // Clamp the swipe offset
    const clampedDiff = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, diff));
    setSwipeOffset(clampedDiff);
  }, [isLocked]);

  const handleTouchEnd = useCallback(() => {
    if (isLocked) return;
    const diff = touchCurrentX.current - touchStartX.current;
    
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff > 0) {
        // Swipe right - reveal call/email actions
        setIsSwipeRevealed('right');
        setSwipeOffset(MAX_SWIPE);
      } else {
        // Swipe left - reveal status actions
        setIsSwipeRevealed('left');
        setSwipeOffset(-MAX_SWIPE);
      }
    } else {
      // Reset to center
      setSwipeOffset(0);
      setIsSwipeRevealed(null);
    }
  }, [isLocked]);

  const resetSwipe = useCallback(() => {
    setSwipeOffset(0);
    setIsSwipeRevealed(null);
  }, []);

  const handleActionClick = useCallback((action: () => void) => {
    action();
    resetSwipe();
  }, [resetSwipe]);

  const location = lead.location_city_state || (lead.location_zip ? `ZIP: ${lead.location_zip}` : null);

  return (
    <div className="relative overflow-hidden rounded-2xl touch-manipulation">
      {/* Left Actions (revealed on swipe right) - Call & Email */}
      <div className="absolute inset-y-0 left-0 flex items-stretch">
        <button
          onClick={() => handleActionClick(onCall)}
          className="w-20 flex flex-col items-center justify-center gap-1 bg-green-500 text-white active:bg-green-600 transition-colors"
          aria-label="Call lead"
        >
          <Phone className="h-6 w-6" />
          <span className="text-[10px] font-semibold">Call</span>
        </button>
        <button
          onClick={() => handleActionClick(onEmail)}
          className="w-20 flex flex-col items-center justify-center gap-1 bg-blue-500 text-white active:bg-blue-600 transition-colors"
          aria-label="Email lead"
        >
          <Mail className="h-6 w-6" />
          <span className="text-[10px] font-semibold">Email</span>
        </button>
      </div>

      {/* Right Actions (revealed on swipe left) - Mark Contacted */}
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        <button
          onClick={() => handleActionClick(onMarkContacted)}
          className={cn(
            "w-20 flex flex-col items-center justify-center gap-1 text-white active:opacity-80 transition-colors",
            lead.status === 'contacted' ? "bg-amber-500" : "bg-purple-500"
          )}
          aria-label={lead.status === 'contacted' ? "Mark in progress" : "Mark contacted"}
        >
          <Check className="h-6 w-6" />
          <span className="text-[10px] font-semibold text-center leading-tight">
            {lead.status === 'contacted' ? "In Progress" : "Contacted"}
          </span>
        </button>
        <button
          onClick={resetSwipe}
          className="w-20 flex flex-col items-center justify-center gap-1 bg-slate-400 text-white active:bg-slate-500 transition-colors"
          aria-label="Cancel"
        >
          <X className="h-6 w-6" />
          <span className="text-[10px] font-semibold">Cancel</span>
        </button>
      </div>

      {/* Main Card Content */}
      <div
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (isSwipeRevealed) {
            resetSwipe();
          } else if (!isLocked) {
            onSelect();
          }
        }}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwipeRevealed !== null || swipeOffset === 0 ? 'transform 0.25s ease-out' : 'none',
        }}
        className={cn(
          "relative border-2 bg-background transition-colors duration-200 overflow-hidden rounded-2xl",
          isSelected 
            ? "border-primary bg-primary/5 shadow-lg" 
            : lead.status === 'new'
              ? "border-primary/50 bg-primary/5"
              : isQualified
                ? "border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-emerald-50/30 dark:border-emerald-800/50 dark:from-emerald-950/30 dark:to-emerald-950/10"
                : "border-slate-200 bg-gradient-to-br from-slate-50/80 to-white dark:border-slate-700/50 dark:from-slate-900/30 dark:to-slate-900/10",
          isLocked && "opacity-60",
          lead.status !== 'new' && !isSelected && "opacity-80"
        )}
      >
        {/* Unread indicator dot */}
        {lead.status === 'new' && (
          <div className="absolute top-3 left-3 h-2.5 w-2.5 rounded-full bg-primary animate-pulse z-10" />
        )}
        <div className={cn("p-4", lead.status === 'new' && "pl-7")}>
          {/* Top Row - Avatar, Name, Time */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={cn(
                "h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-sm",
                isSelected 
                  ? "bg-primary text-primary-foreground" 
                  : isLocked
                    ? "bg-muted text-muted-foreground"
                    : isQualified
                      ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
                      : "bg-gradient-to-br from-slate-400 to-slate-500 text-white"
              )}>
                {isLocked ? "??" : lead.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className={cn(
                  "font-semibold text-base truncate leading-tight",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {isLocked ? maskLeadName(lead.name) : lead.name}
                </h4>
                {location && !isLocked && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                    {location}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-[11px] text-muted-foreground font-medium">
                {formatDistanceToNow(new Date(lead.created_at), { addSuffix: false }).replace('about ', '')}
              </span>
              <LeadStatusBadge status={lead.status as LeadStatus} size="sm" />
            </div>
          </div>

          {/* Tags Row */}
          {!isLocked && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Facility Tag */}
              {showFacility && lead.facility_name && (
                <Badge variant="outline" className="h-6 px-2 text-[10px] border-primary/30 bg-primary/5 text-primary font-medium">
                  <Building2 className="h-3 w-3 mr-1" />
                  {lead.facility_name.length > 15 ? lead.facility_name.slice(0, 15) + "..." : lead.facility_name}
                </Badge>
              )}
              
              {/* Lead Type Tag */}
              {isQualified ? (
                <Badge className="h-6 px-2 text-[10px] bg-emerald-500 text-white border-0 font-semibold shadow-sm">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Qualified
                </Badge>
              ) : (
                <Badge className="h-6 px-2 text-[10px] bg-slate-500 text-white border-0 font-semibold shadow-sm">
                  Direct
                </Badge>
              )}
              
              {/* Exclusivity Badge - per spec labels */}
              {exclusivity === 'shared' && (
                <Badge variant="outline" className="h-6 px-2 text-[10px] border-blue-300 bg-blue-50 text-blue-700 font-medium dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  <Share2 className="h-3 w-3 mr-1" />
                  Shared (Max 2)
                </Badge>
              )}
              {exclusivity === 'exclusive' && (
                <Badge variant="outline" className="h-6 px-2 text-[10px] border-amber-300 bg-amber-50 text-amber-700 font-medium dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                  <Star className="h-3 w-3 mr-1" />
                  Exclusive
                </Badge>
              )}
              
              {/* Urgency Tags */}
              {lead.urgency === 'immediate' && (
                <Badge className="h-6 px-2 text-[10px] bg-red-500 text-white border-0 font-semibold shadow-sm animate-pulse">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Urgent
                </Badge>
              )}
              {lead.urgency === 'within_week' && (
                <Badge className="h-6 px-2 text-[10px] bg-amber-500 text-white border-0 font-semibold shadow-sm">
                  <Clock className="h-3 w-3 mr-1" />
                  This Week
                </Badge>
              )}
              
              {/* Indicators */}
              {lead.email_verified && (
                <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center" title="Email verified">
                  <ShieldCheck className="h-3 w-3 text-green-600 dark:text-green-400" />
                </div>
              )}
              {lead.message && (
                <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center" title="Has message">
                  <MessageSquare className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Swipe Hint */}
        {!isLocked && !isSwipeRevealed && (
          <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none opacity-30">
            <div className="w-1 h-8 rounded-full bg-muted-foreground/50" />
          </div>
        )}
      </div>
    </div>
  );
}, arePropsEqual);
