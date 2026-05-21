import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CreditCard, Landmark, AlertCircle, CheckCircle2, Shield, Building2, Clock, Info } from "lucide-react";
import type { Stripe as StripeType, StripeElements } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { cn } from "@/lib/utils";

interface AddPaymentMethodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: string;
  onSuccess?: () => void;
  /** If true, only show card option (ACH is for Placement Network only) */
  cardOnly?: boolean;
}

interface PaymentFormProps {
  facilityId: string;
  onSuccess?: () => void;
  onCancel: () => void;
  cardOnly?: boolean;
}

interface SetupData {
  clientSecret: string;
  customerId: string;
  facilityName?: string;
}

type VerificationResult = {
  status: 'verified' | 'pending_microdeposits' | 'processing' | 'failed' | 'cancelled';
  message?: string;
};

function PaymentFormContent({
  facilityId,
  onSuccess,
  onCancel,
  cardOnly,
  stripe,
  elements,
}: PaymentFormProps & { stripe: StripeType | null; elements: StripeElements | null }) {
  const queryClient = useQueryClient();
  const [paymentType, setPaymentType] = useState<"ach" | "card">(cardOnly ? "card" : "ach");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnectingBank, setIsConnectingBank] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [facilityName, setFacilityName] = useState<string>("");
  const [accountHolderName, setAccountHolderName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<VerificationResult | null>(null);

  // Get SetupIntent on mount
  useEffect(() => {
    let isMounted = true;
    
    async function getSetupIntent() {
      try {
        setIsLoading(true);
        setError(null);
        
        const { data, error: invokeError } = await supabase.functions.invoke("setup-provider-payment-method", {
          body: { facilityId },
        });

        if (!isMounted) return;

        if (invokeError) {
          throw new Error(invokeError.message || "Failed to initialize payment setup");
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        if (data?.clientSecret) {
          setClientSecret(data.clientSecret);
          setCustomerId(data.customerId);
          // Pre-populate account holder name from facility name
          if (data.facilityName) {
            setFacilityName(data.facilityName);
            setAccountHolderName(data.facilityName);
          }
        } else {
          throw new Error("No client secret received from server");
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to initialize payment setup");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    
    getSetupIntent();
    
    return () => {
      isMounted = false;
    };
  }, [facilityId]);

  const savePaymentMethod = useCallback(async (paymentMethodId: string, isPendingVerification: boolean = false) => {
    const { data, error: saveError } = await supabase.functions.invoke("save-provider-payment-method", {
      body: {
        facilityId,
        paymentMethodId,
        setAsDefault: true,
      },
    });

    if (saveError) {
      throw new Error(saveError.message || "Failed to save payment method");
    }

    if (data?.error) {
      throw new Error(data.error);
    }
    
    queryClient.invalidateQueries({ queryKey: ["provider-payment-methods"] });
    queryClient.invalidateQueries({ queryKey: ["facility-concierge"] });
    
    return data;
  }, [facilityId, queryClient]);

  // Handle SetupIntent status after Financial Connections
  const handleSetupIntentStatus = useCallback(async (
    setupIntent: any, 
    stage: 'collect' | 'confirm'
  ): Promise<VerificationResult> => {
    const status = setupIntent?.status;
    const nextAction = setupIntent?.next_action;

    switch (status) {
      case 'requires_payment_method':
        // User cancelled or didn't complete bank selection
        return { status: 'cancelled', message: 'Bank connection was cancelled.' };

      case 'requires_confirmation':
        // Need to call confirmUsBankAccountSetup - this is expected after collectBankAccountForSetup
        if (stage === 'collect') {
          return { status: 'processing', message: 'Confirming bank account...' };
        }
        // Shouldn't happen after confirm
        return { status: 'failed', message: 'Unexpected confirmation required.' };

      case 'succeeded':
        if (setupIntent?.payment_method) {
          const saveResult = await savePaymentMethod(setupIntent.payment_method as string, false);
          return { 
            status: 'verified', 
            message: `${saveResult?.type === 'ach' ? 'Bank account' : 'Card'} connected and verified!` 
          };
        }
        return { status: 'failed', message: 'Payment method not found.' };

      case 'requires_action':
        if (nextAction?.type === 'verify_with_microdeposits') {
          // Micro-deposit verification fallback
          if (setupIntent?.payment_method) {
            await savePaymentMethod(setupIntent.payment_method as string, true);
          }
          return { 
            status: 'pending_microdeposits', 
            message: 'Your bank requires micro-deposit verification. Two small deposits will appear in your account within 1-2 business days. Check your email for verification instructions.' 
          };
        }
        if (nextAction?.type === 'redirect_to_url') {
          // Rare: some banks require redirect
          return { status: 'processing', message: 'Redirecting to complete verification...' };
        }
        return { status: 'processing', message: 'Additional verification required.' };

      case 'processing':
        // Still processing
        if (setupIntent?.payment_method) {
          await savePaymentMethod(setupIntent.payment_method as string, true);
        }
        return { 
          status: 'processing', 
          message: 'Your bank account is being verified. This may take a few moments.' 
        };

      default:
        console.warn("[PaymentForm] Unknown SetupIntent status:", status);
        return { status: 'failed', message: `Unexpected status: ${status}` };
    }
  }, [savePaymentMethod]);

  // Handle ACH with Financial Connections
  const handleACHSubmit = async () => {
    if (!stripe || !clientSecret) {
      return;
    }

    if (!accountHolderName.trim()) {
      setError("Please enter the account holder name.");
      return;
    }

    setIsConnectingBank(true);
    setError(null);
    setVerificationStatus(null);

    try {
      // Use Financial Connections to collect bank account
      const { error: collectError, setupIntent } = await stripe.collectBankAccountForSetup({
        clientSecret,
        params: {
          payment_method_type: 'us_bank_account',
          payment_method_data: {
            billing_details: {
              name: accountHolderName.trim(),
            },
          },
        },
      });

      if (collectError) {
        throw new Error(collectError.message);
      }

      // Handle the result from collect step
      let result = await handleSetupIntentStatus(setupIntent, 'collect');

      // If we need confirmation, proceed with confirmUsBankAccountSetup
      if (result.status === 'processing' && setupIntent?.status === 'requires_confirmation') {
        const { error: confirmError, setupIntent: confirmedIntent } = await stripe.confirmUsBankAccountSetup(clientSecret);
        
        if (confirmError) {
          throw new Error(confirmError.message);
        }

        result = await handleSetupIntentStatus(confirmedIntent, 'confirm');
      }

      // Handle final result
      setVerificationStatus(result);

      if (result.status === 'verified') {
        toast.success(result.message || "Bank account connected successfully!");
        onSuccess?.();
      } else if (result.status === 'pending_microdeposits') {
        toast.info("Bank added! Check your email for micro-deposit verification instructions.", { duration: 6000 });
        onSuccess?.();
      } else if (result.status === 'processing') {
        toast.info(result.message || "Verification in progress...");
        onSuccess?.();
      } else if (result.status === 'cancelled') {
        // User cancelled - no error, just reset state
      } else if (result.status === 'failed') {
        throw new Error(result.message || "Failed to connect bank account");
      }

    } catch (err: any) {
      setError(err.message || "Failed to connect bank account");
    } finally {
      setIsConnectingBank(false);
    }
  };

  // Handle Card submission
  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setVerificationStatus(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error("Card element not found");
      }
      
      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (stripeError) {
        // Provide more user-friendly error messages
        let errorMessage = stripeError.message;
        if (stripeError.code === 'card_declined') {
          errorMessage = "Your card was declined. Please try a different card.";
        } else if (stripeError.code === 'expired_card') {
          errorMessage = "Your card has expired. Please use a different card.";
        } else if (stripeError.code === 'incorrect_cvc') {
          errorMessage = "The security code is incorrect. Please check and try again.";
        }
        
        throw new Error(errorMessage);
      }

      if (setupIntent?.status === 'succeeded' && setupIntent?.payment_method) {
        const saveResult = await savePaymentMethod(setupIntent.payment_method as string);
        toast.success(`${saveResult?.cardBrand || 'Card'} saved successfully!`);
        onSuccess?.();
      } else if (setupIntent?.status === 'requires_action') {
        // 3D Secure or other action required
        toast.info("Additional verification may be required. Please follow the prompts.");
      } else {
        throw new Error("Failed to save card. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save payment method");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Preparing secure payment setup...</p>
      </div>
    );
  }

  if (error && !clientSecret) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onCancel}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={paymentType} onValueChange={(v) => setPaymentType(v as "ach" | "card")}>
        {!cardOnly && (
          <TabsList className="grid w-full grid-cols-2 h-auto p-1">
            <TabsTrigger 
              value="ach" 
              className={cn(
                "gap-1.5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                "flex-col h-auto"
              )}
            >
              <Landmark className="h-4 w-4" />
              <span className="font-medium text-sm">Bank Account</span>
            </TabsTrigger>
            <TabsTrigger 
              value="card" 
              className={cn(
                "gap-1.5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                "flex-col h-auto"
              )}
            >
              <CreditCard className="h-4 w-4" />
              <span className="font-medium text-sm">Card</span>
            </TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="ach" className="mt-4 space-y-3">
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            {/* Account Holder Name Input */}
            <div className="space-y-1.5">
              <Label htmlFor="accountHolderName" className="text-sm">Account Holder Name</Label>
              <Input
                id="accountHolderName"
                type="text"
                placeholder="Name on bank account"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                disabled={isConnectingBank}
                className="h-9"
              />
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-emerald-600" />
                <span>Bank-level security</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Instant verification</span>
              </div>
            </div>

            <Button
              onClick={handleACHSubmit}
              disabled={!stripe || !clientSecret || isConnectingBank || !accountHolderName.trim()}
              className="w-full"
            >
              {isConnectingBank ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Landmark className="h-4 w-4 mr-2" />
                  Connect Bank Account
                </>
              )}
            </Button>
          </div>

          {/* Verification Status Feedback */}
          {verificationStatus?.status === 'pending_microdeposits' && (
            <Alert className="bg-amber-500/10 border-amber-500/20 py-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs">
                <strong>Micro-deposits required.</strong> Check your email in 1-2 days for verification.
              </AlertDescription>
            </Alert>
          )}

          {verificationStatus?.status === 'processing' && (
            <Alert className="bg-blue-500/10 border-blue-500/20 py-2">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-xs">
                {verificationStatus.message}
              </AlertDescription>
            </Alert>
          )}

          <p className="text-xs text-muted-foreground text-center">
            You'll only be charged when a placement is confirmed.
          </p>
        </TabsContent>

        <TabsContent value="card" className="mt-4 space-y-3">
          <form onSubmit={handleCardSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Card Details</Label>
              <div className="p-3 border rounded-lg bg-background">
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: "15px",
                        color: "#1a1a1a",
                        fontFamily: "system-ui, sans-serif",
                        "::placeholder": {
                          color: "#6b7280",
                        },
                      },
                      invalid: {
                        color: "#ef4444",
                      },
                    },
                  }}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={!stripe || !clientSecret || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Save Card
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Cards may have higher fees than bank accounts.
            </p>
          </form>
        </TabsContent>
      </Tabs>

      {error && clientSecret && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// Wrapper to properly use Stripe hooks
function PaymentFormWrapper(props: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  
  return (
    <PaymentFormContent 
      {...props} 
      stripe={stripe} 
      elements={elements} 
    />
  );
}

export function AddPaymentMethodModal({
  open,
  onOpenChange,
  facilityId,
  onSuccess,
  cardOnly = false,
}: AddPaymentMethodModalProps) {
  const [stripePromise, setStripePromise] = useState<Promise<StripeType | null> | null>(null);
  const [isLoadingStripe, setIsLoadingStripe] = useState(true);
  const [stripeError, setStripeError] = useState<string | null>(null);

  // Fetch Stripe publishable key from edge function when modal opens
  useEffect(() => {
    if (!open) return;

    async function initStripe() {
      setIsLoadingStripe(true);
      setStripeError(null);

      try {
        const { data, error } = await supabase.functions.invoke("setup-provider-payment-method", {
          body: { facilityId },
        });

        if (error) {
          throw new Error(error.message || "Failed to initialize payment setup");
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        if (!data?.publishableKey) {
          throw new Error("Stripe is not configured. Please contact support.");
        }

        const { loadStripe } = await import("@stripe/stripe-js");
        const stripe = loadStripe(data.publishableKey);
        setStripePromise(stripe);
      } catch (err: any) {
        setStripeError(err.message || "Failed to initialize payment system");
      } finally {
        setIsLoadingStripe(false);
      }
    }

    initStripe();
  }, [open, facilityId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            {cardOnly ? <CreditCard className="h-4 w-4" /> : <Landmark className="h-4 w-4" />}
            {cardOnly ? "Add Card" : "Add Payment Method"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {cardOnly
              ? "Save a card for your Pro subscription and add-ons."
              : "Saved for your Pro subscription, Featured / Concierge add-ons, and any future charges."
            }
          </DialogDescription>
        </DialogHeader>

        {isLoadingStripe ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Initializing payment system...</p>
          </div>
        ) : stripeError ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{stripeError}</AlertDescription>
            </Alert>
            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          </div>
        ) : stripePromise ? (
          <Elements stripe={stripePromise}>
            <PaymentFormWrapper
              facilityId={facilityId}
              cardOnly={cardOnly}
              onSuccess={() => {
                onOpenChange(false);
                onSuccess?.();
              }}
              onCancel={() => onOpenChange(false)}
            />
          </Elements>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
