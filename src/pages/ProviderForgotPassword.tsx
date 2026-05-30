import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowRight, ArrowLeft, CheckCircle, KeyRound } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { providerNavLinks } from "@/data/providerNavLinks";
import {
  PasswordStrengthIndicator,
  calculatePasswordStrength,
} from "@/components/ui/password-strength-indicator";

const emailSchema = z
  .string()
  .trim()
  .email({ message: "Please enter a valid email address" })
  .max(255, { message: "Email is too long" });

type Stage = "email" | "code" | "success";

export default function ProviderForgotPassword() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const passwordStrength = calculatePasswordStrength(newPassword);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = emailSchema.safeParse(email);
    if (!result.success) {
      toast({
        title: "Invalid Email",
        description: result.error.errors[0]?.message || "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error: invokeError } = await supabase.functions.invoke("send-password-reset", {
        body: { email },
      });
      if (invokeError) {
        toast({ title: "Error", description: invokeError.message, variant: "destructive" });
        return;
      }
      setStage("code");
      toast({
        title: "Code sent",
        description: `Check ${email} for a 6-digit reset code.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^\d{6}$/.test(code.trim())) {
      toast({ title: "Invalid code", description: "Enter the 6-digit code.", variant: "destructive" });
      return;
    }
    if (passwordStrength.score < 3) {
      toast({
        title: "Weak password",
        description: "Please choose a stronger password (at least 8 characters).",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("confirm-password-reset", {
        body: {
          email: email.trim().toLowerCase(),
          code: code.trim(),
          newPassword,
        },
      });
      if (invokeError) {
        toast({ title: "Error", description: invokeError.message, variant: "destructive" });
        return;
      }
      if (data?.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      setStage("success");
      toast({ title: "Password updated", description: "You can now sign in with your new password." });
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Forgot Password | RehabLookup</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="flex min-h-screen flex-col bg-muted/30">
        <Header
          navLinks={providerNavLinks}
          ctaLink="/provider-signup"
          ctaLabel="Get Started"
          variant="provider"
        />

        <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
          <div className="w-full max-w-md animate-step-enter space-y-5">
            <section className="rounded-2xl border border-border bg-card shadow-sm shadow-foreground/[0.03] p-6 sm:p-8">
              {/* Card header — icon + title + subtitle */}
              <div className="text-center mb-6">
                <div
                  className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center ring-1 ${
                    stage === "success"
                      ? "bg-emerald-100 dark:bg-emerald-900/30 ring-emerald-200 dark:ring-emerald-800/60"
                      : "bg-primary/10 ring-primary/15"
                  }`}
                >
                  {stage === "email" && <Mail className="h-7 w-7 text-primary" />}
                  {stage === "code" && <KeyRound className="h-7 w-7 text-primary" />}
                  {stage === "success" && <CheckCircle className="h-7 w-7 text-emerald-600" />}
                </div>
                <h1 className="mt-4 font-display text-xl sm:text-2xl font-bold text-foreground">
                  {stage === "email"
                    ? "Forgot password?"
                    : stage === "code"
                      ? "Enter your code"
                      : "Password updated"}
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {stage === "email"
                    ? "Enter your email and we'll send a 6-digit reset code."
                    : stage === "code"
                      ? `We sent a 6-digit code to ${email}. It expires in 15 minutes.`
                      : "You can now sign in with your new password."}
                </p>
              </div>

              {stage === "email" && (
                <form onSubmit={handleSendCode} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@facility.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-10 pl-10 text-sm"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={isLoading}>
                    {isLoading ? "Sending..." : "Send 6-digit code"}
                    {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>

                  <Link to="/login" className="block">
                    <Button type="button" variant="ghost" className="w-full h-10 text-sm">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Sign In
                    </Button>
                  </Link>
                </form>
              )}

              {stage === "code" && (
                <form onSubmit={handleConfirm} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="code" className="text-sm font-medium">
                      6-digit code
                    </Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="123456"
                        className="h-10 pl-10 text-center tracking-widest font-mono"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="new-password" className="text-sm font-medium">
                      New password
                    </Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      minLength={8}
                      autoComplete="new-password"
                      required
                    />
                    {newPassword.length > 0 && <PasswordStrengthIndicator password={newPassword} />}
                  </div>

                  <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={isLoading}>
                    {isLoading ? "Updating..." : "Reset password"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full h-10 text-sm"
                    onClick={() => {
                      setStage("email");
                      setCode("");
                      setNewPassword("");
                    }}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Use a different email
                  </Button>
                </form>
              )}

              {stage === "success" && (
                <Button className="w-full h-11 text-sm font-semibold" onClick={() => navigate("/login")}>
                  Sign in
                </Button>
              )}
            </section>

            {stage !== "success" && (
              <p className="text-center text-sm text-muted-foreground">
                Need help?{" "}
                <Link to="/provider-support" className="text-primary font-medium hover:underline">
                  Contact support
                </Link>
              </p>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
