import { useState } from "react";
import { Helmet } from "react-helmet-async";
import headerLogo from "@/assets/logo-header.webp";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Mail,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Building2,
  Search,
  KeyRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  PasswordStrengthIndicator,
  calculatePasswordStrength,
} from "@/components/ui/password-strength-indicator";

const emailSchema = z.object({
  email: z.string().trim().email({ message: "Please enter a valid email address" }).max(255),
});

type AccountType = "provider" | "seeker" | "admin" | "unknown" | null;
type Stage = "email" | "code" | "success";

/**
 * /forgot-password — PROVIDER password recovery.
 *
 * Consumer accounts are retired, so a legacy seeker email is refused here
 * with an explanation instead of being emailed a reset code for an account
 * product that no longer has a destination. Admins keep their separate
 * process; providers are the only accounts this flow serves.
 */
const RETIRED_SEEKER_RESET_MESSAGE =
  "RehabLookup no longer offers personal accounts, so there is no password to reset. You can search, compare and contact treatment centers without signing in.";

export default function ForgotPassword() {
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedType, setDetectedType] = useState<AccountType>(null);
  const navigate = useNavigate();

  const passwordStrength = calculatePasswordStrength(newPassword);

  const detectAccountType = async (
    normalizedEmail: string,
  ): Promise<{ type: AccountType; blocked: boolean; message?: string }> => {
    const { data: isAdmin } = await supabase.rpc("is_email_admin", { p_email: normalizedEmail });
    if (isAdmin) {
      return {
        type: "admin",
        blocked: true,
        message:
          "Admin accounts use a separate password reset process. Please contact your administrator or use the admin login portal.",
      };
    }
    const { data: isProvider } = await supabase.rpc("is_email_provider", { p_email: normalizedEmail });
    if (isProvider) return { type: "provider", blocked: false };
    const { data: isSeeker } = await supabase.rpc("is_email_seeker", { p_email: normalizedEmail });
    if (isSeeker) {
      return { type: "seeker", blocked: true, message: RETIRED_SEEKER_RESET_MESSAGE };
    }
    return {
      type: "unknown",
      blocked: true,
      message: "No provider account found with this email address. Check the address, or list your facility to create one.",
    };
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.errors[0]?.message || "Please enter a valid email.");
      return;
    }

    setIsSubmitting(true);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const accountResult = await detectAccountType(normalizedEmail);
      setDetectedType(accountResult.type);

      if (accountResult.blocked) {
        setError(accountResult.message || "Unable to reset password for this account.");
        setIsSubmitting(false);
        return;
      }

      const { error: invokeErr } = await supabase.functions.invoke("send-password-reset", {
        body: { email: normalizedEmail },
      });

      if (invokeErr) {
        setError(invokeErr.message);
        setIsSubmitting(false);
        return;
      }
      setStage("code");
    } catch (err) {
      console.error("Password reset error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code from the email.");
      return;
    }
    if (passwordStrength.score < 3) {
      setError("Please choose a stronger password (at least 8 characters with a mix of types).");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("confirm-password-reset", {
        body: {
          email: email.trim().toLowerCase(),
          code: code.trim(),
          newPassword,
        },
      });
      if (invokeErr) {
        setError(invokeErr.message);
        setIsSubmitting(false);
        return;
      }
      if (data?.error) {
        setError(data.error);
        setIsSubmitting(false);
        return;
      }
      setStage("success");
    } catch (err) {
      console.error("Password confirm error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Icon + accent for each stage's card header.
  const stageHeader =
    stage === "success"
      ? {
          icon: <CheckCircle className="h-7 w-7 text-emerald-600" />,
          ring: "bg-emerald-100 dark:bg-emerald-900/30 ring-emerald-200 dark:ring-emerald-800/60",
          title: "Password updated",
          subtitle: "You can now sign in with your new password.",
        }
      : stage === "code"
        ? {
            icon: <KeyRound className="h-7 w-7 text-primary" />,
            ring: "bg-primary/10 ring-primary/15",
            title: "Enter your code",
            subtitle: `We sent a 6-digit code to ${email}. It expires in 15 minutes.`,
          }
        : {
            icon: <Mail className="h-7 w-7 text-primary" />,
            ring: "bg-primary/10 ring-primary/15",
            title: "Reset your provider password",
            subtitle: "Enter your email and we'll send you a 6-digit code to reset your password.",
          };

  return (
    <>
      <Helmet>
        <title>
          {stage === "success" ? "Password Reset" : "Provider Password Reset"} | RehabLookup
        </title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen flex flex-col bg-muted/30">
        <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
          <div className="container h-14 flex items-center justify-between">
            <Link to="/" className="flex items-center">
              <img src={headerLogo} alt="RehabLookup" className="h-8 md:h-9 w-auto" width={197} height={36} />
            </Link>
            {stage !== "success" && (
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Back to Sign In
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
          <div className="w-full max-w-md space-y-5">
            {/* Primary card — icon + title + form */}
            <section className="rounded-2xl border border-border bg-card shadow-sm shadow-foreground/[0.03] p-6 sm:p-8">
              <div className="text-center mb-6">
                <div
                  className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center ring-1 ${stageHeader.ring}`}
                >
                  {stageHeader.icon}
                </div>
                <h1 className="mt-4 text-xl sm:text-2xl font-display font-bold text-foreground">
                  {stageHeader.title}
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">{stageHeader.subtitle}</p>
              </div>

              {error && stage !== "success" && (
                <Alert variant="destructive" className="mb-5">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                  {detectedType === "admin" && (
                    <Link
                      to="/admin/login"
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium hover:underline"
                    >
                      Go to Admin Login <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                  {detectedType === "seeker" && (
                    <Link
                      to="/search-results"
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium hover:underline"
                    >
                      Search treatment centers <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                  {detectedType === "unknown" && (
                    <div className="mt-3 flex gap-2">
                      <Link to="/provider/onboarding">
                        <Button size="sm" variant="outline" className="text-xs">
                          List Your Facility
                        </Button>
                      </Link>
                    </div>
                  )}
                </Alert>
              )}

              {stage === "email" && (
                <form onSubmit={handleSendCode} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError(null);
                          setDetectedType(null);
                        }}
                        placeholder="you@example.com"
                        className="pl-10"
                        autoComplete="email"
                        autoCapitalize="none"
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                        Sending code…
                      </>
                    ) : (
                      "Send 6-digit code"
                    )}
                  </Button>
                </form>
              )}

              {stage === "code" && (
                <form onSubmit={handleConfirm} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="code">6-digit code</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={code}
                        onChange={(e) => {
                          setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                          setError(null);
                        }}
                        placeholder="123456"
                        className="pl-10 tracking-widest text-center text-lg font-mono"
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password">New password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setError(null);
                      }}
                      minLength={8}
                      autoComplete="new-password"
                      disabled={isSubmitting}
                      required
                    />
                    {newPassword.length > 0 && <PasswordStrengthIndicator password={newPassword} />}
                  </div>

                  <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                        Updating…
                      </>
                    ) : (
                      "Reset password"
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-sm"
                    onClick={() => {
                      setStage("email");
                      setCode("");
                      setNewPassword("");
                      setError(null);
                    }}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Use a different email
                  </Button>
                </form>
              )}

              {stage === "success" && (
                <Button className="w-full h-11" onClick={() => navigate("/login")}>
                  Sign in
                </Button>
              )}
            </section>

            {/* Footer link — outside the card, lighter touch */}
            {stage !== "success" && (
              <p className="text-center text-sm text-muted-foreground">
                Remember your password?{" "}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            )}

            {/* Secondary card (entry stage only). This flow is for provider
                accounts; consumers need no account at all, so the second
                option is the public directory rather than a signup. */}
            {stage === "email" && (
              <section className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-4 sm:p-5">
                <p className="text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-3">
                  Not a provider?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Link to="/provider/onboarding">
                    <Button variant="outline" className="w-full h-10 text-sm">
                      <Building2 className="h-4 w-4 mr-2" />
                      List Facility
                    </Button>
                  </Link>
                  <Link to="/search-results">
                    <Button variant="outline" className="w-full h-10 text-sm">
                      <Search className="h-4 w-4 mr-2" />
                      Find Treatment
                    </Button>
                  </Link>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
