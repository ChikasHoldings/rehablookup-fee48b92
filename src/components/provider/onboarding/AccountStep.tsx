import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { validateEmail } from "@/lib/facilitySanitization";
import { trackEvent } from "@/lib/analytics";
import { useProviderOnboardingState } from "@/hooks/useProviderOnboardingState";

/**
 * Step 1 — Account creation.
 *
 * Single form (First name, Last name, Email, Password, Confirm password).
 * Calls the existing register-provider-account edge function so the
 * wizard reuses the same auth path as /auth/signup — no duplicate
 * signup machinery, no separate password hashing rules.
 *
 * Once the edge fn returns a userId:
 *   1. We sign in with the password the user just typed (mints a session).
 *   2. We upsert the onboarding-state row with current_step='verify_email'.
 *   3. The wizard shell re-reads the state and dispatches to Step 2.
 *
 * Already-signed-in users see this step skipped by the parent — the
 * shell jumps straight to their current_step.
 */
export function AccountStep({ onAdvance }: { onAdvance: () => void }) {
  const [searchParams] = useSearchParams();
  const claimFacilityId = searchParams.get("facility_id") || null;
  const intent = searchParams.get("intent"); // "claim" | null

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { advance } = useProviderOnboardingState();

  const passwordOk =
    password.length >= 8 &&
    /[A-Za-z]/.test(password) &&
    /[0-9]/.test(password);
  const namesOk = firstName.trim().length >= 1 && lastName.trim().length >= 1;
  const matchOk = password.length > 0 && password === confirm;
  const canSubmit = namesOk && passwordOk && matchOk && email.trim().length > 0 && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      validateEmail(email);
    } catch {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "register-provider-account",
        {
          body: {
            email: email.trim(),
            password,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            accountType: "provider",
          },
        },
      );
      if (error) {
        toast.error(error.message || "Sign-up failed. Please try again.");
        setSubmitting(false);
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        setSubmitting(false);
        return;
      }
      if (!data?.userId) {
        toast.error("Unable to create your account. Please try again.");
        setSubmitting(false);
        return;
      }

      // Sign in so the upsert below runs under the user's RLS context.
      // The user is NOT considered verified until Step 2 finishes; we
      // gate that downstream via profiles.email_verified_at.
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInErr) {
        toast.error(
          "Account created, but we couldn't sign you in. Please use the sign-in form.",
        );
        setSubmitting(false);
        return;
      }

      // Defensive profile-row upsert. The handle_new_provider() trigger
      // (migration 20260529000000) should have already inserted a row
      // when register-provider-account called admin.createUser, but
      // the wizard's downstream writes assume a row exists. A
      // duplicate-key error here is the happy path.
      const userId = data.userId as string;
      const { error: profileErr } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: userId,
            first_name: firstName.trim().slice(0, 80),
            last_name: lastName.trim().slice(0, 80),
            email: email.trim().slice(0, 255),
          } as never,
          { onConflict: "user_id" },
        );
      if (profileErr) {
        console.warn("[AccountStep] profile upsert warning", profileErr);
      }

      // Seed onboarding state. If the user entered the wizard with
      // ?intent=claim&facility_id=…, prefill selected_facility_id so the
      // Find or List step jumps straight to "Continue with this facility".
      await advance({
        current_step: "verify_email",
        ...(intent === "claim" && claimFacilityId
          ? { selected_facility_id: claimFacilityId, mode: "claim" }
          : {}),
      });
      trackEvent("provider_onboarding_step_submit", {
        step_name: "account",
        mode: intent === "claim" && claimFacilityId ? "claim" : null,
        plan: null,
      });

      onAdvance();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-up failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">
          Create your provider account
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          We'll verify your email next.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="acct-first-name" className="text-xs font-medium text-slate-700">
              First name
            </Label>
            <Input
              id="acct-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoComplete="given-name"
              className="mt-1 h-10"
            />
          </div>
          <div>
            <Label htmlFor="acct-last-name" className="text-xs font-medium text-slate-700">
              Last name
            </Label>
            <Input
              id="acct-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              autoComplete="family-name"
              className="mt-1 h-10"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="acct-email" className="text-xs font-medium text-slate-700">
            Work email
          </Label>
          <Input
            id="acct-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 h-10"
          />
        </div>

        <div>
          <Label htmlFor="acct-password" className="text-xs font-medium text-slate-700">
            Password
          </Label>
          <Input
            id="acct-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 h-10"
            aria-describedby="acct-password-help"
          />
          <p
            id="acct-password-help"
            className={`mt-1 text-[11px] ${passwordOk || password.length === 0 ? "text-slate-500" : "text-red-600"}`}
          >
            At least 8 characters, with at least one letter and one number.
          </p>
        </div>

        <div>
          <Label htmlFor="acct-confirm" className="text-xs font-medium text-slate-700">
            Confirm password
          </Label>
          <Input
            id="acct-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="mt-1 h-10"
          />
          {confirm.length > 0 && !matchOk && (
            <p className="mt-1 text-[11px] text-red-600">Passwords don't match.</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-[#1B365D] hover:bg-[#142a4a] gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Creating your account…
            </>
          ) : (
            "Create account & verify"
          )}
        </Button>
      </form>

      <p className="text-xs text-slate-600 text-center">
        Already have an account?{" "}
        <Link
          to="/login?return_to=/provider/onboarding"
          className="text-[#1B365D] hover:underline font-medium"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
