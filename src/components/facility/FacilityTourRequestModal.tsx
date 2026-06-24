import { useState, forwardRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { extractErrorMessage } from "@/lib/extractErrorMessage";
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
import { CalendarDays, Video, Users, Loader2, CheckCircle, Mail } from "lucide-react";
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
  const [step, setStep] = useState<"form" | "verify" | "success">("form");
  const [tourType, setTourType] = useState<"in_person" | "virtual">("in_person");
  const [preferredDates, setPreferredDates] = useState<Date[]>([]);
  const [notes, setNotes] = useState("");
  const [name, setName] = useState(
    prefillData ? `${prefillData.firstName} ${prefillData.lastName}`.trim() : ""
  );
  const [email, setEmail] = useState(prefillData?.email || "");
  const [phone, setPhone] = useState(prefillData?.phone || "");
  // Email verification (non-concierge / guest path only — submit-qualified-lead
  // requires a server-verified email, so we collect a 6-digit code inline).
  const [code, setCode] = useState("");

  // ── Build the qualified-lead payload (non-concierge path) ──
  const buildLeadBody = () => {
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    const tourMessage = `Tour Request (${tourType === "virtual" ? "Virtual" : "In-Person"})\n\nPreferred dates: ${preferredDates.map(d => format(d, "MMM d, yyyy")).join(", ")}\n\n${notes || "No additional notes"}`;
    return {
      facilityId,
      name: name.trim(),
      firstName,
      lastName,
      email: email.toLowerCase().trim(),
      phone: phone.replace(/\D/g, ""),
      message: tourMessage,
      preferredContact: "call" as const,
      source: "facility_profile" as const,
      // Stable within a 5-min window so a double-submit / retry doesn't create
      // two leads, while still allowing a genuine later re-request.
      idempotencyKey: `tour-${facilityId}-${email.toLowerCase().trim()}-${Math.floor(Date.now() / 300000)}`,
    };
  };

  const submitQualifiedLead = async () => {
    const { data, error } = await supabase.functions.invoke("submit-qualified-lead", {
      body: buildLeadBody(),
    });
    if (error) throw new Error(extractErrorMessage(error, "Failed to submit tour request"));
    if (data?.error) throw new Error(extractErrorMessage(data, "Failed to submit tour request"));
  };

  // Authenticated seeker with an active concierge inquiry → use the concierge
  // tour-request table directly (no email verification needed; the JWT proves
  // identity). Returns true when the request was handled this way.
  const tryConciergeSubmit = async (): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: inquiry } = await supabase
      .from("concierge_inquiries")
      .select("id")
      .eq("user_id", user.id)
      .not("status", "in", "(closed,completed)")
      .maybeSingle();
    if (!inquiry) return false;

    const { data: insertedRow, error } = await supabase
      .from("concierge_tour_requests")
      .insert({
        inquiry_id: inquiry.id,
        facility_id: facilityId,
        user_id: user.id,
        tour_type: tourType,
        preferred_dates: preferredDates.map((d) => d.toISOString()),
        notes: notes || null,
        status: "requested",
      })
      .select("id")
      .maybeSingle();
    if (error) throw error;

    // Notify the facility's provider — fire-and-forget, never block confirmation.
    void supabase.functions
      .invoke("send-tour-notifications", {
        body: { type: "tour_requested", tourId: insertedRow?.id },
      })
      .catch((err) =>
        console.warn("[FacilityTourRequestModal] tour notification failed", err),
      );
    return true;
  };

  // Phase 1 — concierge path, or (guest) submit if already verified, else send a
  // code and advance to the verify step. The previous version posted straight to
  // submit-qualified-lead with no verification, so every guest tour request got a
  // 403 email_not_verified and a generic "try again" toast.
  const initiateMutation = useMutation({
    mutationFn: async (): Promise<{ done: boolean }> => {
      if (await tryConciergeSubmit()) return { done: true };

      const emailNorm = email.toLowerCase().trim();
      // Already verified (e.g. used Request Info first this session)? Submit now.
      const { data: check } = await supabase.functions.invoke("check-email-verified", {
        body: { email: emailNorm },
      });
      if (check?.verified) {
        await submitQualifiedLead();
        return { done: true };
      }
      // Otherwise send a one-time code and collect it on the verify step.
      const { data: sendData, error: sendErr } = await supabase.functions.invoke("send-verification-code", {
        body: { email: emailNorm },
      });
      if (sendErr) throw new Error(extractErrorMessage(sendErr, "Failed to send verification code"));
      if (sendData?.error) throw new Error(extractErrorMessage(sendData, "Failed to send verification code"));
      return { done: false };
    },
    onSuccess: (r) => {
      setStep(r.done ? "success" : "verify");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: extractErrorMessage(error, "Failed to submit tour request. Please try again."),
        variant: "destructive",
      });
      console.error("Tour request error:", error);
    },
  });

  // Phase 2 — verify the emailed code, then submit the qualified lead.
  const verifyMutation = useMutation({
    mutationFn: async () => {
      const emailNorm = email.toLowerCase().trim();
      const { data, error } = await supabase.functions.invoke("verify-code", {
        body: { email: emailNorm, code: code.trim() },
      });
      if (error) throw new Error(extractErrorMessage(error, "Invalid code. Please try again."));
      if (data?.error) throw new Error(extractErrorMessage(data, "Invalid code. Please try again."));
      await submitQualifiedLead();
    },
    onSuccess: () => {
      setStep("success");
    },
    onError: (error) => {
      toast({
        title: "Verification failed",
        description: extractErrorMessage(error, "That code didn't work. Please try again."),
        variant: "destructive",
      });
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
    setCode("");
    // Reset identity fields to their prefill defaults too. This modal is a
    // long-lived mount on CenterProfile, so without this, reopening (e.g. on a
    // shared device) would show the previous user's name/email/phone.
    setName(prefillData ? `${prefillData.firstName} ${prefillData.lastName}`.trim() : "");
    setEmail(prefillData?.email || "");
    setPhone(prefillData?.phone || "");
    setTourType("in_person");
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
        ) : step === "verify" ? (
          <>
            <DialogHeader>
              <DialogTitle>Verify your email</DialogTitle>
              <DialogDescription>
                We sent a 6-digit code to {email.toLowerCase().trim()}. Enter it to send your tour request.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div>
                <Label htmlFor="tour_code" className="text-sm font-medium">Verification code</Label>
                <Input
                  id="tour_code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="mt-1.5 text-center text-lg tracking-[0.5em]"
                />
              </div>
              <Button
                onClick={() => verifyMutation.mutate()}
                disabled={code.trim().length !== 6 || verifyMutation.isPending}
                className="w-full"
              >
                {verifyMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying...</>
                ) : (
                  "Verify & Send Request"
                )}
              </Button>
              <button
                type="button"
                onClick={() => initiateMutation.mutate()}
                disabled={initiateMutation.isPending}
                className="w-full text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline disabled:opacity-50"
              >
                {initiateMutation.isPending ? "Resending..." : "Didn't get a code? Resend"}
              </button>
            </div>
          </>
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
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
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
                onClick={() => initiateMutation.mutate()}
                disabled={!canSubmit || initiateMutation.isPending}
                className="flex-1"
              >
                {initiateMutation.isPending ? (
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
