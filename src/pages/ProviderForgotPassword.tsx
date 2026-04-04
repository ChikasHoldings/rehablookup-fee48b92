import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { providerNavLinks } from "@/data/providerNavLinks";

const emailSchema = z.string().trim().email({ message: "Please enter a valid email address" }).max(255, { message: "Email is too long" });

export default function ProviderForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email with zod
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
      const redirectUrl = `${window.location.origin}/provider-reset-password`;
      
      const { data, error: invokeError } = await supabase.functions.invoke('send-password-reset', {
        body: { email, redirectTo: redirectUrl },
      });
      const error = invokeError || (data?.error ? { message: data.error } : null);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setIsEmailSent(true);
        toast({
          title: "Reset Email Sent",
          description: "Check your email for the password reset link.",
        });
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

  const handleResend = async () => {
    setIsLoading(true);
    
    try {
      const redirectUrl = `${window.location.origin}/provider-reset-password`;
      
      const { data, error: invokeError } = await supabase.functions.invoke('send-password-reset', {
        body: { email, redirectTo: redirectUrl },
      });
      const error = invokeError || (data?.error ? { message: data.error } : null);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email Resent",
          description: "A new password reset link has been sent to your email.",
        });
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

  if (isEmailSent) {
    return (
      <>
      <Helmet><title>Check Your Email | RehabLookup</title><meta name="robots" content="noindex, nofollow" /></Helmet>
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
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-7 w-7 text-primary" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                Check Your Email
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We've sent a password reset link to:
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">{email}</p>
            </div>

            {/* Card Container */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Click the link in the email to reset your password. The link will expire in 1 hour.
                </p>
                <p className="text-sm text-muted-foreground">
                  If you don't see the email, check your spam folder.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full h-10 text-sm"
                  onClick={handleResend}
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Resend Email"}
                </Button>
                
                <Link to="/login" className="block">
                  <Button variant="ghost" className="w-full h-10 text-sm">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            </div>

            {/* Footer Links */}
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                Need help?{" "}
                <Link to="/provider-support" className="text-primary hover:underline">
                  Contact support
                </Link>
              </p>
            </div>
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
              Forgot Password?
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your email and we'll send you a reset link
            </p>
          </div>

          {/* Card Container */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
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

              <Button
                type="submit"
                className="w-full h-10 text-sm font-semibold"
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
                {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>

              <Link to="/login" className="block">
                <Button variant="ghost" className="w-full h-10 text-sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Button>
              </Link>
            </form>
          </div>

          {/* Footer Links */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/provider-signup" className="text-primary hover:underline font-medium">
                List your facility
              </Link>
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
