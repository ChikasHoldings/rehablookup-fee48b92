/**
 * AdmissionReportCard
 * ====================
 * Displayed to providers after they accept a case and receive PII.
 * Allows them to self-report an admission with date and notes.
 * Enforces the 48h reporting deadline with visual countdown.
 */

import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format, differenceInHours, differenceInMinutes } from "date-fns";
import {
  CalendarIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  FileText,
  Shield,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdmissionReportCardProps {
  introductionId: string;
  facilityId: string;
  inquiryId: string;
  piiDisclosed: boolean;
  admissionReportDeadline: string | null;
  alreadyReported: boolean;
  reportedDate: string | null;
  seekerFirstName?: string;
}

export function AdmissionReportCard({
  introductionId,
  facilityId,
  inquiryId,
  piiDisclosed,
  admissionReportDeadline,
  alreadyReported,
  reportedDate,
  seekerFirstName = "the client",
}: AdmissionReportCardProps) {
  const queryClient = useQueryClient();
  const [admissionDate, setAdmissionDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [reportType, setReportType] = useState<"admitted" | "not_admitted" | null>(null);

  // Calculate deadline countdown
  const deadlineInfo = useMemo(() => {
    if (!admissionReportDeadline) return null;
    const deadline = new Date(admissionReportDeadline);
    const now = new Date();
    const hoursLeft = differenceInHours(deadline, now);
    const minutesLeft = differenceInMinutes(deadline, now) % 60;
    const isOverdue = deadline < now;
    return { deadline, hoursLeft, minutesLeft, isOverdue };
  }, [admissionReportDeadline]);

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (reportType === "admitted" && !admissionDate) {
        throw new Error("Please select the admission date");
      }

      const { data, error } = await supabase.rpc("provider_report_admission", {
        p_introduction_id: introductionId,
        p_admission_date: admissionDate ? format(admissionDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        p_notes: notes.trim() || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Admission reported successfully. Thank you!");
      queryClient.invalidateQueries({ queryKey: ["provider-introductions"] });
      queryClient.invalidateQueries({ queryKey: ["placement-detail-rpc"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const reportNotAdmittedMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update the introduction to mark as "not admitted"
      const { error } = await supabase
        .from("concierge_introductions")
        .update({
          provider_admission_reported: true,
          provider_admission_reported_at: new Date().toISOString(),
        })
        .eq("id", introductionId);

      if (error) throw error;

      // Log event
      await supabase.from("concierge_case_events").insert({
        inquiry_id: inquiryId,
        event_type: "provider_reported_not_admitted",
        event_data: {
          facility_id: facilityId,
          reason: notes.trim() || "Client not admitted",
        },
        actor_id: user.id,
        actor_type: "provider",
      });
    },
    onSuccess: () => {
      toast.success("Status updated. Thank you for letting us know.");
      queryClient.invalidateQueries({ queryKey: ["provider-introductions"] });
    },
    onError: (e) => toast.error(e.message),
  });

  // Don't show if PII hasn't been disclosed
  if (!piiDisclosed) return null;

  // Already reported
  if (alreadyReported) {
    return (
      <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">
                Admission Reported
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-500">
                {reportedDate ? `Reported on ${format(new Date(reportedDate), "MMM d, yyyy")}` : "Thank you for reporting."}
                {" "}Our team will confirm and coordinate billing.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "border-2",
      deadlineInfo?.isOverdue
        ? "border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20"
        : "border-amber-200 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/20"
    )}>
      <CardHeader className="py-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Report Admission Status
          </CardTitle>
          {deadlineInfo && (
            <Badge
              className={cn(
                "text-[10px] gap-1",
                deadlineInfo.isOverdue
                  ? "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
              )}
            >
              <Clock className="h-2.5 w-2.5" />
              {deadlineInfo.isOverdue
                ? "OVERDUE"
                : `${deadlineInfo.hoursLeft}h ${deadlineInfo.minutesLeft}m remaining`}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="py-2 space-y-4">
        {/* Explanation */}
        <div className="rounded-lg bg-background border p-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Per our placement agreement, please report whether <strong>{seekerFirstName}</strong> was admitted to your facility.
            {deadlineInfo?.isOverdue
              ? " This report is overdue. Please respond immediately to maintain your network standing."
              : " Timely reporting helps maintain your placement network standing."}
          </p>
        </div>

        {/* Report Type Selection */}
        {!reportType && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 border-2 hover:border-emerald-400 hover:bg-emerald-50/50"
              onClick={() => setReportType("admitted")}
            >
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              <span className="text-sm font-medium">Client Admitted</span>
              <span className="text-[10px] text-muted-foreground">Report admission date</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 border-2 hover:border-gray-400 hover:bg-gray-50/50"
              onClick={() => setReportType("not_admitted")}
            >
              <XCircle className="h-6 w-6 text-gray-500" />
              <span className="text-sm font-medium">Not Admitted</span>
              <span className="text-[10px] text-muted-foreground">Client didn't proceed</span>
            </Button>
          </div>
        )}

        {/* Admitted Form */}
        {reportType === "admitted" && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div>
              <label className="text-sm font-medium">Admission Date *</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal mt-1", !admissionDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {admissionDate ? format(admissionDate, "PPP") : "Select admission date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={admissionDate}
                    onSelect={setAdmissionDate}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Client admitted to residential program, expected 30-day stay..."
                className="mt-1"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="flex-1 gap-2" disabled={!admissionDate}>
                    <CheckCircle2 className="h-4 w-4" />
                    Submit Admission Report
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Admission Report</AlertDialogTitle>
                    <AlertDialogDescription>
                      You are reporting that {seekerFirstName} was admitted on{" "}
                      {admissionDate ? format(admissionDate, "MMMM d, yyyy") : "the selected date"}.
                      A placement fee will be invoiced per your agreement.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => reportMutation.mutate()}
                      disabled={reportMutation.isPending}
                    >
                      {reportMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Confirm Report
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="ghost" onClick={() => setReportType(null)}>Back</Button>
            </div>
          </div>
        )}

        {/* Not Admitted Form */}
        {reportType === "not_admitted" && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div>
              <label className="text-sm font-medium">Reason (optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Client chose another facility, insurance not accepted, bed not available..."
                className="mt-1"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => reportNotAdmittedMutation.mutate()}
                disabled={reportNotAdmittedMutation.isPending}
              >
                {reportNotAdmittedMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit: Not Admitted
              </Button>
              <Button variant="ghost" onClick={() => setReportType(null)}>Back</Button>
            </div>
          </div>
        )}

        {/* Compliance Notice */}
        <div className="rounded-lg border border-muted bg-muted/30 p-2.5 flex items-start gap-2">
          <Shield className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Accurate and timely reporting maintains your placement network standing.
            Unreported admissions may result in compliance score reduction and network restrictions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
