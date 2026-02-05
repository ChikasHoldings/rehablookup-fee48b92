import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Header as PublicHeader } from "@/components/layout/Header";
import { Footer as PublicFooter } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle, Loader2, User, LogIn, Clock, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ConciergeIntakeData } from "./ConciergeIntake";

const STORAGE_KEY = "concierge_intake_draft";
const SUBMITTED_KEY = "concierge_submitted_sessions";

export default function ConciergeThankYou() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [intakeSubmitted, setIntakeSubmitted] = useState(false);
  const [inquiryId, setInquiryId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setPaymentVerified(true);
        setIntakeSubmitted(true);
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
          setError("Intake data not found. Please complete the intake form again.");
          setIsVerifying(false);
          return;
        }

        const intakeData: ConciergeIntakeData = JSON.parse(savedIntake);
        setIsSubmitting(true);

        // Submit intake
        const { data: submitData, error: submitError } = await supabase.functions.invoke(
          "submit-concierge-intake",
          { body: { sessionId, intakeData } }
        );

        if (submitError) throw submitError;

        setInquiryId(submitData.inquiryId);
        setIntakeSubmitted(true);

        // Mark as submitted for idempotency
        submittedSessions.push(sessionId);
        localStorage.setItem(SUBMITTED_KEY, JSON.stringify(submittedSessions));

        // Clear the draft
        localStorage.removeItem(STORAGE_KEY);

        toast.success("Your intake has been submitted successfully!");

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
                {isVerifying ? "Verifying your payment..." : "Submitting your intake..."}
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
                      <a href="mailto:support@rehablookup.com">Contact Support</a>
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
        <title>Thank You | RehabLookup Concierge</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-muted/30">
        <PublicHeader />

        <main className="flex-1 flex items-center justify-center py-12">
          <div className="container mx-auto px-4 max-w-lg">
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-8 pb-6 text-center">
                {/* Success Icon */}
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>

                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Thank You!
                </h1>
                <p className="text-lg text-muted-foreground mb-6">
                  Your intake has been submitted successfully.
                </p>

                {/* What happens next */}
                <div className="bg-muted/50 rounded-lg p-6 mb-8 text-left">
                  <h2 className="font-semibold text-foreground mb-4">What Happens Next?</h2>
                  <ul className="space-y-4">
                    <li className="flex gap-3">
                      <Clock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">
                        A placement specialist will review your intake within 24-48 hours
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <User className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">
                        We will connect you with treatment programs that fit your specific needs
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <Mail className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">
                        Selected programs will reach out via email to discuss next steps
                      </span>
                    </li>
                  </ul>
                </div>

                {/* CTAs based on auth state */}
                <div className="space-y-3">
                  {isLoggedIn ? (
                    <Button asChild size="lg" className="w-full">
                      <Link to="/account">
                        <User className="mr-2 h-4 w-4" />
                        View Your Account
                      </Link>
                    </Button>
                  ) : (
                    <>
                      <Button asChild size="lg" className="w-full">
                        <Link to={`/concierge/create-password?session_id=${sessionId}&email=${encodeURIComponent(userEmail || "")}`}>
                          <User className="mr-2 h-4 w-4" />
                          Create Account to Track Progress
                        </Link>
                      </Button>
                      <Button variant="outline" asChild size="lg" className="w-full">
                        <Link to="/">
                          Return to Home
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contact support */}
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>
                Questions? Contact us at{" "}
                <a href="mailto:placement@rehablookup.com" className="text-primary hover:underline">
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
