import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { CreditCard, Check, ArrowRight, Sparkles, Clock, FileText, Zap, Loader2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription, PLAN_DETAILS } from "@/hooks/useSubscription";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function ProviderBillingPage() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: subscription, isLoading: subscriptionLoading, refetch } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Handle success/cancel from Stripe
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast({
        title: "Subscription Activated!",
        description: "Your plan has been upgraded successfully. Welcome to the team!",
      });
      // Refresh subscription status
      refetch();
      queryClient.invalidateQueries({ queryKey: ["provider-data"] });
    } else if (searchParams.get("canceled") === "true") {
      toast({
        variant: "destructive",
        title: "Checkout Canceled",
        description: "Your subscription was not changed.",
      });
    }
  }, [searchParams, toast, refetch, queryClient]);

  const handleCheckout = async (plan: "professional" | "enterprise") => {
    setCheckoutLoading(plan);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast({
        variant: "destructive",
        title: "Checkout Failed",
        description: "Unable to start checkout. Please try again.",
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
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

  const currentPlan = subscription?.plan || "free";
  const isSubscribed = subscription?.subscribed || false;

  const plans = [
    { key: "free" as const, ...PLAN_DETAILS.free, current: currentPlan === "free", recommended: false },
    { key: "professional" as const, ...PLAN_DETAILS.professional, current: currentPlan === "professional", recommended: true },
    { key: "enterprise" as const, ...PLAN_DETAILS.enterprise, current: currentPlan === "enterprise", recommended: false },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Current Plan */}
      <Card className="shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-foreground">
                    {subscriptionLoading ? "Loading..." : subscription?.plan_name || "Free Trial"}
                  </h3>
                  <Badge className={isSubscribed ? "bg-green-100 text-green-700 border-green-200" : "bg-amber-100 text-amber-700 border-amber-200"}>
                    {isSubscribed ? "Active" : "Trial"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {isSubscribed && subscription?.subscription_end ? (
                    <span>Renews on {format(new Date(subscription.subscription_end), "MMMM d, yyyy")}</span>
                  ) : (
                    <span>Upgrade to unlock more leads</span>
                  )}
                </div>
                <div className="mt-2">
                  <span className="text-sm text-muted-foreground">
                    Lead limit: <span className="font-semibold text-foreground">
                      {subscription?.lead_limit === 999999 ? "Unlimited" : `${subscription?.lead_limit || 5} / month`}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              {isSubscribed && (
                <Button 
                  variant="outline" 
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                >
                  {portalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Manage Subscription
                </Button>
              )}
              {!isSubscribed && (
                <Button 
                  className="gap-2"
                  onClick={() => handleCheckout("professional")}
                  disabled={checkoutLoading === "professional"}
                >
                  {checkoutLoading === "professional" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  Upgrade Plan
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Plans */}
      <div>
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-semibold text-foreground">
            Available Plans
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <Card 
              key={plan.key} 
              className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                plan.current 
                  ? "border-green-500 ring-1 ring-green-500 shadow-md"
                  : plan.recommended 
                    ? "border-primary ring-1 ring-primary shadow-md" 
                    : "hover:border-primary/30"
              }`}
            >
              {plan.current && (
                <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-medium px-3 py-1 rounded-bl-lg">
                  Your Plan
                </div>
              )}
              {!plan.current && plan.recommended && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-lg">
                  Recommended
                </div>
              )}
              <CardHeader className="pb-4">
                <CardTitle className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-base font-normal text-muted-foreground">
                    {plan.period}
                  </span>
                </CardTitle>
                <CardDescription className="pt-2">
                  <span className="font-semibold text-foreground text-lg">{plan.name}</span>
                  <br />
                  <span className="text-sm">{plan.description}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>
                {plan.current ? (
                  <Button variant="secondary" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : plan.key === "free" ? (
                  <Button variant="outline" className="w-full" disabled>
                    Free Tier
                  </Button>
                ) : (
                  <Button 
                    variant={plan.recommended ? "default" : "outline"} 
                    className="w-full group"
                    onClick={() => handleCheckout(plan.key)}
                    disabled={checkoutLoading === plan.key}
                  >
                    {checkoutLoading === plan.key ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {plan.recommended ? "Upgrade Now" : "Select Plan"}
                    {!checkoutLoading && (
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Billing History */}
      <Card className="shadow-sm">
        <CardHeader className="border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>View your past invoices and payments</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isSubscribed ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Manage your invoices and payment history in the billing portal.</p>
              <Button variant="outline" onClick={handleManageSubscription} disabled={portalLoading}>
                {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                View Billing History
              </Button>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="h-14 w-14 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground">No billing history yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Your invoices will appear here after your first payment
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
