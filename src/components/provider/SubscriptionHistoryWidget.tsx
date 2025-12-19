import { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  Receipt, 
  CreditCard, 
  XCircle, 
  ExternalLink, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  invoice_pdf?: string;
  hosted_invoice_url?: string;
}

interface SubscriptionDetails {
  id: string;
  status: string;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at?: number;
}

interface SubscriptionHistoryWidgetProps {
  isSubscribed: boolean;
  onSubscriptionChange?: () => void;
}

export function SubscriptionHistoryWidget({ 
  isSubscribed, 
  onSubscriptionChange 
}: SubscriptionHistoryWidgetProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);

  useEffect(() => {
    if (isSubscribed) {
      fetchBillingHistory();
    } else {
      setLoading(false);
    }
  }, [isSubscribed]);

  const fetchBillingHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke("get-provider-subscription", {
        body: { userId: user.id },
      });

      if (error) throw error;

      if (data?.invoices) {
        setInvoices(data.invoices.slice(0, 5));
      }
      if (data?.subscription) {
        setSubscription(data.subscription);
      }
    } catch (err) {
      console.error("Error fetching billing history:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleManagePayments = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Portal error:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unable to open billing portal. Please try again.",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
        toast({
          title: "Manage Subscription",
          description: "You can cancel your subscription in the billing portal.",
        });
      }
    } catch (err) {
      console.error("Cancel error:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unable to process request. Please try again.",
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        );
      case "open":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "void":
      case "uncollectible":
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Non-subscribed users see upgrade prompt instead of billing details
  if (!isSubscribed) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Subscription & Billing
              </CardTitle>
              <CardDescription>View history and manage your subscription</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 space-y-3">
            <div className="h-12 w-12 rounded-full bg-muted mx-auto flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">No Active Subscription</p>
              <p className="text-sm text-muted-foreground mt-1">
                Upgrade to a paid plan to access billing history and subscription management.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Subscription & Billing
            </CardTitle>
            <CardDescription>View history and manage your subscription</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleManagePayments}
            disabled={portalLoading}
          >
            {portalLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            Manage Payments
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Subscription
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>
                    You'll be redirected to the billing portal where you can manage or cancel your subscription.
                  </p>
                  <p className="font-medium text-foreground">
                    If you cancel, you'll still have access until the end of your current billing period.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCancelSubscription}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={cancelLoading}
                >
                  {cancelLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Continue to Portal
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Subscription Status */}
        {subscription?.cancel_at_period_end && (
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">Subscription Ending</p>
              <p className="text-amber-700">
                Your subscription will end on {format(new Date(subscription.current_period_end * 1000), "MMM d, yyyy")}. 
                You can reactivate anytime before then.
              </p>
            </div>
          </div>
        )}

        <Separator />

        {/* Billing History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground">Recent Invoices</h4>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={handleManagePayments}
              disabled={portalLoading}
            >
              View All
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length > 0 ? (
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <div 
                  key={invoice.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Receipt className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(invoice.created * 1000), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {getStatusBadge(invoice.status)}
                    {invoice.invoice_pdf && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        asChild
                      >
                        <a 
                          href={invoice.invoice_pdf} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          title="Download PDF"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No billing history yet
            </div>
          )}
        </div>

        {/* Full Portal Link */}
        <div className="pt-2">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleManagePayments}
            disabled={portalLoading}
          >
            {portalLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ExternalLink className="h-4 w-4 mr-2" />
            )}
            Open Full Billing Portal
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
