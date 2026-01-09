import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Calendar, Clock, MapPin, Video, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Database } from "@/integrations/supabase/types";

type ConciergeInquiry = Database["public"]["Tables"]["concierge_inquiries"]["Row"];

interface ToursTabProps {
  caseData: ConciergeInquiry;
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  requested: { label: "Requested", variant: "default" },
  proposed: { label: "Proposed", variant: "secondary" },
  confirmed: { label: "Confirmed", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export function ToursTab({ caseData }: ToursTabProps) {
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

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (!tours || tours.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No tour requests for this case</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-3">
        {tours.map((tour: any) => (
          <div key={tour.id} className="p-4 rounded-lg border bg-card">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{tour.facilities?.name || "Unknown Facility"}</span>
                  <Badge variant={STATUS_LABELS[tour.status]?.variant || "secondary"}>
                    {STATUS_LABELS[tour.status]?.label || tour.status}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {tour.tour_type === "virtual" ? (
                    <><Video className="h-3.5 w-3.5" /> Virtual</>
                  ) : (
                    <><MapPin className="h-3.5 w-3.5" /> In-Person</>
                  )}
                  {tour.facilities?.city && (
                    <span>• {tour.facilities.city}, {tour.facilities.state}</span>
                  )}
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
                
                {tour.preferred_dates && Array.isArray(tour.preferred_dates) && tour.preferred_dates.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Preferred: </span>
                    {tour.preferred_dates.slice(0, 2).map((d: string, i: number) => (
                      <span key={i}>
                        {format(new Date(d), "MMM d")}
                        {i < Math.min(tour.preferred_dates.length, 2) - 1 ? ", " : ""}
                      </span>
                    ))}
                    {tour.preferred_dates.length > 2 && ` +${tour.preferred_dates.length - 2} more`}
                  </div>
                )}
                
                {tour.notes && (
                  <p className="text-sm text-muted-foreground">"{tour.notes}"</p>
                )}
                
                {tour.facility_response_notes && (
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Facility: "{tour.facility_response_notes}"
                  </p>
                )}
                
                <p className="text-xs text-muted-foreground">
                  Requested {format(new Date(tour.created_at), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
