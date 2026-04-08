import { useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Heart, CheckCircle2, Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+\d\s().-]{7,20}$/;

const EXCLUDED_PREFIXES = ["/provider", "/admin", "/auth"];

const TREATMENT_TYPES = [
  "Detox",
  "Inpatient / Residential",
  "Outpatient (OP)",
  "Intensive Outpatient (IOP)",
  "Partial Hospitalization (PHP)",
  "Sober Living",
  "Medication-Assisted Treatment (MAT)",
  "Not Sure",
] as const;

type Step = 1 | 2;
type FormState = "idle" | "loading" | "success" | "error";

export function ExitIntentCapture() {
  const location = useLocation();
  const navigate = useNavigate();
  const isExcluded = EXCLUDED_PREFIXES.some((p) => location.pathname.startsWith(p));

  const { shouldShow, dismiss, markSubmitted } = useExitIntentTrigger();
  const [step, setStep] = useState<Step>(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [treatmentType, setTreatmentType] = useState("");
  const [preferredState, setPreferredState] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const pageUrlRef = useRef(window.location.pathname);

  const isFirstNameValid = firstName.trim().length >= 1;
  const isLastNameValid = lastName.trim().length >= 1;
  const isEmailValid = EMAIL_REGEX.test(email.trim());
  const isPhoneValid = !phone || PHONE_REGEX.test(phone.trim());
  const canProceedStep1 = isFirstNameValid && isLastNameValid && isEmailValid && isPhoneValid;
  const canSubmit = canProceedStep1 && treatmentType.length > 0;

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
            treatmentType,
            preferredState: preferredState.trim() || undefined,
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

  const renderSuccessScreen = () => (
    <div className="flex flex-col items-center text-center py-4 gap-4">
      <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle2 className="h-8 w-8 text-green-600" />
      </div>
      <DialogTitle className="text-xl font-semibold text-foreground">
        Thank You, {firstName}!
      </DialogTitle>
      <DialogDescription className="text-muted-foreground text-sm leading-relaxed max-w-sm">
        A treatment specialist will reach out shortly to help match you with the right program.
      </DialogDescription>

      <div className="w-full border border-border rounded-lg p-4 mt-2 bg-muted/30">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <p className="text-sm font-semibold text-foreground">Get Placed Faster</p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          Create a free account to unlock priority matching, track your progress, and get personalized treatment recommendations from verified providers.
        </p>
        <Button
          className="w-full"
          onClick={() => {
            dismiss();
            navigate("/auth?tab=signup&account_type=seeker");
          }}
        >
          Create Free Account
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      <button
        onClick={() => dismiss()}
        className="text-xs text-muted-foreground hover:text-foreground underline transition-colors mt-1"
      >
        No thanks, close this
      </button>
    </div>
  );

  const renderStep1 = () => (
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

        <Button
          onClick={() => setStep(2)}
          disabled={!canProceedStep1}
          className="w-full mt-1"
        >
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          100% free &amp; confidential. No obligation.
        </p>
      </div>
    </>
  );

  const renderStep2 = () => (
    <>
      <DialogHeader className="gap-2">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          <DialogTitle className="text-lg font-semibold text-foreground">
            Almost Done
          </DialogTitle>
        </div>
        <DialogDescription className="text-muted-foreground text-sm">
          A couple more details to help us find the best match for you.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3">
        <div>
          <label htmlFor="exit-treatment-type" className="text-sm font-medium text-foreground mb-1 block">
            Type of Treatment <span className="text-destructive">*</span>
          </label>
          <Select value={treatmentType} onValueChange={setTreatmentType}>
            <SelectTrigger id="exit-treatment-type">
              <SelectValue placeholder="Select treatment type" />
            </SelectTrigger>
            <SelectContent>
              {TREATMENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="exit-preferred-state" className="text-sm font-medium text-foreground mb-1 block">
            Preferred Location
          </label>
          <Input
            id="exit-preferred-state"
            value={preferredState}
            onChange={(e) => setPreferredState(e.target.value)}
            placeholder="e.g. California, Florida, or any state"
            disabled={formState === "loading"}
            autoComplete="address-level1"
          />
        </div>

        {formState === "error" && (
          <p className="text-destructive text-sm">{errorMsg}</p>
        )}

        <div className="flex gap-2 mt-1">
          <Button
            variant="outline"
            onClick={() => setStep(1)}
            disabled={formState === "loading"}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || formState === "loading"}
            className="flex-[2]"
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
        </div>

        <div className="flex justify-center gap-2 mt-1">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 w-8 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </>
  );

  return (
    <Dialog open={shouldShow} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md p-6 gap-4">
        {formState === "success"
          ? renderSuccessScreen()
          : step === 1
            ? renderStep1()
            : renderStep2()}
      </DialogContent>
    </Dialog>
  );
}
