import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CalendarIcon, Loader2, Home, MapPin, CheckCircle2, Save } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type ConciergeInquiry = Database["public"]["Tables"]["concierge_inquiries"]["Row"];

interface AdmissionCoordinationCardProps {
  caseData: ConciergeInquiry;
  onRefresh: () => void;
}

const TOUR_STATUSES = [
  { value: "not_started", label: "Not Started" },
  { value: "needed", label: "Tour Needed" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "skipped", label: "Skipped" },
  { value: "not_applicable", label: "N/A" },
];

const ADMISSION_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "tour_phase", label: "Tour Phase" },
  { value: "admitted", label: "Admitted" },
  { value: "move_in_scheduled", label: "Move-In Scheduled" },
  { value: "moved_in", label: "Moved In" },
];

const TOUR_BADGE_COLORS: Record<string, string> = {
  not_started: "bg-muted text-muted-foreground",
  needed: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  skipped: "bg-muted text-muted-foreground",
  not_applicable: "bg-muted text-muted-foreground",
};

const ADMISSION_BADGE_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  tour_phase: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  admitted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  move_in_scheduled: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  moved_in: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
};

export function AdmissionCoordinationCard({ caseData, onRefresh }: AdmissionCoordinationCardProps) {
  const queryClient = useQueryClient();
  const [tourStatus, setTourStatus] = useState(caseData.tour_coordination_status || "not_started");
  const [admissionStatus, setAdmissionStatus] = useState(caseData.admission_status || "pending");
  const [moveInDate, setMoveInDate] = useState<Date | undefined>(
    caseData.move_in_date ? new Date(caseData.move_in_date) : undefined
  );
  const [admissionNotes, setAdmissionNotes] = useState(caseData.admission_notes || "");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const updates: Record<string, unknown> = {
        tour_coordination_status: tourStatus,
        admission_status: admissionStatus,
        admission_notes: admissionNotes || null,
        move_in_date: moveInDate ? moveInDate.toISOString() : null,
      };

      // Optimistic lock: only update if updated_at matches what we loaded
      const { data: updated, error } = await supabase
        .from("concierge_inquiries")
        .update(updates)
        .eq("id", caseData.id)
        .eq("updated_at", caseData.updated_at)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!updated) {
        throw new Error("This case was updated by another user. Please refresh and try again.");
      }

      // Log event for meaningful changes
      const changes: string[] = [];
      if (tourStatus !== caseData.tour_coordination_status) changes.push(`tour: ${tourStatus}`);
      if (admissionStatus !== caseData.admission_status) changes.push(`admission: ${admissionStatus}`);
      if (moveInDate?.toISOString() !== caseData.move_in_date) changes.push("move_in_date updated");

      if (changes.length > 0) {
        await supabase.from("concierge_case_events").insert({
          inquiry_id: caseData.id,
          event_type: "admission_updated",
          event_data: {
            tour_status: tourStatus,
            admission_status: admissionStatus,
            move_in_date: moveInDate?.toISOString() || null,
            changes,
          },
          actor_id: user.id,
          actor_type: "admin",
        });

        // Determine which notification to send based on what changed
        let notificationType: string | null = null;
        if (admissionStatus === "moved_in" && caseData.admission_status !== "moved_in") {
          notificationType = "moved_in";
        } else if (admissionStatus === "move_in_scheduled" && caseData.admission_status !== "move_in_scheduled") {
          notificationType = "move_in_scheduled";
        } else if (tourStatus === "completed" && caseData.tour_coordination_status !== "completed") {
          notificationType = "tour_completed";
        } else if (admissionStatus !== caseData.admission_status) {
          notificationType = "admission_updated";
        }

        if (notificationType) {
          try {
            await supabase.functions.invoke("send-concierge-notifications", {
              body: {
                type: notificationType,
                inquiryId: caseData.id,
                facilityId: caseData.placed_facility_id,
                metadata: {
                  admission_status: admissionStatus,
                  tour_status: tourStatus,
                  move_in_date: moveInDate?.toISOString() || null,
                },
              },
            });
          } catch (e) {
            console.error("Notification send failed:", e);
          }
        }
      }
    },
    onSuccess: () => {
      toast.success("Admission coordination updated");
      queryClient.invalidateQueries({ queryKey: ["case-events", caseData.id] });
      onRefresh();
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  // Only show for cases that have a placed facility or are in late stages
  const showCard = ["seeker_selected", "admission_in_progress", "admitted", "billed", "completed"].includes(caseData.status) || caseData.seeker_confirmed;
  if (!showCard) return null;

  const hasChanges =
    tourStatus !== (caseData.tour_coordination_status || "not_started") ||
    admissionStatus !== (caseData.admission_status || "pending") ||
    admissionNotes !== (caseData.admission_notes || "") ||
    moveInDate?.toISOString() !== caseData.move_in_date;

  return (
    <Card className="border-indigo-200 dark:border-indigo-800">
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Home className="h-4 w-4 text-indigo-600" />
          Admission & Move-In Coordination
        </CardTitle>
        <div className="flex items-center gap-2 mt-1">
          <Badge className={cn("text-xs", TOUR_BADGE_COLORS[tourStatus])}>
            Tour: {TOUR_STATUSES.find(s => s.value === tourStatus)?.label}
          </Badge>
          <Badge className={cn("text-xs", ADMISSION_BADGE_COLORS[admissionStatus])}>
            {ADMISSION_STATUSES.find(s => s.value === admissionStatus)?.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="py-2 space-y-4">
        {/* Tour Coordination Status */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Tour Status</label>
          <Select value={tourStatus} onValueChange={setTourStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TOUR_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Admission Status */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Admission Status</label>
          <Select value={admissionStatus} onValueChange={setAdmissionStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ADMISSION_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Move-In Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Move-In Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !moveInDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {moveInDate ? format(moveInDate, "PPP") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={moveInDate}
                onSelect={setMoveInDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Admission Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Admission Notes</label>
          <Textarea
            value={admissionNotes}
            onChange={(e) => setAdmissionNotes(e.target.value)}
            placeholder="Coordination details, special arrangements..."
            rows={3}
          />
        </div>

        {/* Save Button */}
        <Button
          className="w-full"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !hasChanges}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Coordination Details
        </Button>
      </CardContent>
    </Card>
  );
}
