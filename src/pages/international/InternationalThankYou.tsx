import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Header as PublicHeader } from "@/components/layout/Header";
import { Footer as PublicFooter } from "@/components/layout/Footer";
import { 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  Loader2,
  Lock,
  User,
  ChevronDown,
  ChevronUp,
  Home
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LocationState {
  firstName?: string;
  email?: string;
  inquiryId?: string;
}

export default function InternationalThankYou() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const state = location.state as LocationState | null;
  
  const [firstName, setFirstName] = useState(state?.firstName || "");
  const [email, setEmail] = useState(state?.email || "");
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);

  useEffect(() => {
    // Trigger confetti on mount
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#10b981', '#3b82f6', '#8b5cf6'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#10b981', '#3b82f6', '#8b5cf6'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();

    // Try to get data from localStorage if not in state
    if (!firstName || !email) {
      try {
        const intakeData = localStorage.getItem("international_intake_data");
        if (intakeData) {
          const parsed = JSON.parse(intakeData);
          if (parsed.first_name && !firstName) setFirstName(parsed.first_name);
          if (parsed.email && !email) setEmail(parsed.email);
          localStorage.removeItem("international_intake_data");
        }
      } catch (e) {
        console.error("Error parsing intake data:", e);
      }
    }
  }, []);

  const handleCreateAccount = async () => {
    if (password.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }

    if (password.length > 128) {
      toast({
        title: "Password Too Long",
        description: "Password must be 128 characters or less.",
        variant: "destructive",
      });
      return;
    }

    // Prevent double-submit
    if (isCreatingAccount) return;

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingAccount(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();

      // CRITICAL: Check if email belongs to a provider or admin account first
      const [providerResult, adminResult] = await Promise.all([
        supabase.rpc('is_email_provider', { p_email: trimmedEmail }),
        supabase.rpc('is_email_admin', { p_email: trimmedEmail }),
      ]);

      if (!providerResult.error && providerResult.data) {
        toast({
          title: "Account Exists",
          description: "This email is registered as a facility provider. Please use a different email or log in to your provider account separately.",
          variant: "destructive",
        });
        setIsCreatingAccount(false);
        return;
      }

      if (!adminResult.error && adminResult.data) {
        toast({
          title: "Account Exists",
          description: "This email is associated with an administrative account. Please use a different email.",
          variant: "destructive",
        });
        setIsCreatingAccount(false);
        return;
      }

      // Create user account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/account`,
          data: {
            first_name: firstName,
            account_type: 'seeker',
          },
        },
      });

      if (signUpError) throw signUpError;

      if (signUpData.user) {
        // Guard: if signUp returned an existing session with wrong account type, sign out
        if (signUpData.session) {
          const accountType = signUpData.user.user_metadata?.account_type;
          if (accountType && accountType !== 'seeker') {
            await supabase.auth.signOut();
            toast({
              title: "Account Conflict",
              description: "This email is already associated with another account type. Please use a different email.",
              variant: "destructive",
            });
            setIsCreatingAccount(false);
            return;
          }
        }

        // Create seeker profile
        await supabase.from("seeker_profiles").insert({
          user_id: signUpData.user.id,
          first_name: firstName,
          email: trimmedEmail,
        });

        // Link international cases to this user
        await supabase
          .from("international_placement_cases")
          .update({ user_id: signUpData.user.id })
          .eq("client_email", trimmedEmail)
          .is("user_id", null);

        setAccountCreated(true);
        toast({
          title: "Account Created!",
          description: "Check your email to verify, then track your placement progress.",
        });

        // Only redirect if they have an active session
        if (signUpData.session) {
          setTimeout(() => {
            navigate("/account/international");
          }, 1500);
        }
      }
    } catch (err: any) {
      console.error("Account creation error:", err);
      
      let errorMessage = "Failed to create account. Please try again.";
      if (err.message?.includes("already registered")) {
        errorMessage = "An account with this email already exists. Please log in instead.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const steps = [
    {
      number: 1,
      title: "Application Received",
      description: "Your placement request has been submitted",
      completed: true,
    },
    {
      number: 2,
      title: "Advisor Assignment",
      description: "A dedicated advisor will review your case within 24 hours",
      active: true,
    },
    {
      number: 3,
      title: "Facility Recommendations",
      description: "Receive personalized US treatment center options",
      active: false,
    },
    {
      number: 4,
      title: "Placement Coordination",
      description: "We handle admission coordination with your chosen facility",
      active: false,
    },
  ];

  return (
    <>
      <SEO
        title="Application Submitted | International Placement"
        description="Your international placement application has been received."
        noindex
      />
      
      <div className="min-h-screen flex flex-col bg-background">
        <PublicHeader />
        
        <main className="flex-1 flex items-center justify-center py-8 md:py-12 px-4">
          <div className="max-w-2xl w-full">
            {/* Success Header */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-6 md:mb-8"
            >
              <div className="relative inline-block mb-4 md:mb-6">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-10 w-10 md:h-12 md:w-12 text-primary" />
                </div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                  className="absolute -top-2 -right-2"
                >
                  <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </motion.div>
              </div>
              
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2 md:mb-3">
                {firstName ? `Thank You, ${firstName}!` : "Thank You!"}
              </h1>
              
              <p className="text-base md:text-lg text-muted-foreground max-w-md mx-auto">
                Your international placement application has been successfully submitted. Our team will be in touch within 24 hours.
              </p>
            </motion.div>

            {/* Timeline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground mb-5 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    What Happens Next
                  </h3>
                  
                  <div className="space-y-4">
                    {steps.map((step, index) => (
                      <div
                        key={step.number}
                        className={`flex gap-4 ${index !== steps.length - 1 ? "pb-4 border-b" : ""}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold ${
                          step.completed 
                            ? "bg-primary/20 text-primary"
                            : step.active 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted text-muted-foreground"
                        }`}>
                          {step.completed ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            step.number
                          )}
                        </div>
                        <div>
                          <p className={`font-medium ${step.active || step.completed ? "text-foreground" : "text-muted-foreground"}`}>
                            {step.title}
                            {step.active && (
                              <span className="ml-2 text-xs font-normal bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                Current Step
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Optional Password Creation */}
            {!accountCreated && email && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="mb-6 border-primary/20">
                  <CardContent className="pt-6">
                    <button
                      onClick={() => setShowPasswordSection(!showPasswordSection)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            Create an Account to Track Progress
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Optional - Set a password to monitor your placement status
                          </p>
                        </div>
                      </div>
                      {showPasswordSection ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>

                    <AnimatePresence>
                      {showPasswordSection && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-6 space-y-4">
                            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                              <p>Your email <span className="font-medium text-foreground">{email}</span> has already been verified. Just set a password below.</p>
                            </div>

                            <div className="space-y-3">
                              <div>
                                <Label htmlFor="password">Password</Label>
                                <div className="relative mt-1.5">
                                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Create a password (min. 8 characters)"
                                    className="pl-10"
                                  />
                                </div>
                              </div>

                              <div>
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <div className="relative mt-1.5">
                                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm your password"
                                    className="pl-10"
                                  />
                                </div>
                              </div>
                            </div>

                            <Button
                              onClick={handleCreateAccount}
                              disabled={isCreatingAccount || !password || !confirmPassword}
                              className="w-full"
                            >
                              {isCreatingAccount ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Creating Account...
                                </>
                              ) : (
                                "Create Account"
                              )}
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Account Created Success */}
            {accountCreated && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card className="mb-6 border-primary/30 bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-6 w-6 text-primary" />
                      <div>
                        <h3 className="font-semibold text-foreground">Account Created!</h3>
                        <p className="text-sm text-muted-foreground">Redirecting you to your dashboard...</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-5 md:p-6 bg-muted/30 rounded-xl text-center"
            >
              <p className="text-sm text-muted-foreground mb-2">
                Questions about your international placement?
              </p>
              <a 
                href="mailto:international@rehablookup.com" 
                className="text-primary hover:underline font-medium"
              >
                international@rehablookup.com
              </a>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 md:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <Button asChild variant="outline" size="lg">
                <Link to="/">
                  <Home className="mr-2 h-4 w-4" />
                  Return to Homepage
                </Link>
              </Button>
            </motion.div>
          </div>
        </main>
        
        <PublicFooter />
      </div>
    </>
  );
}
