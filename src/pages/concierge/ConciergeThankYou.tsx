import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Header as PublicHeader } from "@/components/layout/Header";
import { Footer as PublicFooter } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  CheckCircle, 
  Loader2, 
  User, 
  Clock, 
  Mail, 
  Phone,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Shield,
  Home,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const STORAGE_KEY = "concierge_intake_draft";
const SUBMITTED_KEY = "concierge_submitted_sessions";

export default function ConciergeThankYou() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [inquiryId, setInquiryId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password creation state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const verifyAndSubmit = async () => {
      if (!sessionId) {
        setError("No payment session found");
        setIsVerifying(false);
        return;
      }

      // Check if already submitted for this session (idempotency)
      const submittedSessions = JSON.parse(localStorage.getItem(SUBMITTED_KEY) || "[]");
      if (submittedSessions.includes(sessionId)) {
        // Load saved data from localStorage for display
        const savedIntake = localStorage.getItem(STORAGE_KEY);
        if (savedIntake) {
          try {
            const data = JSON.parse(savedIntake)?.data || JSON.parse(savedIntake);
            setFirstName(data.firstName || null);
            setLastName(data.lastName || null);
            setUserEmail(data.email || null);
          } catch (e) {
            console.error("Failed to parse saved intake", e);
          }
        }
        setPaymentVerified(true);
        setIsVerifying(false);
        return;
      }

      try {
        // Verify payment
        const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
          "verify-concierge-payment",
          { body: { sessionId } }
        );

        if (verifyError) throw verifyError;

        if (!verifyData?.paid) {
          setError("Payment not verified. Please contact support.");
          setIsVerifying(false);
          return;
        }

        setPaymentVerified(true);
        setUserEmail(verifyData.email);

        // Get intake data from localStorage
        const savedIntake = localStorage.getItem(STORAGE_KEY);
        if (!savedIntake) {
          setError("Intake data not found. Please contact support if you completed payment.");
          setIsVerifying(false);
          return;
        }

        const intakeData = JSON.parse(savedIntake)?.data || JSON.parse(savedIntake);
        setFirstName(intakeData.firstName || null);
        setLastName(intakeData.lastName || null);
        setIsSubmitting(true);

        // Submit intake
        const { data: submitData, error: submitError } = await supabase.functions.invoke(
          "submit-concierge-intake",
          { body: { sessionId, intakeData } }
        );

        if (submitError) throw submitError;

        setInquiryId(submitData.inquiryId);

        // Mark as submitted for idempotency
        submittedSessions.push(sessionId);
        localStorage.setItem(SUBMITTED_KEY, JSON.stringify(submittedSessions));

        toast.success("Your placement request has been submitted!");

      } catch (err) {
        console.error("Verification/submission error:", err);
        setError("Something went wrong. Please contact support.");
      } finally {
        setIsVerifying(false);
        setIsSubmitting(false);
      }
    };

    verifyAndSubmit();
  }, [sessionId]);

  // Check auth status
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
    };
    checkAuth();
  }, []);

  const handleCreateAccount = async () => {
    if (!userEmail) {
      toast.error("Email not available");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsCreatingAccount(true);

    try {
      const trimmedEmail = userEmail.trim().toLowerCase();

      // CRITICAL: Check if email belongs to a provider or admin account first
      const [providerResult, adminResult] = await Promise.all([
        supabase.rpc('is_email_provider', { p_email: trimmedEmail }),
        supabase.rpc('is_email_admin', { p_email: trimmedEmail }),
      ]);

      if (!providerResult.error && providerResult.data) {
        toast.error("This email is registered as a facility provider. Please use a different email or log in to your provider account separately.");
        setIsCreatingAccount(false);
        return;
      }

      if (!adminResult.error && adminResult.data) {
        toast.error("This email is associated with an administrative account. Please use a different email.");
        setIsCreatingAccount(false);
        return;
      }

      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/account`,
          data: {
            first_name: firstName,
            last_name: lastName,
            account_type: "seeker",
          },
        },
      });

      if (authError) throw authError;

      // Guard: if signUp returned an existing session (email already registered),
      // don't proceed — the user needs to log in instead
      if (authData.user && !authData.session) {
        // User created but needs email confirmation — this is normal
      } else if (authData.user && authData.session) {
        // Check the user's metadata to ensure they're a seeker, not a provider
        const accountType = authData.user.user_metadata?.account_type;
        if (accountType && accountType !== 'seeker') {
          // Sign them out immediately — wrong account type
          await supabase.auth.signOut();
          toast.error("This email is already associated with another account type. Please use a different email.");
          setIsCreatingAccount(false);
          return;
        }
      }

      if (authData.user) {
        // Create seeker profile
        const { error: profileError } = await supabase
          .from("seeker_profiles")
          .insert({
            user_id: authData.user.id,
            first_name: firstName || "",
            last_name: lastName || "",
            email: trimmedEmail,
          });

        if (profileError) {
          console.error("Profile creation error:", profileError);
        }

        // Link inquiry to user
        if (inquiryId) {
          try {
            await supabase.functions.invoke("link-inquiry-to-user", {
              body: { inquiryId, userId: authData.user.id },
            });
          } catch (linkErr) {
            console.error("Inquiry link error:", linkErr);
          }
        }

        setAccountCreated(true);
        toast.success("Account created! Check your email to verify.");

        localStorage.removeItem(STORAGE_KEY);

        // Only redirect if they have an active session (auto-confirm on)
        if (authData.session) {
          setTimeout(() => {
            navigate("/account");
          }, 2000);
        }
      }
    } catch (err) {
      console.error("Account creation error:", err);
      const message = err instanceof Error ? err.message : "Failed to create account";
      
      if (message.includes("already registered")) {
        toast.error("An account with this email already exists. Please log in instead.");
      } else {
        toast.error(message);
      }
    } finally {
      setIsCreatingAccount(false);
    }
  };

  if (isVerifying || isSubmitting) {
    return (
      <>
        <Helmet>
          <title>Processing | RehabLookup Concierge</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <div className="min-h-screen flex flex-col bg-background">
          <PublicHeader />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">
                {isVerifying ? "Verifying your payment..." : "Submitting your placement request..."}
              </p>
            </div>
          </main>
          <PublicFooter />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Helmet>
          <title>Error | RehabLookup Concierge</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <div className="min-h-screen flex flex-col bg-background">
          <PublicHeader />
          <main className="flex-1 flex items-center justify-center py-12">
            <div className="container mx-auto px-4 max-w-md text-center">
              <Card className="border-destructive">
                <CardContent className="pt-8 pb-6">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">⚠️</span>
                  </div>
                  <h1 className="text-xl font-semibold mb-2">Something Went Wrong</h1>
                  <p className="text-muted-foreground mb-6">{error}</p>
                  <div className="flex flex-col gap-3">
                    <Button asChild>
                      <Link to="/concierge/intake">Return to Intake</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <a href="mailto:placement@rehablookup.com">Contact Support</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
          <PublicFooter />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Thank You | RehabLookup Placement</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gradient-to-b from-green-50/50 to-background dark:from-green-950/20">
        <PublicHeader />

        <main className="flex-1 py-8 sm:py-12">
          <div className="container mx-auto px-4 max-w-xl">
            {/* Success Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="border-0 shadow-xl overflow-hidden">
                {/* Success Header */}
                <div className="bg-gradient-to-br from-green-500 to-green-600 px-6 py-8 text-center text-white">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircle className="h-10 w-10 text-white" />
                  </motion.div>
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                    {firstName ? `Thank You, ${firstName}!` : "Thank You!"}
                  </h1>
                  <p className="text-green-100 text-lg">
                    Your placement request has been received
                  </p>
                </div>

                <CardContent className="p-6">
                  {/* What Happens Next */}
                  <div className="mb-8">
                    <h2 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      What Happens Next
                    </h2>
                    <div className="space-y-4">
                      <div className="flex gap-4 items-start">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Clock className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">24-48 Hour Review</p>
                          <p className="text-sm text-muted-foreground">
                            A placement advisor will personally review your request
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4 items-start">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Facility Introductions</p>
                          <p className="text-sm text-muted-foreground">
                            We'll connect you with verified treatment programs that fit your needs
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4 items-start">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Phone className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Direct Contact</p>
                          <p className="text-sm text-muted-foreground">
                            Selected programs will reach out to discuss your options
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Create Account Section */}
                  {!isLoggedIn && !accountCreated && (
                    <Collapsible open={showPasswordSection} onOpenChange={setShowPasswordSection}>
                      <div className="border rounded-lg overflow-hidden">
                        <CollapsibleTrigger asChild>
                          <button className="w-full px-4 py-4 flex items-center justify-between bg-muted/50 hover:bg-muted/70 transition-colors text-left">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Shield className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-semibold text-foreground">Create Account</p>
                                <p className="text-sm text-muted-foreground">Track your placement progress</p>
                              </div>
                            </div>
                            {showPasswordSection ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </button>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <AnimatePresence>
                            {showPasswordSection && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="px-4 pb-4 pt-2 border-t"
                              >
                                <p className="text-sm text-muted-foreground mb-4">
                                  Create a password to log in and track your placement request. Your email ({userEmail}) is already verified.
                                </p>
                                
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative mt-1.5">
                                      <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="At least 8 characters"
                                        className="pr-10"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                      >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                      </button>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                                    <Input
                                      id="confirmPassword"
                                      type={showPassword ? "text" : "password"}
                                      value={confirmPassword}
                                      onChange={(e) => setConfirmPassword(e.target.value)}
                                      placeholder="Re-enter password"
                                      className="mt-1.5"
                                    />
                                  </div>
                                  
                                  <Button
                                    onClick={handleCreateAccount}
                                    disabled={isCreatingAccount || password.length < 8 || password !== confirmPassword}
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
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  )}

                  {/* Account Created Success */}
                  {accountCreated && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-800 dark:text-green-200">Account Created!</p>
                          <p className="text-sm text-green-700 dark:text-green-300">Redirecting to your dashboard...</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Already Logged In CTA */}
                  {isLoggedIn && (
                    <Button asChild size="lg" className="w-full">
                      <Link to="/account">
                        <User className="mr-2 h-4 w-4" />
                        Go to Your Dashboard
                      </Link>
                    </Button>
                  )}

                  {/* Return Home */}
                  {!isLoggedIn && !accountCreated && (
                    <div className="mt-6 text-center">
                      <Button variant="ghost" asChild>
                        <Link to="/" className="text-muted-foreground">
                          <Home className="mr-2 h-4 w-4" />
                          Return to Home
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Support Footer */}
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>
                Questions? Contact us at{" "}
                <a 
                  href="mailto:placement@rehablookup.com" 
                  className="text-primary hover:underline font-medium"
                >
                  placement@rehablookup.com
                </a>
              </p>
            </div>
          </div>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
