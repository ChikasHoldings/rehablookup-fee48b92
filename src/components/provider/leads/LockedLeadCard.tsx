import { Lock, Sparkles, Phone, Mail, Clock, Zap, Building2, Timer, Flame, Eye, Users, MapPin, Heart, Shield, DollarSign, CalendarClock, UserCheck, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { UnlockLeadButton } from "@/components/provider/UnlockLeadButton";
import { useLeadCountdown } from "@/hooks/useLeadCountdown";
import { useProStatus } from "@/hooks/useProStatus";

interface LockedLeadCardProps {
  leadId: string;
  facilityId: string;
  name: string;
  createdAt: string;
  urgency?: string | null;
  source?: string | null;
  facilityName?: string;
  showFacility?: boolean;
  isRedistributed?: boolean;
  onClick?: () => void;
  isSelected?: boolean;
  onUnlockSuccess?: () => void;
  // Smart preview fields
  locationCityState?: string | null;
  locationZip?: string | null;
  primarySubstance?: string[] | null;
  levelOfCare?: string | null;
  insuranceType?: string | null;
  insuranceProvider?: string | null;
  budgetPreference?: string | null;
  ageRange?: string | null;
  gender?: string | null;
  dualDiagnosis?: string | null;
  preferredContact?: string | null;
}

const URGENCY_LABELS: Record<string, { label: string; color: string; icon: typeof Zap }> = {
  immediate: { label: "Needs help now", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400", icon: Zap },
  within_week: { label: "Within this week", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400", icon: CalendarClock },
  within_month: { label: "Within 30 days", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400", icon: CalendarClock },
  flexible: { label: "Flexible timeline", color: "bg-muted text-muted-foreground", icon: Clock },
};

function formatSubstances(substances: string[]): string {
  if (substances.length === 0) return "";
  if (substances.length === 1) return substances[0];
  return `${substances[0]} +${substances.length - 1} more`;
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
  isRedistributed,
  onClick,
  isSelected,
  onUnlockSuccess,
  locationCityState,
  locationZip,
  primarySubstance,
  levelOfCare,
  insuranceType,
  insuranceProvider,
  budgetPreference,
  ageRange,
  gender,
  dualDiagnosis,
  preferredContact,
}: LockedLeadCardProps) {
  const initial = name.charAt(0).toUpperCase();
  const blurredName = `${initial}${"●".repeat(Math.min(name.length - 1, 8))}`;
  const countdown = useLeadCountdown(createdAt);
  const { data: proStatus } = useProStatus(facilityId);
  const isPro = proStatus?.isPro ?? false;
  const location = locationCityState || (locationZip ? `ZIP: ${locationZip}` : null);
  const urgencyInfo = urgency ? URGENCY_LABELS[urgency] : null;
  const insuranceHint = insuranceProvider || insuranceType;
  const demographicHint = [ageRange, gender].filter(Boolean).join(" · ");

  return (
    <div
      className={cn(
        "relative group p-4 border rounded-lg transition-all",
        "bg-muted/30 hover:bg-muted/50 border-muted-foreground/20",
        isSelected && "ring-2 ring-primary bg-primary/5"
      )}
    >
      {/* Top badges row */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5">
        {isRedistributed && (
          <Badge variant="outline" className="gap-1 h-5 text-[10px] px-1.5 border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700">
            <Flame className="h-2.5 w-2.5" />
            Shared
          </Badge>
        )}
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
          {/* Blurred name + contact */}
          <p className="font-medium text-foreground/60 blur-[3px] select-none text-sm">
            {blurredName}
          </p>
          <div className="flex items-center gap-3 mt-1 text-muted-foreground/50">
            <span className="flex items-center gap-1 text-[11px] blur-[2px]">
              <Phone className="h-3 w-3" />
              (●●●) ●●●-●●●●
            </span>
            <span className="flex items-center gap-1 text-[11px] blur-[2px]">
              <Mail className="h-3 w-3" />
              ●●●@●●●.com
            </span>
          </div>

          {/* ── Smart Preview Details (visible) ── */}
          <div className="mt-2.5 space-y-1.5">
            {/* Location */}
            {location && (
              <div className="flex items-center gap-1.5 text-xs text-foreground">
                <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="font-medium">{location}</span>
              </div>
            )}

            {/* Treatment type / substances */}
            {((primarySubstance && primarySubstance.length > 0) || levelOfCare) && (
              <div className="flex items-center gap-1.5 text-xs text-foreground">
                <Heart className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span>
                  {primarySubstance && primarySubstance.length > 0 && (
                    <span className="font-medium">{formatSubstances(primarySubstance)}</span>
                  )}
                  {primarySubstance && primarySubstance.length > 0 && levelOfCare && " · "}
                  {levelOfCare && <span className="text-muted-foreground">{levelOfCare}</span>}
                </span>
              </div>
            )}

            {/* Dual Diagnosis */}
            {dualDiagnosis && dualDiagnosis !== "no" && (
              <div className="flex items-center gap-1.5 text-xs text-foreground">
                <Shield className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span>Dual Diagnosis: <span className="font-medium">Yes</span></span>
              </div>
            )}

            {/* Insurance / Budget hint */}
            {(insuranceHint || budgetPreference) && (
              <div className="flex items-center gap-1.5 text-xs text-foreground">
                <DollarSign className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span>
                  {insuranceHint && <span className="font-medium">{insuranceHint}</span>}
                  {insuranceHint && budgetPreference && " · "}
                  {budgetPreference && <span className="text-muted-foreground">{budgetPreference}</span>}
                </span>
              </div>
            )}

            {/* Demographics hint */}
            {demographicHint && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <UserCheck className="h-3 w-3 flex-shrink-0" />
                <span>{demographicHint}</span>
              </div>
            )}
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {showFacility && facilityName && (
              <Badge variant="outline" className="h-5 text-[10px] px-1.5 border-primary/30 bg-primary/5 text-primary font-medium">
                <Building2 className="h-2.5 w-2.5 mr-0.5" />
                {facilityName.length > 12 ? facilityName.slice(0, 12) + "..." : facilityName}
              </Badge>
            )}

            {/* Urgency Badge */}
            {urgencyInfo && (
              <Badge className={cn("h-5 text-[10px] px-1.5 border-0", urgencyInfo.color, urgency === "immediate" && "animate-pulse")}>
                <urgencyInfo.icon className="h-2.5 w-2.5 mr-0.5" />
                {urgencyInfo.label}
              </Badge>
            )}

            {source === "Request Help Page" && (
              <Badge className="bg-primary/10 text-primary border-0 h-5 text-[10px] px-1.5">
                <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                Qualified
              </Badge>
            )}

            {preferredContact === "call" && (
              <Badge variant="outline" className="h-5 text-[10px] px-1.5 border-green-300 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">
                <Phone className="h-2.5 w-2.5 mr-0.5" />
                Wants callback
              </Badge>
            )}

            <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </span>
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

          {/* Scarcity / FOMO Signals */}
          {isRedistributed ? (
            <div className="mt-1.5 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                <Users className="h-3 w-3" />
                ⚠️ Limited availability — max 2 providers only
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-orange-600 dark:text-orange-400">
                <Eye className="h-3 w-3" />
                👀 Another provider may have already seen this lead
              </div>
            </div>
          ) : !countdown.isExpired && countdown.urgencyTier !== "safe" && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-orange-600 dark:text-orange-400">
              <Flame className="h-3 w-3" />
              🔥 This lead may be shared with others if not unlocked
            </div>
          )}

          {/* Pro upgrade nudge for Free providers */}
          {!isPro && (
            <Link
              to="/provider/pro-upgrade"
              className="mt-2 flex items-center gap-1.5 text-[11px] text-primary hover:text-primary/80 transition-colors font-medium"
            >
              <Star className="h-3 w-3" />
              Upgrade to Pro — save 20% on unlocks &amp; get priority leads
            </Link>
          )}
        </div>
      
      {/* Unlock CTA */}
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
