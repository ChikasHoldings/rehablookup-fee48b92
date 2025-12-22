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
    <div className="space-y-10 animate-fade-in w-full px-4 lg:px-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
          Choose Your Plan
        </h2>
        <p className="text-muted-foreground text-base lg:text-lg max-w-2xl mx-auto">
          Select the plan that fits your facility's needs. Upgrade or downgrade anytime from your dashboard.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid gap-6 md:gap-8 lg:gap-10 md:grid-cols-3 max-w-7xl mx-auto items-start">
        {plans.map((plan) => {
          const Icon = planIcons[plan.key];
          const colors = planColors[plan.key];
          const isSelected = selectedPlan === plan.key;

          return (
            <div
              key={plan.key}
              onClick={() => onPlanSelect(plan.key)}
              className={cn(
                "relative cursor-pointer rounded-2xl border-2 p-6 md:p-8 lg:p-10 transition-all duration-300 flex flex-col",
                colors.border,
                colors.bg,
                isSelected && "ring-2 ring-primary ring-offset-4 ring-offset-background",
                !isSelected && "hover:border-primary/50 hover:shadow-xl",
                colors.highlight && "shadow-lg",
                plan.key === "professional" && "md:-mt-4 md:mb-4 md:scale-[1.03] z-10"
              )}
            >
              {/* Badge */}
              {plan.key === "professional" && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lg whitespace-nowrap">
                    <Zap className="h-4 w-4" />
                    Most Popular
                  </span>
                </div>
              )}

              {plan.key === "featured" && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground shadow-lg whitespace-nowrap">
                    <Crown className="h-4 w-4" />
                    Best Value
                  </span>
                </div>
              )}

              {/* Header */}
              <div className={cn("flex-shrink-0", (plan.key === "professional" || plan.key === "featured") && "pt-4")}>
                <div className="flex items-center gap-4 mb-6">
                  <div className={cn(
                    "flex h-14 w-14 lg:h-16 lg:w-16 items-center justify-center rounded-xl",
                    colors.iconBg
                  )}>
                    <Icon className={cn(
                      "h-7 w-7 lg:h-8 lg:w-8",
                      plan.key === "basic" && "text-muted-foreground",
                      plan.key === "professional" && "text-primary",
                      plan.key === "featured" && "text-accent"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl lg:text-2xl font-bold text-foreground">{plan.name}</h3>
                    {plan.key !== "basic" && (
                      <p className="text-sm lg:text-base text-muted-foreground truncate">{plan.description}</p>
                    )}
                  </div>
                </div>

                {/* Pricing */}
                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">{plan.price}</span>
                    {plan.period && (
                      <span className="text-lg lg:text-xl text-muted-foreground">{plan.period}</span>
                    )}
                  </div>
                  {plan.key === "basic" && (
                    <p className="text-sm lg:text-base text-muted-foreground mt-2">Forever free</p>
                  )}
                </div>
              </div>

              {/* Key Metrics */}
              <div className="mb-8 space-y-4 border-t border-b border-border/50 py-6">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm lg:text-base">Qualified Leads</span>
                  <span className={cn(
                    "font-bold text-base lg:text-lg",
                    plan.key === "basic" ? "text-muted-foreground" : "text-foreground"
                  )}>
                    {plan.key === "basic" 
                      ? "None" 
                      : `${plan.lead_limit}/mo`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm lg:text-base">Lead Type</span>
                  <span className={cn(
                    "font-medium px-3 py-1 rounded-full text-sm lg:text-base",
                    plan.key === "basic" && "bg-muted text-muted-foreground",
                    plan.key === "professional" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                    plan.key === "featured" && "bg-accent/10 text-accent"
                  )}>
                    {plan.key === "basic" ? "—" : plan.exclusivity}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm lg:text-base">Locations</span>
                  <span className="font-bold text-base lg:text-lg text-foreground">
                    {plan.location_limit}
                  </span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.slice(0, 5).map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full mt-0.5",
                      plan.key === "basic" && "bg-muted",
                      plan.key === "professional" && "bg-primary/10",
                      plan.key === "featured" && "bg-accent/10"
                    )}>
                      <Check className={cn(
                        "h-3.5 w-3.5",
                        plan.key === "basic" && "text-muted-foreground",
                        plan.key === "professional" && "text-primary",
                        plan.key === "featured" && "text-accent"
                      )} />
                    </div>
                    <span className="text-sm lg:text-base text-foreground/80">{feature}</span>
                  </li>
                ))}
                {plan.features.length > 5 && (
                  <li className="text-sm lg:text-base text-muted-foreground pl-9 font-medium">
                    +{plan.features.length - 5} more features
                  </li>
                )}
              </ul>

              {/* Limitations for Basic */}
              {plan.key === "basic" && plan.notIncludedDetails && (
                <div className="mb-8 rounded-xl bg-destructive/5 border border-destructive/10 p-5">
                  <p className="text-sm lg:text-base font-semibold text-destructive mb-3">Limitations:</p>
                  <ul className="space-y-2">
                    {plan.notIncludedDetails.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2.5 text-sm lg:text-base text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive/50 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Microcopy */}
              {(plan.key === "professional" || plan.key === "featured") && plan.microcopy && (
                <p className="text-sm lg:text-base text-muted-foreground italic mb-8 leading-relaxed">
                  "{plan.microcopy}"
                </p>
              )}

              {/* Selection Button */}
              <Button
                size="lg"
                variant={isSelected ? "default" : colors.button}
                className={cn(
                  "w-full text-base lg:text-lg font-semibold h-12 lg:h-14 mt-auto",
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
      <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="flex items-start gap-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent/15">
            <Shield className="h-7 w-7 text-accent" />
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-lg text-foreground">
              Start free, upgrade anytime
            </p>
            <p className="text-base text-muted-foreground leading-relaxed">
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-8 max-w-4xl mx-auto">
        <div className="rounded-xl bg-muted/50 p-5 lg:p-8 text-center space-y-3">
          <div className="flex h-12 w-12 lg:h-14 lg:w-14 mx-auto items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-6 w-6 lg:h-7 lg:w-7 text-primary" />
          </div>
          <p className="font-semibold text-base lg:text-lg text-foreground">Exclusive Leads</p>
          <p className="text-sm lg:text-base text-muted-foreground">Never shared with competitors</p>
        </div>
        <div className="rounded-xl bg-muted/50 p-5 lg:p-8 text-center space-y-3">
          <div className="flex h-12 w-12 lg:h-14 lg:w-14 mx-auto items-center justify-center rounded-xl bg-accent/10">
            <TrendingUp className="h-6 w-6 lg:h-7 lg:w-7 text-accent" />
          </div>
          <p className="font-semibold text-base lg:text-lg text-foreground">Pre-Qualified</p>
          <p className="text-sm lg:text-base text-muted-foreground">Email verified prospects</p>
        </div>
        <div className="rounded-xl bg-muted/50 p-5 lg:p-8 text-center space-y-3">
          <div className="flex h-12 w-12 lg:h-14 lg:w-14 mx-auto items-center justify-center rounded-xl bg-primary/10">
            <Mail className="h-6 w-6 lg:h-7 lg:w-7 text-primary" />
          </div>
          <p className="font-semibold text-base lg:text-lg text-foreground">Instant Alerts</p>
          <p className="text-sm lg:text-base text-muted-foreground">Real-time lead delivery</p>
        </div>
      </div>
    </div>
  );
}
