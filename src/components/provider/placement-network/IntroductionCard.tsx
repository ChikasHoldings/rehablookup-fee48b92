import { useState } from "react";
import { Clock, CheckCircle2, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ProviderConfirmPlacementModal } from "@/components/provider/ProviderConfirmPlacementModal";
import { format } from "date-fns";

interface IntroductionCardProps {
  introduction: any;
  facilityId: string;
  onRespond: (response: string, notes?: string) => void;
  isResponding: boolean;
  showConfirmButton?: boolean;
  hasPro?: boolean;
}

export function IntroductionCard({
  introduction,
  facilityId,
  onRespond,
  isResponding,
  showConfirmButton = false,
  hasPro = false,
}: IntroductionCardProps) {
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const inquiry = introduction.concierge_inquiries;

  const seekerConfirmed = inquiry?.seeker_confirmed;

  return (
    <>
      <Card className={showConfirmButton 
        ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20" 
        : "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20"
      }>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              {showConfirmButton ? (
                <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50 mb-2">
                  <UserCheck className="h-3 w-3 mr-1" />
                  Seeker Confirmed Admission
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-100 dark:bg-amber-950/50 mb-2">
                  <Clock className="h-3 w-3 mr-1" />
                  New Introduction
                </Badge>
              )}
              <h3 className="font-semibold text-foreground">
                {inquiry?.user_name || `Case #${inquiry?.id?.slice(0, 8).toUpperCase()}`}
              </h3>
              <p className="text-sm text-muted-foreground">
                Received {format(new Date(introduction.created_at), "MMM d 'at' h:mm a")}
              </p>
            </div>
          </div>

          {/* Case Details */}
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <span className="text-muted-foreground">Level of Care:</span>
              <p className="font-medium capitalize">{inquiry?.level_of_care?.replace(/_/g, " ") || "—"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Payment:</span>
              <p className="font-medium capitalize">{inquiry?.payment_type?.replace(/_/g, " ") || "—"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Urgency:</span>
              <p className="font-medium capitalize">{inquiry?.timeline_urgency?.replace(/_/g, " ") || "—"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Location:</span>
              <p className="font-medium">{inquiry?.preferred_state || "Flexible"}</p>
            </div>
          </div>

          {/* Show seeker confirmation status */}
          {seekerConfirmed && !showConfirmButton && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-100 dark:bg-emerald-950/30 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              Seeker has confirmed they were admitted
            </div>
          )}

          {/* Response Actions or Confirm Action */}
          {showConfirmButton ? (
            <Button onClick={() => setConfirmModalOpen(true)} className="w-full gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Confirm Placement
            </Button>
          ) : (
            <>
              {showNotes && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Any notes about your availability or the case..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => onRespond("interested", notes)}
                  disabled={isResponding}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Interested
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!showNotes) {
                      setShowNotes(true);
                    } else {
                      onRespond("limited", notes);
                    }
                  }}
                  disabled={isResponding}
                >
                  Limited Availability
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRespond("not_available")}
                  disabled={isResponding}
                >
                  Not Available
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirm Placement Modal */}
      {inquiry && (
        <ProviderConfirmPlacementModal
          open={confirmModalOpen}
          onOpenChange={setConfirmModalOpen}
          inquiry={{
            id: inquiry.id,
            user_name: inquiry.user_name,
            seeker_confirmed: inquiry.seeker_confirmed,
          }}
          facilityId={facilityId}
          hasPro={hasPro}
        />
      )}
    </>
  );
}
