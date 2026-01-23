import { useState, useEffect, forwardRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface FailedSubmission {
  sessionId: string;
  data: any;
  error: string;
  timestamp: number;
  retryCount?: number;
}

interface ConciergePaymentRecoveryProps {
  userId?: string;
  onRecoveryComplete: () => void;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

export const ConciergePaymentRecovery = forwardRef<HTMLDivElement, ConciergePaymentRecoveryProps>(
  function ConciergePaymentRecovery({ userId, onRecoveryComplete }, ref) {
    const [isRecovering, setIsRecovering] = useState(false);
    const [recoveryStatus, setRecoveryStatus] = useState<"idle" | "success" | "failed">("idle");
    const [failedSubmission, setFailedSubmission] = useState<FailedSubmission | null>(null);

    useEffect(() => {
      // Check for failed submission on mount
      const storedSubmission = localStorage.getItem("concierge_failed_submission");
      if (storedSubmission) {
        try {
          const parsed = JSON.parse(storedSubmission);
          // Only show recovery if it's less than 24 hours old
          if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
            setFailedSubmission(parsed);
          } else {
            // Clean up old failed submissions
            localStorage.removeItem("concierge_failed_submission");
          }
        } catch {
          localStorage.removeItem("concierge_failed_submission");
        }
      }
    }, []);

    const attemptRecovery = async () => {
      if (!failedSubmission) return;

      setIsRecovering(true);
      const retryCount = (failedSubmission.retryCount || 0) + 1;

      try {
        // First verify the payment is still valid
        const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-concierge-payment", {
          body: { sessionId: failedSubmission.sessionId }
        });

        if (verifyError) throw verifyError;

        if (verifyData?.alreadySubmitted) {
          // Already submitted, clear the failed state
          localStorage.removeItem("concierge_failed_submission");
          localStorage.removeItem("concierge_pending_intake");
          setRecoveryStatus("success");
          toast.success("Your intake was already submitted successfully!");
          onRecoveryComplete();
          return;
        }

        if (!verifyData?.paid) {
          throw new Error("Payment not verified");
        }

        // Attempt to submit the intake
        const payload = failedSubmission.data;
        if (userId && !payload.userId) {
          payload.userId = userId;
        }

        const { error: submitError } = await supabase.functions.invoke("submit-concierge-intake", {
          body: payload,
        });

        if (submitError) {
          throw submitError;
        }

        // Success!
        localStorage.removeItem("concierge_failed_submission");
        localStorage.removeItem("concierge_pending_intake");
        setRecoveryStatus("success");
        toast.success("Your intake has been submitted successfully!");
        onRecoveryComplete();

      } catch (error) {
        console.error("Recovery attempt failed:", error);
        
        if (retryCount < MAX_RETRIES) {
          // Update retry count and try again after delay
          const updatedSubmission = { ...failedSubmission, retryCount };
          localStorage.setItem("concierge_failed_submission", JSON.stringify(updatedSubmission));
          setFailedSubmission(updatedSubmission);
          
          toast.error(`Recovery attempt ${retryCount} failed. Retrying...`);
          
          setTimeout(() => {
            attemptRecovery();
          }, RETRY_DELAY * retryCount);
        } else {
          setRecoveryStatus("failed");
          toast.error("Unable to recover your submission. Please contact support.");
        }
      } finally {
        setIsRecovering(false);
      }
    };

    const dismissRecovery = () => {
      localStorage.removeItem("concierge_failed_submission");
      setFailedSubmission(null);
    };

    if (!failedSubmission) return null;

    if (recoveryStatus === "success") {
      return (
        <Alert ref={ref} className="bg-green-50 border-green-200 dark:bg-green-950/20">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Your intake has been recovered and submitted successfully! Refreshing...
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Card ref={ref} className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <AlertCircle className="h-5 w-5" />
            Pending Submission Recovery
          </CardTitle>
          <CardDescription className="text-amber-700 dark:text-amber-300">
            Your payment was successful but the intake submission didn't complete. 
            {failedSubmission.retryCount 
              ? ` We've attempted ${failedSubmission.retryCount} automatic ${failedSubmission.retryCount === 1 ? "retry" : "retries"}.`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {recoveryStatus === "failed" ? (
            <div className="space-y-3">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  We were unable to automatically recover your submission after multiple attempts.
                  Your payment was successful - please contact our support team with your session ID.
                </AlertDescription>
              </Alert>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="default" asChild className="flex-1">
                  <a href={`mailto:placement@rehablookup.com?subject=Concierge%20Submission%20Recovery&body=Session%20ID:%20${failedSubmission.sessionId}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Contact Support
                  </a>
                </Button>
                <Button variant="outline" onClick={dismissRecovery} className="flex-1">
                  Dismiss
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Session ID: {failedSubmission.sessionId.slice(0, 20)}...
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={attemptRecovery} 
                disabled={isRecovering}
                className="flex-1"
              >
                {isRecovering ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Recovering...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Submission
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={dismissRecovery}
                disabled={isRecovering}
                className="flex-1"
              >
                Dismiss
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);
