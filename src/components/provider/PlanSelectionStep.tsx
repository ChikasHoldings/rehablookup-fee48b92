import { Check, Zap, Crown, Building2, Star, Users, TrendingUp, Mail, Shield } from "lucide-react";
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
    iconBg: "bg-muted",
  },
  professional: {
    border: "border-primary",
    bg: "bg-card",
    badge: "bg-primary/10 text-primary",
    button: "default" as const,
    highlight: true,
    iconBg: "bg-primary/10",
  },
  featured: {
    border: "border-accent",
    bg: "bg-gradient-to-br from-accent/5 via-card to-primary/5",
    badge: "bg-accent text-accent-foreground",
    button: "default" as const,
    highlight: true,
    iconBg: "bg-accent/10",
  },
};

export function PlanSelectionStep({ selectedPlan, onPlanSelect }: PlanSelectionStepProps) {
  const plans = [
    { key: "basic" as const, ...PLAN_DETAILS.basic },
    { key: "professional" as const, ...PLAN_DETAILS.professional },
    { key: "featured" as const, ...PLAN_DETAILS.featured },
  ];

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
          Choose Your Plan
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Select the plan that fits your facility's needs. Upgrade or downgrade anytime from your dashboard.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid gap-6 lg:gap-8 lg:grid-cols-3">
        {plans.map((plan) => {
          const Icon = planIcons[plan.key];
          const colors = planColors[plan.key];
          const isSelected = selectedPlan === plan.key;

          return (
            <div
              key={plan.key}
              onClick={() => onPlanSelect(plan.key)}
              className={cn(
                "relative cursor-pointer rounded-2xl border-2 p-6 lg:p-8 transition-all duration-300",
                colors.border,
                colors.bg,
                isSelected && "ring-2 ring-primary ring-offset-4 ring-offset-background scale-[1.02]",
                !isSelected && "hover:border-primary/50 hover:shadow-xl hover:scale-[1.01]",
                colors.highlight && "shadow-lg",
                plan.key === "professional" && "lg:scale-105 lg:z-10"
              )}
            >
              {/* Badge */}
              {plan.key === "professional" && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-lg">
                    <Zap className="h-4 w-4" />
                    Most Popular
                  </span>
                </div>
              )}

              {plan.key === "featured" && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground shadow-lg">
                    <Crown className="h-4 w-4" />
                    Best Value
                  </span>
                </div>
              )}

              {/* Header */}
              <div className={cn("pt-2", (plan.key === "professional" || plan.key === "featured") && "pt-4")}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl",
                    colors.iconBg
                  )}>
                    <Icon className={cn(
                      "h-6 w-6",
                      plan.key === "basic" && "text-muted-foreground",
                      plan.key === "professional" && "text-primary",
                      plan.key === "featured" && "text-accent"
                    )} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                    {plan.key !== "basic" && (
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    )}
                  </div>
                </div>

                {/* Pricing */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl lg:text-5xl font-bold text-foreground">{plan.price}</span>
                    {plan.period && (
                      <span className="text-lg text-muted-foreground">{plan.period}</span>
                    )}
                  </div>
                  {plan.key === "basic" && (
                    <p className="text-sm text-muted-foreground mt-1">Forever free</p>
                  )}
                </div>
              </div>

              {/* Key Metrics */}
              <div className="mb-6 space-y-3 border-t border-b border-border/50 py-5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Qualified Leads</span>
                  <span className={cn(
                    "font-bold",
                    plan.key === "basic" ? "text-muted-foreground" : "text-foreground"
                  )}>
                    {plan.key === "basic" 
                      ? "None" 
                      : `${plan.lead_limit}/mo`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Lead Type</span>
                  <span className={cn(
                    "font-medium px-2 py-0.5 rounded-full text-sm",
                    plan.key === "basic" && "bg-muted text-muted-foreground",
                    plan.key === "professional" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                    plan.key === "featured" && "bg-accent/10 text-accent"
                  )}>
                    {plan.key === "basic" ? "—" : plan.exclusivity}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Locations</span>
                  <span className="font-bold text-foreground">
                    {plan.location_limit}
                  </span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {plan.features.slice(0, 5).map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full mt-0.5",
                      plan.key === "basic" && "bg-muted",
                      plan.key === "professional" && "bg-primary/10",
                      plan.key === "featured" && "bg-accent/10"
                    )}>
                      <Check className={cn(
                        "h-3 w-3",
                        plan.key === "basic" && "text-muted-foreground",
                        plan.key === "professional" && "text-primary",
                        plan.key === "featured" && "text-accent"
                      )} />
                    </div>
                    <span className="text-sm text-foreground/80">{feature}</span>
                  </li>
                ))}
                {plan.features.length > 5 && (
                  <li className="text-sm text-muted-foreground pl-8 font-medium">
                    +{plan.features.length - 5} more features
                  </li>
                )}
              </ul>

              {/* Limitations for Basic */}
              {plan.key === "basic" && plan.notIncludedDetails && (
                <div className="mb-6 rounded-xl bg-destructive/5 border border-destructive/10 p-4">
                  <p className="text-sm font-semibold text-destructive mb-2">Limitations:</p>
                  <ul className="space-y-1.5">
                    {plan.notIncludedDetails.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive/50" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Microcopy */}
              {(plan.key === "professional" || plan.key === "featured") && plan.microcopy && (
                <p className="text-sm text-muted-foreground italic mb-6 leading-relaxed">
                  "{plan.microcopy}"
                </p>
              )}

              {/* Selection Button */}
              <Button
                size="lg"
                variant={isSelected ? "default" : colors.button}
                className={cn(
                  "w-full text-base font-semibold h-12",
                  isSelected && "bg-primary text-primary-foreground shadow-lg",
                  plan.key === "featured" && !isSelected && "bg-accent text-accent-foreground hover:bg-accent/90 shadow-md"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onPlanSelect(plan.key);
                }}
              >
                {isSelected ? (
                  <>
                    <Check className="mr-2 h-5 w-5" />
                    Selected
                  </>
                ) : (
                  `Choose ${plan.name}`
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Info Banner */}
      <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/15">
            <Shield className="h-6 w-6 text-accent" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground">
              Start free, upgrade anytime
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
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
      <div className="grid grid-cols-3 gap-4 lg:gap-6">
        <div className="rounded-xl bg-muted/50 p-4 lg:p-6 text-center space-y-2">
          <div className="flex h-10 w-10 lg:h-12 lg:w-12 mx-auto items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
          </div>
          <p className="font-semibold text-foreground">Exclusive Leads</p>
          <p className="text-sm text-muted-foreground">Never shared with competitors</p>
        </div>
        <div className="rounded-xl bg-muted/50 p-4 lg:p-6 text-center space-y-2">
          <div className="flex h-10 w-10 lg:h-12 lg:w-12 mx-auto items-center justify-center rounded-xl bg-accent/10">
            <TrendingUp className="h-5 w-5 lg:h-6 lg:w-6 text-accent" />
          </div>
          <p className="font-semibold text-foreground">Pre-Qualified</p>
          <p className="text-sm text-muted-foreground">Email verified prospects</p>
        </div>
        <div className="rounded-xl bg-muted/50 p-4 lg:p-6 text-center space-y-2">
          <div className="flex h-10 w-10 lg:h-12 lg:w-12 mx-auto items-center justify-center rounded-xl bg-primary/10">
            <Mail className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
          </div>
          <p className="font-semibold text-foreground">Instant Alerts</p>
          <p className="text-sm text-muted-foreground">Real-time lead delivery</p>
        </div>
      </div>
    </div>
  );
}
