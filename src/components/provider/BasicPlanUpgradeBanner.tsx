import { Link } from "react-router-dom";
import { useState } from "react";
import { 
  ArrowRight, 
  X, 
  Zap, 
  Users, 
  Phone, 
  Star,
  TrendingUp,
  Shield
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface BasicPlanUpgradeBannerProps {
  /** Whether user has leads waiting (changes messaging) */
  hasLeadsWaiting?: boolean;
}

export function BasicPlanUpgradeBanner({ hasLeadsWaiting }: BasicPlanUpgradeBannerProps) {
  const [isDismissed, setIsDismissed] = useState(() => {
    const dismissed = localStorage.getItem("basic-upgrade-banner-dismissed");
    if (!dismissed) return false;
    // Auto-reset dismissal after 7 days
    const dismissedAt = parseInt(dismissed, 10);
    if (Date.now() - dismissedAt > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem("basic-upgrade-banner-dismissed");
      return false;
    }
    return true;
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("basic-upgrade-banner-dismissed", Date.now().toString());
  };

  if (isDismissed) return null;

  const benefits = [
    { icon: Users, text: "100 qualified leads/month" },
    { icon: Phone, text: "Show phone & website" },
    { icon: TrendingUp, text: "Priority in search" },
    { icon: Shield, text: "Lead management dashboard" },
  ];

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 overflow-hidden relative">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
      
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-muted/80 transition-colors z-10"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
      
      <CardContent className="py-5 sm:py-6 relative">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-5">
          {/* Main content */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md shadow-primary/20">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-foreground">
                  Upgrade to Professional
                </h3>
                <p className="text-xs text-muted-foreground">
                  Get more leads and grow your facility
                </p>
              </div>
            </div>
            
            {/* Benefits grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <benefit.icon className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">{benefit.text}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* CTA section */}
          <div className="flex flex-col items-start lg:items-end gap-2 w-full lg:w-auto">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-foreground">$399</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <Button asChild size="lg" className="w-full lg:w-auto gap-2 shadow-md">
              <Link to="/provider/billing">
                <Star className="h-4 w-4" />
                Upgrade Now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              No long-term commitment required
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
