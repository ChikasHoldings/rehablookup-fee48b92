import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Header as PublicHeader } from "@/components/layout/Header";
import { Footer as PublicFooter } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock, Mail, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type Step = "verify-email" | "set-password" | "success";

export default function ConciergeCreatePassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>("verify-email");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isEligible, setIsEligible] = useState(false);
  
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  const sessionId = searchParams.get("session_id");
  const emailParam = searchParams.get("email");

  // Verify eligibility (must have paid)
  useEffect(() => {
    const verifyEligibility = async () => {
      if (!sessionId) {
        toast.error("Invalid access. Please complete the intake process first.");
        navigate("/concierge");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke(
          "verify-concierge-payment",
          { body: { sessionId } }
        );

        if (error || !data?.paid) {
          toast.error("Payment not verified. Please complete payment first.");
          navigate("/concierge");
          return;
        }

        setEmail(data.email || emailParam || "");
        setIsEligible(true);
      } catch (err) {
        console.error("Eligibility check failed:", err);
        toast.error("Unable to verify eligibility");
        navigate("/concierge");
      } finally {
        setIsVerifying(false);
      }
    };

    verifyEligibility();
  }, [sessionId, emailParam, navigate]);

  const handleSendCode = async () => {
    if (!email) {
      toast.error("Email is required");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-verification-code', {
        body: { email },
      });

      if (error || data?.error) {
        toast.error(data?.error || "Failed to send verification code");
        return;
      }

      setCodeSent(true);
      toast.success("Verification code sent to your email");
    } catch (err) {
      console.error("Send code error:", err);
      toast.error("Failed to send verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }

    setIsLoading(true);
    try {
      // Verify the code via our custom edge function
      const { data, error } = await supabase.functions.invoke('verify-code', {
        body: { email, code: verificationCode },
      });

      if (error || data?.error) {
        toast.error(data?.error || "Invalid or expired code. Please try again.");
        return;
      }

      if (data?.success) {
        // CRITICAL: Check if email belongs to a provider or admin before creating account
        const [providerResult, adminResult] = await Promise.all([
          supabase.rpc('is_email_provider', { p_email: email.trim().toLowerCase() }),
          supabase.rpc('is_email_admin', { p_email: email.trim().toLowerCase() }),
        ]);

        if (!providerResult.error && providerResult.data) {
          toast.error("This email is registered as a facility provider. Please use a different email or log in to your provider account.");
          return;
        }

        if (!adminResult.error && adminResult.data) {
          toast.error("This email is associated with an administrative account. Please use a different email.");
          return;
        }

        // Now sign up the user
        const tempPassword = crypto.randomUUID();
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password: tempPassword,
          options: { data: { account_type: 'seeker' } },
        });
        
        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            toast.error("An account with this email already exists. Please log in instead.");
            return;
          }
          throw signUpError;
        }

        setStep("set-password");
        toast.success("Email verified!");
      }
    } catch (err) {
      console.error("Verify code error:", err);
      toast.error("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password.length > 128) {
      toast.error("Password must be 128 characters or less");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      // Link the concierge inquiry to this user
      const { data: { user } } = await supabase.auth.getUser();
      if (user && sessionId) {
        await supabase
          .from("concierge_inquiries")
          .update({ user_id: user.id })
          .eq("checkout_session_id", sessionId);
      }

      setStep("success");
      toast.success("Account created successfully!");

      // Redirect after short delay
      setTimeout(() => {
        navigate("/account");
      }, 2000);
    } catch (err) {
      console.error("Set password error:", err);
      toast.error("Failed to set password");
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <>
        <Helmet>
          <title>Create Account | RehabLookup</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <div className="min-h-screen flex flex-col bg-background">
          <PublicHeader />
          <main className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </main>
          <PublicFooter />
        </div>
      </>
    );
  }

  if (!isEligible) {
    return null; // Will redirect
  }

  return (
    <>
      <Helmet>
        <title>Create Account | RehabLookup</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-muted/30">
        <PublicHeader />

        <main className="flex-1 flex items-center justify-center py-12">
          <div className="container mx-auto px-4 max-w-md">
            <Card className="border-0 shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">
                  {step === "verify-email" && "Verify Your Email"}
                  {step === "set-password" && "Set Your Password"}
                  {step === "success" && "Account Created!"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {step === "verify-email" && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10"
                          placeholder="your@email.com"
                          disabled={codeSent}
                        />
                      </div>
                    </div>

                    {!codeSent ? (
                      <Button
                        onClick={handleSendCode}
                        disabled={isLoading || !email}
                        className="w-full"
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Send Verification Code
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Enter 6-digit code</Label>
                          <div className="flex justify-center">
                            <InputOTP
                              value={verificationCode}
                              onChange={setVerificationCode}
                              maxLength={6}
                            >
                              <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                        </div>

                        <Button
                          onClick={handleVerifyCode}
                          disabled={isLoading || verificationCode.length !== 6}
                          className="w-full"
                        >
                          {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Verify Code
                        </Button>

                        <Button
                          variant="ghost"
                          onClick={handleSendCode}
                          disabled={isLoading}
                          className="w-full text-sm"
                        >
                          Resend Code
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {step === "set-password" && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10"
                          placeholder="At least 8 characters"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10"
                          placeholder="Confirm your password"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleSetPassword}
                      disabled={isLoading || !password || !confirmPassword}
                      className="w-full"
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Create Account
                    </Button>
                  </div>
                )}

                {step === "success" && (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <p className="text-muted-foreground">
                      Redirecting to your account...
                    </p>
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                  </div>
                )}
              </CardContent>
            </Card>

            {step !== "success" && (
              <div className="mt-6 text-center text-sm text-muted-foreground">
                <p>
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            )}
          </div>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
