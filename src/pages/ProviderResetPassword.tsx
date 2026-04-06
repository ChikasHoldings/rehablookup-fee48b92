import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, ArrowRight, CheckCircle, Eye, EyeOff } from "lucide-react";
import { PasswordStrengthIndicator } from "@/components/ui/password-strength-indicator";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { providerNavLinks } from "@/data/providerNavLinks";

const passwordSchema = z.string()
  .min(8, { message: "Password must be at least 8 characters long" })
  .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
  .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
  .regex(/[0-9]/, { message: "Password must contain at least one number" });

export default function ProviderResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST to catch PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsValidSession(true);
          setIsCheckingSession(false);
        } else if (event === "SIGNED_IN" && session) {
          // User is signed in (either from recovery link or existing session)
          setIsValidSession(true);
          setIsCheckingSession(false);
        }
      }
    );

    // Then check for existing session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // If we have a session, it's valid for password reset
      if (session) {
        setIsValidSession(true);
      }
      
      setIsCheckingSession(false);
    };

    checkSession();

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password with zod
    const result = passwordSchema.safeParse(password);
    if (!result.success) {
      toast({
        title: "Invalid Password",
        description: result.error.errors[0]?.message || "Please enter a valid password.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords match.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast({
          title: "Reset Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setIsSuccess(true);
        
        // Log password reset activity
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          supabase.functions.invoke("log-activity", {
            body: {
              user_id: session.user.id,
              event_type: "password_reset",
              event_description: "Password was reset successfully",
            },
          });
        }

        toast({
          title: "Password Reset Successfully",
          description: "Your password has been updated. You can now log in.",
        });

        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Helmet><title>Reset Password | RehabLookup</title><meta name="robots" content="noindex, nofollow" /></Helmet>
        <Header 
          navLinks={providerNavLinks} 
          ctaLink="/provider-signup" 
          ctaLabel="Get Started"
          variant="provider"
        />
        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-sm text-muted-foreground">Verifying reset link...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header 
          navLinks={providerNavLinks} 
          ctaLink="/provider-signup" 
          ctaLabel="Get Started"
          variant="provider"
        />
        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-md animate-step-enter">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="h-7 w-7 text-destructive" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                Invalid or Expired Link
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <Link to="/provider/forgot-password" className="block">
                <Button className="w-full h-10 text-sm font-semibold">
                  Request New Link
                </Button>
              </Link>
              <Link to="/login" className="block mt-3">
                <Button variant="ghost" className="w-full h-10 text-sm">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header 
          navLinks={providerNavLinks} 
          ctaLink="/provider-signup" 
          ctaLabel="Get Started"
          variant="provider"
        />
        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-md animate-step-enter text-center">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-7 w-7 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Password Reset Successfully
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your password has been updated. Redirecting to login...
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header 
        navLinks={providerNavLinks} 
        ctaLink="/provider-signup" 
        ctaLabel="Get Started"
        variant="provider"
      />
      
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-step-enter">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="font-display text-2xl font-bold text-foreground">
              Reset Your Password
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your new password below
            </p>
          </div>

          {/* Card Container */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 pl-10 pr-10 text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <PasswordStrengthIndicator password={password} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-10 pl-10 pr-10 text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-10 text-sm font-semibold"
                disabled={isLoading}
              >
                {isLoading ? "Resetting..." : "Reset Password"}
                {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>
          </div>

          {/* Footer Links */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Remember your password?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
