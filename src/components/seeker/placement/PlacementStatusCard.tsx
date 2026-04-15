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
  Sparkles,
  ClipboardCheck,
  UserCheck,
  Building2,
  Eye,
  Home,
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
  intake_submitted: { label: "Submitted", icon: Clock, color: "text-primary", bgColor: "bg-primary" },
  intake_reviewed: { label: "Under Review", icon: Search, color: "text-warning", bgColor: "bg-warning" },
  advisor_assigned: { label: "Advisor Assigned", icon: UserCheck, color: "text-primary", bgColor: "bg-primary" },
  matching_providers: { label: "Finding Treatment Options", icon: Users, color: "text-primary", bgColor: "bg-primary" },
  provider_prequalification: { label: "Verifying Providers", icon: Users, color: "text-primary", bgColor: "bg-primary" },
  providers_accepted: { label: "Providers Confirmed", icon: Users, color: "text-primary", bgColor: "bg-primary" },
  presented_to_seeker: { label: "Options Ready for Review", icon: Send, color: "text-primary", bgColor: "bg-primary" },
  seeker_selected: { label: "Selection Made", icon: Eye, color: "text-primary", bgColor: "bg-primary" },
  admission_in_progress: { label: "Admission in Progress", icon: Building2, color: "text-primary", bgColor: "bg-primary" },
  admitted: { label: "Successfully Placed", icon: CheckCircle, color: "text-success", bgColor: "bg-success" },
  billed: { label: "Successfully Placed", icon: CheckCircle, color: "text-success", bgColor: "bg-success" },
  completed: { label: "Completed", icon: CheckCircle, color: "text-success", bgColor: "bg-success" },
  closed: { label: "Closed", icon: XCircle, color: "text-muted-foreground", bgColor: "bg-muted" },
  // Legacy fallbacks
  new: { label: "Submitted", icon: Clock, color: "text-primary", bgColor: "bg-primary" },
  pending: { label: "Submitted", icon: Clock, color: "text-primary", bgColor: "bg-primary" },
  reviewing: { label: "Under Review", icon: Search, color: "text-warning", bgColor: "bg-warning" },
  matching: { label: "Finding Treatment Options", icon: Users, color: "text-primary", bgColor: "bg-primary" },
  matched: { label: "Providers Found", icon: Users, color: "text-primary", bgColor: "bg-primary" },
  introductions_sent: { label: "Introductions Sent", icon: Send, color: "text-primary", bgColor: "bg-primary" },
  in_contact: { label: "In Contact", icon: MessageCircle, color: "text-primary", bgColor: "bg-primary" },
  confirming: { label: "Awaiting Confirmation", icon: Clock, color: "text-warning", bgColor: "bg-warning" },
  placed: { label: "Successfully Placed", icon: CheckCircle, color: "text-success", bgColor: "bg-success" },
};

const GUIDED_STEPS = [
  { key: "submitted", label: "Intake Submitted", shortLabel: "Submitted", icon: ClipboardCheck,
    statuses: ["intake_submitted", "new", "pending"],
    description: "Your intake form has been received" },
  { key: "advisor", label: "Advisor Assigned", shortLabel: "Advisor", icon: UserCheck,
    statuses: ["intake_reviewed", "advisor_assigned", "reviewing"],
    description: "A placement advisor is reviewing your case" },
  { key: "matched", label: "Providers Matched", shortLabel: "Matched", icon: Building2,
    statuses: ["matching_providers", "provider_prequalification", "providers_accepted", "matching", "matched", "introductions_sent"],
    description: "Treatment centers have been identified for you" },
  { key: "review", label: "Review Options", shortLabel: "Review", icon: Eye,
    statuses: ["presented_to_seeker", "seeker_selected", "in_contact", "confirming"],
    description: "Review and choose your treatment center" },
  { key: "admission", label: "Admission", shortLabel: "Admission", icon: Home,
    statuses: ["admission_in_progress", "admitted", "billed", "completed", "placed"],
    description: "✅ Admission successful — your placement is confirmed" },
];

function getGuidedStepIndex(status: string): number {
  for (let i = 0; i < GUIDED_STEPS.length; i++) {
    if (GUIDED_STEPS[i].statuses.includes(status)) return i;
  }
  return 0;
}

export function PlacementStatusCard({ caseData }: PlacementStatusCardProps) {
  const config = STATUS_CONFIG[caseData.status] || STATUS_CONFIG.new;
  const StatusIcon = config.icon;
  const currentStepIndex = getGuidedStepIndex(caseData.status);
  const isClosed = caseData.status === "closed";

  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card via-card to-primary/5">
      <CardContent className="p-0">
        {/* Header Section */}
        <div className="relative p-4 sm:p-6 pb-3 sm:pb-4">
          <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full" />
          
          <div className="relative flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                <span>Case</span>
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
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
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Submitted {format(new Date(caseData.created_at), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            </div>
            
            {["admitted", "billed", "completed"].includes(caseData.status) && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-success/10 rounded-full shrink-0"
              >
                <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
                <span className="text-xs sm:text-sm font-medium text-success">✅ Admission Successful</span>
              </motion.div>
            )}
          </div>
        </div>

        {/* 5-Step Guided Progress Tracker */}
        {!isClosed && (
          <div className="px-4 sm:px-6 pb-4 sm:pb-5">
            {/* Progress bar */}
            <div className="relative mb-4">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(currentStepIndex / (GUIDED_STEPS.length - 1)) * 100}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Step indicators */}
            <div className="grid grid-cols-5 gap-1">
              {GUIDED_STEPS.map((step, index) => {
                const StepIcon = step.icon;
                const isCompleted = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const isFuture = index > currentStepIndex;

                return (
                  <div key={step.key} className="flex flex-col items-center text-center gap-1.5">
                    <motion.div
                      initial={isCurrent ? { scale: 0.8 } : {}}
                      animate={isCurrent ? { scale: 1 } : {}}
                      className={cn(
                        "relative h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center transition-all duration-300",
                        isCompleted && "bg-primary text-white",
                        isCurrent && "bg-primary text-white ring-4 ring-primary/20",
                        isFuture && "bg-muted text-muted-foreground",
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <StepIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      )}
                      {isCurrent && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-warning border-2 border-background animate-pulse" />
                      )}
                    </motion.div>
                    <div className="min-w-0">
                      <p className={cn(
                        "text-[10px] sm:text-xs font-medium leading-tight",
                        isCurrent ? "text-foreground" : isCompleted ? "text-primary" : "text-muted-foreground",
                      )}>
                        <span className="hidden sm:inline">{step.label}</span>
                        <span className="sm:hidden">{step.shortLabel}</span>
                      </p>
                      {isCurrent && (
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 leading-tight hidden sm:block">
                          {step.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
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
        <span className="text-[10px] sm:text-xs uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className="text-xs sm:text-sm font-medium capitalize truncate">{value}</p>
    </div>
  );
}
