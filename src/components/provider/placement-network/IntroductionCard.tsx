import { useState, useEffect } from "react";
import { Clock, CheckCircle2, XCircle, Loader2, MapPin, AlertCircle } from "lucide-react";
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
  status?: string;
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

  // Format care level for display
  const formatCareLevel = (level: string | null) => {
    if (!level) return "Not specified";
    return level.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Format payment type for display
  const formatPayment = (type: string | null) => {
    if (!type) return "Not specified";
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Format urgency for display
  const formatUrgency = (urgency: string | null) => {
    if (!urgency) return "Flexible";
    const labels: Record<string, string> = {
      immediate: "Immediate",
      within_week: "Within 1 Week",
      within_month: "Within 1 Month",
      flexible: "Flexible",
    };
    return labels[urgency] || urgency.replace(/_/g, " ");
  };

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

  // Reset loading states when mutation completes
  useEffect(() => {
    if (!isResponding) {
      setIsAccepting(false);
      setIsDeclining(false);
    }
  }, [isResponding]);

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
      <CardContent className="p-5 space-y-4">
        {/* Header with Case ID */}
        <div className="flex items-start justify-between">
          <div>
            <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-100 dark:bg-amber-950/50 mb-2">
              <Clock className="h-3 w-3 mr-1" />
              Awaiting Response
            </Badge>
            <h3 className="font-semibold text-foreground text-lg">
              {caseId}
            </h3>
            <p className="text-sm text-muted-foreground">
              Received {format(new Date(introduction.created_at), "MMM d 'at' h:mm a")}
            </p>
          </div>
        </div>

        {/* Anonymized Case Details */}
        <div className="bg-background/50 rounded-lg p-4 space-y-3 border">
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Level of Care</span>
              <p className="font-medium">{formatCareLevel(inquiry?.level_of_care)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Payment</span>
              <p className="font-medium">{formatPayment(inquiry?.payment_type)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Urgency</span>
              <p className="font-medium">{formatUrgency(inquiry?.timeline_urgency)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Location Preference</span>
              <p className="font-medium flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {inquiry?.preferred_state || "Flexible"}
              </p>
            </div>
          </div>
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

        {/* Action Buttons - Accept or Decline ONLY */}
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
