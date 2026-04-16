import { useState, forwardRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, Video, Users, Loader2, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface FacilityTourRequestModalProps {
  open: boolean;
  onClose: () => void;
  facilityId: string;
  facilityName: string;
  prefillData?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

export const FacilityTourRequestModal = forwardRef<HTMLDivElement, FacilityTourRequestModalProps>(
  function FacilityTourRequestModal({
    open,
    onClose,
    facilityId,
    facilityName,
    prefillData,
  }, ref) {
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "success">("form");
  const [tourType, setTourType] = useState<"in_person" | "virtual">("in_person");
  const [preferredDates, setPreferredDates] = useState<Date[]>([]);
  const [notes, setNotes] = useState("");
  const [name, setName] = useState(
    prefillData ? `${prefillData.firstName} ${prefillData.lastName}`.trim() : ""
  );
  const [email, setEmail] = useState(prefillData?.email || "");
  const [phone, setPhone] = useState(prefillData?.phone || "");

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      // For authenticated users with active concierge inquiry, use that flow
      if (user) {
        const { data: inquiry } = await supabase
          .from("concierge_inquiries")
          .select("id")
          .eq("user_id", user.id)
          .not("status", "in", '("closed","completed")')
          .maybeSingle();

        if (inquiry) {
          // Use the concierge tour request flow
          const { error } = await supabase.from("concierge_tour_requests").insert({
            inquiry_id: inquiry.id,
            facility_id: facilityId,
            user_id: user.id,
            tour_type: tourType,
            preferred_dates: preferredDates.map(d => d.toISOString()),
            notes: notes || null,
            status: "requested",
          });
          if (error) throw error;
          return { type: "concierge" };
        }
      }

      // For non-concierge users, route through the hardened edge function
      // This ensures sanitization, rate limiting, duplicate detection, and notifications
      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      const tourMessage = `Tour Request (${tourType === "virtual" ? "Virtual" : "In-Person"})\n\nPreferred dates: ${preferredDates.map(d => format(d, "MMM d, yyyy")).join(", ")}\n\n${notes || "No additional notes"}`;

      const { data, error } = await supabase.functions.invoke("submit-qualified-lead", {
        body: {
          facilityId,
          name: name.trim(),
          firstName,
          lastName,
          email: email.toLowerCase().trim(),
          phone: phone.replace(/\D/g, ""),
          message: tourMessage,
          preferredContact: "call",
          source: "facility_profile",
          idempotencyKey: `tour-${facilityId}-${email.toLowerCase().trim()}-${Date.now()}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return { type: "lead" };
    },
    onSuccess: () => {
      setStep("success");
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

  const handleClose = () => {
    setStep("form");
    setPreferredDates([]);
    setNotes("");
    onClose();
  };

  const canSubmit = name.trim() && email.trim() && preferredDates.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent ref={ref} className="max-w-md">
        {step === "success" ? (
          <div className="py-8 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle className="h-7 w-7 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Tour Request Sent!</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {facilityName} will review your request and contact you to schedule your tour.
            </p>
            <Button onClick={handleClose} className="w-full">Done</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Request a Tour</DialogTitle>
              <DialogDescription>
                Schedule a tour at {facilityName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              {/* Tour Type */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tour Type</Label>
                <RadioGroup
                  value={tourType}
                  onValueChange={(v) => setTourType(v as "in_person" | "virtual")}
                  className="grid grid-cols-2 gap-2"
                >
                  <Label
                    htmlFor="tour_in_person"
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all text-sm",
                      tourType === "in_person" 
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                        : "border-border hover:border-border/80"
                    )}
                  >
                    <RadioGroupItem value="in_person" id="tour_in_person" className="sr-only" />
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">In-Person</span>
                  </Label>
                  <Label
                    htmlFor="tour_virtual"
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all text-sm",
                      tourType === "virtual" 
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                        : "border-border hover:border-border/80"
                    )}
                  >
                    <RadioGroupItem value="virtual" id="tour_virtual" className="sr-only" />
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Virtual</span>
                  </Label>
                </RadioGroup>
              </div>

              {/* Preferred Dates */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Preferred Dates (up to 3)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start gap-2 h-10">
                      <CalendarDays className="h-4 w-4" />
                      <span className="text-sm">
                        {preferredDates.length === 0
                          ? "Select dates..."
                          : `${preferredDates.length} date(s) selected`}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={undefined}
                      onSelect={handleDateSelect}
                      disabled={(date) => date < new Date()}
                      modifiers={{ selected: preferredDates }}
                      modifiersStyles={{
                        selected: { backgroundColor: "hsl(var(--primary))", color: "white" },
                      }}
                    />
                  </PopoverContent>
                </Popover>
                {preferredDates.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {preferredDates.map((date) => (
                      <span
                        key={date.toISOString()}
                        className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md font-medium"
                      >
                        {format(date, "MMM d")}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Contact Info */}
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="tour_name" className="text-sm font-medium">Your Name</Label>
                  <Input
                    id="tour_name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    className="mt-1.5"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="tour_email" className="text-sm font-medium">Email</Label>
                    <Input
                      id="tour_email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tour_phone" className="text-sm font-medium">Phone</Label>
                    <Input
                      id="tour_phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone"
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="tour_notes" className="text-sm font-medium">Questions or Notes (optional)</Label>
                <Textarea
                  id="tour_notes"
                  placeholder="Any specific questions about the facility..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="mt-1.5 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={!canSubmit || submitMutation.isPending}
                className="flex-1"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Request Tour"
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
});
