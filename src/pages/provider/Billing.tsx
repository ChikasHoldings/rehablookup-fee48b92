import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  CreditCard, 
  Check, 
  ArrowRight, 
  Clock, 
  FileText, 
  Loader2, 
  ExternalLink,
  Star,
  TrendingUp,
  Users,
  Crown,
  Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription, PLAN_DETAILS } from "@/hooks/useSubscription";
import { useProviderData } from "@/hooks/useProviderData";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";

export default function ProviderBillingPage() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: subscription, isLoading: subscriptionLoading, refetch } = useSubscription();
  const { data: providerData } = useProviderData();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Handle success/cancel from Stripe
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast({
        title: "Subscription Activated!",
        description: "Your plan has been upgraded successfully. Welcome aboard!",
      });
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

  const handleCheckout = async (plan: "professional" | "featured") => {
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

  const currentPlan = subscription?.plan || "basic";
  const isSubscribed = subscription?.subscribed || false;
  const leadLimit = subscription?.lead_limit || 0;
  const usedLeads = providerData?.monthlyLeadsCount || 0;
  const leadUsagePercent = leadLimit > 0 ? Math.min((usedLeads / leadLimit) * 100, 100) : 0;

  const plans = [
    { 
      key: "basic" as const, 
      ...PLAN_DETAILS.basic, 
      current: currentPlan === "basic", 
      icon: Users,
      highlight: false 
    },
    { 
      key: "professional" as const, 
      ...PLAN_DETAILS.professional, 
      current: currentPlan === "professional", 
      icon: TrendingUp,
      highlight: currentPlan === "basic"
    },
    { 
      key: "featured" as const, 
      ...PLAN_DETAILS.featured, 
      current: currentPlan === "featured", 
      icon: Crown,
      highlight: currentPlan === "professional"
    },
  ];

  const getStatusBadge = () => {
    if (!isSubscribed) {
      return <Badge variant="secondary" className="bg-muted text-muted-foreground">Free Plan</Badge>;
    }
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription plan and billing
        </p>
      </div>

      {/* Current Plan Summary */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="bg-gradient-to-br from-primary via-primary to-primary/80 p-6 md:p-8 text-primary-foreground">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
                {currentPlan === "featured" ? (
                  <Crown className="h-7 w-7" />
                ) : currentPlan === "professional" ? (
                  <TrendingUp className="h-7 w-7" />
                ) : (
                  <CreditCard className="h-7 w-7" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold">
                    {subscriptionLoading ? "Loading..." : subscription?.plan_name || "Basic Listing"}
                  </h2>
                  {getStatusBadge()}
                </div>
                <div className="flex items-center gap-2 mt-2 text-primary-foreground/80">
                  <Clock className="h-4 w-4" />
                  {isSubscribed && subscription?.subscription_end ? (
                    <span>Renews {format(new Date(subscription.subscription_end), "MMMM d, yyyy")}</span>
                  ) : (
                    <span>Upgrade to start receiving leads</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {isSubscribed && (
                <Button 
                  variant="secondary"
                  className="bg-white/10 hover:bg-white/20 text-primary-foreground border-white/20"
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                >
                  {portalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Manage Billing
                </Button>
              )}
              {currentPlan !== "featured" && (
                <Button 
                  variant="secondary"
                  className="bg-white text-primary hover:bg-white/90"
                  onClick={() => handleCheckout(currentPlan === "basic" ? "professional" : "featured")}
                  disabled={checkoutLoading !== null}
                >
                  {checkoutLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Upgrade Plan
                </Button>
              )}
            </div>
          </div>

          {/* Lead Usage */}
          {leadLimit > 0 && (
            <div className="mt-6 p-4 bg-white/10 backdrop-blur rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Monthly Lead Usage</span>
                <span className="text-sm">
                  <span className="font-bold">{usedLeads}</span> / {leadLimit} leads
                </span>
              </div>
              <Progress value={leadUsagePercent} className="h-2 bg-white/20" />
              {leadUsagePercent >= 80 && leadUsagePercent < 100 && (
                <p className="text-xs mt-2 text-amber-200">
                  You're approaching your monthly lead limit. Consider upgrading for more leads.
                </p>
              )}
              {leadUsagePercent >= 100 && (
                <p className="text-xs mt-2 text-red-200 font-medium">
                  Monthly lead limit reached. Upgrade to continue receiving leads.
                </p>
              )}
            </div>
          )}

          {leadLimit === 0 && (
            <div className="mt-6 p-4 bg-white/10 backdrop-blur rounded-xl">
              <p className="text-sm text-primary-foreground/80">
                <Star className="h-4 w-4 inline mr-1.5" />
                Your listing is live but you're not receiving leads. Upgrade to start getting qualified leads.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Plans Grid */}
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground mb-5">
          Choose Your Plan
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card 
                key={plan.key} 
                className={`relative overflow-hidden transition-all duration-300 ${
                  plan.current 
                    ? "border-primary ring-2 ring-primary shadow-lg"
                    : plan.highlight 
                      ? "border-primary/50 shadow-md hover:shadow-lg hover:border-primary" 
                      : "hover:shadow-md hover:border-border"
                }`}
              >
                {plan.current && (
                  <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-xs font-semibold text-center py-1.5">
                    Current Plan
                  </div>
                )}
                {!plan.current && plan.key === "featured" && (
                  <div className="absolute top-0 left-0 right-0 bg-amber-500 text-white text-xs font-semibold text-center py-1.5">
                    <Star className="h-3 w-3 inline mr-1" />
                    Most Popular
                  </div>
                )}
                
                <CardHeader className={`pb-4 ${plan.current || plan.key === "featured" ? "pt-10" : ""}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                      plan.key === "featured" 
                        ? "bg-amber-100 text-amber-600" 
                        : plan.key === "professional"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <CardDescription className="mt-2">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-5">
                  <div className={`text-sm font-semibold px-3 py-2 rounded-lg ${
                    plan.key === "featured"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : plan.key === "professional"
                        ? "bg-primary/5 text-primary border border-primary/20"
                        : "bg-muted text-muted-foreground"
                  }`}>
                    {plan.lead_limit === 0 
                      ? "No leads included" 
                      : `Up to ${plan.lead_limit} leads/month`
                    }
                  </div>
                  
                  <ul className="space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm">
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          plan.key === "featured"
                            ? "bg-amber-100 text-amber-600"
                            : "bg-primary/10 text-primary"
                        }`}>
                          <Check className="h-3 w-3" />
                        </div>
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {plan.current ? (
                    <Button variant="secondary" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : plan.key === "basic" ? (
                    <Button variant="outline" className="w-full" disabled>
                      Free Tier
                    </Button>
                  ) : (
                    <Button 
                      variant={plan.key === "featured" ? "default" : "outline"} 
                      className={`w-full group ${
                        plan.key === "featured" 
                          ? "bg-amber-500 hover:bg-amber-600 text-white" 
                          : ""
                      }`}
                      onClick={() => handleCheckout(plan.key)}
                      disabled={checkoutLoading === plan.key}
                    >
                      {checkoutLoading === plan.key ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {currentPlan === "basic" ? "Get Started" : "Upgrade"}
                      {!checkoutLoading && (
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
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
              <CardDescription>View invoices and payment history</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isSubscribed ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground mb-4">Access your invoices and payment history in the billing portal.</p>
              <Button variant="outline" onClick={handleManageSubscription} disabled={portalLoading}>
                {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                View Billing Portal
              </Button>
            </div>
          ) : (
            <div className="text-center py-14">
              <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground">No billing history yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Invoices will appear here after your first payment
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
