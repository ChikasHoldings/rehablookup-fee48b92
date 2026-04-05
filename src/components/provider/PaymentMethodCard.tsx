import { useState, useEffect } from "react";
import { CreditCard, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PaymentMethodData {
  hasPaymentMethod: boolean;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

// Brand logos mapping
const brandLogos: Record<string, string> = {
  visa: "💳",
  mastercard: "💳",
  amex: "💳",
  discover: "💳",
  diners: "💳",
  jcb: "💳",
  unionpay: "💳",
};

const brandColors: Record<string, string> = {
  visa: "bg-blue-50 text-blue-700 border-blue-200",
  mastercard: "bg-orange-50 text-orange-700 border-orange-200",
  amex: "bg-blue-50 text-blue-700 border-blue-200",
  discover: "bg-orange-50 text-orange-700 border-orange-200",
  default: "bg-muted text-muted-foreground border-border",
};

interface PaymentMethodCardProps {
  onManagePayment: () => void;
  portalLoading: boolean;
}

export function PaymentMethodCard({ onManagePayment, portalLoading }: PaymentMethodCardProps) {
  const [paymentData, setPaymentData] = useState<PaymentMethodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPaymentMethod();
  }, []);

  const fetchPaymentMethod = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("get-payment-method");
      
      if (error) throw error;
      setPaymentData(data);
    } catch (err) {
      console.error("Failed to fetch payment method:", err);
      setError("Unable to load payment method");
    } finally {
      setLoading(false);
    }
  };

  const formatExpiry = (month: number, year: number) => {
    return `${month.toString().padStart(2, "0")}/${year.toString().slice(-2)}`;
  };

  const getBrandName = (brand: string) => {
    const names: Record<string, string> = {
      visa: "Visa",
      mastercard: "Mastercard",
      amex: "American Express",
      discover: "Discover",
      diners: "Diners Club",
      jcb: "JCB",
      unionpay: "UnionPay",
    };
    return names[brand.toLowerCase()] || brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-20 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
            <Button variant="ghost" size="sm" onClick={fetchPaymentMethod}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!paymentData?.hasPaymentMethod) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payment Method
          </CardTitle>
          <CardDescription>Add a payment method to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-20 rounded-lg bg-muted flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No payment method</p>
                <p className="text-xs text-muted-foreground">Add a card to manage your subscription</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onManagePayment}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Add Card
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { card } = paymentData;
  const brandColor = brandColors[card!.brand.toLowerCase()] || brandColors.default;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Method
            </CardTitle>
            <CardDescription>Your saved payment method</CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onManagePayment}
            disabled={portalLoading}
            className="text-muted-foreground hover:text-foreground"
          >
            {portalLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ExternalLink className="h-4 w-4 mr-2" />
            )}
            Update
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {/* Card visual */}
          <div className={`h-14 w-24 rounded-lg border-2 flex flex-col items-start justify-between p-2 ${brandColor}`}>
            <span className="text-xs font-medium uppercase tracking-wide opacity-70">
              {getBrandName(card!.brand)}
            </span>
            <span className="text-sm font-mono font-semibold">
              •••• {card!.last4}
            </span>
          </div>
          
          {/* Card details */}
          <div className="flex-1">
            <p className="font-medium text-foreground">
              {getBrandName(card!.brand)} ending in {card!.last4}
            </p>
            <p className="text-sm text-muted-foreground">
              Expires {formatExpiry(card!.expMonth, card!.expYear)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
