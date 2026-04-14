import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  X,
  Handshake,
  BarChart3,
  Eye,
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

const COMPARISON_ITEMS: { feature: string; free: string | boolean; pro: string | boolean }[] = [
  { feature: "Facility Listings", free: "1", pro: "Up to 5" },
  { feature: "Lead Price", free: "Full Price", pro: "20% OFF" },
  { feature: "Lead Access", free: "Limited", pro: "Priority" },
  { feature: "Visibility", free: "Standard", pro: "Featured" },
  { feature: "Placement Fees", free: "Full Price", pro: "20% OFF" },
  { feature: "Search Ranking", free: "Standard", pro: "Priority (+50)" },
  { feature: "Homepage Featured", free: false, pro: true },
  { feature: "Pro Badge", free: false, pro: true },
  { feature: "Google Reviews Import", free: false, pro: true },
  { feature: "Review Requests", free: false, pro: true },
  { feature: "Per-Facility Analytics", free: false, pro: true },
  { feature: "Support Priority", free: "Standard", pro: "Priority" },
];

export default function ProUpgradePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedFacility } = useSelectedFacility();
  const facilityId = selectedFacility?.id;
  const { data: proStatus, refetch: refetchProStatus } = useProStatus(facilityId ?? undefined);
  const isPro = proStatus?.isPro ?? false;
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  const startPostCheckoutPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollCountRef.current = 0;
    pollingRef.current = setInterval(() => {
      pollCountRef.current++;
      refetchProStatus();
      if (pollCountRef.current >= 10) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }, 3000);
  }, [refetchProStatus]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  useEffect(() => {
    const proSuccess = searchParams.get("pro_success");
    const proCanceled = searchParams.get("pro_canceled");

    if (proSuccess === "true") {
      toast.success("🎉 Welcome to Pro! Your benefits are now active.", { duration: 6000 });
      refetchProStatus();
      startPostCheckoutPolling();
      searchParams.delete("pro_success");
      setSearchParams(searchParams, { replace: true });
    }

    if (proCanceled === "true") {
      toast.info("Pro upgrade was cancelled. You can upgrade anytime.");
      searchParams.delete("pro_canceled");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, refetchProStatus, startPostCheckoutPolling]);

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
      <div className="max-w-5xl mx-auto space-y-8">
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

        {/* ━━━ HERO SECTION ━━━ */}
        <div className="relative rounded-2xl overflow-hidden border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-background to-amber-600/5 p-6 sm:p-8 md:p-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30 text-xs mb-4">
              <Crown className="h-3 w-3 mr-1" /> PRO MEMBERSHIP
            </Badge>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-tight">
              Get More Admissions.{" "}
              <span className="text-amber-600">Spend Less Per Lead.</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-3 max-w-xl">
              Upgrade to Pro and unlock priority access, discounts, and higher visibility. Pro pays for itself with just a few extra admissions.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <UpgradeButton />
              {!isPro && (
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Shield className="h-3 w-3" /> 
                  Cancel anytime · No lock-in
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ━━━ SIDE-BY-SIDE COMPARISON TABLE ━━━ */}
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Free vs Pro</h2>
            <p className="text-sm text-muted-foreground mt-1">
              See exactly what you get with Pro
            </p>
          </div>
          <Card className="overflow-hidden border-border/60 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left py-3 px-5 font-semibold text-muted-foreground">Feature</th>
                    <th className="text-center py-3 px-5 font-semibold text-muted-foreground w-32">Free</th>
                    <th className="text-center py-3 px-5 w-36 bg-amber-500/5">
                      <span className="inline-flex items-center gap-1.5 text-amber-700 font-bold text-sm">
                        <Crown className="h-3.5 w-3.5" /> Pro
                        <span className="text-[11px] font-normal text-amber-600/70">($399/mo)</span>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ITEMS.map((item, i) => (
                    <tr key={item.feature} className={cn("border-b last:border-0", i % 2 === 0 && "bg-muted/10")}>
                      <td className="py-3 px-5 text-sm font-medium text-foreground">{item.feature}</td>
                      <td className="py-3 px-5 text-center text-sm text-muted-foreground">
                        {typeof item.free === "boolean" ? (
                          item.free ? (
                            <CheckCircle className="h-4 w-4 text-emerald-600 mx-auto" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                          )
                        ) : (
                          item.free
                        )}
                      </td>
                      <td className="py-3 px-5 text-center text-sm font-semibold text-foreground bg-amber-500/[0.02]">
                        {typeof item.pro === "boolean" ? (
                          item.pro ? (
                            <CheckCircle className="h-4 w-4 text-emerald-600 mx-auto" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                          )
                        ) : (
                          <span className={item.pro.includes("OFF") || item.pro.includes("Priority") || item.pro.includes("Featured") ? "text-amber-700" : ""}>
                            {item.pro}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Benefits Grid */}
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Everything Included</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Tools and features that help you grow faster
            </p>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {HERO_BENEFITS.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.title}
                  className="flex items-start gap-3 p-3.5 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="h-[18px] w-[18px] text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[15px] text-foreground">{benefit.title}</p>
                      <Badge variant="secondary" className="text-[11px] px-1.5 py-0 h-[18px] font-medium shrink-0">
                        {benefit.highlight}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{benefit.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ROI + Bottom CTA */}
        {!isPro && (
          <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-amber-600/10">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <p className="font-bold text-lg text-foreground">Pro pays for itself quickly</p>
                <p className="text-sm text-muted-foreground mt-1">
                  With 20% off every unlock, just a few extra admissions cover your $399/mo membership. Most providers see ROI within the first week.
                </p>
              </div>
              <Button
                onClick={handleUpgrade}
                disabled={upgradeLoading || !facilityId}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md h-11 px-8 text-sm font-semibold shrink-0"
              >
                {upgradeLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Get Started Now
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
