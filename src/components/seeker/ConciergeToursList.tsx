import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useToast } from "@/hooks/use-toast";
import { 
  CalendarDays, 
  Video, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle,
  MapPin,
  Calendar,
  Loader2
} from "lucide-react";
import { format } from "date-fns";

interface TourRequest {
  id: string;
  inquiry_id: string;
  facility_id: string;
  tour_type: string;
  preferred_dates: string[];
  notes: string | null;
  contact_preference: string | null;
  status: string;
  proposed_datetime: string | null;
  confirmed_datetime: string | null;
  facility_response_notes: string | null;
  created_at: string;
  updated_at: string | null;
  facility: {
    name: string;
    city: string;
    state: string;
  };
}

interface ConciergeToursListProps {
  inquiryId: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  requested: { label: "Pending", color: "bg-yellow-500", icon: Clock },
  proposed: { label: "Time Proposed", color: "bg-blue-500", icon: Calendar },
  confirmed: { label: "Confirmed", color: "bg-green-500", icon: CheckCircle },
  completed: { label: "Completed", color: "bg-muted-foreground", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-destructive", icon: XCircle },
};

export function ConciergeToursList({ inquiryId }: ConciergeToursListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cancelTourId, setCancelTourId] = useState<string | null>(null);

  const { data: tours, isLoading } = useQuery({
    queryKey: ["concierge-tours", inquiryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concierge_tour_requests")
        .select(`
          id, inquiry_id, facility_id, tour_type, preferred_dates, notes,
          contact_preference, status, proposed_datetime, confirmed_datetime,
          facility_response_notes, created_at, updated_at,
          facility:facilities(name, city, state)
        `)
        .eq("inquiry_id", inquiryId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as TourRequest[];
    },
  });

  // Real-time subscription for tour updates
  useEffect(() => {
    const channel = supabase
      .channel(`tours-${inquiryId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "concierge_tour_requests",
          filter: `inquiry_id=eq.${inquiryId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["concierge-tours", inquiryId] });
          
          // Show toast for updates
          if (payload.eventType === "UPDATE") {
            const newStatus = (payload.new as TourRequest).status;
            if (newStatus === "proposed") {
              toast({
                title: "Tour Time Proposed!",
                description: "A facility has proposed a tour time. Check your tours below.",
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [inquiryId, queryClient, toast]);

  const updateTourMutation = useMutation({
    mutationFn: async ({ tourId, status, confirmedDatetime }: { 
      tourId: string; 
      status: string; 
      confirmedDatetime?: string;
    }) => {
      const updateData: Record<string, unknown> = { status };
      if (confirmedDatetime) {
        updateData.confirmed_datetime = confirmedDatetime;
      }

      const { error } = await supabase
        .from("concierge_tour_requests")
        .update(updateData)
        .eq("id", tourId);

      if (error) throw error;

      // Send notification based on status change
      const notificationType = status === "confirmed" ? "tour_confirmed" : 
                               status === "cancelled" ? "tour_cancelled" : null;
      if (notificationType) {
        try {
          await supabase.functions.invoke("send-tour-notifications", {
            body: { 
              type: notificationType, 
              tourId,
              metadata: { cancelledBy: "user" }
            }
          });
        } catch (notifyErr) {
          console.error("Notification failed (non-blocking):", notifyErr);
        }
      }
    },
    onSuccess: (_, variables) => {
      const message = variables.status === "confirmed" ? "Tour confirmed!" : 
                      variables.status === "cancelled" ? "Tour cancelled" : "Tour updated";
      toast({ title: message });
      queryClient.invalidateQueries({ queryKey: ["concierge-tours", inquiryId] });
      setCancelTourId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update tour. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCancelTour = (tourId: string) => {
    updateTourMutation.mutate({
      tourId,
      status: "cancelled",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!tours?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CalendarDays className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No tour requests yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Request a tour from your matched facilities above
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {tours.map((tour) => {
        const statusConfig = STATUS_CONFIG[tour.status] || STATUS_CONFIG.requested;
        const StatusIcon = statusConfig.icon;
        const preferredDates = Array.isArray(tour.preferred_dates) ? tour.preferred_dates : [];

        return (
          <Card key={tour.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">{tour.facility.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{tour.facility.city}, {tour.facility.state}</span>
                  </CardDescription>
                </div>
                <Badge className={`${statusConfig.color} text-white shrink-0`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">{statusConfig.label}</span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  {tour.tour_type === "virtual" ? (
                    <Video className="h-4 w-4" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                  <span className="capitalize">{tour.tour_type.replace("_", "-")} Tour</span>
                </div>
                <div className="text-muted-foreground">
                  Requested {format(new Date(tour.created_at), "MMM d")}
                </div>
              </div>

              {/* Preferred Dates */}
              {preferredDates.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Preferred Dates
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {preferredDates.map((dateStr, i) => (
                      <span key={i} className="text-xs bg-muted px-2 py-1 rounded">
                        {format(new Date(dateStr), "MMM d, yyyy")}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Proposed Time */}
              {tour.status === "proposed" && tour.proposed_datetime && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                    Proposed Time: {format(new Date(tour.proposed_datetime), "EEEE, MMMM d 'at' h:mm a")}
                  </p>
                  {tour.facility_response_notes && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {tour.facility_response_notes}
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => updateTourMutation.mutate({
                        tourId: tour.id,
                        status: "confirmed",
                        confirmedDatetime: tour.proposed_datetime!,
                      })}
                      disabled={updateTourMutation.isPending}
                      className="flex-1 sm:flex-none"
                    >
                      {updateTourMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : null}
                      Accept Time
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateTourMutation.mutate({
                        tourId: tour.id,
                        status: "cancelled",
                      })}
                      disabled={updateTourMutation.isPending}
                      className="flex-1 sm:flex-none"
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              )}

              {/* Confirmed Time */}
              {tour.status === "confirmed" && tour.confirmed_datetime && (
                <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span>Confirmed: {format(new Date(tour.confirmed_datetime), "EEEE, MMMM d 'at' h:mm a")}</span>
                  </p>
                </div>
              )}

              {/* Notes */}
              {tour.notes && (
                <p className="text-sm text-muted-foreground border-t pt-3">
                  "{tour.notes}"
                </p>
              )}

              {/* Cancel Button with Confirmation Dialog */}
              {["requested", "proposed"].includes(tour.status) && (
                <AlertDialog open={cancelTourId === tour.id} onOpenChange={(open) => !open && setCancelTourId(null)}>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setCancelTourId(tour.id)}
                      disabled={updateTourMutation.isPending}
                    >
                      Cancel Request
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel this tour request?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will cancel your tour request with {tour.facility.name}. 
                        This action cannot be undone. You can always request a new tour later.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Request</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleCancelTour(tour.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {updateTourMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : null}
                        Yes, Cancel Tour
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
