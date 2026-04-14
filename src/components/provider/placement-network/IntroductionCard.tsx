import { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  MapPin,
  User,
  Calendar,
  Shield,
  Heart,
  Pill,
  DollarSign,
  Activity,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useSelectedFacilityOptional } from "@/contexts/SelectedFacilityContext";
import { useMatchScore, MatchScoreBadge } from "./MatchScoreUtils";

interface ConciergeInquiry {
  id: string;
  user_name?: string;
  level_of_care?: string | null;
  payment_type?: string | null;
  timeline_urgency?: string | null;
  preferred_state?: string | null;
  preferred_city?: string | null;
  status?: string;
  age_range?: string | null;
  gender?: string | null;
  primary_concern?: string | null;
  insurance_carrier?: string | null;
  detox_needed?: string | null;
  co_occurring_concerns?: unknown | null;
  substance_use_duration?: string | null;
  budget_range?: string | null;
  seeker_confirmed?: boolean;
  seeker_confirmed_at?: string | null;
  placement_confirmed?: boolean;
  placement_confirmed_at?: string | null;
  placed_facility_id?: string | null;
}

interface Introduction {
  id: string;
  facility_id: string;
  inquiry_id: string;
  created_at: string;
  provider_response?: string | null;
  provider_responded_at?: string | null;
  provider_notes?: string | null;
  concierge_inquiries?: ConciergeInquiry | null;
}

interface IntroductionCardProps {
  introduction: Introduction;
  facilityId: string;
  onRespond: (response: string, notes?: string) => void;
  isResponding: boolean;
  hasPro?: boolean;
  onClick?: () => void;
}

