import { ProviderLayout } from "@/components/provider/ProviderLayout";
import { CreditCard, Check, ArrowRight, Sparkles, Clock, FileText, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const plans = [
  {
    name: "Free Trial",
    price: "$0",
    period: "/month",
    description: "Get started with basic features",
    features: [
      "Basic listing",
      "Up to 5 leads/month",
      "Email support",
    ],
    current: true,
  },
  {
    name: "Professional",
    price: "$99",
    period: "/month",
    description: "Everything you need to grow",
    features: [
      "Featured listing",
      "Unlimited leads",
      "Priority support",
      "Analytics dashboard",
      "Lead notifications",
    ],
    recommended: true,
  },
  {
    name: "Enterprise",
    price: "$249",
    period: "/month",
    description: "For large treatment centers",
    features: [
      "Multiple listings",
      "Unlimited leads",
      "Dedicated support",
      "Advanced analytics",
      "API access",
      "Custom integrations",
    ],
  },
];

export default function ProviderBillingPage() {
  return (
    <ProviderLayout>
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
                    <h3 className="text-xl font-bold text-foreground">Free Trial</h3>
                    <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>30 days remaining in your trial</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline">Cancel Subscription</Button>
                <Button className="gap-2">
                  <Zap className="h-4 w-4" />
                  Upgrade Plan
                </Button>
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
                key={plan.name} 
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                  plan.recommended 
                    ? "border-primary ring-1 ring-primary shadow-md" 
                    : "hover:border-primary/30"
                }`}
              >
                {plan.recommended && (
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
                  ) : (
                    <Button 
                      variant={plan.recommended ? "default" : "outline"} 
                      className="w-full group"
                    >
                      {plan.recommended ? "Upgrade Now" : "Select Plan"}
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
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
            <div className="text-center py-16">
              <div className="h-14 w-14 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground">No billing history yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Your invoices will appear here after your first payment
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProviderLayout>
  );
}
