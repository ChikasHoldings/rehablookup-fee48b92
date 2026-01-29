import { useState, useEffect } from "react";
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
import { Loader2, CreditCard, Landmark, AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { loadStripe, Stripe, StripeElements } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

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
  const [paymentType, setPaymentType] = useState<"card" | "ach">("card");
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
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
        // Save payment method to database
        const { error: saveError } = await supabase.functions.invoke("save-provider-payment-method", {
          body: {
            facilityId,
            paymentMethodId: setupIntent.payment_method,
            setAsDefault: true,
          },
        });

        if (saveError) throw saveError;

        queryClient.invalidateQueries({ queryKey: ["provider-payment-methods"] });
        toast.success("Payment method added successfully");
        onSuccess?.();
      }
    } catch (err: any) {
      setError(err.message || "Failed to save payment method");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!clientSecret) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs value={paymentType} onValueChange={(v) => setPaymentType(v as "card" | "ach")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="card" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Credit Card
          </TabsTrigger>
          <TabsTrigger value="ach" className="gap-2 opacity-50 cursor-not-allowed" disabled>
            <Landmark className="h-4 w-4" />
            Bank (ACH)
            <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1 border-muted-foreground/30 text-muted-foreground">Coming Soon</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="card" className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label>Card Information</Label>
            <div className="p-3 border rounded-lg bg-background">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: "16px",
                      color: "hsl(var(--foreground))",
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
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-sm">
              Your card will only be charged when a placement is confirmed. No upfront costs.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="ach" className="mt-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Bank account (ACH) payments are coming soon. Please use a credit card for now.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4 mr-2" />
          )}
          Save Payment Method
        </Button>
      </div>
    </form>
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Add Payment Method
          </DialogTitle>
          <DialogDescription>
            Add a payment method to receive placement referrals. You'll only be charged on confirmed placements.
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
