import { useState } from "react";
import { Helmet } from "react-helmet-async";
import headerLogo from "@/assets/logo-header.webp";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, ArrowLeft, AlertTriangle, CheckCircle, ExternalLink, Building2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const emailSchema = z.object({
  email: z.string().trim().email({ message: "Please enter a valid email address" }).max(255),
});

type AccountType = "provider" | "seeker" | "admin" | "unknown" | null;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [detectedType, setDetectedType] = useState<AccountType>(null);
  const navigate = useNavigate();

  const detectAccountType = async (normalizedEmail: string): Promise<{ type: AccountType; blocked: boolean; message?: string }> => {
    // Check admin first
    const { data: isAdmin } = await supabase.rpc('is_email_admin', { p_email: normalizedEmail });
    if (isAdmin) {
      return { 
        type: 'admin', 
        blocked: true, 
        message: "Admin accounts use a separate password reset process. Please contact your administrator or use the admin login portal." 
      };
    }

    // Check provider
    const { data: isProvider } = await supabase.rpc('is_email_provider', { p_email: normalizedEmail });
    if (isProvider) return { type: 'provider', blocked: false };

    // Check seeker
    const { data: isSeeker } = await supabase.rpc('is_email_seeker', { p_email: normalizedEmail });
    if (isSeeker) return { type: 'seeker', blocked: false };

    return { 
      type: 'unknown', 
      blocked: true, 
      message: "No account found with this email address. Please check your email or create a new account." 
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      // Detect account type first
      const accountResult = await detectAccountType(normalizedEmail);
      setDetectedType(accountResult.type);
      
      if (accountResult.blocked) {
        setError(accountResult.message || "Unable to reset password for this account.");
        setIsSubmitting(false);
        return;
      }

      // Determine redirect URL based on account type
      const redirectBase = window.location.origin;
      const redirectTo = accountResult.type === "provider" 
        ? `${redirectBase}/provider/reset-password`
        : `${redirectBase}/seeker/reset-password`;

      const { data: resetData, error: resetError } = await supabase.functions.invoke('send-password-reset', {
        body: { email: normalizedEmail, redirectTo },
      });
      
      if (resetData?.error) {
        setError(resetData.error);
        setIsSubmitting(false);
        return;
      }

      if (resetError) {
        setError(resetError.message);
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error("Password reset error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <>
      <Helmet>
        <title>Reset Password | RehabLookup</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen flex flex-col bg-background">
        <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
          <div className="container h-14 flex items-center">
            <Link to="/" className="flex items-center">
              <img src={headerLogo} alt="RehabLookup" className="h-8 md:h-9 w-auto" />
            </Link>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">Check your email</h1>
            <p className="text-muted-foreground mb-6">
              We've sent password reset instructions to <span className="font-medium text-foreground">{email}</span>
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              If you don't see the email, check your spam folder. The link will expire in 24 hours.
            </p>
            <div className="space-y-3">
              <Link to="/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                className="w-full text-sm"
                onClick={() => {
                  setSuccess(false);
                  setEmail("");
                  setDetectedType(null);
                }}
              >
                Try a different email
              </Button>
            </div>
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
            <img src={headerLogo} alt="RehabLookup" className="h-8 md:h-9 w-auto" />
          </Link>
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Back to Sign In
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-display font-bold text-foreground">Reset your password</h1>
            <p className="text-muted-foreground mt-2">
              Enter your email address and we'll send you a link to reset your password.
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

          <form onSubmit={handleSubmit} className="space-y-5">
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
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>

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
