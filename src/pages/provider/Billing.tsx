import { ProviderLayout } from "@/components/provider/ProviderLayout";
import { CreditCard, Check, ArrowRight } from "lucide-react";
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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Billing</h1>
          <p className="text-muted-foreground mt-1">
            Manage your subscription and billing information
          </p>
        </div>

        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold text-foreground">Free Trial</h3>
                  <Badge variant="secondary">Active</Badge>
                </div>
                <p className="text-muted-foreground mt-1">
                  30 days remaining in your trial
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">Cancel Subscription</Button>
                <Button>Upgrade Plan</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plans */}
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-4">
            Available Plans
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <Card 
                key={plan.name} 
                className={plan.recommended ? "border-primary ring-1 ring-primary" : ""}
              >
                <CardHeader>
                  {plan.recommended && (
                    <Badge className="w-fit mb-2">Recommended</Badge>
                  )}
                  <CardTitle className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{plan.price}</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {plan.period}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    <span className="font-semibold text-foreground">{plan.name}</span>
                    <br />
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
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
                      className="w-full"
                    >
                      {plan.recommended ? "Upgrade" : "Select"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Billing History */}
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>View your past invoices and payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground">No billing history yet</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProviderLayout>
  );
}
