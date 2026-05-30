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
  User,
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
    if (isSeeker) return { type: "seeker", blocked: false };
    return {
      type: "unknown",
      blocked: true,
      message: "No account found with this email address. Please check your email or create a new account.",
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

  if (stage === "success") {
    return (
      <>
        <Helmet>
          <title>Password Reset | RehabLookup</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <div className="min-h-screen flex flex-col bg-background">
          <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
            <div className="container h-14 flex items-center">
              <Link to="/" className="flex items-center">
                <img src={headerLogo} alt="RehabLookup" className="h-8 md:h-9 w-auto" width={197} height={36} />
              </Link>
            </div>
          </header>
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-md text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-display font-bold text-foreground mb-2">Password updated</h1>
              <p className="text-muted-foreground mb-8">You can now sign in with your new password.</p>
              <Button className="w-full" onClick={() => navigate("/login")}>
                Sign in
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Forgot Password | RehabLookup</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen flex flex-col bg-background">
        <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
          <div className="container h-14 flex items-center justify-between">
            <Link to="/" className="flex items-center">
              <img src={headerLogo} alt="RehabLookup" className="h-8 md:h-9 w-auto" width={197} height={36} />
            </Link>
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Back to Sign In
            </Link>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-display font-bold text-foreground">
                {stage === "email" ? "Reset your password" : "Enter your code"}
              </h1>
              <p className="text-muted-foreground mt-2">
                {stage === "email"
                  ? "Enter your email and we'll send you a 6-digit code to reset your password."
                  : `We sent a 6-digit code to ${email}. It expires in 15 minutes.`}
              </p>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-6">
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
                {detectedType === "unknown" && (
                  <div className="mt-3 flex gap-2">
                    <Link to="/signup">
                      <Button size="sm" variant="outline" className="text-xs">
                        Create Personal Account
                      </Button>
                    </Link>
                    <Link to="/provider-signup">
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
                  {newPassword.length > 0 && (
                    <PasswordStrengthIndicator password={newPassword} />
                  )}
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

            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">
                Remember your password?{" "}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </div>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Need an account?</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link to="/signup">
                <Button variant="outline" className="w-full h-10 text-sm">
                  <User className="h-4 w-4 mr-2" />
                  Personal
                </Button>
              </Link>
              <Link to="/provider-signup">
                <Button variant="outline" className="w-full h-10 text-sm">
                  <Building2 className="h-4 w-4 mr-2" />
                  Provider
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