export function IntroductionCard({
  introduction,
  facilityId,
  onRespond,
  isResponding,
  hasPro = false,
  onClick,
}: IntroductionCardProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const inquiry = introduction.concierge_inquiries;
  const { selectedFacility } = useSelectedFacilityOptional();
  const matchScore = useMatchScore(selectedFacility, inquiry);

  const caseId = `Case #${inquiry?.id?.slice(0, 8).toUpperCase() || introduction.id.slice(0, 8).toUpperCase()}`;
  const firstName = inquiry?.user_name?.split(" ")[0] || "Client";

  const fmt = (value: string | null | undefined, fallback = "—") => {
    if (!value) return fallback;
    return value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const urgencyLabel = (u: string | null | undefined) => {
    const map: Record<string, string> = {
      immediate: "Immediate",
      within_week: "Within 1 Week",
      within_month: "Within 1 Month",
      flexible: "Flexible",
    };
    return map[u || ""] || "Flexible";
  };

  const formatCoOccurring = (concerns: unknown) => {
    if (!concerns) return null;
    if (Array.isArray(concerns)) return concerns.join(", ");
    if (typeof concerns === "object") {
      return Object.entries(concerns as Record<string, boolean>)
        .filter(([, v]) => v)
        .map(([k]) => fmt(k))
        .join(", ");
    }
    return String(concerns);
  };

  const location = [inquiry?.preferred_city, inquiry?.preferred_state].filter(Boolean).join(", ") || "Flexible";
  const coOccurring = formatCoOccurring(inquiry?.co_occurring_concerns);

  const handleAccept = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAccepting(true);
    setIsDeclining(false);
    onRespond("interested");
  };

  const handleDecline = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeclining(true);
    setIsAccepting(false);
    onRespond("not_available");
  };

  useEffect(() => {
    if (!isResponding) {
      setIsAccepting(false);
      setIsDeclining(false);
    }
  }, [isResponding]);

  // Collect detail items for the grid
  const detailItems: { icon: React.ReactNode; label: string; value: string }[] = [];
  if (inquiry?.age_range) detailItems.push({ icon: <Calendar className="h-3 w-3" />, label: "Age", value: fmt(inquiry.age_range) });
  if (inquiry?.gender) detailItems.push({ icon: <User className="h-3 w-3" />, label: "Gender", value: fmt(inquiry.gender) });
  detailItems.push({ icon: <MapPin className="h-3 w-3" />, label: "Location", value: location });
  detailItems.push({ icon: <Activity className="h-3 w-3" />, label: "Care Level", value: fmt(inquiry?.level_of_care) });
  if (inquiry?.primary_concern) detailItems.push({ icon: <Heart className="h-3 w-3" />, label: "Concern", value: fmt(inquiry.primary_concern) });
  if (inquiry?.insurance_carrier) detailItems.push({ icon: <Shield className="h-3 w-3" />, label: "Insurance", value: inquiry.insurance_carrier });

  const extendedItems: { label: string; value: string }[] = [];
  if (inquiry?.detox_needed) extendedItems.push({ label: "Detox Needed", value: fmt(inquiry.detox_needed) });
  if (inquiry?.substance_use_duration) extendedItems.push({ label: "Duration of Use", value: fmt(inquiry.substance_use_duration) });
  if (inquiry?.payment_type) extendedItems.push({ label: "Payment", value: fmt(inquiry.payment_type) });
  if (inquiry?.budget_range) extendedItems.push({ label: "Budget", value: fmt(inquiry.budget_range) });
  if (coOccurring) extendedItems.push({ label: "Co-Occurring", value: coOccurring });

  return (
    <Card
      className="border hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* ─── Header ─── */}
        <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">{caseId}</h3>
              <MatchScoreBadge score={matchScore} size="compact" />
              <Badge
                variant={inquiry?.timeline_urgency === "immediate" ? "destructive" : "secondary"}
                className="text-xs h-5"
              >
                <Clock className="h-3 w-3 mr-0.5" />
                {urgencyLabel(inquiry?.timeline_urgency)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {firstName} · {format(new Date(introduction.created_at), "MMM d 'at' h:mm a")}
            </p>
          </div>
          {(!introduction.provider_response || introduction.provider_response === "pending") ? (
            <Badge variant="outline" className="border-amber-300 text-amber-600 dark:text-amber-400 text-xs shrink-0">
              Awaiting Response
            </Badge>
          ) : introduction.provider_response === "interested" ? (
            <Badge variant="outline" className="border-emerald-300 text-emerald-600 dark:text-emerald-400 text-xs shrink-0">
              Accepted
            </Badge>
          ) : (
            <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground text-xs shrink-0">
              Declined
            </Badge>
          )}
        </div>

        <Separator />

        {/* ─── Key Details Grid ─── */}
        <div className="px-4 sm:px-5 py-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
            {detailItems.map((item, i) => (
              <div key={i} className="min-w-0">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                  {item.icon} {item.label}
                </span>
                <p className="text-sm font-medium text-foreground truncate mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Expandable Extended Details ─── */}
        {extendedItems.length > 0 && (
          <>
            <div
              className="px-4 sm:px-5 py-2 flex items-center gap-1.5 cursor-pointer hover:bg-muted/30 transition-colors border-t"
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            >
              <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
              <span className="text-xs text-muted-foreground font-medium">
                {expanded ? "Less details" : "More details"}
              </span>
            </div>
            {expanded && (
              <div className="px-4 sm:px-5 pb-3 pt-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
                  {extendedItems.map((item, i) => (
                    <div key={i} className={cn("min-w-0", item.label === "Co-Occurring" && "col-span-2 sm:col-span-3")}>
                      <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{item.label}</span>
                      <p className="text-sm font-medium text-foreground mt-0.5">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── Speed Nudge ─── */}
        <div className="px-4 sm:px-5 py-1.5 bg-primary/5 border-t flex items-center gap-1.5 text-xs text-primary font-medium">
          <span>⚡</span>
          <span>Faster response increases admission chances</span>
        </div>

        {/* ─── Action Bar ─── */}
        <div className="px-4 sm:px-5 py-3 bg-muted/20 border-t flex gap-3" onClick={(e) => e.stopPropagation()}>
          <Button
            className="flex-1 h-9 gap-1.5 text-sm"
            onClick={handleAccept}
            disabled={isResponding}
          >
            {isAccepting && isResponding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Accept
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-9 gap-1.5 text-sm"
            onClick={handleDecline}
            disabled={isResponding}
          >
            {isDeclining && isResponding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            Decline
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
