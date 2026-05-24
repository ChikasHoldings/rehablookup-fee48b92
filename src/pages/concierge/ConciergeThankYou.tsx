import { useState, useEffect, useRef } from "react";
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

export default function ConciergeThankYou() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
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

  const idParam = searchParams.get("id");

  // Guard against React strict mode double-fire
  const submissionInFlight = useRef(false);

  // Concierge is FREE for seekers — intake submits directly from the
  // intake page (submit-concierge-intake) and lands here with
  // ?id=<inquiryId> (and optionally ?channel=free|sms for analytics).
  // No Stripe verify, no idempotency replay — that's all handled
  // server-side by submit-concierge-intake's idempotency_key.
  useEffect(() => {
    if (submissionInFlight.current) return;
    submissionInFlight.current = true;

    if (!idParam) {
      setError("No request found");
      setIsVerifying(false);
      submissionInFlight.current = false;
      return;
    }

    setInquiryId(idParam);

    // Personalize from any saved intake draft, then clear it.
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

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("concierge_email_verified");
    localStorage.removeItem("concierge_phone_verified");
    localStorage.removeItem("concierge_draft_id");

    setIsVerifying(false);
    submissionInFlight.current = false;
  }, [idParam]);

  // Check auth status and listen for changes (e.g. user logs in from another tab)
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
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

    if (password.length > 128) {
      toast.error("Password must be 128 characters or less");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // Prevent double-submit
    if (isCreatingAccount) return;

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

      // Create user account via register-provider-account edge function
      // (accountType=seeker). Uses admin.createUser(email_confirm:true) so
      // Supabase never sends a magic-link confirmation email — seekers
      // arrive from the concierge flow already verified by intake.
      const { data: regData, error: regErr } = await supabase.functions.invoke(
        "register-provider-account",
        {
          body: {
            email: trimmedEmail,
            password,
            // Fallbacks intentionally generic — never use "Seeker" as a
            // user-facing display name. Welcome / greeting copy guards
            // empty first_name with "Hi there," so a "Friend" / "User"
            // placeholder only surfaces if the user later sees their
            // profile name field directly.
            firstName: firstName || "Friend",
            lastName: lastName || "User",
            accountType: "seeker",
            autoConfirm: true,
          },
        },
      );
      if (regErr || regData?.error) {
        const msg = regData?.error ?? regErr?.message ?? "Failed to create account.";
        toast.error(msg);
        setIsCreatingAccount(false);
        return;
      }
      if (!regData?.userId) {
        toast.error("Unable to create account. Please try again.");
        setIsCreatingAccount(false);
        return;
      }

      // Sign in with password to mint a session. email_confirm was set to
      // false by the edge function (default for new accounts), so we must
      // explicitly confirm here to allow signInWithPassword.
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      // Shape compatibility with the rest of this handler.
      const authData = {
        user: { id: regData.userId, user_metadata: { account_type: "seeker" } },
        session: signInErr ? null : { access_token: "", refresh_token: "" },
      } as {
        user: { id: string; user_metadata: { account_type: string } } | null;
        session: { access_token: string; refresh_token: string } | null;
      };

      if (signInErr) {
        console.warn("[ConciergeThankYou] signInWithPassword failed", signInErr.message);
        toast.success("Account created. Please sign in to continue.");
        navigate("/login");
        return;
      }

      if (authData.user) {
        // The handle_new_seeker trigger auto-creates seeker_profiles on signup
        // with account_type='seeker'. Only insert if the trigger didn't fire
        // (e.g. metadata missing). Use upsert to avoid conflicts.
        const { error: profileError } = await supabase
          .from("seeker_profiles")
          .upsert({
            user_id: authData.user.id,
            first_name: firstName || "",
            last_name: lastName || "",
            email: trimmedEmail,
          } as never, { onConflict: "user_id" });

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

        localStorage.removeItem(STORAGE_KEY);

        if (authData.session) {
          // Active session — redirect to dashboard
          toast.success("Account created! Redirecting to your dashboard...");
          setTimeout(() => {
            navigate("/account/requests");
          }, 2000);
        } else {
          // Needs email verification — don't promise redirect
          toast.success("Account created! Check your email to verify, then log in to track your placement.");
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

  if (isVerifying) {
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
                Preparing your placement summary…
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
                          <p className="font-medium text-foreground">Coordinator Reach-Out (within 1 business hour)</p>
                          <p className="text-sm text-muted-foreground">
                            A placement advisor reaches out to confirm details and answer questions.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4 items-start">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Facility Introductions (within 24-48 hours)</p>
                          <p className="text-sm text-muted-foreground">
                            We connect you with verified treatment programs that fit your needs.
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
                    <>
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

                      <div className="mt-3 text-center">
                        <p className="text-sm text-muted-foreground">
                          Already have an account?{" "}
                          <Link 
                            to={`/login?redirect=${encodeURIComponent('/account/requests')}`}
                            className="text-primary hover:underline font-medium"
                          >
                            Log in here
                          </Link>
                        </p>
                      </div>
                    </>
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
                          <p className="text-sm text-green-700 dark:text-green-300">
                            {isLoggedIn 
                              ? "Redirecting to your dashboard..." 
                              : "Check your email to verify, then log in to track your placement."}
                          </p>
                        </div>
                      </div>
                      {!isLoggedIn && (
                        <Button asChild size="sm" variant="outline" className="mt-3 ml-8">
                          <Link to={`/login?redirect=${encodeURIComponent('/account/requests')}`}>
                            Log In Now
                          </Link>
                        </Button>
                      )}
                    </motion.div>
                  )}

                  {/* Already Logged In CTA */}
                  {isLoggedIn && (
                    <Button asChild size="lg" className="w-full">
                      <Link to="/account/requests">
                        <User className="mr-2 h-4 w-4" />
                        View Your Placement
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

            {/* Crisis line — surfaces in front of every concierge submitter
                regardless of whether they flagged self-harm history.
                Substance-use placement is a high-stakes domain; 988 is
                always immediately available even while seekers wait for
                a coordinator. */}
            <div
              role="complementary"
              aria-label="Immediate crisis support"
              className="mt-6 rounded-lg border border-red-200 bg-red-50/70 p-4 text-sm text-red-900"
            >
              <p className="font-semibold">In crisis right now?</p>
              <p className="mt-1 leading-relaxed">
                Call or text{" "}
                <a href="tel:988" className="font-bold underline">
                  988
                </a>
                {" "}for the Suicide &amp; Crisis Lifeline, or visit{" "}
                <a
                  href="https://988lifeline.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline"
                >
                  988lifeline.org
                </a>
                . Trained counselors are available 24/7 — you don't have to
                wait for our coordinator.
              </p>
            </div>

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
              <p className="mt-2 text-xs text-muted-foreground/80">
                Curious how RehabLookup makes money?{" "}
                <Link
                  to="/how-we-make-money"
                  className="text-primary hover:underline font-medium"
                >
                  See our transparency page →
                </Link>
              </p>
            </div>
          </div>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
