import { format } from "date-fns";
import { motion } from "framer-motion";
import { 
  Clock, 
  Search, 
  Users, 
  Send, 
  CheckCircle, 
  XCircle,
  MessageCircle,
  Calendar,
  MapPin,
  CreditCard,
  Sparkles
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PlacementStatusCardProps {
  caseData: {
    id: string;
    status: string;
    created_at: string;
    level_of_care: string | null;
    payment_type: string | null;
    insurance_carrier: string | null;
    timeline_urgency: string | null;
    preferred_state: string | null;
    preferred_city: string | null;
  };
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string; bgColor: string }> = {
  new: { label: "Submitted", icon: Clock, color: "text-primary", bgColor: "bg-primary" },
  pending: { label: "Submitted", icon: Clock, color: "text-primary", bgColor: "bg-primary" },
  reviewing: { label: "Under Review", icon: Search, color: "text-warning", bgColor: "bg-warning" },
  matching: { label: "Finding Treatment Options", icon: Users, color: "text-primary", bgColor: "bg-primary" },
  matched: { label: "Facilities Found", icon: Users, color: "text-primary", bgColor: "bg-primary" },
  introductions_sent: { label: "Introductions Sent", icon: Send, color: "text-primary", bgColor: "bg-primary" },
  in_contact: { label: "In Contact", icon: MessageCircle, color: "text-primary", bgColor: "bg-primary" },
  confirming: { label: "Awaiting Confirmation", icon: Clock, color: "text-warning", bgColor: "bg-warning" },
  placed: { label: "Successfully Placed", icon: CheckCircle, color: "text-success", bgColor: "bg-success" },
  closed: { label: "Closed", icon: XCircle, color: "text-muted-foreground", bgColor: "bg-muted" },
};

const TIMELINE_STEPS = ["new", "reviewing", "matching", "matched", "introductions_sent", "in_contact", "placed"];

export function PlacementStatusCard({ caseData }: PlacementStatusCardProps) {
  const config = STATUS_CONFIG[caseData.status] || STATUS_CONFIG.new;
  const StatusIcon = config.icon;
  const currentIndex = TIMELINE_STEPS.indexOf(caseData.status);
  const effectiveIndex = caseData.status === "confirming" ? TIMELINE_STEPS.indexOf("in_contact") + 0.5 : currentIndex;
  const progress = Math.min(100, (effectiveIndex / (TIMELINE_STEPS.length - 1)) * 100);

  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card via-card to-primary/5">
      <CardContent className="p-0">
        {/* Header Section */}
        <div className="relative p-4 sm:p-6 pb-3 sm:pb-4">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full" />
          
          <div className="relative flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                <span>Case</span>
                <span className="font-mono text-[10px] sm:text-xs bg-muted px-1.5 py-0.5 rounded">
                  #{caseData.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={cn("p-1.5 sm:p-2 rounded-lg sm:rounded-xl", config.bgColor)}>
                  <StatusIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className={cn("text-base sm:text-xl font-semibold truncate", config.color)}>
                    {config.label}
                  </h2>
                  <p className="text-[11px] sm:text-sm text-muted-foreground">
                    Submitted {format(new Date(caseData.created_at), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            </div>
            
            {caseData.status === "placed" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full shrink-0"
              >
                <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[10px] sm:text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Complete
                </span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Progress Timeline */}
        {caseData.status !== "closed" && (
          <div className="px-4 sm:px-6 pb-3 sm:pb-4">
            <div className="relative">
              {/* Background track */}
              <div className="h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              
              {/* Step indicators */}
              <div className="flex justify-between mt-2 sm:mt-3">
                {TIMELINE_STEPS.map((step, index) => {
                  const stepConfig = STATUS_CONFIG[step];
                  const isCompleted = index < effectiveIndex;
                  const isCurrent = step === caseData.status || (caseData.status === "confirming" && step === "in_contact");
                  
                  return (
                    <div key={step} className="flex flex-col items-center">
                      <div 
                        className={cn(
                          "w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-300",
                          isCompleted && "bg-primary",
                          isCurrent && "bg-primary ring-2 sm:ring-4 ring-primary/20",
                          !isCompleted && !isCurrent && "bg-muted-foreground/30"
                        )}
                      />
                      <span className={cn(
                        "text-[8px] sm:text-[10px] mt-1 sm:mt-1.5 text-center max-w-[40px] sm:max-w-[50px] leading-tight hidden sm:block",
                        isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                      )}>
                        {stepConfig?.label?.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Case Details */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-3 sm:pt-4 border-t">
            {caseData.level_of_care && (
              <DetailItem 
                icon={<Users className="h-3 w-3" />}
                label="Care Type"
                value={caseData.level_of_care.replace(/_/g, ' ')}
              />
            )}
            <DetailItem 
              icon={<CreditCard className="h-3 w-3" />}
              label="Payment"
              value={caseData.payment_type === "insurance" 
                ? caseData.insurance_carrier || "Insurance"
                : caseData.payment_type?.replace(/_/g, ' ') || "Not set"}
            />
            {caseData.timeline_urgency && (
              <DetailItem 
                icon={<Calendar className="h-3 w-3" />}
                label="Timeline"
                value={caseData.timeline_urgency.replace(/_/g, ' ')}
              />
            )}
            {(caseData.preferred_city || caseData.preferred_state) && (
              <DetailItem 
                icon={<MapPin className="h-3 w-3" />}
                label="Location"
                value={[caseData.preferred_city, caseData.preferred_state].filter(Boolean).join(", ")}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className="text-xs sm:text-sm font-medium capitalize truncate">{value}</p>
    </div>
  );
}
