import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { validateEmail } from "@/lib/facilitySanitization";
import { trackEvent } from "@/lib/analytics";
import { safeReturnTo } from "@/lib/safeReturnTo";
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
  const claimFacilitySlug = searchParams.get("facility_slug") || null;
  const intent = searchParams.get("intent"); // "claim" | null

  // Audit fix (2026-05-23): the "Sign in" link previously sent users to
  // `/login?return_to=/provider/onboarding` — wrong param name
  // (`return_to` vs `returnTo`, Login.tsx only reads the latter) AND
  // dropped the original `?intent=claim&facility_id=…` so a returning
  // provider lost their facility context on the round-trip. Now we
  // forward the entire current URL (path + search) through a sanitized
  // `?returnTo=`, so Login can route them back to the same wizard
  // entry point with the claim deep link intact.
  const signInHref = useMemo(() => {
    const here =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/provider/onboarding";
    const sanitized = safeReturnTo(here) ?? "/provider/onboarding";
    return `/login?returnTo=${encodeURIComponent(sanitized)}`;
  }, [searchParams]);

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
      // Surface "already registered" errors as a sign-in prompt instead
      // of a generic failure toast. register-provider-account returns
      // 409 with code='email_in_use' when the email is taken; older
      // deployments may return the raw "already exists" string, so we
      // match both.
      const detectAlreadyRegistered = (msg: string | undefined): boolean =>
        !!msg && /already (registered|in use|exists)|duplicate/i.test(msg);

      if (error) {
        if (detectAlreadyRegistered(error.message)) {
          toast.error("An account with this email already exists. Use the sign-in page instead.");
        } else {
          toast.error(error.message || "Sign-up failed. Please try again.");
        }
        setSubmitting(false);
        return;
      }
      if (data?.error) {
        if (detectAlreadyRegistered(data.error) || data?.code === "email_in_use") {
          toast.error("An account with this email already exists. Use the sign-in page instead.");
        } else {
          toast.error(data.error);
        }
        setSubmitting(false);
        return;
      }
      if (!data?.userId) {
        toast.error("Unable to create your account. Please try again.");
        setSubmitting(false);
        return;
      }

      // Sign in so the upsert below runs under the user's RLS context.
      // register-provider-account v1.2.0 sets email_confirm:true upfront so
      // password sign-in succeeds. The user is NOT considered verified
      // until Step 2 finishes — that's gated downstream via
      // profiles.email_verified_at, written by verify-code only after the
      // 6-digit OTP succeeds. So a session here only unlocks navigating
      // the wizard; nothing externally consequential happens without OTP.
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInErr) {
        // Stale unconfirmed user from before v1.2.0? Surface a helpful
        // message instead of the generic "couldn't sign you in". The user
        // can recover by signing in directly (which triggers our OTP flow)
        // or resetting their password.
        const isEmailNotConfirmed =
          /email.*not.*confirm/i.test(signInErr.message ?? "") ||
          /unconfirm/i.test(signInErr.message ?? "");
        toast.error(
          isEmailNotConfirmed
            ? "Your account exists but isn't fully activated. Use 'Sign in' on the login page — we'll send you a fresh verification code."
            : signInErr.message || "Couldn't sign you in. Please try the sign-in form.",
        );
        setSubmitting(false);
        return;
      }

      // Defensive profile-row upsert. The handle_new_provider() trigger
      // (migration 20260529000000) should have already inserted a row
      // when register-provider-account called admin.createUser, but
      // the wizard's downstream writes assume a row exists. A
      // duplicate-key error here is the happy path.
      //
      // Audit fix (2026-05-23): previously this only logged a warning
      // on failure, which masked the rare case where the trigger and
      // this fallback both fail — downstream verify-code / plan-set /
      // onboarding-complete writes would silently no-op against a
      // missing row, and the user would appear to progress while their
      // profile remained un-flagged. Treat any non-duplicate error as
      // fatal so the user is told to retry instead of marching forward
      // into a broken state.
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
        const code = (profileErr as { code?: string }).code;
        // 23505 = duplicate key — expected when the trigger already
        // inserted the row before us. Anything else is an actual
        // failure (RLS, FK, network, etc.) we shouldn't paper over.
        if (code !== "23505") {
          console.error("[AccountStep] profile upsert failed", profileErr);
          toast.error(
            "We created your account but couldn't finish setting it up. Please retry — or sign in from the login page if the issue persists.",
          );
          setSubmitting(false);
          return;
        }
        console.warn("[AccountStep] profile upsert duplicate (expected)", profileErr);
      }

      // Seed onboarding state. If the user entered with ?intent=claim
      // and EITHER ?facility_id=<uuid> or ?facility_slug=<slug>, resolve
      // the slug to an id (if needed) and prefill selected_facility_id
      // so FindOrListStep jumps straight to "Continue with this facility".
      // Legacy /provider/claim/:slug redirects pass facility_slug.
      //
      // Audit fix (2026-05-23): when the slug/id can't be resolved we
      // used to fall through silently and seed the row WITHOUT a
      // facility — the user would then advance to VerifyEmailStep
      // believing they were claiming something, only to hit a generic
      // "facility not found" on BuildStep. Now we surface a toast at
      // signup time so the user knows their deep link is dead and can
      // continue with the regular "search after signup" flow without
      // wasting time on email verification under false pretenses.
      let resolvedClaimFacilityId = claimFacilityId;
      if (intent === "claim" && !resolvedClaimFacilityId && claimFacilitySlug) {
        try {
          const { data: lookup } = await supabase
            .from("public_facilities")
            .select("id")
            .eq("slug", claimFacilitySlug)
            .maybeSingle();
          resolvedClaimFacilityId = (lookup as { id?: string } | null)?.id ?? null;
        } catch (e) {
          console.warn("[AccountStep] facility_slug→id lookup failed", e);
        }
      }
      if (intent === "claim" && (claimFacilityId || claimFacilitySlug) && !resolvedClaimFacilityId) {
        toast.message(
          "We couldn't find the facility from your link — you can search for it after verifying your email.",
          { duration: 6000 },
        );
      }
      await advance({
        current_step: "verify_email",
        ...(intent === "claim" && resolvedClaimFacilityId
          ? { selected_facility_id: resolvedClaimFacilityId, mode: "claim" }
          : {}),
      });
      trackEvent("provider_onboarding_step_submit", {
        step_name: "account",
        mode: intent === "claim" && resolvedClaimFacilityId ? "claim" : null,
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
          to={signInHref}
          className="text-[#1B365D] hover:underline font-medium"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
