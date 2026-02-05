import { useState } from "react";
import { 
  Sparkles, 
  Check, 
  Percent, 
  Star, 
  TrendingUp, 
  Award,
  Loader2,
  ExternalLink
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProStatus } from "@/hooks/useProStatus";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const PRO_BENEFITS = [
  {
    icon: Percent,
    title: "20% Off All Unlocks",
    description: "Save on every inquiry you unlock with your Pro discount"
  },
  {
    icon: Star,
    title: "Featured Homepage Placement",
    description: "Your facility appears in the featured section on our homepage"
  },
  {
    icon: TrendingUp,
    title: "Top of Search Results",
    description: "Priority placement in state and city search pages"
  },
  {
    icon: Award,
    title: "Gold Pro Badge",
    description: "Stand out with a verified Pro badge on your listing"
  },
];

export default function ProviderProUpgradePage() {
  const { selectedFacility } = useSelectedFacility();
  const facilityId = selectedFacility?.id;
  const { data: proStatus, isLoading } = useProStatus();
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

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
        window.open(data.checkoutUrl, "_blank");
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

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Portal error:", err);
      toast.error("Unable to open billing portal. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 mb-4">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">Pro Visibility</h1>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Boost your facility's visibility and save on every inquiry unlock
          </p>
        </div>

        {/* Status Card */}
        {proStatus?.isPro ? (
          <Card className="mb-8 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">Pro Active</h3>
                      <Badge className="bg-amber-500 text-white">Active</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {proStatus.currentPeriodEnd 
                        ? `Renews ${format(new Date(proStatus.currentPeriodEnd), "MMMM d, yyyy")}`
                        : "Your Pro subscription is active"
                      }
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                >
                  {portalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Manage
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8 border-2 border-dashed border-primary/30">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground mb-4">
                You're not on Pro yet. Upgrade to unlock all benefits.
              </p>
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white gap-2"
                onClick={handleUpgrade}
                disabled={upgradeLoading || !facilityId}
              >
                {upgradeLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Upgrade to Pro
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Benefits */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Pro Benefits</h2>
          <div className="grid gap-4">
            {PRO_BENEFITS.map((benefit, i) => {
              const Icon = benefit.icon;
              return (
                <Card key={i} className={cn(
                  "transition-all",
                  proStatus?.isPro && "bg-amber-500/5 border-amber-500/20"
                )}>
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      proStatus?.isPro 
                        ? "bg-amber-500/20 text-amber-600" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{benefit.title}</h3>
                        {proStatus?.isPro && (
                          <Check className="h-4 w-4 text-emerald-600" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {benefit.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* FAQ */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium">How does the 20% discount work?</h4>
              <p className="text-sm text-muted-foreground mt-1">
                As a Pro member, every inquiry unlock is automatically discounted by 20%. The savings add up quickly.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Can I cancel anytime?</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Yes, you can cancel your Pro subscription at any time. You'll keep your benefits until the end of your billing period.
              </p>
            </div>
            <div>
              <h4 className="font-medium">How does featured placement work?</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Pro facilities are shown in the featured section on our homepage and appear at the top of search results for their locations.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
