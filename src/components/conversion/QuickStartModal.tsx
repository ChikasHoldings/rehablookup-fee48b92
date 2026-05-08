import { useState, FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Phone, MapPin, ShieldCheck, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";

interface QuickStartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Context for analytics — e.g. "exit_intent", "sticky_bar", "hero" */
  source?: string;
  /** Optional headline override */
  headline?: string;
  /** Optional sub-headline override */
  subheadline?: string;
}

interface FormState {
  firstName: string;
  phone: string;
  location: string;
}

type SubmitState = "idle" | "submitting" | "success" | "error";

export function QuickStartModal({
  open,
  onOpenChange,
  source = "quick_start_modal",
  headline = "Get Free Help Finding Treatment",
  subheadline = "Answer 3 quick questions and a certified advisor will call you within minutes — free, confidential, no obligation.",
}: QuickStartModalProps) {
  const [form, setForm] = useState<FormState>({ firstName: "", phone: "", location: "" });
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const update = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrorMsg(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const { firstName, phone, location } = form;

    if (!firstName.trim()) { setErrorMsg("Please enter your first name."); return; }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) {
      setErrorMsg("Please enter a valid 10-digit phone number."); return;
    }
    if (!location.trim()) { setErrorMsg("Please enter your city or state."); return; }

    setSubmitState("submitting");
    setErrorMsg(null);

    try {
      analytics.ctaClick("Quick Start Modal Submit", source);

      const { error } = await supabase.functions.invoke("submit-exit-intent-lead", {
        body: {
          firstName: firstName.trim(),
          lastName: "",
          phone: phone.trim(),
          email: "",
          pageUrl: window.location.pathname,
          treatmentType: "",
          preferredState: location.trim(),
          source,
        },
      });

      if (error) throw error;

      setSubmitState("success");
      // Reset form after 4 seconds and close
      setTimeout(() => {
        setSubmitState("idle");
        setForm({ firstName: "", phone: "", location: "" });
        onOpenChange(false);
      }, 4000);
    } catch (err) {
      console.error("[QuickStartModal] submission error:", err);
      setSubmitState("error");
      setErrorMsg("Something went wrong. Please try again or call us directly.");
    }
  };

  const handleClose = () => {
    if (submitState === "submitting") return;
    setSubmitState("idle");
    setForm({ firstName: "", phone: "", location: "" });
    setErrorMsg(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {submitState === "success" ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl">You're All Set!</DialogTitle>
              <DialogDescription className="text-base">
                A certified advisor will call <strong>{form.firstName}</strong> at{" "}
                <strong>{form.phone}</strong> within the next few minutes.
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              100% confidential. We never sell your information.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Heart className="h-5 w-5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Free Advisor Callback
                </span>
              </div>
              <DialogTitle className="text-xl leading-snug">{headline}</DialogTitle>
              <DialogDescription className="text-sm leading-relaxed">
                {subheadline}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="qs-name">
                  <span className="flex items-center gap-1.5">
                    <Heart className="h-3.5 w-3.5 text-muted-foreground" />
                    First Name
                  </span>
                </Label>
                <Input
                  id="qs-name"
                  value={form.firstName}
                  onChange={update("firstName")}
                  placeholder="e.g. Sarah"
                  autoComplete="given-name"
                  maxLength={50}
                  disabled={submitState === "submitting"}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="qs-phone">
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    Best Phone Number
                  </span>
                </Label>
                <Input
                  id="qs-phone"
                  type="tel"
                  value={form.phone}
                  onChange={update("phone")}
                  placeholder="(555) 000-0000"
                  autoComplete="tel"
                  maxLength={20}
                  disabled={submitState === "submitting"}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="qs-location">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    Your Location
                  </span>
                </Label>
                <Input
                  id="qs-location"
                  value={form.location}
                  onChange={update("location")}
                  placeholder="City, state, or zip code"
                  autoComplete="address-level2"
                  maxLength={80}
                  disabled={submitState === "submitting"}
                />
              </div>

              {errorMsg && (
                <p className="text-sm text-destructive" role="alert">{errorMsg}</p>
              )}

              <Button
                type="submit"
                className="w-full gap-2"
                size="lg"
                disabled={submitState === "submitting"}
              >
                {submitState === "submitting" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting you with an advisor…
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4" />
                    Request Free Callback
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                100% free &amp; confidential. No obligation. We never sell your information.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
