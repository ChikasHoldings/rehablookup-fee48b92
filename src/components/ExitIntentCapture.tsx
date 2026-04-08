import { useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useExitIntentTrigger } from "@/hooks/useExitIntentTrigger";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ValidatedInput } from "@/components/ui/validated-input";
import { Heart, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+\d\s().-]{7,20}$/;

const EXCLUDED_PREFIXES = ["/provider", "/admin", "/auth"];

type FormState = "idle" | "loading" | "success" | "error";

export function ExitIntentCapture() {
  const location = useLocation();
  const isExcluded = EXCLUDED_PREFIXES.some((p) => location.pathname.startsWith(p));

  const { shouldShow, dismiss, markSubmitted } = useExitIntentTrigger();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const pageUrlRef = useRef(window.location.pathname);

  const isFirstNameValid = firstName.trim().length >= 1;
  const isLastNameValid = lastName.trim().length >= 1;
  const isEmailValid = EMAIL_REGEX.test(email.trim());
  const isPhoneValid = !phone || PHONE_REGEX.test(phone.trim());
  const canSubmit = isFirstNameValid && isLastNameValid && isEmailValid && isPhoneValid;

  if (isExcluded) return null;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setFormState("loading");
    setErrorMsg("");

    try {
      const { data, error } = await supabase.functions.invoke(
        "submit-exit-intent-lead",
        {
          body: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim() || undefined,
            pageUrl: pageUrlRef.current,
          },
        }
      );

      if (error) throw error;

      if (data?.error) {
        if (data.error === "duplicate") {
          markSubmitted();
          setFormState("success");
          return;
        }
        throw new Error(data.error);
      }

      markSubmitted();
      setFormState("success");
    } catch (err: any) {
      setFormState("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) dismiss();
  };

  return (
    <Dialog open={shouldShow} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md p-6 gap-4">
        {formState === "success" ? (
          <div className="flex flex-col items-center text-center py-4 gap-3">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <DialogTitle className="text-xl font-semibold text-foreground">
              We'll Be in Touch!
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              A treatment specialist will reach out to help you find the right options.
            </DialogDescription>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => dismiss()}
            >
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader className="gap-2">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                <DialogTitle className="text-lg font-semibold text-foreground">
                  Before You Go
                </DialogTitle>
              </div>
              <DialogDescription className="text-muted-foreground text-sm">
                Let us help you find the right treatment. Get matched with verified
                treatment centers near you — free and confidential.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="exit-first-name" className="text-sm font-medium text-foreground mb-1 block">
                    First Name <span className="text-destructive">*</span>
                  </label>
                  <ValidatedInput
                    id="exit-first-name"
                    type="text"
                    value={firstName}
                    onChange={setFirstName}
                    placeholder="First name"
                    isValid={isFirstNameValid}
                    showValidation={firstName.length > 0}
                    disabled={formState === "loading"}
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <label htmlFor="exit-last-name" className="text-sm font-medium text-foreground mb-1 block">
                    Last Name <span className="text-destructive">*</span>
                  </label>
                  <ValidatedInput
                    id="exit-last-name"
                    type="text"
                    value={lastName}
                    onChange={setLastName}
                    placeholder="Last name"
                    isValid={isLastNameValid}
                    showValidation={lastName.length > 0}
                    disabled={formState === "loading"}
                    autoComplete="family-name"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="exit-email" className="text-sm font-medium text-foreground mb-1 block">
                  Email <span className="text-destructive">*</span>
                </label>
                <ValidatedInput
                  id="exit-email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="your@email.com"
                  isValid={isEmailValid}
                  showValidation={email.length > 0}
                  disabled={formState === "loading"}
                />
              </div>
              <div>
                <label htmlFor="exit-phone" className="text-sm font-medium text-foreground mb-1 block">
                  Phone
                </label>
                <ValidatedInput
                  id="exit-phone"
                  type="phone"
                  value={phone}
                  onChange={setPhone}
                  placeholder="(555) 123-4567"
                  isValid={isPhoneValid}
                  showValidation={phone.length > 0}
                  disabled={formState === "loading"}
                />
              </div>

              {formState === "error" && (
                <p className="text-destructive text-sm">{errorMsg}</p>
              )}

              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || formState === "loading"}
                className="w-full mt-1"
              >
                {formState === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Get Matched Now"
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                100% free &amp; confidential. No obligation.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
