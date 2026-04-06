import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
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
  Sparkles,
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
    description: "Save on every lead unlock — inquiries and placements alike.",
  },
  {
    icon: Star,
    title: "Featured Placement",
    description: "Prominent display on homepage, state & city pages.",
  },
  {
    icon: TrendingUp,
    title: "Priority Search Ranking",
    description: "+50 boost so families find you first.",
  },
  {
    icon: Building2,
    title: "Up to 5 Listings",
    description: "List multiple locations under one membership.",
  },
  {
    icon: Award,
    title: "Pro Badge",
    description: "Trusted badge on your profile for credibility.",
  },
  {
    icon: Mail,
    title: "Review Tools",
    description: "Request reviews & import Google ratings.",
  },
  {
    icon: Search,
    title: "Enhanced SEO",
    description: "Priority indexing and enriched metadata.",
  },
  {
    icon: Shield,
    title: "Trust Signals",
    description: "Verified accreditations and trust badges.",
  },
];

const COMPARISON_ITEMS = [
  { feature: "Facility Listings", free: "1", pro: "Up to 5" },
  { feature: "Lead Unlock Discount", free: "—", pro: "20% off" },
  { feature: "Search Ranking", free: "Standard", pro: "Priority" },
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

  const UpgradeButton = ({ label = "Upgrade to Pro", icon: Icon = Sparkles }: { label?: string; icon?: typeof Sparkles }) => (
    <Button
      size="lg"
      onClick={handleUpgrade}
      disabled={upgradeLoading || !facilityId}
      className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/20 px-8 h-12 text-base font-semibold transition-all duration-200 hover:shadow-xl hover:shadow-amber-500/25 active:scale-[0.98]"
    >
      {upgradeLoading ? (
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
      ) : (
        <Icon className="h-5 w-5 mr-2" />
      )}
      {label}
    </Button>
  );

  return (
    <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 overflow-x-hidden">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Back */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        {/* ── Hero ── */}
        <Card className="border-amber-500/20 overflow-hidden relative">
          {/* Decorative gradient orb */}
          <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-amber-500/8 blur-2xl pointer-events-none" />

          <CardContent className="relative py-10 px-6 sm:px-10 text-center space-y-5">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/25 mx-auto">
              <Crown className="h-7 w-7 text-white" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                RehabLookup <span className="bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">Pro</span>
              </h1>
              <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
                More visibility. Lower costs. Higher admissions. Everything you need to grow.
              </p>
            </div>

            {/* Price */}
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-4xl font-bold text-foreground tracking-tight">$399</span>
              <span className="text-muted-foreground text-sm font-medium">/month</span>
            </div>

            {isPro ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-sm px-5 py-2">
                <CheckCircle className="h-4 w-4 mr-1.5" />
                You're a Pro Member
              </Badge>
            ) : (
              <div className="space-y-2 pt-1">
                <UpgradeButton />
                <p className="text-xs text-muted-foreground">Cancel anytime · Secure payment via Stripe</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Benefits Grid ── */}
        <div className="space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Everything Included</h2>
            <p className="text-sm text-muted-foreground">All the tools to maximize your facility's reach</p>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {HERO_BENEFITS.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.title}
                  className="flex items-start gap-3 rounded-xl border border-border/50 bg-card p-3.5 transition-colors hover:border-amber-500/20 hover:bg-amber-500/[0.02]"
                >
                  <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4.5 w-4.5 text-amber-600" />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className="font-medium text-sm text-foreground leading-tight">{benefit.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{benefit.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Comparison Table ── */}
        <div className="space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Free vs Pro</h2>
            <p className="text-sm text-muted-foreground">See what you're missing</p>
          </div>

          <Card className="overflow-hidden border-border/60">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Feature</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider w-24">Free</th>
                    <th className="text-center py-3 px-4 w-32">
                      <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 text-xs font-semibold">
                        <Crown className="h-3 w-3 mr-1" /> PRO
                      </Badge>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ITEMS.map((item, i) => (
                    <tr key={item.feature} className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground text-sm">{item.feature}</td>
                      <td className="py-3 px-4 text-center">
                        {typeof item.free === "boolean" ? (
                          item.free ? (
                            <CheckCircle className="h-4 w-4 text-emerald-600 mx-auto" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                          )
                        ) : (
                          <span className="text-muted-foreground text-sm">{item.free}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {typeof item.pro === "boolean" ? (
                          item.pro ? (
                            <CheckCircle className="h-4 w-4 text-emerald-600 mx-auto" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                          )
                        ) : (
                          <span className="font-medium text-foreground text-sm">{item.pro}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* ── ROI Card ── */}
        <Card className="border-border/60 bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
          <CardContent className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <BarChart3 className="h-7 w-7 text-primary" />
            </div>
            <div className="text-center sm:text-left">
              <h3 className="font-semibold text-base text-foreground mb-1">Pro Pays for Itself</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                With 20% savings on every unlock and featured placement driving more families to your listing, 
                most Pro members see ROI within the first month.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Bottom CTA ── */}
        {!isPro && (
          <Card className="border-amber-500/20 rounded-2xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-amber-600/10 pointer-events-none" />
            <CardContent className="relative py-8 px-6 text-center space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Ready to Grow?</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Join hundreds of top facilities using Pro to increase admissions and reduce costs.
              </p>
              <UpgradeButton label="Start Your Pro Membership" icon={Zap} />
              <p className="text-xs text-muted-foreground">Billed monthly · Cancel anytime · No contracts</p>
            </CardContent>
          </Card>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
