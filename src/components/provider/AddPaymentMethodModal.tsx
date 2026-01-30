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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CreditCard, Landmark, AlertCircle, CheckCircle2, Shield, Building2 } from "lucide-react";
import { loadStripe, Stripe as StripeType, StripeElements } from "@stripe/stripe-js";
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
}

interface PaymentFormProps {
  facilityId: string;
  onSuccess?: () => void;
  onCancel: () => void;
}

interface SetupData {
  clientSecret: string;
  customerId: string;
}

function PaymentFormContent({
  facilityId,
  onSuccess,
  onCancel,
  stripe,
  elements,
}: PaymentFormProps & { stripe: StripeType | null; elements: StripeElements | null }) {
  const queryClient = useQueryClient();
  const [paymentType, setPaymentType] = useState<"ach" | "card">("ach");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnectingBank, setIsConnectingBank] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get SetupIntent on mount
  useEffect(() => {
    let isMounted = true;
    
    async function getSetupIntent() {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log("[PaymentForm] Requesting SetupIntent for facility:", facilityId);
        
        const { data, error: invokeError } = await supabase.functions.invoke("setup-provider-payment-method", {
          body: { facilityId },
        });

        if (!isMounted) return;

        if (invokeError) {
          console.error("[PaymentForm] SetupIntent error:", invokeError);
          throw new Error(invokeError.message || "Failed to initialize payment setup");
        }

        if (data?.error) {
          console.error("[PaymentForm] SetupIntent API error:", data.error);
          throw new Error(data.error);
        }

        if (data?.clientSecret) {
          console.log("[PaymentForm] SetupIntent received:", { 
            hasSecret: !!data.clientSecret, 
            customerId: data.customerId 
          });
          setClientSecret(data.clientSecret);
          setCustomerId(data.customerId);
        } else {
          throw new Error("No client secret received from server");
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("[PaymentForm] Setup error:", err);
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

  const savePaymentMethod = useCallback(async (paymentMethodId: string) => {
    console.log("[PaymentForm] Saving payment method:", paymentMethodId);
    
    const { data, error: saveError } = await supabase.functions.invoke("save-provider-payment-method", {
      body: {
        facilityId,
        paymentMethodId,
        setAsDefault: true,
      },
    });

    if (saveError) {
      console.error("[PaymentForm] Save error:", saveError);
      throw new Error(saveError.message || "Failed to save payment method");
    }

    if (data?.error) {
      console.error("[PaymentForm] Save API error:", data.error);
      throw new Error(data.error);
    }

    console.log("[PaymentForm] Payment method saved:", data);
    
    queryClient.invalidateQueries({ queryKey: ["provider-payment-methods"] });
    queryClient.invalidateQueries({ queryKey: ["facility-concierge"] });
    toast.success(`${data?.type === 'ach' ? 'Bank account' : 'Card'} added successfully!`);
    onSuccess?.();
  }, [facilityId, queryClient, onSuccess]);

  // Handle ACH with Financial Connections
  const handleACHSubmit = async () => {
    if (!stripe || !clientSecret) {
      console.error("[PaymentForm] ACH submit - missing stripe or clientSecret");
      return;
    }

    setIsConnectingBank(true);
    setError(null);

    try {
      console.log("[PaymentForm] Starting Financial Connections flow");
      
      // Use Financial Connections to collect bank account
      const { error: collectError, setupIntent } = await stripe.collectBankAccountForSetup({
        clientSecret,
        params: {
          payment_method_type: 'us_bank_account',
          payment_method_data: {
            billing_details: {
              name: '', // Will be collected by Financial Connections
            },
          },
        },
      });

      if (collectError) {
        console.error("[PaymentForm] Financial Connections error:", collectError);
        throw new Error(collectError.message);
      }

      console.log("[PaymentForm] SetupIntent status after collect:", setupIntent?.status);

      // Check if setup intent status requires verification
      if (setupIntent?.status === 'requires_payment_method') {
        // User cancelled or didn't complete
        console.log("[PaymentForm] User cancelled bank connection");
        setIsConnectingBank(false);
        return;
      }

      if (setupIntent?.status === 'requires_confirmation') {
        console.log("[PaymentForm] Confirming US bank account setup");
        
        // Confirm the setup intent
        const { error: confirmError, setupIntent: confirmedIntent } = await stripe.confirmUsBankAccountSetup(clientSecret);
        
        if (confirmError) {
          console.error("[PaymentForm] Confirmation error:", confirmError);
          throw new Error(confirmError.message);
        }

        console.log("[PaymentForm] Confirmed SetupIntent status:", confirmedIntent?.status);

        if (confirmedIntent?.status === 'succeeded' && confirmedIntent?.payment_method) {
          await savePaymentMethod(confirmedIntent.payment_method as string);
        } else if (confirmedIntent?.status === 'requires_action' && confirmedIntent?.next_action?.type === 'verify_with_microdeposits') {
          // Micro-deposits verification required
          toast.info("Bank verification required. Check your account for micro-deposits (1-2 business days).");
          onSuccess?.();
        } else {
          console.log("[PaymentForm] Unexpected confirmed status:", confirmedIntent?.status);
        }
      } else if (setupIntent?.status === 'succeeded' && setupIntent?.payment_method) {
        console.log("[PaymentForm] SetupIntent succeeded directly");
        await savePaymentMethod(setupIntent.payment_method as string);
      } else {
        console.log("[PaymentForm] Unexpected setup status:", setupIntent?.status);
      }
    } catch (err: any) {
      console.error("[PaymentForm] ACH error:", err);
      setError(err.message || "Failed to connect bank account");
    } finally {
      setIsConnectingBank(false);
    }
  };

  // Handle Card submission
  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) {
      console.error("[PaymentForm] Card submit - missing dependencies");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error("Card element not found");
      }

      console.log("[PaymentForm] Confirming card setup");
      
      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (stripeError) {
        console.error("[PaymentForm] Card setup error:", stripeError);
        throw new Error(stripeError.message);
      }

      console.log("[PaymentForm] Card SetupIntent status:", setupIntent?.status);

      if (setupIntent?.payment_method) {
        await savePaymentMethod(setupIntent.payment_method as string);
      }
    } catch (err: any) {
      console.error("[PaymentForm] Card error:", err);
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
    <div className="space-y-6">
      <Tabs value={paymentType} onValueChange={(v) => setPaymentType(v as "ach" | "card")}>
        <TabsList className="grid w-full grid-cols-2 h-auto p-1">
          <TabsTrigger 
            value="ach" 
            className={cn(
              "gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
              "flex-col h-auto"
            )}
          >
            <Landmark className="h-5 w-5" />
            <div className="flex flex-col items-center">
              <span className="font-medium">Bank Account (ACH)</span>
              <span className="text-[10px] opacity-80">Recommended • Lower fees</span>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="card" 
            className={cn(
              "gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
              "flex-col h-auto"
            )}
          >
            <CreditCard className="h-5 w-5" />
            <div className="flex flex-col items-center">
              <span className="font-medium">Credit/Debit Card</span>
              <span className="text-[10px] opacity-80">Backup option</span>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ach" className="mt-6 space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm">Connect Your Bank Account</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Securely link your business bank account using Stripe Financial Connections. 
                  This enables ACH direct debit for placement fees with lower processing costs.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-emerald-600" />
                <span>Bank-level security</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Instant verification</span>
              </div>
            </div>

            <Button
              onClick={handleACHSubmit}
              disabled={!stripe || !clientSecret || isConnectingBank}
              className="w-full"
              size="lg"
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

          <Alert className="bg-emerald-500/10 border-emerald-500/20">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-sm">
              <strong>No upfront costs.</strong> Your account will only be debited when a placement is confirmed and both parties agree.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="card" className="mt-6 space-y-4">
          <form onSubmit={handleCardSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Card Information</Label>
              <div className="p-4 border rounded-lg bg-background">
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: "16px",
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

            <Alert className="bg-muted/50 border-muted">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Cards may have higher processing fees than ACH. Consider using a bank account for lower costs.
              </AlertDescription>
            </Alert>

            <Button
              type="submit"
              disabled={!stripe || !clientSecret || isSubmitting}
              className="w-full"
              size="lg"
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
          </form>
        </TabsContent>
      </Tabs>

      {error && clientSecret && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
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
        console.log("[AddPaymentMethodModal] Fetching Stripe config...");
        const { data, error } = await supabase.functions.invoke("setup-provider-payment-method", {
          body: { facilityId },
        });

        if (error) {
          console.error("[AddPaymentMethodModal] Setup error:", error);
          throw new Error(error.message || "Failed to initialize payment setup");
        }

        if (data?.error) {
          console.error("[AddPaymentMethodModal] API error:", data.error);
          throw new Error(data.error);
        }

        if (!data?.publishableKey) {
          throw new Error("Stripe is not configured. Please contact support.");
        }

        console.log("[AddPaymentMethodModal] Stripe key received, initializing...");
        const stripe = loadStripe(data.publishableKey);
        setStripePromise(stripe);
      } catch (err: any) {
        console.error("[AddPaymentMethodModal] Init error:", err);
        setStripeError(err.message || "Failed to initialize payment system");
      } finally {
        setIsLoadingStripe(false);
      }
    }

    initStripe();
  }, [open, facilityId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Add Payment Method
          </DialogTitle>
          <DialogDescription>
            Add a payment method for placement network billing. You'll only be charged when a placement is confirmed.
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
