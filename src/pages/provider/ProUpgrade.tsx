import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Percent,
  Star,
  TrendingUp,
  Award,
  Building2,
  Shield,
  Mail,
  Search,
  ArrowLeft,
  Loader2,
  CheckCircle,
  Crown,
  Zap,
  BarChart3,
  Globe,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProStatus } from "@/hooks/useProStatus";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const HERO_BENEFITS = [
  {
    icon: Percent,
    title: "20% Off All Unlocks",
    description: "Save on every lead unlock — whether it's a direct inquiry or a concierge placement. Savings add up fast.",
    color: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: Star,
    title: "Featured Placement",
    description: "Your facility is prominently displayed on the homepage, state pages, and city pages for maximum visibility.",
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
  },
  {
    icon: TrendingUp,
    title: "Priority Search Ranking",
    description: "Get a +50 boost in search results so families find you first when searching for treatment options.",
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Building2,
    title: "Up to 5 Facility Listings",
    description: "Expand your reach by listing multiple locations under a single Pro membership — free members get only 1.",
    color: "text-violet-600",
    bgColor: "bg-violet-500/10",
  },
  {
    icon: Award,
    title: "Pro Badge on Profile",
    description: "A trusted Pro badge is displayed on your facility profile, building credibility with families seeking care.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Mail,
    title: "Review Requests & Google Import",
    description: "Send review request emails to clients and import your Google Reviews rating directly onto your profile.",
    color: "text-rose-600",
    bgColor: "bg-rose-500/10",
  },
  {
    icon: Search,
    title: "Enhanced SEO Visibility",
    description: "Pro listings receive priority indexing and enhanced metadata for better organic search performance.",
    color: "text-teal-600",
    bgColor: "bg-teal-500/10",
  },
  {
    icon: Shield,
    title: "Verified Trust Signals",
    description: "Display verified accreditations and trust badges that help families feel confident choosing your facility.",
    color: "text-orange-600",
    bgColor: "bg-orange-500/10",
  },
];

const COMPARISON_ITEMS = [
  { feature: "Facility Listings", free: "1", pro: "Up to 5" },
  { feature: "Lead Unlock Discount", free: "None", pro: "20% off all unlocks" },
  { feature: "Search Ranking", free: "Standard", pro: "Priority (+50 boost)" },
  { feature: "Homepage Featured", free: "No", pro: "Yes" },
  { feature: "Pro Badge", free: "No", pro: "Yes" },
  { feature: "Google Reviews Import", free: "No", pro: "Yes" },
  { feature: "Review Requests", free: "No", pro: "Yes" },
  { feature: "Profile Analytics", free: "Basic", pro: "Advanced" },
  { feature: "Support Priority", free: "Standard", pro: "Priority" },
];

export default function ProUpgradePage() {
  const navigate = useNavigate();
  const { selectedFacility } = useSelectedFacility();
  const facilityId = selectedFacility?.id;
  const { data: proStatus } = useProStatus(facilityId ?? undefined);
  const isPro = proStatus?.isPro ?? false;
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!facilityId) {
      toast.error("No facility selected");
      return;
    }
    setUpgradeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("subscribe-pro", {
        body: { facilityId },
      });
      if (error) throw error;
      if (data?.checkoutUrl) {
        try {
          const url = new URL(data.checkoutUrl);
          if (!url.hostname.endsWith("stripe.com")) throw new Error("Invalid checkout URL");
          window.open(data.checkoutUrl, "_blank");
        } catch {
          toast.error("Invalid checkout URL received.");
        }
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (err) {
      console.error("Upgrade error:", err);
      toast.error("Failed to start upgrade. Please try again.");
    } finally {
      setUpgradeLoading(false);
    }
  };

  return (
    <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 overflow-x-hidden">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg mx-auto">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
            RehabLookup <span className="text-amber-600">Pro</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
            Get more visibility, save on every lead, and grow your admissions with our premium provider membership.
          </p>
          
          {/* Price Tag */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <span className="text-3xl md:text-4xl font-bold text-foreground">$399</span>
            <span className="text-muted-foreground text-sm">/month</span>
          </div>

          {isPro ? (
            <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-sm px-4 py-1.5">
              <CheckCircle className="h-4 w-4 mr-1.5" />
              You're a Pro Member
            </Badge>
          ) : (
            <Button
              size="lg"
              onClick={handleUpgrade}
              disabled={upgradeLoading || !facilityId}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg px-8 h-12 text-base"
            >
              {upgradeLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-5 w-5 mr-2" />
              )}
              Upgrade to Pro
            </Button>
          )}
        </div>

        {/* Benefits Grid */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-center">Everything You Get with Pro</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {HERO_BENEFITS.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <Card key={benefit.title} className="border-border/60 hover:border-border transition-colors">
                  <CardContent className="p-4 flex gap-3">
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", benefit.bgColor)}>
                      <Icon className={cn("h-5 w-5", benefit.color)} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground">{benefit.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{benefit.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Comparison Table */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-center">Free vs Pro</h2>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Feature</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground w-28">Free</th>
                    <th className="text-center py-3 px-4 font-medium w-36">
                      <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                        <Crown className="h-3.5 w-3.5" /> Pro
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ITEMS.map((item, i) => (
                    <tr key={item.feature} className={cn("border-b last:border-0", i % 2 === 0 && "bg-muted/20")}>
                      <td className="py-2.5 px-4 font-medium text-foreground">{item.feature}</td>
                      <td className="py-2.5 px-4 text-center text-muted-foreground">{item.free}</td>
                      <td className="py-2.5 px-4 text-center font-medium text-foreground">
                        {item.pro === "Yes" ? (
                          <CheckCircle className="h-4 w-4 text-emerald-600 mx-auto" />
                        ) : (
                          item.pro
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* ROI Section */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-6 text-center space-y-3">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 mx-auto">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Quick ROI</h3>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              With 20% off every unlock, Pro pays for itself with just a few additional admissions per month. 
              Plus, featured placement means more families see your facility first.
            </p>
          </CardContent>
        </Card>

        {/* Bottom CTA */}
        {!isPro && (
          <div className="text-center pb-4 space-y-3">
            <Button
              size="lg"
              onClick={handleUpgrade}
              disabled={upgradeLoading || !facilityId}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg px-8 h-12 text-base"
            >
              {upgradeLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Zap className="h-5 w-5 mr-2" />
              )}
              Start Your Pro Membership
            </Button>
            <p className="text-xs text-muted-foreground">Cancel anytime · Billed monthly · Secure payment via Stripe</p>
          </div>
        )}
      </div>
    </div>
  );
}
