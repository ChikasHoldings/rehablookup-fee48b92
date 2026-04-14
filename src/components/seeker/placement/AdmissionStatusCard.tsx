import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, Calendar, MapPin, CheckCircle2, Clock, Eye } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AdmissionStatusCardProps {
  tourStatus: string;
  admissionStatus: string;
  moveInDate: string | null;
}

const TOUR_LABELS: Record<string, { label: string; description: string }> = {
  not_started: { label: "Pending", description: "Your advisor will coordinate next steps." },
  needed: { label: "Tour Recommended", description: "A facility tour is being arranged for you." },
  scheduled: { label: "Tour Scheduled", description: "Your tour has been scheduled. Check the Tours tab for details." },
  completed: { label: "Tour Complete", description: "Your tour is complete. Your advisor will follow up." },
  skipped: { label: "Tour Skipped", description: "No tour needed — proceeding to admission." },
  not_applicable: { label: "N/A", description: "" },
};

const ADMISSION_LABELS: Record<string, { label: string; description: string; color: string }> = {
  pending: { label: "Pending", description: "Your placement is being coordinated.", color: "bg-muted text-muted-foreground" },
  tour_phase: { label: "Tour Phase", description: "You're in the tour and evaluation phase.", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  admitted: { label: "Admitted", description: "You've been accepted! Move-in details are being arranged.", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  move_in_scheduled: { label: "Move-In Scheduled", description: "Your move-in date has been set.", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400" },
  moved_in: { label: "Moved In", description: "Welcome to your new treatment program!", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
};

export function AdmissionStatusCard({ tourStatus, admissionStatus, moveInDate }: AdmissionStatusCardProps) {
  const admission = ADMISSION_LABELS[admissionStatus] || ADMISSION_LABELS.pending;
  const tour = TOUR_LABELS[tourStatus] || TOUR_LABELS.not_started;
  
  // Don't show if nothing is happening yet
  if (admissionStatus === "pending" && tourStatus === "not_started") return null;

  return (
    <Card className="border-indigo-200/50 dark:border-indigo-800/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Home className="h-4 w-4 text-indigo-600" />
          Admission & Move-In
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Admission Status */}
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg shrink-0", admission.color)}>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium text-sm">{admission.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{admission.description}</p>
          </div>
        </div>

        {/* Tour Status (if relevant) */}
        {tourStatus !== "not_applicable" && tourStatus !== "not_started" && (
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted shrink-0">
              <Eye className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm">Tour: {tour.label}</p>
              {tour.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{tour.description}</p>
              )}
            </div>
          </div>
        )}

        {/* Move-In Date */}
        {moveInDate && (
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Move-In Date</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(moveInDate), "EEEE, MMMM d, yyyy")}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
