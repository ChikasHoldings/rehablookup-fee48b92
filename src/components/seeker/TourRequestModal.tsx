import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, Video, Users, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TourRequestModalProps {
  open: boolean;
  onClose: () => void;
  inquiryId: string;
  facilityId: string;
  facilityName: string;
}

export function TourRequestModal({
  open,
  onClose,
  inquiryId,
  facilityId,
  facilityName,
}: TourRequestModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tourType, setTourType] = useState<"in_person" | "virtual">("in_person");
  const [preferredDates, setPreferredDates] = useState<Date[]>([]);
  const [notes, setNotes] = useState("");
  const [contactPreference, setContactPreference] = useState<"phone" | "email">("phone");

  const createTourMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: tourData, error } = await supabase.from("concierge_tour_requests").insert({
        inquiry_id: inquiryId,
        facility_id: facilityId,
        user_id: user.id,
        tour_type: tourType,
        preferred_dates: preferredDates.map(d => d.toISOString()),
        notes: notes || null,
        contact_preference: contactPreference,
        status: "requested",
      }).select("id").single();

      if (error) throw error;

      // Send notifications to facility and admin
      try {
        await supabase.functions.invoke("send-tour-notifications", {
          body: { type: "tour_requested", tourId: tourData.id }
        });
      } catch (notifyErr) {
        console.error("Notification failed (non-blocking):", notifyErr);
      }

      return tourData;
    },
    onSuccess: () => {
      toast({
        title: "Tour requested",
        description: `Your tour request has been sent to ${facilityName}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["concierge-tours"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit tour request. Please try again.",
        variant: "destructive",
      });
      console.error("Tour request error:", error);
    },
  });

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    if (preferredDates.some(d => d.toDateString() === date.toDateString())) {
      setPreferredDates(preferredDates.filter(d => d.toDateString() !== date.toDateString()));
    } else if (preferredDates.length < 3) {
      setPreferredDates([...preferredDates, date]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request a Tour</DialogTitle>
          <DialogDescription>
            Request a tour at {facilityName}. Select your preferences below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Tour Type */}
          <div className="space-y-3">
            <Label>Tour Type</Label>
            <RadioGroup
              value={tourType}
              onValueChange={(v) => setTourType(v as "in_person" | "virtual")}
              className="grid grid-cols-2 gap-3"
            >
              <Label
                htmlFor="in_person"
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors",
                  tourType === "in_person" ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <RadioGroupItem value="in_person" id="in_person" />
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">In-Person</span>
              </Label>
              <Label
                htmlFor="virtual"
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors",
                  tourType === "virtual" ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <RadioGroupItem value="virtual" id="virtual" />
                <Video className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Virtual</span>
              </Label>
            </RadioGroup>
          </div>

          {/* Preferred Dates */}
          <div className="space-y-3">
            <Label>Preferred Dates (select up to 3)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {preferredDates.length === 0
                    ? "Select dates"
                    : `${preferredDates.length} date(s) selected`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={undefined}
                  onSelect={handleDateSelect}
                  disabled={(date) => date < new Date()}
                  modifiers={{
                    selected: preferredDates,
                  }}
                  modifiersStyles={{
                    selected: { backgroundColor: "hsl(var(--primary))", color: "white" },
                  }}
                />
              </PopoverContent>
            </Popover>
            {preferredDates.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {preferredDates.map((date) => (
                  <span
                    key={date.toISOString()}
                    className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md"
                  >
                    {format(date, "MMM d, yyyy")}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Contact Preference */}
          <div className="space-y-3">
            <Label>Preferred Contact Method</Label>
            <RadioGroup
              value={contactPreference}
              onValueChange={(v) => setContactPreference(v as "phone" | "email")}
              className="flex gap-4"
            >
              <Label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="phone" />
                <span>Phone</span>
              </Label>
              <Label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="email" />
                <span>Email</span>
              </Label>
            </RadioGroup>
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <Label>Additional Notes (optional)</Label>
            <Textarea
              placeholder="Any specific questions or requests for your tour..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={() => createTourMutation.mutate()}
            disabled={preferredDates.length === 0 || createTourMutation.isPending}
            className="flex-1"
          >
            {createTourMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Request Tour"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
