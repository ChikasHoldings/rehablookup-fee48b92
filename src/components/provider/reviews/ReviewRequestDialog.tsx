import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, Sparkles, AlertCircle, ArrowRight, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReviewRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * The provider's facilities they own. When the provider has multiple
   * locations, the dialog lets them pick which one the request belongs
   * to. With one facility, the picker is hidden and the single facility
   * is pre-selected.
   */
  facilities: { id: string; name: string }[];
  /** Optional facility to pre-select (used when the page filters by facility). */
  defaultFacilityId?: string;
  /**
   * Whether the active facility is on Pro. Review requests are Pro-gated
   * server-side (create_review_request raises if not Pro). When false we
   * show an upgrade prompt instead of the form so a Free provider gets a
   * clear path rather than filling a form that the server would reject.
   * Undefined = don't gate in the UI (server still enforces).
   */
  isPro?: boolean;
}

const NAME_MAX = 100;

function isLikelyEmail(s: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.trim());
}

export function ReviewRequestDialog({
  open,
  onOpenChange,
  facilities,
  defaultFacilityId,
  isPro,
}: ReviewRequestDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const single = facilities.length === 1;
  const [facilityId, setFacilityId] = useState<string>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Pre-select when (a) only one facility, or (b) caller passed a
  // default. The effect runs on `open` so reopening the dialog with a
  // different default still picks it up.
  useEffect(() => {
    if (!open) return;
    if (defaultFacilityId && facilities.some((f) => f.id === defaultFacilityId)) {
      setFacilityId(defaultFacilityId);
    } else if (single) {
      setFacilityId(facilities[0].id);
    }
  }, [open, defaultFacilityId, facilities, single]);

  const reset = () => {
    setName("");
    setEmail("");
  };

  const send = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("send-review-request", {
        body: {
          facility_id: facilityId,
          recipient_name: name.trim(),
          recipient_email: email.trim().toLowerCase(),
        },
      });
      if (error) throw new Error(error.message || "Failed to send review request");
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data as { ok: boolean; duplicate?: boolean; email_sent?: boolean; review_url?: string; message?: string };
    },
    onSuccess: (data) => {
      if (data.duplicate) {
        toast({
          title: "Already invited",
          description:
            data.message ||
            "This recipient has a pending invitation from the last 24 hours. We won't send another email.",
        });
      } else if (data.ok === false || data.email_sent === false) {
        // The request row was created, but the invitation email did not go out
        // (suppressed recipient or send failure). Never claim it was sent.
        toast({
          title: "Request saved, but email not sent",
          description:
            data.message ||
            "We couldn't send the invitation email. Please try again shortly.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Review request sent",
          description: `${name.trim()} will get an email with their unique review link.`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["review-requests"] });
      reset();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Couldn't send review request",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const canSend = useMemo(
    () =>
      !!facilityId &&
      name.trim().length > 0 &&
      name.trim().length <= NAME_MAX &&
      isLikelyEmail(email) &&
      !send.isPending,
    [facilityId, name, email, send.isPending],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (send.isPending && !o) return; // block close mid-send
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-[#1B365D]" aria-hidden />
            Request a review
          </DialogTitle>
          <DialogDescription>
            We'll email a one-time link the recipient can use to leave a
            moderated review. Links expire after 30 days.
          </DialogDescription>
        </DialogHeader>

        {isPro === false ? (
          <div className="py-2">
            <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                  <Lock className="h-2.5 w-2.5" aria-hidden /> Pro feature
                </span>
              </div>
              <h3 className="mt-2 text-base font-semibold text-slate-900">
                Send review-request invitations with Pro
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Email past clients a one-time link to leave a moderated review,
                and track opens, clicks, and submissions. Upgrade to Pro to turn
                this on.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-700">
                {[
                  "One-time, expiring review links",
                  "Open / click / submission tracking",
                  "EKRA-safe — no incentives, ever",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Maybe later
              </Button>
              <Button asChild className="gap-2 bg-[#1B365D] hover:bg-[#142a4a]">
                <Link to="/provider/billing?upgrade=pro" onClick={() => onOpenChange(false)}>
                  Upgrade to Pro
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </DialogFooter>
          </div>
        ) : (
        <>
        <div className="space-y-4 py-1">
          {!single && (
            <div className="space-y-1.5">
              <Label htmlFor="rr-facility">Facility</Label>
              <Select value={facilityId} onValueChange={setFacilityId}>
                <SelectTrigger id="rr-facility">
                  <SelectValue placeholder="Select a facility…" />
                </SelectTrigger>
                <SelectContent>
                  {facilities.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="rr-name">
              Recipient name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="rr-name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
              placeholder="e.g., Sarah Mitchell"
              maxLength={NAME_MAX}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Used to personalise the email. They can change how it appears
              publicly before submitting.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rr-email">
              Recipient email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="rr-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@example.com"
              autoComplete="off"
              aria-invalid={email.length > 0 && !isLikelyEmail(email)}
            />
            {email.length > 0 && !isLikelyEmail(email) && (
              <p className="text-xs text-destructive">
                Please enter a valid email address.
              </p>
            )}
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600 leading-relaxed">
            <p className="flex items-start gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" aria-hidden />
              <span>
                <strong>EKRA-safe:</strong> RehabLookup never offers
                incentives for reviews. Make sure your outreach reflects that
                — no gifts, discounts, or other consideration in exchange.
              </span>
            </p>
          </div>

          {send.isError && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
              <p>{(send.error as Error).message}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={send.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => send.mutate()}
            disabled={!canSend}
            className="gap-2 bg-[#1B365D] hover:bg-[#142a4a]"
          >
            {send.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Send invitation
          </Button>
        </DialogFooter>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}
