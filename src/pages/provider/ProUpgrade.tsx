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
  X,
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
    description: "Save on every lead unlock and placement fee.",
    highlight: "Save ~$8–10 per lead",
  },
  {
    icon: Star,
    title: "Featured Placement",
    description: "Prominent display on homepage, state & city pages.",
    highlight: "Max visibility",
  },
  {
    icon: TrendingUp,
    title: "Priority Search Ranking",
    description: "+50 boost so families find you first.",
    highlight: "+50 ranking boost",
  },
  {
    icon: Building2,
    title: "Up to 5 Listings",
    description: "List multiple locations under one membership.",
    highlight: "5× capacity",
  },
  {
    icon: Award,
    title: "Pro Badge",
    description: "Trusted badge on your profile builds credibility.",
    highlight: "Trust signal",
  },
  {
    icon: Mail,
    title: "Review Tools",
    description: "Send review requests & import Google Reviews.",
    highlight: "Reputation mgmt",
  },
  {
    icon: Search,
    title: "Enhanced SEO",
    description: "Priority indexing & enhanced metadata.",
    highlight: "More organic traffic",
  },
  {
    icon: Shield,
    title: "Verified Badges",
    description: "Display verified accreditations & trust signals.",
    highlight: "Higher conversions",
  },
];

const COMPARISON_ITEMS = [
  { feature: "Facility Listings", free: "1", pro: "Up to 5" },
  { feature: "Lead Unlock Discount", free: "—", pro: "20% off" },
  { feature: "Search Ranking", free: "Standard", pro: "Priority (+50)" },
  { feature: "Homepage Featured", free: false, pro: true },
  { feature: "Pro Badge", free: false, pro: true },
  { feature: "Google Reviews Import", free: false, pro: true },
  { feature: "Review Requests", free: false, pro: true },
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

  const UpgradeButton = ({ className }: { className?: string }) =>
    isPro ? (
      <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-sm px-4 py-1.5">
        <CheckCircle className="h-4 w-4 mr-1.5" />
        You're a Pro Member
      </Badge>
    ) : (
      <Button
        size="lg"
        onClick={handleUpgrade}
        disabled={upgradeLoading || !facilityId}
        className={cn(
          "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg h-11 text-sm font-semibold",
          className
        )}
      >
        {upgradeLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Sparkles className="h-4 w-4 mr-2" />
        )}
        Upgrade to Pro — $399/mo
      </Button>
    );

  return (
    <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 overflow-x-hidden">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          {!isPro && (
            <span className="text-xs text-muted-foreground">Cancel anytime · Secure via Stripe</span>
          )}
        </div>

        {/* Compact Hero */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0 shadow-md">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              RehabLookup <span className="text-amber-600">Pro</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              More visibility, lower costs, faster admissions growth.
            </p>
          </div>
          <div className="hidden sm:block">
            <UpgradeButton />
          </div>
        </div>
        <div className="sm:hidden">
          <UpgradeButton className="w-full" />
        </div>

        {/* Benefits Grid */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            What's Included
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {HERO_BENEFITS.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.title}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-foreground">{benefit.title}</p>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-medium shrink-0">
                        {benefit.highlight}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{benefit.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Comparison Table */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Free vs Pro
          </h2>
          <Card className="overflow-hidden border-border/60">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-xs">Feature</th>
                    <th className="text-center py-2.5 px-4 font-medium text-muted-foreground text-xs w-24">Free</th>
                    <th className="text-center py-2.5 px-4 w-28">
                      <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-xs">
                        <Crown className="h-3 w-3" /> Pro
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ITEMS.map((item, i) => (
                    <tr key={item.feature} className={cn("border-b last:border-0", i % 2 === 0 && "bg-muted/15")}>
                      <td className="py-2 px-4 text-xs font-medium text-foreground">{item.feature}</td>
                      <td className="py-2 px-4 text-center text-xs text-muted-foreground">
                        {typeof item.free === "boolean" ? (
                          item.free ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600 mx-auto" /> : <X className="h-3.5 w-3.5 text-muted-foreground/40 mx-auto" />
                        ) : item.free}
                      </td>
                      <td className="py-2 px-4 text-center text-xs font-medium text-foreground">
                        {typeof item.pro === "boolean" ? (
                          item.pro ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600 mx-auto" /> : <X className="h-3.5 w-3.5 text-muted-foreground/40 mx-auto" />
                        ) : item.pro}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* ROI + Bottom CTA combined */}
        {!isPro && (
          <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-amber-600/10">
            <CardContent className="p-5 flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <p className="font-semibold text-sm">Pro pays for itself quickly</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  With 20% off every unlock, just a few extra admissions cover your membership.
                </p>
              </div>
              <Button
                onClick={handleUpgrade}
                disabled={upgradeLoading || !facilityId}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md h-10 px-6 text-sm font-semibold shrink-0"
              >
                {upgradeLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Get Started
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
