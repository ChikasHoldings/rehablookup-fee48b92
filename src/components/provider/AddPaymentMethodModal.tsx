import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { cn } from "@/lib/utils";

// Stripe publishable key from env
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

interface AddPaymentMethodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: string;
  onSuccess?: () => void;
}

function PaymentForm({
  facilityId,
  onSuccess,
  onCancel,
}: {
  facilityId: string;
  onSuccess?: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const queryClient = useQueryClient();
  const [paymentType, setPaymentType] = useState<"ach" | "card">("ach");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnectingBank, setIsConnectingBank] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);

  // Get SetupIntent on mount
  useEffect(() => {
    async function getSetupIntent() {
      try {
        const { data, error } = await supabase.functions.invoke("setup-provider-payment-method", {
          body: { facilityId },
        });

        if (error) throw error;
        if (data?.clientSecret) {
          setClientSecret(data.clientSecret);
          setCustomerId(data.customerId);
        }
      } catch (err: any) {
        setError(err.message || "Failed to initialize payment setup");
      }
    }
    getSetupIntent();
  }, [facilityId]);

  const savePaymentMethod = useCallback(async (paymentMethodId: string) => {
    const { error: saveError } = await supabase.functions.invoke("save-provider-payment-method", {
      body: {
        facilityId,
        paymentMethodId,
        setAsDefault: true,
      },
    });

    if (saveError) throw saveError;

    queryClient.invalidateQueries({ queryKey: ["provider-payment-methods"] });
    queryClient.invalidateQueries({ queryKey: ["facility-concierge"] });
    toast.success("Payment method added successfully");
    onSuccess?.();
  }, [facilityId, queryClient, onSuccess]);

  // Handle ACH with Financial Connections
  const handleACHSubmit = async () => {
    if (!stripe || !clientSecret) return;

    setIsConnectingBank(true);
    setError(null);

    try {
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
        throw new Error(collectError.message);
      }

      // Check if setup intent status requires verification
      if (setupIntent?.status === 'requires_payment_method') {
        // User cancelled or didn't complete
        setIsConnectingBank(false);
        return;
      }

      if (setupIntent?.status === 'requires_confirmation') {
        // Confirm the setup intent
        const { error: confirmError, setupIntent: confirmedIntent } = await stripe.confirmUsBankAccountSetup(clientSecret);
        
        if (confirmError) {
          throw new Error(confirmError.message);
        }

        if (confirmedIntent?.status === 'succeeded' && confirmedIntent?.payment_method) {
          await savePaymentMethod(confirmedIntent.payment_method as string);
        } else if (confirmedIntent?.status === 'requires_action' && confirmedIntent?.next_action?.type === 'verify_with_microdeposits') {
          // Micro-deposits verification required
          toast.info("Bank verification required. Check your account for micro-deposits (1-2 business days).");
          onSuccess?.();
        }
      } else if (setupIntent?.status === 'succeeded' && setupIntent?.payment_method) {
        await savePaymentMethod(setupIntent.payment_method as string);
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
    if (!stripe || !elements || !clientSecret) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (setupIntent?.payment_method) {
        await savePaymentMethod(setupIntent.payment_method as string);
      }
    } catch (err: any) {
      setError(err.message || "Failed to save payment method");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!clientSecret) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Preparing secure payment setup...</p>
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
              disabled={!stripe || isConnectingBank}
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
                        color: "hsl(var(--foreground))",
                        fontFamily: "system-ui, sans-serif",
                        "::placeholder": {
                          color: "hsl(var(--muted-foreground))",
                        },
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
              disabled={!stripe || isSubmitting}
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

      {error && (
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

export function AddPaymentMethodModal({
  open,
  onOpenChange,
  facilityId,
  onSuccess,
}: AddPaymentMethodModalProps) {
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

        <Elements stripe={stripePromise}>
          <PaymentForm
            facilityId={facilityId}
            onSuccess={() => {
              onOpenChange(false);
              onSuccess?.();
            }}
            onCancel={() => onOpenChange(false)}
          />
        </Elements>
      </DialogContent>
    </Dialog>
  );
}
