import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useSearchParams } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Header as PublicHeader } from "@/components/layout/Header";
import { Footer as PublicFooter } from "@/components/layout/Footer";
import { CheckCircle, Clock, Mail, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function InternationalThankYou() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState<string>("");
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  const handleResendVerification = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please provide your email address to resend verification.",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);
    try {
      const { error } = await supabase.functions.invoke("send-verification-code", {
        body: { email, type: "international_placement" },
      });

      if (error) throw error;

      toast({
        title: "Verification Sent",
        description: "A new verification email has been sent to your inbox.",
      });
    } catch (err) {
      console.error("Resend error:", err);
      toast({
        title: "Error",
        description: "Failed to resend verification. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

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

    // Try to get email from localStorage intake data
    try {
      const intakeData = localStorage.getItem("international_intake_data");
      if (intakeData) {
        const parsed = JSON.parse(intakeData);
        if (parsed.email) {
          setEmail(parsed.email);
        }
        // Clear the stored data
        localStorage.removeItem("international_intake_data");
      }
    } catch (e) {
      console.error("Error parsing intake data:", e);
    }
  }, []);

  const steps = [
    {
      number: 1,
      title: "Verify Your Email",
      description: "Check your inbox and click the verification link",
      active: true,
    },
    {
      number: 2,
      title: "Advisor Review",
      description: "Our team reviews your case within 24 hours",
      active: false,
    },
    {
      number: 3,
      title: "Receive Matches",
      description: "Get personalized facility recommendations",
      active: false,
    },
    {
      number: 4,
      title: "Confirm Placement",
      description: "We coordinate admission with your chosen facility",
      active: false,
    },
  ];

  return (
    <>
      <SEO
        title="Application Received | International Placement"
        description="Your international placement application has been received."
        noindex
      />
      
      <div className="min-h-screen flex flex-col bg-background">
        <PublicHeader />
        
        <main className="flex-1 flex items-center justify-center py-12 px-4">
          <div className="max-w-2xl w-full">
            {/* Success Header */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-8"
            >
              <div className="relative inline-block mb-6">
                <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                  className="absolute -top-2 -right-2"
                >
                  <Sparkles className="h-8 w-8 text-primary" />
                </motion.div>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                Application Submitted!
              </h1>
              
              <p className="text-lg text-muted-foreground">
                Thank you for completing your placement application. Your dedicated advisor will reach out within 24 hours.
              </p>
            </motion.div>

            {/* Email Verification Alert */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-primary/20 bg-primary/5 mb-8">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        Please Verify Your Email
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        We sent a verification link to{" "}
                        <span className="font-medium text-foreground">
                          {email || "your email address"}
                        </span>
                        . Please verify to activate your case.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleResendVerification}
                        disabled={isResending || !email}
                      >
                        {isResending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          "Resend Verification Email"
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Timeline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground mb-6 flex items-center gap-2">
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
                          step.active 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {step.number}
                        </div>
                        <div>
                          <p className={`font-medium ${step.active ? "text-foreground" : "text-muted-foreground"}`}>
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

            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-6 p-6 bg-muted/30 rounded-xl text-center"
            >
              <p className="text-sm text-muted-foreground mb-2">
                Questions? Contact our international team:
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
              className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <Button asChild size="lg">
                <Link to="/account/international">
                  Track Your Case
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/">Return to Homepage</Link>
              </Button>
            </motion.div>
          </div>
        </main>
        
        <PublicFooter />
      </div>
    </>
  );
}
