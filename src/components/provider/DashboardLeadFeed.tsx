import { useMemo } from "react";
import { useLeadContactTracking } from "@/hooks/useLeadContactTracking";
import { Link } from "react-router-dom";
import {
  Lock,
  Unlock,
  Phone,
  Mail,
  MapPin,
  Timer,
  Flame,
  Zap,
  Clock,
  Building2,
  ChevronRight,
  Users,
  Sparkles,
  Crown,
  CalendarClock,
  Heart,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { LeadStatusBadge, type LeadStatus } from "@/components/provider/leads/LeadStatusBadge";
import { UnlockLeadButton } from "@/components/provider/UnlockLeadButton";
import { useLeadCountdown } from "@/hooks/useLeadCountdown";
import type { Lead } from "@/components/provider/leads/LeadDetailPanel";

interface DashboardLeadFeedProps {
  leads: Lead[];
  unlockedLeadIds: Set<string>;
  facilityId: string;
  facilityName?: string;
  isPro: boolean;
  isLoading: boolean;
  onLeadClick: (lead: Lead) => void;
}

// Compute lead score label from available fields
function getLeadScoreInfo(lead: Lead): { label: string; color: string; icon: typeof Flame } {
  let score = 0;
  if (lead.urgency === "immediate" || lead.urgency === "Urgent" || lead.urgency === "Immediately") score += 30;
  else if (lead.urgency === "within_week" || lead.urgency === "This week") score += 20;
  else if (lead.urgency === "within_month" || lead.urgency === "This month") score += 10;
  if (lead.level_of_care?.toLowerCase().includes("residential") || lead.level_of_care?.toLowerCase().includes("detox")) score += 15;
  else if (lead.level_of_care?.toLowerCase().includes("php") || lead.level_of_care?.toLowerCase().includes("iop")) score += 10;
  if (lead.insurance_type && lead.insurance_type !== "None" && lead.insurance_type !== "") score += 10;
  if (lead.inquiry_type === "request_callback") score += 15;
  else if (lead.inquiry_type === "request_info") score += 8;
  if (lead.message && lead.message.length > 50) score += 5;

  if (score >= 40) return { label: "Hot", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400", icon: Flame };
  if (score >= 20) return { label: "Warm", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400", icon: Zap };
  return { label: "Cold", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400", icon: Clock };
}

const URGENCY_CONFIG: Record<string, { label: string; class: string }> = {
  immediate: { label: "Urgent", class: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 animate-pulse" },
  Immediately: { label: "Urgent", class: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 animate-pulse" },
  Urgent: { label: "Urgent", class: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 animate-pulse" },
  within_week: { label: "This Week", class: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  "This week": { label: "This Week", class: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  within_month: { label: "This Month", class: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
  "This month": { label: "This Month", class: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
};

export function DashboardLeadFeed({
  leads,
  unlockedLeadIds,
  facilityId,
  facilityName,
  isPro,
  isLoading,
  onLeadClick,
}: DashboardLeadFeedProps) {
  const { trackContact } = useLeadContactTracking();
  return (
    <Card>
      <CardHeader className="p-3 sm:p-4 pb-2 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Lead Feed</CardTitle>
            {leads.length > 0 && (
              <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                {leads.length}
              </Badge>
            )}
          </div>
          {leads.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2.5" asChild>
              <Link to="/provider/inquiries">
                View All <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-3 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 rounded-lg border space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-8 px-4">
            <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">No leads yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Leads appear when families reach out through your listing
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {leads.map((lead) => {
              const isUnlocked = unlockedLeadIds.has(lead.id);
              return isUnlocked ? (
                <UnlockedLeadRow
                  key={lead.id}
                  lead={lead}
                  facilityName={facilityName}
                  onClick={() => onLeadClick(lead)}
                />
              ) : (
                <LockedLeadRow
                  key={lead.id}
                  lead={lead}
                  facilityId={facilityId}
                  facilityName={facilityName}
                  isPro={isPro}
                  onClick={() => onLeadClick(lead)}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Unlocked Lead Row ──
function UnlockedLeadRow({
  lead,
  facilityName,
  onClick,
}: {
  lead: Lead;
  facilityName?: string;
  onClick: () => void;
}) {
  const { trackContact } = useLeadContactTracking();
  const location = lead.location_city_state || (lead.location_zip ? `ZIP: ${lead.location_zip}` : null);
  const scoreInfo = getLeadScoreInfo(lead);

  return (
    <div
      onClick={onClick}
      className="p-3 sm:p-4 hover:bg-muted/50 transition-colors cursor-pointer"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-primary">
            {lead.name.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate">{lead.name}</p>
            <LeadStatusBadge status={lead.status as LeadStatus} size="sm" />
            <Badge className={cn("h-5 text-[10px] px-1.5 border-0", scoreInfo.color)}>
              <scoreInfo.icon className="h-2.5 w-2.5 mr-0.5" />
              {scoreInfo.label}
            </Badge>
          </div>

          {/* Location + Facility */}
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
            {facilityName && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {facilityName}
              </span>
            )}
            {location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {location}
              </span>
            )}
          </div>

          {/* Contact Actions */}
          <div className="flex items-center gap-2 mt-2.5">
            {lead.phone && lead.phone !== "••••••••••" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                onClick={(e) => {
                  e.stopPropagation();
                  trackContact(lead.id, lead.facility_id, "call");
                  window.open(`tel:${lead.phone}`, "_self");
                }}
              >
                <Phone className="h-3 w-3" />
                Call Now
              </Button>
            )}
            {lead.email && lead.email !== "••••••••••" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30"
                onClick={(e) => {
                  e.stopPropagation();
                  trackContact(lead.id, lead.facility_id, "email");
                  window.open(`mailto:${lead.email}`, "_blank");
                }}
              >
                <Mail className="h-3 w-3" />
                Send Email
              </Button>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 mt-3 shrink-0" />
      </div>
    </div>
  );
}

// ── Locked Lead Row ──
function LockedLeadRow({
  lead,
  facilityId,
  facilityName,
  isPro,
  onClick,
}: {
  lead: Lead;
  facilityId: string;
  facilityName?: string;
  isPro: boolean;
  onClick: () => void;
}) {
  const initial = lead.name.charAt(0).toUpperCase();
  const blurredName = `${initial}${"●".repeat(Math.min(lead.name.length - 1, 6))}`;
  const location = lead.location_city_state || (lead.location_zip ? `ZIP: ${lead.location_zip}` : null);
  const scoreInfo = getLeadScoreInfo(lead);
  const urgencyConfig = lead.urgency ? URGENCY_CONFIG[lead.urgency] : null;

  return (
    <div
      onClick={onClick}
      className="p-3 sm:p-4 hover:bg-muted/30 transition-colors cursor-pointer relative"
    >
      <div className="flex items-start gap-3">
        {/* Blurred Avatar */}
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 relative">
          <span className="text-sm font-semibold text-muted-foreground blur-[2px]">{initial}</span>
          <Lock className="h-3 w-3 text-warning absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5 border" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Row 1: Name + Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-medium text-foreground/60 blur-[2px] select-none">{blurredName}</p>
            <Badge variant="secondary" className="gap-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 h-5 text-[10px] px-1.5">
              <Lock className="h-2.5 w-2.5" />
              Locked
            </Badge>
            <Badge className={cn("h-5 text-[10px] px-1.5 border-0", scoreInfo.color)}>
              <scoreInfo.icon className="h-2.5 w-2.5 mr-0.5" />
              {scoreInfo.label}
            </Badge>
            {urgencyConfig && (
              <Badge className={cn("h-5 text-[10px] px-1.5 border-0", urgencyConfig.class)}>
                {urgencyConfig.label}
              </Badge>
            )}
          </div>

          {/* Row 2: Facility + Location */}
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
            {facilityName && (
              <span className="flex items-center gap-1 font-medium text-foreground/80">
                <Building2 className="h-3 w-3 text-primary" />
                {facilityName}
              </span>
            )}
            {location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {location}
              </span>
            )}
            {lead.level_of_care && (
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {lead.level_of_care}
              </span>
            )}
          </div>

          {/* Row 3: Blurred contact */}
          <div className="flex items-center gap-3 mt-1 text-muted-foreground/40">
            <span className="flex items-center gap-1 text-[11px] blur-[2px]">
              <Phone className="h-3 w-3" /> (●●●) ●●●-●●●●
            </span>
            <span className="flex items-center gap-1 text-[11px] blur-[2px]">
              <Mail className="h-3 w-3" /> ●●●@●●●.com
            </span>
          </div>

          {/* Row 4: Countdown + Unlock CTA */}
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <LeadCountdownBadge createdAt={lead.created_at} />
            
            <div className="ml-auto flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <UnlockLeadButton
                leadId={lead.id}
                facilityId={facilityId}
                leadName={blurredName}
                inquiryType={lead.inquiry_type}
                cityState={lead.location_city_state}
                variant="compact"
              />
            </div>
          </div>

          {/* Pro upgrade nudge for Free users */}
          {!isPro && (
            <Link
              to="/provider/pro-upgrade"
              className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              <Crown className="h-3 w-3" />
              Upgrade to Pro and save 20% on this lead
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// Small countdown badge component (doesn't use hooks conditionally)
function LeadCountdownBadge({ createdAt }: { createdAt: string }) {
  const countdown = useLeadCountdown(createdAt);

  return (
    <div className={cn(
      "flex items-center gap-1 text-[10px] font-mono font-semibold rounded px-1.5 py-0.5",
      countdown.urgencyTier === "critical" && "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 animate-pulse",
      countdown.urgencyTier === "warning" && "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
      countdown.urgencyTier === "safe" && "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    )}>
      <Timer className="h-3 w-3" />
      {countdown.isExpired ? "Expired" : `⏳ ${countdown.formatted}`}
    </div>
  );
}
