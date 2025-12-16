import { useState } from "react";
import { Check, Sparkles, Star, Zap, Crown, Building2, Users, Phone, Globe, Mail, TrendingUp, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PLAN_DETAILS } from "@/hooks/useSubscription";

interface PlanSelectionStepProps {
  selectedPlan: "basic" | "professional" | "featured";
  onPlanSelect: (plan: "basic" | "professional" | "featured") => void;
}

const planIcons = {
  basic: Building2,
  professional: Star,
  featured: Crown,
};

const planColors = {
  basic: {
    border: "border-border",
    bg: "bg-card",
    badge: "bg-muted text-muted-foreground",
    button: "outline" as const,
    highlight: false,
  },
  professional: {
    border: "border-primary/50",
    bg: "bg-card",
    badge: "bg-primary/10 text-primary",
    button: "default" as const,
    highlight: false,
  },
  featured: {
    border: "border-accent",
    bg: "bg-gradient-to-br from-accent/5 via-card to-primary/5",
    badge: "bg-accent text-accent-foreground",
    button: "default" as const,
    highlight: true,
  },
};

export function PlanSelectionStep({ selectedPlan, onPlanSelect }: PlanSelectionStepProps) {
  const plans = [
    { key: "basic" as const, ...PLAN_DETAILS.basic },
    { key: "professional" as const, ...PLAN_DETAILS.professional },
    { key: "featured" as const, ...PLAN_DETAILS.featured },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Choose a plan that fits your needs. You can always upgrade later.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const Icon = planIcons[plan.key];
          const colors = planColors[plan.key];
          const isSelected = selectedPlan === plan.key;

          return (
            <div
              key={plan.key}
              onClick={() => onPlanSelect(plan.key)}
              className={cn(
                "relative cursor-pointer rounded-xl border-2 p-5 transition-all duration-200",
                colors.border,
                colors.bg,
                isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                !isSelected && "hover:border-primary/30 hover:shadow-md",
                colors.highlight && "shadow-lg"
              )}
            >
              {/* Popular Badge */}
              {plan.key === "professional" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    <Zap className="h-3 w-3" />
                    Most Popular
                  </span>
                </div>
              )}

              {/* Best Value Badge */}
              {plan.key === "featured" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                    <Crown className="h-3 w-3" />
                    Best Value
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="mb-4 pt-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", colors.badge)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{plan.name}</h3>
                    {plan.key !== "basic" && (
                      <p className="text-xs text-muted-foreground">{plan.description}</p>
                    )}
                  </div>
                </div>

                {/* Pricing */}
                <div className="mt-3">
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground">{plan.period}</span>
                  )}
                </div>
              </div>

              {/* Key Metrics */}
              <div className="mb-4 space-y-2 border-t border-b border-border/50 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Qualified Leads</span>
                  <span className="font-semibold text-foreground">
                    {plan.qualified_lead_limit === 0 ? "None" : `${plan.qualified_lead_limit}/mo`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Direct Inquiries</span>
                  <span className="font-semibold text-foreground">
                    {plan.direct_lead_limit === -1 ? "Unlimited" : plan.direct_lead_limit === 1 ? "1 lifetime" : plan.direct_lead_limit}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Locations</span>
                  <span className="font-semibold text-foreground">
                    {plan.location_limit}
                  </span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-4">
                {plan.features.slice(0, 6).map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 shrink-0 text-accent mt-0.5" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
                {plan.features.length > 6 && (
                  <li className="text-xs text-muted-foreground pl-6">
                    +{plan.features.length - 6} more features
                  </li>
                )}
              </ul>

              {/* Not Included for Basic */}
              {plan.key === "basic" && plan.notIncludedDetails && (
                <div className="mb-4 rounded-lg bg-destructive/5 p-3">
                  <p className="text-xs font-medium text-destructive mb-1">Limitations:</p>
                  <ul className="space-y-1">
                    {plan.notIncludedDetails.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Microcopy */}
              {(plan.key === "professional" || plan.key === "featured") && plan.microcopy && (
                <p className="text-xs text-muted-foreground italic mb-4">
                  {plan.microcopy}
                </p>
              )}

              {/* Selection Button */}
              <Button
                variant={isSelected ? "default" : colors.button}
                className={cn(
                  "w-full",
                  isSelected && "bg-primary text-primary-foreground",
                  plan.key === "featured" && !isSelected && "bg-accent text-accent-foreground hover:bg-accent/90"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onPlanSelect(plan.key);
                }}
              >
                {isSelected ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Selected
                  </>
                ) : (
                  `Select ${plan.name}`
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Info Banner */}
      <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15">
            <Shield className="h-4 w-4 text-accent" />
          </div>
          <div>
            <p className="font-medium text-sm text-foreground mb-1">
              Start free, upgrade anytime
            </p>
            <p className="text-xs text-muted-foreground">
              {selectedPlan === "basic" 
                ? "You'll start with the Basic plan. Upgrade to Professional or Featured from your dashboard to receive exclusive qualified leads."
                : selectedPlan === "professional"
                ? "After signup, you'll be redirected to complete payment via Stripe. Cancel anytime from your billing settings."
                : "After signup, you'll be redirected to complete payment via Stripe. Enjoy priority placement and maximum lead volume."}
            </p>
          </div>
        </div>
      </div>

      {/* Comparison Highlights */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-muted/50 p-3">
          <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs font-medium text-foreground">Exclusive Leads</p>
          <p className="text-xs text-muted-foreground">Never shared</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <TrendingUp className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs font-medium text-foreground">Pre-Qualified</p>
          <p className="text-xs text-muted-foreground">Email verified</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <Mail className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs font-medium text-foreground">Instant Alerts</p>
          <p className="text-xs text-muted-foreground">Real-time delivery</p>
        </div>
      </div>
    </div>
  );
}
