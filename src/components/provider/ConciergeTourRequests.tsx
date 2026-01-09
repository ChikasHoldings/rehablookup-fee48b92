import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { format } from "date-fns";
import { Calendar, Clock, MapPin, Phone, Mail, Video, User, CheckCircle, XCircle, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  requested: { label: "Requested", variant: "default" },
  proposed: { label: "Time Proposed", variant: "secondary" },
  confirmed: { label: "Confirmed", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export function ConciergeTourRequests() {
  const { selectedFacility } = useSelectedFacility();
  const queryClient = useQueryClient();
  const [respondingTo, setRespondingTo] = useState<any>(null);
  const [proposedDate, setProposedDate] = useState("");
  const [proposedTime, setProposedTime] = useState("");
  const [responseNotes, setResponseNotes] = useState("");

  const { data: tourRequests, isLoading } = useQuery({
    queryKey: ["provider-tour-requests", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return [];
      const { data, error } = await supabase
        .from("concierge_tour_requests")
        .select(`
          *,
          concierge_inquiries (
            id, user_name, user_email, user_phone, level_of_care
          )
        `)
        .eq("facility_id", selectedFacility.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedFacility?.id,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ tourId, action, proposedDatetime, notes }: { 
      tourId: string; 
      action: "propose" | "confirm" | "complete" | "cancel";
      proposedDatetime?: string;
      notes?: string;
    }) => {
      const updates: Record<string, unknown> = {
        facility_responded_at: new Date().toISOString(),
        facility_response_notes: notes,
      };

      if (action === "propose" && proposedDatetime) {
        updates.status = "proposed";
        updates.proposed_datetime = proposedDatetime;
      } else if (action === "confirm") {
        updates.status = "confirmed";
        updates.confirmed_datetime = proposedDatetime || new Date().toISOString();
      } else if (action === "complete") {
        updates.status = "completed";
      } else if (action === "cancel") {
        updates.status = "cancelled";
      }

      const { error } = await supabase
        .from("concierge_tour_requests")
        .update(updates)
        .eq("id", tourId);
      
      if (error) throw error;

      // Send notification to user when proposing a time
      if (action === "propose") {
        try {
          await supabase.functions.invoke("send-tour-notifications", {
            body: { type: "tour_proposed", tourId }
          });
        } catch (notifyErr) {
          console.error("Notification failed (non-blocking):", notifyErr);
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["provider-tour-requests"] });
      const message = variables.action === "propose" ? "Time proposed - seeker notified" :
                      variables.action === "confirm" ? "Tour confirmed" :
                      variables.action === "complete" ? "Tour marked complete" : "Tour request updated";
      toast.success(message);
      setRespondingTo(null);
      setProposedDate("");
      setProposedTime("");
      setResponseNotes("");
    },
    onError: () => {
      toast.error("Failed to update tour request");
    },
  });

  const handlePropose = () => {
    if (!respondingTo || !proposedDate || !proposedTime) return;
    const proposedDatetime = new Date(`${proposedDate}T${proposedTime}`).toISOString();
    respondMutation.mutate({
      tourId: respondingTo.id,
      action: "propose",
      proposedDatetime,
      notes: responseNotes,
    });
  };

  const pendingRequests = tourRequests?.filter(t => t.status === "requested") || [];
  const otherRequests = tourRequests?.filter(t => t.status !== "requested") || [];

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading tour requests...</div>;
  }

  return (
    <div className="space-y-4">
      {pendingRequests.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-600" />
              Pending Tour Requests ({pendingRequests.length})
            </CardTitle>
            <CardDescription>Respond to these tour requests from seekers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.map((tour: any) => (
                <div key={tour.id} className="p-4 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{tour.concierge_inquiries?.user_name || "Unknown"}</span>
                        <Badge variant="outline" className="capitalize">
                          {tour.tour_type === "virtual" ? (
                            <><Video className="h-3 w-3 mr-1" /> Virtual</>
                          ) : (
                            <><MapPin className="h-3 w-3 mr-1" /> In-Person</>
                          )}
                        </Badge>
                      </div>
                      
                      {tour.preferred_dates && Array.isArray(tour.preferred_dates) && tour.preferred_dates.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Preferred times: </span>
                          {tour.preferred_dates.map((d: string, i: number) => (
                            <span key={i}>
                              {format(new Date(d), "MMM d 'at' h:mm a")}
                              {i < tour.preferred_dates.length - 1 ? ", " : ""}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {tour.notes && (
                        <p className="text-sm text-muted-foreground">{tour.notes}</p>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        Requested {format(new Date(tour.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    
                    <Button size="sm" onClick={() => setRespondingTo(tour)}>
                      Respond
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">All Tour Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {tourRequests && tourRequests.length > 0 ? (
            <ScrollArea className="h-[350px]">
              <div className="space-y-3">
                {tourRequests.map((tour: any) => (
                  <div key={tour.id} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{tour.concierge_inquiries?.user_name || "Unknown"}</span>
                          <Badge variant={STATUS_LABELS[tour.status]?.variant || "secondary"}>
                            {STATUS_LABELS[tour.status]?.label || tour.status}
                          </Badge>
                        </div>
                        
                        {tour.confirmed_datetime && (
                          <div className="flex items-center gap-1 text-sm text-green-600">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Confirmed: {format(new Date(tour.confirmed_datetime), "MMM d 'at' h:mm a")}
                          </div>
                        )}
                        
                        {tour.proposed_datetime && !tour.confirmed_datetime && (
                          <div className="flex items-center gap-1 text-sm text-amber-600">
                            <Clock className="h-3.5 w-3.5" />
                            Proposed: {format(new Date(tour.proposed_datetime), "MMM d 'at' h:mm a")}
                          </div>
                        )}
                        
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(tour.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        {tour.status === "proposed" && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => respondMutation.mutate({ tourId: tour.id, action: "confirm" })}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            Confirm
                          </Button>
                        )}
                        {tour.status === "confirmed" && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => respondMutation.mutate({ tourId: tour.id, action: "complete" })}
                          >
                            Mark Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No tour requests yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Respond Dialog */}
      <Dialog open={!!respondingTo} onOpenChange={(open) => !open && setRespondingTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Tour Request</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted">
              <p className="font-medium">{respondingTo?.concierge_inquiries?.user_name}</p>
              <p className="text-sm text-muted-foreground capitalize">
                {respondingTo?.tour_type} tour requested
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Proposed Date</Label>
                <Input 
                  type="date" 
                  value={proposedDate}
                  onChange={(e) => setProposedDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Proposed Time</Label>
                <Input 
                  type="time" 
                  value={proposedTime}
                  onChange={(e) => setProposedTime(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any additional information..."
                value={responseNotes}
                onChange={(e) => setResponseNotes(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRespondingTo(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handlePropose}
              disabled={!proposedDate || !proposedTime || respondMutation.isPending}
            >
              Propose Time
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
