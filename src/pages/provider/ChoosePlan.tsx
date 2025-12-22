import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PLAN_DETAILS } from "@/hooks/useSubscription";
import {
  Check,
  Crown,
  Sparkles,
  Star,
  ArrowRight,
  Shield,
  Users,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    id: "basic" as const,
    name: "Basic",
    description: "Perfect for getting started",
    price: "$0",
    period: "/forever",
    icon: Shield,
    color: "muted",
    features: [
      "1 lead (lifetime)",
      "Basic listing",
      "Profile page",
      "Email support",
    ],
    limitations: [
      "No featured placement",
      "Limited visibility",
    ],
  },
  {
    id: "professional" as const,
    name: "Professional",
    description: "Best for growing facilities",
    price: "$149",
    period: "/month",
    icon: TrendingUp,
    color: "primary",
    popular: true,
    features: [
      "15 leads per month",
      "Priority listing placement",
      "Lead conversion analytics",
      "Email lead notifications",
      "Shared lead pool access",
      "Priority email support",
    ],
    limitations: [],
  },
  {
    id: "featured" as const,
    name: "Featured",
    description: "Maximum visibility & leads",
    price: "$299",
    period: "/month",
    icon: Crown,
    color: "accent",
    features: [
      "30 leads per month",
      "Homepage featured placement",
      "Exclusive leads priority",
      "Advanced analytics dashboard",
      "Dedicated account manager",
      "Phone & email support",
      "Verified badge",
      "Priority in all searches",
    ],
    limitations: [],
  },
];

export default function ChoosePlan() {
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "professional" | "featured">("professional");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleContinue = async () => {
    setIsLoading(true);

    try {
      if (selectedPlan === "basic") {
        // For basic plan, just go to dashboard
        toast({
          title: "Welcome to RehabLookup!",
          description: "Your account is ready. Start by completing your facility profile.",
        });
        navigate("/provider/dashboard");
        return;
      }

      // For paid plans, create checkout session
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke("create-checkout", {
        body: { plan: selectedPlan },
      });

      if (checkoutError || !checkoutData?.url) {
        console.error("Checkout error:", checkoutError);
        toast({
          title: "Unable to start checkout",
          description: "Please try again or contact support.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = checkoutData.url;
    } catch (error) {
      console.error("Checkout invocation error:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    toast({
      title: "Welcome to RehabLookup!",
      description: "You can upgrade your plan anytime from the Billing page.",
    });
    navigate("/provider/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container max-w-6xl px-4 py-12 md:py-20">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-full mb-4">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Select the plan that best fits your facility's needs. You can upgrade or downgrade at any time.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-12">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            const Icon = plan.icon;
            
            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative cursor-pointer transition-all duration-300 hover:shadow-lg",
                  isSelected && plan.color === "primary" && "ring-2 ring-primary shadow-lg shadow-primary/10",
                  isSelected && plan.color === "accent" && "ring-2 ring-accent shadow-lg shadow-accent/10",
                  isSelected && plan.color === "muted" && "ring-2 ring-border shadow-lg",
                  !isSelected && "hover:border-muted-foreground/30"
                )}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                      <Star className="h-3 w-3" />
                      Most Popular
                    </span>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <div className={cn(
                    "mx-auto mb-3 p-3 rounded-xl w-fit",
                    plan.color === "primary" && "bg-primary/10",
                    plan.color === "accent" && "bg-accent/10",
                    plan.color === "muted" && "bg-muted"
                  )}>
                    <Icon className={cn(
                      "h-7 w-7",
                      plan.color === "primary" && "text-primary",
                      plan.color === "accent" && "text-accent",
                      plan.color === "muted" && "text-muted-foreground"
                    )} />
                  </div>
                  <CardTitle className="text-xl font-semibold">{plan.name}</CardTitle>
                  <CardDescription className="text-sm">{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <div className={cn(
                          "mt-0.5 p-0.5 rounded-full",
                          plan.color === "primary" && "bg-primary/10",
                          plan.color === "accent" && "bg-accent/10",
                          plan.color === "muted" && "bg-muted"
                        )}>
                          <Check className={cn(
                            "h-3.5 w-3.5",
                            plan.color === "primary" && "text-primary",
                            plan.color === "accent" && "text-accent",
                            plan.color === "muted" && "text-muted-foreground"
                          )} />
                        </div>
                        <span className="text-sm text-foreground">{feature}</span>
                      </div>
                    ))}
                    {plan.limitations.map((limitation, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 opacity-60">
                        <div className="mt-0.5 p-0.5 rounded-full bg-muted">
                          <div className="h-3.5 w-3.5 flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">–</span>
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">{limitation}</span>
                      </div>
                    ))}
                  </div>

                  {/* Selection indicator */}
                  <div className={cn(
                    "mt-6 py-2.5 rounded-lg text-center text-sm font-medium transition-colors",
                    isSelected && plan.color === "primary" && "bg-primary text-primary-foreground",
                    isSelected && plan.color === "accent" && "bg-accent text-accent-foreground",
                    isSelected && plan.color === "muted" && "bg-foreground text-background",
                    !isSelected && "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? "Selected" : "Select Plan"}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={isLoading}
            className="min-w-[200px] h-12 text-base font-semibold"
          >
            {isLoading ? (
              "Processing..."
            ) : selectedPlan === "basic" ? (
              <>
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            ) : (
              <>
                Continue to Payment
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={handleSkip}
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground"
          >
            Skip for now
          </Button>
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 text-center">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Secure payments via Stripe</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Trusted by 500+ facilities</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
