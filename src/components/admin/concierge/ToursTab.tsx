import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Video,
  CheckCircle,
  XCircle,
  Plus,
  Loader2,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type ConciergeInquiry = Database["public"]["Tables"]["concierge_inquiries"]["Row"];

interface ToursTabProps {
  caseData: ConciergeInquiry;
}

const STATUS_LABELS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  requested: { label: "Requested", variant: "default" },
  proposed: { label: "Proposed", variant: "secondary" },
  confirmed: { label: "Confirmed", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export function ToursTab({ caseData }: ToursTabProps) {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createFacilityId, setCreateFacilityId] = useState("");
  const [createTourType, setCreateTourType] = useState("in_person");
  const [createDate, setCreateDate] = useState<Date | undefined>(undefined);
  const [createNotes, setCreateNotes] = useState("");

  // Propose datetime state
  const [proposeDialogTourId, setProposeDialogTourId] = useState<string | null>(null);
  const [proposeDate, setProposeDate] = useState<Date | undefined>(undefined);
  const [proposeTime, setProposeTime] = useState("10:00");

  const { data: tours, isLoading } = useQuery({
    queryKey: ["admin-case-tours", caseData.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concierge_tour_requests")
        .select(`
          *,
          facilities (id, name, city, state)
        `)
        .eq("inquiry_id", caseData.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch matched facilities for creating tours
  const matchedIds = [
    ...new Set([
      ...(caseData.matched_facility_ids || []),
      ...(caseData.admin_matched_facility_ids || []),
    ]),
  ];

  const { data: matchedFacilities } = useQuery({
    queryKey: ["tour-matched-facilities", matchedIds],
    queryFn: async () => {
      if (!matchedIds.length) return [];
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, city, state")
        .in("id", matchedIds);
      if (error) throw error;
      return data || [];
    },
    enabled: matchedIds.length > 0,
  });

  // Create tour mutation
  const createTourMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!createFacilityId) throw new Error("Select a facility");

      const preferredDates = createDate ? [createDate.toISOString()] : [];

      const { error } = await supabase.from("concierge_tour_requests").insert({
        inquiry_id: caseData.id,
        facility_id: createFacilityId,
        user_id: caseData.user_id || user.id,
        tour_type: createTourType,
        preferred_dates: preferredDates,
        notes: createNotes || null,
        status: "requested",
      });

      if (error) throw error;

      // Log event
      await supabase.from("concierge_case_events").insert({
        inquiry_id: caseData.id,
        event_type: "tour_requested",
        event_data: { facility_id: createFacilityId, tour_type: createTourType },
        actor_id: user.id,
        actor_type: "admin",
      });
    },
    onSuccess: () => {
      toast.success("Tour request created");
      queryClient.invalidateQueries({ queryKey: ["admin-case-tours", caseData.id] });
      queryClient.invalidateQueries({ queryKey: ["case-events", caseData.id] });
      setShowCreateDialog(false);
      setCreateFacilityId("");
      setCreateTourType("in_person");
      setCreateDate(undefined);
      setCreateNotes("");
    },
    onError: (error) => {
      toast.error("Failed to create tour: " + error.message);
    },
  });

  // Update tour status mutation
  const updateTourMutation = useMutation({
    mutationFn: async ({
      tourId,
      updates,
      eventType,
    }: {
      tourId: string;
      updates: Record<string, any>;
      eventType: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("concierge_tour_requests")
        .update(updates)
        .eq("id", tourId);

      if (error) throw error;

      await supabase.from("concierge_case_events").insert({
        inquiry_id: caseData.id,
        event_type: eventType,
        event_data: { tour_id: tourId, ...updates },
        actor_id: user?.id,
        actor_type: "admin",
      });
    },
    onSuccess: () => {
      toast.success("Tour updated");
      queryClient.invalidateQueries({ queryKey: ["admin-case-tours", caseData.id] });
      queryClient.invalidateQueries({ queryKey: ["case-events", caseData.id] });
      setProposeDialogTourId(null);
    },
    onError: (error) => {
      toast.error("Failed to update tour: " + error.message);
    },
  });

  const handlePropose = () => {
    if (!proposeDialogTourId || !proposeDate) return;
    const [hours, minutes] = proposeTime.split(":").map(Number);
    const datetime = new Date(proposeDate);
    datetime.setHours(hours, minutes, 0, 0);

    updateTourMutation.mutate({
      tourId: proposeDialogTourId,
      updates: {
        proposed_datetime: datetime.toISOString(),
        status: "proposed",
      },
      eventType: "tour_proposed",
    });
  };

  const handleConfirm = (tourId: string, proposedDatetime: string) => {
    updateTourMutation.mutate({
      tourId,
      updates: {
        confirmed_datetime: proposedDatetime,
        status: "confirmed",
      },
      eventType: "tour_confirmed",
    });
  };

  const handleCancel = (tourId: string) => {
    updateTourMutation.mutate({
      tourId,
      updates: { status: "cancelled" },
      eventType: "tour_cancelled",
    });
  };

  const handleComplete = (tourId: string) => {
    updateTourMutation.mutate({
      tourId,
      updates: { status: "completed" },
      eventType: "tour_completed",
    });
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <div className="bg-muted/50 border rounded-lg p-3 text-sm flex-1 mr-3">
          <p className="font-medium">Tour Coordination (Admin)</p>
          <p className="text-muted-foreground text-xs mt-1">
            Create, propose times, confirm, and manage tour requests for this case.
          </p>
        </div>
        {matchedFacilities && matchedFacilities.length > 0 && (
          <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1.5 shrink-0">
            <Plus className="h-3.5 w-3.5" />
            New Tour
          </Button>
        )}
      </div>

      {/* Tours list */}
      {!tours || tours.length === 0 ? (
        <div className="text-center py-8">
          <CalendarIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No tour requests for this case</p>
          <p className="text-xs text-muted-foreground mt-1">
            Click "New Tour" to schedule a facility visit.
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {tours.map((tour: any) => {
              const statusConfig = STATUS_LABELS[tour.status] || {
                label: tour.status,
                variant: "secondary" as const,
              };
              const isActive = tour.status !== "cancelled" && tour.status !== "completed";

              return (
                <div key={tour.id} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {tour.facilities?.name || "Unknown Facility"}
                        </span>
                        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {tour.tour_type === "virtual" ? (
                          <>
                            <Video className="h-3.5 w-3.5" /> Virtual
                          </>
                        ) : (
                          <>
                            <MapPin className="h-3.5 w-3.5" /> In-Person
                          </>
                        )}
                        {tour.facilities?.city && (
                          <span>
                            • {tour.facilities.city}, {tour.facilities.state}
                          </span>
                        )}
                      </div>

                      {tour.confirmed_datetime && (
                        <div className="flex items-center gap-1 text-sm text-success">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Confirmed:{" "}
                          {format(new Date(tour.confirmed_datetime), "MMM d 'at' h:mm a")}
                        </div>
                      )}

                      {tour.proposed_datetime && !tour.confirmed_datetime && (
                        <div className="flex items-center gap-1 text-sm text-warning">
                          <Clock className="h-3.5 w-3.5" />
                          Proposed:{" "}
                          {format(new Date(tour.proposed_datetime), "MMM d 'at' h:mm a")}
                        </div>
                      )}

                      {tour.preferred_dates &&
                        Array.isArray(tour.preferred_dates) &&
                        tour.preferred_dates.length > 0 && (
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">Preferred: </span>
                            {tour.preferred_dates
                              .slice(0, 2)
                              .map((d: string, i: number) => (
                                <span key={i}>
                                  {format(new Date(d), "MMM d")}
                                  {i < Math.min(tour.preferred_dates.length, 2) - 1 ? ", " : ""}
                                </span>
                              ))}
                            {tour.preferred_dates.length > 2 &&
                              ` +${tour.preferred_dates.length - 2} more`}
                          </div>
                        )}

                      {tour.notes && (
                        <p className="text-sm text-muted-foreground">"{tour.notes}"</p>
                      )}

                      {tour.facility_response_notes && (
                        <p className="text-sm text-info dark:text-info">
                          Facility: "{tour.facility_response_notes}"
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Requested {format(new Date(tour.created_at), "MMM d, yyyy")}
                      </p>
                    </div>

                    {/* Admin Actions */}
                    {isActive && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="shrink-0">
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {tour.status === "requested" && (
                            <DropdownMenuItem
                              onClick={() => {
                                setProposeDialogTourId(tour.id);
                                setProposeDate(undefined);
                                setProposeTime("10:00");
                              }}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Propose Time
                            </DropdownMenuItem>
                          )}
                          {tour.status === "proposed" && tour.proposed_datetime && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleConfirm(tour.id, tour.proposed_datetime!)
                              }
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Confirm Tour
                            </DropdownMenuItem>
                          )}
                          {tour.status === "confirmed" && (
                            <DropdownMenuItem onClick={() => handleComplete(tour.id)}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark Completed
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleCancel(tour.id)}
                            className="text-destructive"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancel Tour
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Create Tour Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Tour</DialogTitle>
            <DialogDescription>
              Create a tour request on behalf of the seeker.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Facility</Label>
              <Select value={createFacilityId} onValueChange={setCreateFacilityId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select facility..." />
                </SelectTrigger>
                <SelectContent>
                  {matchedFacilities?.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} — {f.city}, {f.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tour Type</Label>
              <Select value={createTourType} onValueChange={setCreateTourType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_person">In-Person</SelectItem>
                  <SelectItem value="virtual">Virtual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Preferred Date (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !createDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {createDate ? format(createDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={createDate}
                    onSelect={setCreateDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
                placeholder="Any special requirements or notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createTourMutation.mutate()}
              disabled={!createFacilityId || createTourMutation.isPending}
            >
              {createTourMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Tour
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Propose Time Dialog */}
      <Dialog
        open={!!proposeDialogTourId}
        onOpenChange={(open) => !open && setProposeDialogTourId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Propose Tour Time</DialogTitle>
            <DialogDescription>
              Suggest a specific date and time for this tour.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !proposeDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {proposeDate ? format(proposeDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={proposeDate}
                    onSelect={setProposeDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={proposeTime}
                onChange={(e) => setProposeTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProposeDialogTourId(null)}>
              Cancel
            </Button>
            <Button
              onClick={handlePropose}
              disabled={!proposeDate || updateTourMutation.isPending}
            >
              {updateTourMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Propose Time
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
