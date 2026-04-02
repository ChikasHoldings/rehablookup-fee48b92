import { useState, useEffect } from "react";
import { Clock, CheckCircle2, XCircle, Loader2, MapPin, AlertCircle, User, Calendar, Shield, Heart, Pill, DollarSign, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

// Proper type definitions
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
}: IntroductionCardProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const inquiry = introduction.concierge_inquiries;

  // Generate anonymized Case ID
  const caseId = `Case #${inquiry?.id?.slice(0, 8).toUpperCase() || introduction.id.slice(0, 8).toUpperCase()}`;

  // Extract first name only for anonymized display
  const firstName = inquiry?.user_name?.split(" ")[0] || "Client";

  const formatLabel = (value: string | null | undefined, fallback = "Not specified") => {
    if (!value) return fallback;
    return value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatUrgency = (urgency: string | null | undefined) => {
    if (!urgency) return "Flexible";
    const labels: Record<string, string> = {
      immediate: "Immediate",
      within_week: "Within 1 Week",
      within_month: "Within 1 Month",
      flexible: "Flexible",
    };
    return labels[urgency] || urgency.replace(/_/g, " ");
  };

  const formatCoOccurring = (concerns: unknown) => {
    if (!concerns) return null;
    if (Array.isArray(concerns)) return concerns.join(", ");
    if (typeof concerns === "object") {
      const entries = Object.entries(concerns as Record<string, boolean>).filter(([, v]) => v);
      return entries.map(([k]) => formatLabel(k)).join(", ");
    }
    return String(concerns);
  };

  const locationText = [inquiry?.preferred_city, inquiry?.preferred_state].filter(Boolean).join(", ") || "Flexible";
  const coOccurringText = formatCoOccurring(inquiry?.co_occurring_concerns);

  const handleAccept = () => {
    setIsAccepting(true);
    setIsDeclining(false);
    onRespond("interested");
  };

  const handleDecline = () => {
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

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
      <CardContent className="p-5 space-y-4">
        {/* Header with Case ID and Name */}
        <div className="flex items-start justify-between">
          <div>
            <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-100 dark:bg-amber-950/50 mb-2">
              <Clock className="h-3 w-3 mr-1" />
              Awaiting Response
            </Badge>
            <h3 className="font-semibold text-foreground text-lg">
              {caseId}
            </h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
              <User className="h-3.5 w-3.5" />
              {firstName} · Received {format(new Date(introduction.created_at), "MMM d 'at' h:mm a")}
            </p>
          </div>
        </div>

        {/* Primary Details Grid */}
        <div className="bg-background/50 rounded-lg p-4 space-y-3 border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Client Profile</p>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            {inquiry?.age_range && (
              <div className="space-y-0.5">
                <span className="text-muted-foreground text-xs uppercase tracking-wide flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Age Range
                </span>
                <p className="font-medium">{formatLabel(inquiry.age_range)}</p>
              </div>
            )}
            {inquiry?.gender && (
              <div className="space-y-0.5">
                <span className="text-muted-foreground text-xs uppercase tracking-wide flex items-center gap-1">
                  <User className="h-3 w-3" /> Gender
                </span>
                <p className="font-medium">{formatLabel(inquiry.gender)}</p>
              </div>
            )}
            <div className="space-y-0.5">
              <span className="text-muted-foreground text-xs uppercase tracking-wide flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Location Preference
              </span>
              <p className="font-medium">{locationText}</p>
            </div>
          </div>
        </div>

        {/* Clinical Details Grid */}
        <div className="bg-background/50 rounded-lg p-4 space-y-3 border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Clinical Summary</p>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="space-y-0.5">
              <span className="text-muted-foreground text-xs uppercase tracking-wide flex items-center gap-1">
                <Activity className="h-3 w-3" /> Level of Care
              </span>
              <p className="font-medium">{formatLabel(inquiry?.level_of_care)}</p>
            </div>
            {inquiry?.primary_concern && (
              <div className="space-y-0.5">
                <span className="text-muted-foreground text-xs uppercase tracking-wide flex items-center gap-1">
                  <Heart className="h-3 w-3" /> Primary Concern
                </span>
                <p className="font-medium">{formatLabel(inquiry.primary_concern)}</p>
              </div>
            )}
            {inquiry?.detox_needed && (
              <div className="space-y-0.5">
                <span className="text-muted-foreground text-xs uppercase tracking-wide flex items-center gap-1">
                  <Pill className="h-3 w-3" /> Detox Needed
                </span>
                <p className="font-medium">{formatLabel(inquiry.detox_needed)}</p>
              </div>
            )}
            {inquiry?.substance_use_duration && (
              <div className="space-y-0.5">
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Duration of Use</span>
                <p className="font-medium">{formatLabel(inquiry.substance_use_duration)}</p>
              </div>
            )}
            {coOccurringText && (
              <div className="space-y-0.5 sm:col-span-2">
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Co-Occurring Concerns</span>
                <p className="font-medium">{coOccurringText}</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment & Insurance */}
        <div className="bg-background/50 rounded-lg p-4 border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment & Coverage</p>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div className="space-y-0.5">
              <span className="text-muted-foreground text-xs uppercase tracking-wide flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Payment Type
              </span>
              <p className="font-medium">{formatLabel(inquiry?.payment_type)}</p>
            </div>
            {inquiry?.insurance_carrier && (
              <div className="space-y-0.5">
                <span className="text-muted-foreground text-xs uppercase tracking-wide flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Insurance
                </span>
                <p className="font-medium">{inquiry.insurance_carrier}</p>
              </div>
            )}
            {inquiry?.budget_range && (
              <div className="space-y-0.5">
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Budget Range</span>
                <p className="font-medium">{formatLabel(inquiry.budget_range)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Urgency Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Timeline:</span>
          <Badge variant={inquiry?.timeline_urgency === "immediate" ? "destructive" : "secondary"} className="text-xs">
            {formatUrgency(inquiry?.timeline_urgency)}
          </Badge>
        </div>

        {/* Fee Notice */}
        <div className="bg-muted/50 rounded-lg p-3 text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-muted-foreground">
              <strong className="text-foreground">Placement fee applies</strong> only when admission is confirmed by RehabLookup. 
              {hasPro ? " Pro discount: $800" : " Standard: $1,000"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            className="flex-1 gap-2"
            onClick={handleAccept}
            disabled={isResponding}
          >
            {isAccepting && isResponding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Accept Candidate
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={handleDecline}
            disabled={isResponding}
          >
            {isDeclining && isResponding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Decline
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
