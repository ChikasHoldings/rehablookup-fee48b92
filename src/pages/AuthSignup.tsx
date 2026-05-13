/**
 * AuthSignup — minimal provider signup
 * ────────────────────────────────────
 * Creates the auth account + provider profile. After email verification,
 * routes the user to /provider/onboarding (or `?returnTo=...` if the caller
 * passed a destination — e.g. /provider/claim/:slug from the "Claim This
 * Listing" entry point on facility pages).
 *
 * Replaces the auth steps of the old monolithic /provider-signup. The
 * facility-creation portion now lives at /provider/onboarding/new-listing
 * which delegates back to ProviderSignup at step 3.
 */

import { useEffect, useState, type FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  PasswordStrengthIndicator,
  calculatePasswordStrength,
} from "@/components/ui/password-strength-indicator";
import { EmailVerificationStep } from "@/components/provider/EmailVerificationStep";
import { supabase } from "@/integrations/supabase/client";
import {
  sanitizePersonName,
  validateEmail,
} from "@/lib/facilitySanitization";
import { Loader2, ShieldCheck } from "lucide-react";

type Stage = "form" | "verify" | "finalizing";

export default function AuthSignup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");

  const [stage, setStage] = useState<Stage>("form");
  const [submitting, setSubmitting] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  // If the visitor already has a session, skip the form entirely.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled || !session?.user) return;
      navigate(returnTo ?? "/provider/onboarding", { replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [navigate, returnTo]);

  const passwordStrength = calculatePasswordStrength(password);
  const formValid =
    firstName.trim().length >= 1 &&
    lastName.trim().length >= 1 &&
    email.trim().length > 0 &&
    passwordStrength.score >= 3;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!formValid || submitting) return;

    // Local sanity check on the email before sending it through signUp.
    try {
      validateEmail(email);
    } catch (err) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const [seekerResult, adminResult] = await Promise.all([
        supabase.rpc("is_email_seeker", { p_email: email }),
        supabase.rpc("is_email_admin", { p_email: email }),
      ]);

      if (!seekerResult.error && seekerResult.data) {
        toast.error(
          "This email is registered as a personal account. Use a different email for your facility."
        );
        setSubmitting(false);
        return;
      }
      if (!adminResult.error && adminResult.data) {
        toast.error(
          "This email is associated with an administrative account. Use a different email."
        );
        setSubmitting(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/provider/onboarding`,
          data: {
            account_type: "provider",
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes("already registered")) {
          toast.error(
            "An account with this email already exists. Try signing in instead."
          );
        } else {
          toast.error(error.message || "Sign-up failed. Please try again.");
        }
        setSubmitting(false);
        return;
      }

      if (!data.user) {
        toast.error("Unable to create your account. Please try again.");
        setSubmitting(false);
        return;
      }

      setAuthUserId(data.user.id);
      setStage("verify");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-up failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function finalizeAfterVerification() {
    setStage("finalizing");
    try {
      // The auth session is established by EmailVerificationStep's OTP verify.
      // Resolve the canonical userId from the live session to avoid trusting
      // any stale value.
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? authUserId;
      if (!userId) {
        toast.error("Session not established. Please sign in.");
        navigate("/login", { replace: true });
        return;
      }

      // Insert (or upsert) the provider profile row. Best-effort: if a row
      // already exists for this user (rare; would mean an interrupted prior
      // signup), don't block the redirect.
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: userId,
        first_name: sanitizePersonName(firstName),
        last_name: sanitizePersonName(lastName),
        email: email.trim().slice(0, 255),
      });
      if (profileError && !profileError.message.includes("duplicate")) {
        // Soft-warn: account is created and verified, profile is best-effort.
        toast.warning(
          "Your account is created, but we couldn't save profile details. You can update them in settings."
        );
      }

      toast.success("Account created — welcome aboard!");
      navigate(returnTo ?? "/provider/onboarding", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Finalization failed.");
      setStage("verify");
    }
  }

  return (
    <>
      <Helmet>
        <title>Create your provider account — RehabLookup</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14 max-w-md">
        <Card className="p-6 md:p-7 space-y-5">
          <header className="space-y-1.5">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-1">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <h1 className="font-display text-xl md:text-2xl font-bold text-foreground">
              Create your provider account
            </h1>
            <p className="text-sm text-muted-foreground">
              Just the basics — you'll add facility details on the next screen.
            </p>
          </header>

          {stage === "form" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="auth-signup-first">First name</Label>
                  <Input
                    id="auth-signup-first"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    autoComplete="given-name"
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="auth-signup-last">Last name</Label>
                  <Input
                    id="auth-signup-last"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    autoComplete="family-name"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="auth-signup-email">Work email</Label>
                <Input
                  id="auth-signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="auth-signup-password">Password</Label>
                <Input
                  id="auth-signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={submitting}
                />
                {password.length > 0 && (
                  <PasswordStrengthIndicator password={password} />
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!formValid || submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Creating account…
                  </>
                ) : (
                  "Continue"
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}

          {stage === "verify" && (
            <EmailVerificationStep
              email={email}
              onVerified={finalizeAfterVerification}
              onBack={() => setStage("form")}
            />
          )}

          {stage === "finalizing" && (
            <div className="flex flex-col items-center gap-2 py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">
                Setting up your account…
              </p>
            </div>
          )}
        </Card>
      </main>
      <Footer />
    </>
  );
}
