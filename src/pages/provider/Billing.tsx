import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  CreditCard, 
  Check, 
  ArrowRight, 
  ArrowDown,
  Clock, 
  Loader2, 
  ExternalLink,
  Star,
  TrendingUp,
  X,
  Users,
  Crown,
  Zap,
  RefreshCw,
  Tag,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Shield,
  Sparkles
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription, PLAN_DETAILS, EXCLUSIVITY_MESSAGE } from "@/hooks/useSubscription";
import { useProviderData } from "@/hooks/useProviderData";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { SubscriptionHistoryWidget } from "@/components/provider/SubscriptionHistoryWidget";
import { PaymentMethodCard } from "@/components/provider/PaymentMethodCard";

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

  // Handle success/cancel from Stripe
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
      queryClient.invalidateQueries({ queryKey: ["provider-data"] });
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["facility-plan"] });
    } else if (canceled === "true") {
      toast({
        variant: "destructive",
        title: "Checkout Canceled",
        description: "Your subscription was not changed.",
      });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, toast, refetch, refetchProvider, queryClient]);

  // Auto-refresh subscription status
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        refetch();
      }
    }, 30000);
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

  const handleRefreshStatus = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      await refetchProvider();
      queryClient.invalidateQueries({ queryKey: ["facility-plan"] });
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
    },
    { 
      key: "professional" as const, 
      ...PLAN_DETAILS.professional, 
      current: currentPlan === "professional", 
      icon: TrendingUp,
      popular: false,
    },
    { 
      key: "featured" as const, 
      ...PLAN_DETAILS.featured, 
      current: currentPlan === "featured", 
      icon: Crown,
      popular: true,
    },
  ];

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
      if (isSubscribed) {
        return (
          <Button 
            variant="outline" 
            className="w-full"
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

    const planOrder = { basic: 0, professional: 1, featured: 2 };
    const isUpgrade = planOrder[plan.key] > planOrder[currentPlan];

    if (isUpgrade) {
      return (
        <Button 
          className={`w-full group ${
            plan.key === "featured" 
              ? "bg-amber-500 hover:bg-amber-600 text-white border-0" 
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
          Upgrade Now
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      );
    } else {
      return (
        <Button 
          variant="outline" 
          className="w-full"
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

  // Feature comparison data - ACCURATE to PLAN_DETAILS
  const comparisonFeatures = [
    { 
      feature: "Monthly Price", 
      basic: "Free", 
      professional: "$399", 
      featured: "$1,099",
      highlight: false 
    },
    { 
      feature: "Qualified Leads", 
      basic: "—", 
      professional: "100/month (shared)", 
      featured: "100/month (exclusive)",
      highlight: true,
      tooltip: "Pre-screened leads from our intake form with verified contact info and treatment intent."
    },
    { 
      feature: "Lead Exclusivity", 
      basic: "—", 
      professional: "Shared (max 2 providers)", 
      featured: "100% Exclusive",
      highlight: true 
    },
    { 
      feature: "Facility Locations", 
      basic: "1", 
      professional: "Up to 3", 
      featured: "Up to 5",
      highlight: false 
    },
    { 
      feature: "Phone & Website Visible", 
      basic: false, 
      professional: true, 
      featured: true,
      highlight: false 
    },
    { 
      feature: "Email Lead Notifications", 
      basic: false, 
      professional: true, 
      featured: true,
      highlight: false 
    },
    { 
      feature: "Lead Management Dashboard", 
      basic: false, 
      professional: true, 
      featured: true,
      highlight: false 
    },
    { 
      feature: "Analytics & Insights", 
      basic: "Basic", 
      professional: "Standard", 
      featured: "Advanced",
      highlight: false 
    },
    { 
      feature: "Homepage Featured Placement", 
      basic: false, 
      professional: false, 
      featured: true,
      highlight: false 
    },
    { 
      feature: "Priority Search Placement", 
      basic: false, 
      professional: false, 
      featured: true,
      highlight: false 
    },
    { 
      feature: "Gold Featured Badge", 
      basic: false, 
      professional: false, 
      featured: true,
      highlight: false 
    },
    { 
      feature: "Priority Email Support", 
      basic: false, 
      professional: false, 
      featured: true,
      highlight: false 
    },
  ];

  const renderCellValue = (value: boolean | string, isFeatured: boolean = false) => {
    if (typeof value === "boolean") {
      return value ? (
        <Check className={`h-4 w-4 mx-auto ${isFeatured ? "text-amber-500" : "text-emerald-500"}`} />
      ) : (
        <X className="h-4 w-4 mx-auto text-muted-foreground/40" />
      );
    }
    return <span className={isFeatured ? "text-amber-600 font-medium" : ""}>{value}</span>;
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Plans & Billing</h1>
            <p className="text-muted-foreground mt-1">
              Manage your subscription and billing preferences
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshStatus}
            disabled={isRefreshing || isFetching}
            className="self-start sm:self-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing || isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Current Plan Card */}
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              {/* Plan Info */}
              <div className="flex items-start gap-4 flex-1">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                  currentPlan === "featured" 
                    ? "bg-amber-100 text-amber-600" 
                    : currentPlan === "professional"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}>
                  {currentPlan === "featured" ? (
                    <Crown className="h-6 w-6" />
                  ) : currentPlan === "professional" ? (
                    <TrendingUp className="h-6 w-6" />
                  ) : (
                    <CreditCard className="h-6 w-6" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-semibold text-foreground">
                      {subscriptionLoading ? "Loading..." : subscription?.plan_name || "Basic Listing"}
                    </h2>
                    {isSubscribed ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Free</Badge>
                    )}
                    {isFetching && !subscriptionLoading && (
                      <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {isSubscribed && subscription?.subscription_end ? (
                      <span>Renews {format(new Date(subscription.subscription_end), "MMM d, yyyy")}</span>
                    ) : (
                      <span>Upgrade to start receiving qualified leads</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Lead Usage */}
              {leadLimit > 0 && (
                <div className="lg:w-64 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Lead Usage</span>
                    <span className="font-medium">{usedLeads}/{leadLimit}</span>
                  </div>
                  <Progress 
                    value={leadUsagePercent} 
                    className={`h-2 ${leadUsagePercent >= 90 ? "[&>div]:bg-red-500" : leadUsagePercent >= 75 ? "[&>div]:bg-amber-500" : ""}`} 
                  />
                  {leadUsagePercent >= 90 && (
                    <p className="text-xs text-red-600">Approaching limit</p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 shrink-0">
                {isSubscribed && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                  >
                    {portalLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Manage
                      </>
                    )}
                  </Button>
                )}
                {currentPlan !== "featured" && (
                  <Button 
                    size="sm"
                    onClick={() => handleCheckout(currentPlan === "basic" ? "professional" : "featured")}
                    disabled={checkoutLoading !== null}
                    className={currentPlan === "professional" ? "bg-amber-500 hover:bg-amber-600" : ""}
                  >
                    {checkoutLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Upgrade
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Card */}
        <PaymentMethodCard 
          onManagePayment={handleManageSubscription}
          portalLoading={portalLoading}
        />

        {/* Promo Code - Compact */}
        {currentPlan !== "featured" && (
          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border">
            <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Promo code"
                value={promoCode}
                onChange={(e) => handlePromoCodeChange(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && promoCode.trim() && !promoValidating) {
                    validatePromoCode();
                  }
                }}
                className={`uppercase h-9 sm:max-w-[200px] ${
                  promoValidation.isValid === true 
                    ? "border-emerald-500" 
                    : promoValidation.isValid === false 
                      ? "border-red-500"
                      : ""
                }`}
                disabled={promoValidating}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={validatePromoCode}
                  disabled={!promoCode.trim() || promoValidating || promoValidation.isValid === true}
                  className="h-9"
                >
                  {promoValidating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : promoValidation.isValid === true ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    "Apply"
                  )}
                </Button>
                {promoCode && (
                  <Button size="sm" variant="ghost" onClick={clearPromoCode} className="h-9 px-2">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            {promoValidation.isValid === true && (
              <span className="text-sm text-emerald-600 font-medium hidden sm:block">
                {promoValidation.discount}
              </span>
            )}
            {promoValidation.isValid === false && (
              <span className="text-sm text-red-600 hidden sm:block">
                {promoValidation.message}
              </span>
            )}
          </div>
        )}

        {/* Plans Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Choose Your Plan</h2>
          
          <div className="grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isFeatured = plan.key === "featured";
              const isProfessional = plan.key === "professional";
              
              return (
                <Card 
                  key={plan.key} 
                  className={`relative overflow-hidden transition-all ${
                    plan.current 
                      ? "ring-2 ring-primary border-primary"
                      : isFeatured
                        ? "border-amber-200 bg-gradient-to-b from-amber-50/50 to-transparent" 
                        : "hover:border-border/80"
                  }`}
                >
                  {/* Plan Badge */}
                  {plan.current && (
                    <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-xs font-medium text-center py-1">
                      Your Plan
                    </div>
                  )}
                  {!plan.current && isFeatured && (
                    <div className="absolute top-0 left-0 right-0 bg-amber-500 text-white text-xs font-medium text-center py-1 flex items-center justify-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Most Popular
                    </div>
                  )}
                  
                  <CardHeader className={`pb-4 ${plan.current || isFeatured ? "pt-8" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        isFeatured 
                          ? "bg-amber-100 text-amber-600" 
                          : isProfessional
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{plan.name}</CardTitle>
                        <CardDescription className="text-xs">{plan.description}</CardDescription>
                      </div>
                    </div>
                    
                    <div className="flex items-baseline gap-1 mt-4">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      {plan.period && <span className="text-muted-foreground text-sm">{plan.period}</span>}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Key Metric */}
                    <div className={`text-sm font-medium p-3 rounded-lg text-center ${
                      isFeatured
                        ? "bg-amber-100/70 text-amber-700"
                        : isProfessional
                          ? "bg-primary/5 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}>
                      {plan.key === "basic" 
                        ? "No qualified leads"
                        : `${plan.lead_limit} ${plan.exclusivity} leads/mo`
                      }
                    </div>
                    
                    {/* Microcopy */}
                    {(plan as any).microcopy && (
                      <p className="text-xs text-muted-foreground text-center leading-relaxed">
                        {(plan as any).microcopy}
                      </p>
                    )}
                    
                    {/* Features */}
                    <ul className="space-y-2">
                      {plan.features.slice(0, 5).map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <Check className={`h-4 w-4 shrink-0 mt-0.5 ${
                            isFeatured ? "text-amber-500" : "text-primary"
                          }`} />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                      {plan.features.length > 5 && (
                        <li className="text-xs text-muted-foreground pl-6">
                          +{plan.features.length - 5} more features
                        </li>
                      )}
                    </ul>
                    
                    {getPlanAction(plan)}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Feature Comparison */}
        <Collapsible defaultOpen={false}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors group">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Feature Comparison</CardTitle>
                    <CardDescription>Compare all plan features side-by-side</CardDescription>
                  </div>
                  <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-t border-b border-border bg-muted/30">
                        <th className="text-left p-4 font-medium text-muted-foreground w-[40%]">Feature</th>
                        <th className="text-center p-4 font-medium text-muted-foreground w-[20%]">Basic</th>
                        <th className="text-center p-4 font-medium text-muted-foreground w-[20%]">Professional</th>
                        <th className="text-center p-4 font-medium text-amber-600 w-[20%]">Featured</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {comparisonFeatures.map((row) => (
                        <tr key={row.feature} className={`hover:bg-muted/20 ${row.highlight ? "bg-muted/10" : ""}`}>
                          <td className="p-4 text-foreground">
                            <span className="flex items-center gap-1.5">
                              {row.feature}
                              {row.tooltip && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[250px] text-xs">
                                      <p>{row.tooltip}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </span>
                          </td>
                          <td className="p-4 text-center text-muted-foreground">{renderCellValue(row.basic)}</td>
                          <td className="p-4 text-center text-foreground">{renderCellValue(row.professional)}</td>
                          <td className="p-4 text-center">{renderCellValue(row.featured, true)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Exclusivity Note */}
                <div className="p-4 border-t border-border bg-muted/20">
                  <div className="flex items-start gap-3 text-sm">
                    <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Lead Exclusivity:</span> {EXCLUSIVITY_MESSAGE}
                    </p>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Subscription History Widget */}
        <SubscriptionHistoryWidget 
          isSubscribed={isSubscribed} 
          onSubscriptionChange={() => {
            refetch();
            refetchProvider();
          }}
        />
      </div>
    </div>
  );
}
