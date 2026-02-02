import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  Clock,
  Video,
  MapPin,
  Loader2,
  CheckCircle2,
  XCircle,
  CalendarCheck,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PlacementToursTabProps {
  facilityId: string;
}

const STATUS_CONFIG = {
  pending: { label: "Pending", variant: "secondary" as const, icon: Clock },
  confirmed: { label: "Confirmed", variant: "default" as const, icon: CheckCircle2 },
  completed: { label: "Completed", variant: "outline" as const, icon: CalendarCheck },
  cancelled: { label: "Cancelled", variant: "destructive" as const, icon: XCircle },
  declined: { label: "Declined", variant: "destructive" as const, icon: XCircle },
};

const TOUR_TYPE_ICONS = {
  in_person: MapPin,
  virtual: Video,
};

export function PlacementToursTab({ facilityId }: PlacementToursTabProps) {
  const queryClient = useQueryClient();
  const [respondModalOpen, setRespondModalOpen] = useState(false);
  const [selectedTour, setSelectedTour] = useState<any>(null);
  const [responseData, setResponseData] = useState({
    action: "confirm" as "confirm" | "decline" | "propose",
    proposedDate: new Date(),
    proposedTime: "10:00",
    notes: "",
  });

  // Fetch tour requests for this facility
  const { data: tours, isLoading } = useQuery({
    queryKey: ["placement-tours", facilityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concierge_tour_requests")
        .select(`
          *,
          concierge_inquiries (
            id, user_name, level_of_care, preferred_state
          )
        `)
        .eq("facility_id", facilityId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!facilityId,
  });

  // Respond to tour request mutation
  const respondMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTour) throw new Error("No tour selected");

      const updates: Record<string, any> = {
        facility_responded_at: new Date().toISOString(),
        facility_response_notes: responseData.notes || null,
        updated_at: new Date().toISOString(),
      };

      if (responseData.action === "confirm") {
        // Combine date and time for confirmed datetime
        const dateTime = new Date(responseData.proposedDate);
        const [hours, minutes] = responseData.proposedTime.split(":");
        dateTime.setHours(parseInt(hours), parseInt(minutes));
        
        updates.status = "confirmed";
        updates.confirmed_datetime = dateTime.toISOString();
      } else if (responseData.action === "decline") {
        updates.status = "declined";
      } else if (responseData.action === "propose") {
        const dateTime = new Date(responseData.proposedDate);
        const [hours, minutes] = responseData.proposedTime.split(":");
        dateTime.setHours(parseInt(hours), parseInt(minutes));
        
        updates.proposed_datetime = dateTime.toISOString();
        updates.status = "pending"; // Still pending seeker confirmation
      }

      const { error } = await supabase
        .from("concierge_tour_requests")
        .update(updates)
        .eq("id", selectedTour.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(
        responseData.action === "confirm"
          ? "Tour confirmed!"
          : responseData.action === "decline"
          ? "Tour declined"
          : "Alternative time proposed"
      );
      queryClient.invalidateQueries({ queryKey: ["placement-tours"] });
      setRespondModalOpen(false);
      setSelectedTour(null);
    },
    onError: () => {
      toast.error("Failed to respond to tour request");
    },
  });

  // Mark tour as completed
  const completeMutation = useMutation({
    mutationFn: async (tourId: string) => {
      const { error } = await supabase
        .from("concierge_tour_requests")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", tourId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tour marked as completed");
      queryClient.invalidateQueries({ queryKey: ["placement-tours"] });
    },
    onError: () => {
      toast.error("Failed to update tour");
    },
  });

  const openRespondModal = (tour: any) => {
    setSelectedTour(tour);
    setResponseData({
      action: "confirm",
      proposedDate: tour.preferred_dates?.[0]
        ? new Date(tour.preferred_dates[0])
        : new Date(),
      proposedTime: "10:00",
      notes: "",
    });
    setRespondModalOpen(true);
  };

  const pendingTours = tours?.filter((t) => t.status === "pending") || [];
  const confirmedTours = tours?.filter((t) => t.status === "confirmed") || [];
  const pastTours = tours?.filter((t) => ["completed", "cancelled", "declined"].includes(t.status)) || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!tours || tours.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground mb-1">No tour requests yet</p>
          <p className="text-sm text-muted-foreground">
            Tour requests from seekers will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Tours */}
      {pendingTours.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-amber-600 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Requests ({pendingTours.length})
          </h3>
          {pendingTours.map((tour) => (
            <TourCard
              key={tour.id}
              tour={tour}
              onRespond={() => openRespondModal(tour)}
            />
          ))}
        </div>
      )}

      {/* Confirmed Tours */}
      {confirmedTours.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-emerald-600 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Upcoming Tours ({confirmedTours.length})
          </h3>
          {confirmedTours.map((tour) => (
            <TourCard
              key={tour.id}
              tour={tour}
              onComplete={() => completeMutation.mutate(tour.id)}
              isCompleting={completeMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Past Tours */}
      {pastTours.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Past Tours</h3>
          {pastTours.slice(0, 5).map((tour) => (
            <TourCard key={tour.id} tour={tour} />
          ))}
        </div>
      )}

      {/* Respond Modal */}
      <Dialog open={respondModalOpen} onOpenChange={setRespondModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Respond to Tour Request</DialogTitle>
            <DialogDescription>
              {selectedTour?.concierge_inquiries?.user_name} has requested a{" "}
              {selectedTour?.tour_type === "virtual" ? "virtual" : "in-person"} tour
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Requested Dates */}
            {selectedTour?.preferred_dates && selectedTour.preferred_dates.length > 0 && (
              <div className="text-sm">
                <Label className="text-muted-foreground">Requested dates:</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(selectedTour.preferred_dates as string[]).map((date: string, i: number) => (
                    <Badge key={i} variant="outline">
                      {format(new Date(date), "MMM d, yyyy")}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Action Select */}
            <div className="space-y-2">
              <Label>Your Response</Label>
              <Select
                value={responseData.action}
                onValueChange={(v) =>
                  setResponseData((p) => ({ ...p, action: v as any }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirm">Confirm Tour</SelectItem>
                  <SelectItem value="propose">Propose Different Time</SelectItem>
                  <SelectItem value="decline">Decline Request</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date/Time for confirm or propose */}
            {responseData.action !== "decline" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {format(responseData.proposedDate, "MMM d")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={responseData.proposedDate}
                        onSelect={(date) =>
                          date && setResponseData((p) => ({ ...p, proposedDate: date }))
                        }
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Select
                    value={responseData.proposedTime}
                    onValueChange={(v) =>
                      setResponseData((p) => ({ ...p, proposedTime: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 20 }, (_, i) => {
                        const hour = 8 + Math.floor(i / 2);
                        const min = i % 2 === 0 ? "00" : "30";
                        const time = `${hour}:${min}`;
                        return (
                          <SelectItem key={time} value={time}>
                            {format(new Date(`2000-01-01T${time}`), "h:mm a")}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder={
                  responseData.action === "decline"
                    ? "Reason for declining..."
                    : "Any additional information for the seeker..."
                }
                value={responseData.notes}
                onChange={(e) =>
                  setResponseData((p) => ({ ...p, notes: e.target.value }))
                }
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => respondMutation.mutate()}
              disabled={respondMutation.isPending}
              variant={responseData.action === "decline" ? "destructive" : "default"}
            >
              {respondMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {responseData.action === "confirm"
                ? "Confirm Tour"
                : responseData.action === "decline"
                ? "Decline"
                : "Propose Time"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Tour Card Component
function TourCard({
  tour,
  onRespond,
  onComplete,
  isCompleting,
}: {
  tour: any;
  onRespond?: () => void;
  onComplete?: () => void;
  isCompleting?: boolean;
}) {
  const status = STATUS_CONFIG[tour.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;
  const TypeIcon = TOUR_TYPE_ICONS[tour.tour_type as keyof typeof TOUR_TYPE_ICONS] || MapPin;

  return (
    <Card className={cn(
      tour.status === "pending" && "border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10",
      tour.status === "confirmed" && "border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={status.variant} className="gap-1 text-xs">
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
              <Badge variant="outline" className="gap-1 text-xs">
                <TypeIcon className="h-3 w-3" />
                {tour.tour_type === "virtual" ? "Virtual" : "In-Person"}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-sm mb-1">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {tour.concierge_inquiries?.user_name || "Unknown"}
              </span>
            </div>

            <p className="text-xs text-muted-foreground mb-2">
              Case #{tour.inquiry_id.slice(0, 8).toUpperCase()} • Requested{" "}
              {format(new Date(tour.created_at), "MMM d")}
            </p>

            {/* Confirmed/Proposed DateTime */}
            {tour.confirmed_datetime && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-100/50 dark:bg-emerald-950/30 rounded p-2">
                <CalendarCheck className="h-4 w-4" />
                <span className="font-medium">
                  {format(new Date(tour.confirmed_datetime), "EEEE, MMM d 'at' h:mm a")}
                </span>
              </div>
            )}

            {tour.proposed_datetime && !tour.confirmed_datetime && (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-100/50 dark:bg-amber-950/30 rounded p-2">
                <Clock className="h-4 w-4" />
                <span>
                  Proposed: {format(new Date(tour.proposed_datetime), "MMM d 'at' h:mm a")}
                </span>
              </div>
            )}

            {tour.notes && (
              <p className="text-xs text-muted-foreground mt-2 italic">"{tour.notes}"</p>
            )}
          </div>

          {/* Actions */}
          <div className="shrink-0">
            {tour.status === "pending" && onRespond && (
              <Button size="sm" onClick={onRespond}>
                Respond
              </Button>
            )}
            {tour.status === "confirmed" && onComplete && (
              <Button
                size="sm"
                variant="outline"
                onClick={onComplete}
                disabled={isCompleting}
              >
                {isCompleting && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                Mark Complete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
