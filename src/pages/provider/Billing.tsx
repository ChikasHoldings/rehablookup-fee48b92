import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  CreditCard, 
  Check, 
  ArrowRight, 
  ArrowDown,
  Clock, 
  FileText, 
  Loader2, 
  ExternalLink,
  Star,
  TrendingUp,
  X,
  Users,
  Crown,
  Zap,
  RefreshCw,
  Wallet,
  Receipt,
  Settings,
  Tag,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription, PLAN_DETAILS, DIRECT_INQUIRY_CLARIFICATION, EXCLUSIVITY_MESSAGE } from "@/hooks/useSubscription";
import { useProviderData } from "@/hooks/useProviderData";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

export default function ProviderBillingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: subscription, isLoading: subscriptionLoading, refetch, isFetching } = useSubscription();
  const { data: providerData, refetch: refetchProvider } = useProviderData();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoValidating, setPromoValidating] = useState(false);
  const [promoValidation, setPromoValidation] = useState<{
    isValid: boolean | null;
    message: string;
    discount?: string;
  }>({ isValid: null, message: "" });

  // Handle success/cancel from Stripe and clear params
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");
    
    if (success === "true") {
      toast({
        title: "Subscription Updated!",
        description: "Your plan has been changed successfully.",
      });
      setSearchParams({});
      refetch();
      refetchProvider();
      // Invalidate all plan-related queries so UI updates everywhere
      queryClient.invalidateQueries({ queryKey: ["provider-data"] });
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["facility-plan"] });
      queryClient.invalidateQueries({ queryKey: ["featured-subscription-check"] });
    } else if (canceled === "true") {
      toast({
        variant: "destructive",
        title: "Checkout Canceled",
        description: "Your subscription was not changed.",
      });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, toast, refetch, refetchProvider, queryClient]);

  // Auto-refresh subscription status periodically when page is visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        refetch();
      }
    }, 30000); // Every 30 seconds for real-time feel
    
    return () => clearInterval(interval);
  }, [refetch]);

  // Refetch on window focus
  useEffect(() => {
    const handleFocus = () => {
      refetch();
      refetchProvider();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refetch, refetchProvider]);

  // Manual refresh handler
  const handleRefreshStatus = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      await refetchProvider();
      // Also invalidate plan-related queries
      queryClient.invalidateQueries({ queryKey: ["facility-plan"] });
      queryClient.invalidateQueries({ queryKey: ["featured-subscription-check"] });
      toast({
        title: "Status Refreshed",
        description: "Your subscription status has been updated.",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, refetchProvider, queryClient, toast]);

  const handleCheckout = async (plan: "professional" | "featured") => {
    setCheckoutLoading(plan);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { 
          plan,
          promoCode: promoValidation.isValid ? promoCode.trim().toUpperCase() : undefined
        },
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

  const handlePromoCodeChange = (value: string) => {
    setPromoCode(value);
    // Reset validation when user types
    if (promoValidation.isValid !== null) {
      setPromoValidation({ isValid: null, message: "" });
    }
  };

  const validatePromoCode = async () => {
    if (!promoCode.trim()) return;
    
    setPromoValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke("validate-promo-code", {
        body: { promoCode: promoCode.trim().toUpperCase() },
      });

      if (error) throw error;

      setPromoValidation({
        isValid: data?.valid || false,
        message: data?.message || "Unable to validate",
        discount: data?.discount,
      });
    } catch (err) {
      console.error("Promo validation error:", err);
      setPromoValidation({
        isValid: false,
        message: "Unable to validate promo code",
      });
    } finally {
      setPromoValidating(false);
    }
  };

  const clearPromoCode = () => {
    setPromoCode("");
    setPromoValidation({ isValid: null, message: "" });
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
      canUpgrade: false,
      canDowngrade: currentPlan !== "basic"
    },
    { 
      key: "professional" as const, 
      ...PLAN_DETAILS.professional, 
      current: currentPlan === "professional", 
      icon: TrendingUp,
      canUpgrade: currentPlan === "basic",
      canDowngrade: currentPlan === "featured"
    },
    { 
      key: "featured" as const, 
      ...PLAN_DETAILS.featured, 
      current: currentPlan === "featured", 
      icon: Crown,
      canUpgrade: currentPlan !== "featured",
      canDowngrade: false
    },
  ];

  const getStatusBadge = () => {
    if (!isSubscribed) {
      return <Badge variant="secondary" className="bg-muted text-muted-foreground">Free Plan</Badge>;
    }
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>;
  };

  const getPlanAction = (plan: typeof plans[0]) => {
    if (plan.current) {
      return (
        <Button variant="secondary" className="w-full" disabled>
          <Check className="h-4 w-4 mr-2" />
          Current Plan
        </Button>
      );
    }
    
    if (plan.key === "basic") {
      // Downgrade to basic via portal
      if (isSubscribed) {
        return (
          <Button 
            variant="outline" 
            className="w-full text-muted-foreground"
            onClick={handleManageSubscription}
            disabled={portalLoading}
          >
            {portalLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ArrowDown className="h-4 w-4 mr-2" />
            )}
            Downgrade
          </Button>
        );
      }
      return (
        <Button variant="outline" className="w-full" disabled>
          Free Tier
        </Button>
      );
    }

    // Check if this is an upgrade or downgrade
    const planOrder = { basic: 0, professional: 1, featured: 2 };
    const isUpgrade = planOrder[plan.key] > planOrder[currentPlan];

    if (isUpgrade) {
      return (
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
          ) : (
            <Zap className="h-4 w-4 mr-2" />
          )}
          Upgrade
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      );
    } else {
      // Downgrade - use customer portal
      return (
        <Button 
          variant="outline" 
          className="w-full text-muted-foreground"
          onClick={handleManageSubscription}
          disabled={portalLoading}
        >
          {portalLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <ArrowDown className="h-4 w-4 mr-2" />
          )}
          Switch Plan
        </Button>
      );
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription plan and billing
        </p>
      </div>

      {/* Current Plan Summary - Updated design without solid blue */}
      <Card className="overflow-hidden shadow-md">
        <CardHeader className="border-b border-border bg-muted/30 pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${
                currentPlan === "featured" 
                  ? "bg-amber-100 text-amber-600" 
                  : currentPlan === "professional"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}>
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
                  <h2 className="text-2xl font-bold text-foreground">
                    {subscriptionLoading ? "Loading..." : subscription?.plan_name || "Basic Listing"}
                  </h2>
                  {getStatusBadge()}
                  {isFetching && !subscriptionLoading && (
                    <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {isSubscribed && subscription?.subscription_end ? (
                    <span>Renews {format(new Date(subscription.subscription_end), "MMMM d, yyyy")}</span>
                  ) : (
                    <span>Upgrade to start receiving leads</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshStatus}
                disabled={isRefreshing || isFetching}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing || isFetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              {currentPlan !== "featured" && (
                <Button 
                  size="sm"
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
        </CardHeader>
        
        <CardContent className="p-6">
          {/* Lead Usage */}
          {leadLimit > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Monthly Lead Usage</span>
                <span className="text-sm text-muted-foreground">
                  <span className="font-bold text-foreground">{usedLeads}</span> / {leadLimit} leads
                </span>
              </div>
              <Progress value={leadUsagePercent} className="h-2" />
              {leadUsagePercent >= 80 && leadUsagePercent < 100 && (
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  You're approaching your monthly lead limit. Consider upgrading for more leads.
                </p>
              )}
              {leadUsagePercent >= 100 && (
                <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg font-medium">
                  Monthly lead limit reached. Upgrade to continue receiving leads.
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
              <Star className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Your listing is live but you're not receiving leads. Upgrade to start getting qualified leads.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions for Subscribed Users */}
      {isSubscribed && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleManageSubscription}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Payment Methods</h3>
                <p className="text-sm text-muted-foreground">Add or update cards</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleManageSubscription}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Billing History</h3>
                <p className="text-sm text-muted-foreground">View all invoices</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleManageSubscription}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Manage Subscription</h3>
                <p className="text-sm text-muted-foreground">Cancel or modify</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Promo Code Section - Only show for non-featured plans */}
      {currentPlan !== "featured" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Have a Promo Code?</CardTitle>
            </div>
            <CardDescription>
              Enter your promotional code to get a discount on your subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Input
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => handlePromoCodeChange(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && promoCode.trim() && !promoValidating) {
                      validatePromoCode();
                    }
                  }}
                  className={`uppercase pr-10 ${
                    promoValidation.isValid === true 
                      ? "border-emerald-500 focus-visible:ring-emerald-500" 
                      : promoValidation.isValid === false 
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                  }`}
                  disabled={promoValidating}
                />
                {promoCode && !promoValidating && (
                  <button
                    type="button"
                    onClick={clearPromoCode}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={validatePromoCode}
                disabled={!promoCode.trim() || promoValidating || promoValidation.isValid === true}
              >
                {promoValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : promoValidation.isValid === true ? (
                  <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                ) : null}
                {promoValidating ? "Validating..." : promoValidation.isValid === true ? "Applied" : "Apply"}
              </Button>
            </div>
            
            {/* Validation feedback */}
            {promoValidation.isValid === true && (
              <div className="flex items-center gap-2 mt-3 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {promoValidation.message}
                  {promoValidation.discount && ` - ${promoValidation.discount}`}
                </span>
              </div>
            )}
            {promoValidation.isValid === false && (
              <div className="flex items-center gap-2 mt-3 text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                <XCircle className="h-4 w-4" />
                <span className="text-sm">{promoValidation.message}</span>
              </div>
            )}
            
            {promoCode && promoValidation.isValid === null && !promoValidating && (
              <p className="text-sm text-muted-foreground mt-3">
                Click "Apply" to validate your promo code
              </p>
            )}
          </CardContent>
        </Card>
      )}

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
                    : plan.key === "featured"
                      ? "border-amber-300 shadow-md hover:shadow-lg hover:border-amber-400" 
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
                  <div className="space-y-2">
                    <div className={`text-sm font-semibold px-3 py-2 rounded-lg ${
                      plan.key === "featured"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : plan.key === "professional"
                          ? "bg-primary/5 text-primary border border-primary/20"
                          : "bg-muted text-muted-foreground"
                    }`}>
                      {plan.key === "basic" 
                        ? "1 direct inquiry (lifetime)"
                        : `${plan.qualified_lead_limit || plan.lead_limit} exclusive qualified leads/month`
                      }
                    </div>
                    {(plan.key === "professional" || plan.key === "featured") && (
                      <>
                        <p className="text-[11px] text-muted-foreground px-1 italic">
                          {(plan as any).microcopy}
                        </p>
                        <div className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 group relative">
                          + Unlimited direct profile inquiries
                          <span className="hidden group-hover:block absolute left-0 right-0 top-full mt-1 p-2 bg-foreground text-background text-[10px] rounded z-10">
                            {DIRECT_INQUIRY_CLARIFICATION}
                          </span>
                        </div>
                      </>
                    )}
                    <div className={`text-xs font-medium px-3 py-1.5 rounded-lg ${
                      plan.key === "featured"
                        ? "bg-amber-50/50 text-amber-600 border border-amber-100"
                        : plan.key === "professional"
                          ? "bg-primary/5 text-primary/80 border border-primary/10"
                          : "bg-muted/50 text-muted-foreground/80"
                    }`}>
                      {plan.location_limit === 1 
                        ? "1 facility location" 
                        : `Up to ${plan.location_limit} locations`
                      }
                    </div>
                  </div>
                  
                  {/* Exclusivity message for paid plans */}
                  {plan.key !== "basic" && (
                    <p className="text-xs text-center text-muted-foreground bg-muted/30 rounded-lg py-2 px-3 border border-border/50">
                      {EXCLUSIVITY_MESSAGE}
                    </p>
                  )}
                  
                  {/* Upgrade microcopy for basic plan */}
                  {plan.key === "basic" && (plan as any).upgradeMicrocopy && (
                    <p className="text-xs text-center text-primary bg-primary/5 rounded-lg py-2 px-3 border border-primary/10">
                      {(plan as any).upgradeMicrocopy}
                    </p>
                  )}
                  
                  {/* Features list */}
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
                  
                  {/* Not included list for basic plan */}
                  {plan.key === "basic" && (plan as any).notIncluded && (
                    <ul className="space-y-2 pt-2 border-t border-border">
                      <li className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Does not include</li>
                      {(plan as any).notIncluded.map((item: string) => (
                        <li key={item} className="flex items-start gap-2.5 text-sm">
                          <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-destructive/10 text-destructive">
                            <X className="h-3 w-3" />
                          </div>
                          <span className="text-muted-foreground/70">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  
                  {getPlanAction(plan)}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Plan Comparison Table */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border bg-muted/30">
          <CardTitle className="text-lg">Feature Comparison</CardTitle>
          <CardDescription>See all features side-by-side</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left p-4 font-medium text-muted-foreground">Feature</th>
                  <th className="text-center p-4 font-medium text-muted-foreground min-w-[120px]">Basic</th>
                  <th className="text-center p-4 font-medium text-muted-foreground min-w-[120px]">Professional</th>
                  <th className="text-center p-4 font-medium text-amber-600 min-w-[120px]">Featured</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm text-foreground">Monthly Price</td>
                  <td className="p-4 text-center text-sm font-semibold text-foreground">Free</td>
                  <td className="p-4 text-center text-sm font-semibold text-foreground">$399</td>
                  <td className="p-4 text-center text-sm font-semibold text-amber-600">$1,099</td>
                </tr>
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm text-foreground">
                    <span className="flex items-center gap-1.5">
                      Qualified Leads
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[280px] text-xs">
                            <p>Pre-screened leads from our intake form who have verified their contact info and expressed intent to seek treatment. Exclusively routed to one provider.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </span>
                  </td>
                  <td className="p-4 text-center text-sm text-muted-foreground">—</td>
                  <td className="p-4 text-center text-sm text-foreground">25/month</td>
                  <td className="p-4 text-center text-sm text-amber-600 font-medium">75/month</td>
                </tr>
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm text-foreground">
                    <span className="flex items-center gap-1.5">
                      Direct Inquiries
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[280px] text-xs">
                            <p>Inquiries from users who contact your profile directly. These don't count toward your monthly qualified lead limit.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </span>
                  </td>
                  <td className="p-4 text-center text-sm text-muted-foreground">1 (lifetime)</td>
                  <td className="p-4 text-center text-sm text-emerald-600 font-medium">Unlimited</td>
                  <td className="p-4 text-center text-sm text-emerald-600 font-medium">Unlimited</td>
                </tr>
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm text-foreground">Facility Locations</td>
                  <td className="p-4 text-center text-sm text-foreground">1</td>
                  <td className="p-4 text-center text-sm text-foreground">3</td>
                  <td className="p-4 text-center text-sm text-amber-600 font-medium">5</td>
                </tr>
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm text-foreground">Phone & Website Visible</td>
                  <td className="p-4 text-center"><X className="h-4 w-4 text-muted-foreground mx-auto" /></td>
                  <td className="p-4 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                  <td className="p-4 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm text-foreground">Email Lead Notifications</td>
                  <td className="p-4 text-center"><X className="h-4 w-4 text-muted-foreground mx-auto" /></td>
                  <td className="p-4 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                  <td className="p-4 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm text-foreground">Lead Management Dashboard</td>
                  <td className="p-4 text-center"><X className="h-4 w-4 text-muted-foreground mx-auto" /></td>
                  <td className="p-4 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                  <td className="p-4 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm text-foreground">Analytics & Insights</td>
                  <td className="p-4 text-center text-sm text-muted-foreground">Basic</td>
                  <td className="p-4 text-center text-sm text-foreground">Standard</td>
                  <td className="p-4 text-center text-sm text-amber-600 font-medium">Advanced</td>
                </tr>
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm text-foreground">Homepage Featured Placement</td>
                  <td className="p-4 text-center"><X className="h-4 w-4 text-muted-foreground mx-auto" /></td>
                  <td className="p-4 text-center"><X className="h-4 w-4 text-muted-foreground mx-auto" /></td>
                  <td className="p-4 text-center"><Check className="h-4 w-4 text-amber-500 mx-auto" /></td>
                </tr>
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm text-foreground">Priority Search Placement</td>
                  <td className="p-4 text-center"><X className="h-4 w-4 text-muted-foreground mx-auto" /></td>
                  <td className="p-4 text-center"><X className="h-4 w-4 text-muted-foreground mx-auto" /></td>
                  <td className="p-4 text-center"><Check className="h-4 w-4 text-amber-500 mx-auto" /></td>
                </tr>
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm text-foreground">Gold Featured Badge</td>
                  <td className="p-4 text-center"><X className="h-4 w-4 text-muted-foreground mx-auto" /></td>
                  <td className="p-4 text-center"><X className="h-4 w-4 text-muted-foreground mx-auto" /></td>
                  <td className="p-4 text-center"><Check className="h-4 w-4 text-amber-500 mx-auto" /></td>
                </tr>
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm text-foreground">Priority Email Support</td>
                  <td className="p-4 text-center"><X className="h-4 w-4 text-muted-foreground mx-auto" /></td>
                  <td className="p-4 text-center"><X className="h-4 w-4 text-muted-foreground mx-auto" /></td>
                  <td className="p-4 text-center"><Check className="h-4 w-4 text-amber-500 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Billing Portal Section */}
      <Card className="shadow-sm">
        <CardHeader className="border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Billing Portal</CardTitle>
                <CardDescription>Manage payments, invoices, and subscription</CardDescription>
              </div>
            </div>
            {isSubscribed && (
              <Button onClick={handleManageSubscription} disabled={portalLoading}>
                {portalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                Open Portal
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isSubscribed ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Access the billing portal to:
              </p>
              <ul className="grid gap-3 md:grid-cols-2">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-primary" />
                  View and download invoices
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-primary" />
                  Update payment methods
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-primary" />
                  Change or cancel subscription
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-primary" />
                  Update billing information
                </li>
              </ul>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground">No billing history yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Subscribe to a plan to access billing features
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
