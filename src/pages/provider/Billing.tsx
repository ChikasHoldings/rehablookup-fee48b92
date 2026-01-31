import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  Wallet, 
  Plus, 
  ArrowDownLeft, 
  ArrowUpRight,
  Loader2,
  CreditCard,
  Clock,
  CheckCircle,
  Sparkles,
  Percent,
  Star,
  TrendingUp,
  Award,
  ExternalLink,
  Trash2,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProviderCredits } from "@/hooks/useProviderCredits";
import { useProStatus } from "@/hooks/useProStatus";
import { useProviderPaymentMethods } from "@/hooks/useProviderPaymentMethods";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { AddPaymentMethodModal } from "@/components/provider/AddPaymentMethodModal";

const CREDIT_PACKAGES = [
  { amountCents: 10000, label: "$100", bonus: null },
  { amountCents: 25000, label: "$250", bonus: null },
  { amountCents: 50000, label: "$500", bonus: "Best Value" },
  { amountCents: 100000, label: "$1,000", bonus: "Popular" },
];

const PRO_BENEFITS = [
  { icon: Percent, label: "20% off unlocks" },
  { icon: Star, label: "Featured placement" },
  { icon: TrendingUp, label: "Priority ranking" },
  { icon: Award, label: "Pro badge" },
];

export default function ProviderBillingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedFacility } = useSelectedFacility();
  const facilityId = selectedFacility?.id;
  const { balanceFormatted, transactions, isLoading, refetch: refetchCredits } = useProviderCredits(facilityId);
  const { data: proStatus, refetch: refetchProStatus } = useProStatus();
  const { 
    paymentMethods: allPaymentMethods, 
    isLoading: paymentMethodsLoading,
    deletePaymentMethod,
    setDefaultPaymentMethod,
  } = useProviderPaymentMethods(facilityId);
  
  const paymentMethods = allPaymentMethods.filter(pm => pm.type === "card");
  
  const [purchaseLoading, setPurchaseLoading] = useState<number | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // Handle success/cancel URL params from Stripe checkout
  useEffect(() => {
    const proSuccess = searchParams.get("pro_success");
    const proCanceled = searchParams.get("pro_canceled");
    const creditsSuccess = searchParams.get("credits_success");
    const creditsCanceled = searchParams.get("credits_canceled");

    if (proSuccess === "true") {
      toast.success("Pro subscription activated! You now have 20% off all lead unlocks.", { duration: 6000 });
      refetchProStatus();
      // Clear the URL params
      searchParams.delete("pro_success");
      setSearchParams(searchParams, { replace: true });
    }

    if (proCanceled === "true") {
      toast.info("Pro upgrade was cancelled.");
      searchParams.delete("pro_canceled");
      setSearchParams(searchParams, { replace: true });
    }

    if (creditsSuccess === "true") {
      const amount = searchParams.get("amount");
      const formattedAmount = amount ? `$${(parseInt(amount, 10) / 100).toFixed(0)}` : "";
      toast.success(`${formattedAmount} credits added to your account!`, { duration: 5000 });
      refetchCredits();
      searchParams.delete("credits_success");
      searchParams.delete("amount");
      setSearchParams(searchParams, { replace: true });
    }

    if (creditsCanceled === "true") {
      toast.info("Credit purchase was cancelled.");
      searchParams.delete("credits_canceled");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, refetchCredits, refetchProStatus]);

  const handlePurchase = async (amountCents: number) => {
    if (!facilityId) {
      toast.error("No facility selected");
      return;
    }
    setPurchaseLoading(amountCents);
    try {
      const { data, error } = await supabase.functions.invoke("purchase-credits", {
        body: { amountCents, facilityId },
      });
      if (error) throw error;
      if (data?.checkoutUrl) {
        window.open(data.checkoutUrl, "_blank");
        setShowPurchaseModal(false);
      }
    } catch (err) {
      console.error("Purchase error:", err);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setPurchaseLoading(null);
    }
  };

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

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "purchase":
        return <ArrowDownLeft className="h-4 w-4 text-emerald-600" />;
      case "unlock":
        return <ArrowUpRight className="h-4 w-4 text-orange-600" />;
      case "refund":
        return <ArrowDownLeft className="h-4 w-4 text-blue-600" />;
      case "bonus":
        return <CheckCircle className="h-4 w-4 text-purple-600" />;
      default:
        return <CreditCard className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "purchase":
      case "refund":
      case "bonus":
        return "text-emerald-600";
      case "unlock":
        return "text-muted-foreground";
      default:
        return "text-foreground";
    }
  };

  return (
    <div className="min-h-full bg-background">
      <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
        <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Billing</h1>
          <p className="text-muted-foreground mt-1">
            Manage subscription, credits, and payment methods
          </p>
        </div>

        {/* Pro Subscription */}
        <Card>
          <CardContent className="p-5">
            {proStatus?.isPro ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">Pro Subscription</span>
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 border-0">
                        Active
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">
                      {proStatus.currentPeriodEnd 
                        ? `Renews ${format(new Date(proStatus.currentPeriodEnd), "MMMM d, yyyy")}`
                        : "Your subscription is active"
                      }
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline"
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                >
                  {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                  Manage
                </Button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <span className="text-lg font-semibold">Upgrade to Pro</span>
                      <p className="text-muted-foreground">$399/month</p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleUpgrade}
                    disabled={upgradeLoading || !facilityId}
                  >
                    {upgradeLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Upgrade
                  </Button>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground">
                  {PRO_BENEFITS.map((b, i) => {
                    const Icon = b.icon;
                    return (
                      <span key={i} className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {b.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Credits */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Credit Balance</p>
                  <p className="text-2xl font-bold text-foreground">{balanceFormatted}</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => setShowPurchaseModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Credits
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        {transactions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y divide-border">
                {transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                        {getTransactionIcon(tx.transaction_type)}
                      </div>
                      <div>
                        <p className="font-medium capitalize">
                          {tx.transaction_type === "unlock" ? "Lead Unlock" : tx.transaction_type}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(tx.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <span className={cn("font-semibold", getTransactionColor(tx.transaction_type))}>
                      {tx.transaction_type === "unlock" ? "−" : "+"}
                      ${(Math.abs(tx.amount_cents) / 100).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Methods */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {paymentMethodsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : paymentMethods.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-muted-foreground mb-4">No payment methods saved</p>
                <Button variant="outline" onClick={() => setShowPaymentMethodModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Card
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map((pm) => (
                  <div 
                    key={pm.id} 
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border",
                      pm.is_default ? "bg-muted/50" : "bg-background"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {pm.card_brand || "Card"} •••• {pm.last_four}
                          </span>
                          {pm.is_default && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                        </div>
                        {pm.exp_month && pm.exp_year && (
                          <p className="text-sm text-muted-foreground">
                            Expires {pm.exp_month}/{pm.exp_year}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!pm.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDefaultPaymentMethod.mutate(pm.id)}
                          disabled={setDefaultPaymentMethod.isPending}
                        >
                          Set default
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm("Remove this card?")) {
                            deletePaymentMethod.mutate(pm.id);
                          }
                        }}
                        disabled={deletePaymentMethod.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button 
                  variant="ghost" 
                  className="w-full text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPaymentMethodModal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add another card
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Purchase Credits Modal */}
        <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
          <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
            {/* Header with balance */}
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 border-b">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center">
                  <Wallet className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Add Credits</h2>
                  <p className="text-muted-foreground">
                    Current balance: <span className="font-semibold text-foreground">{balanceFormatted}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Packages */}
            <div className="p-6 space-y-3">
              <p className="text-sm font-medium text-muted-foreground mb-4">Select a package</p>
              {CREDIT_PACKAGES.map((pkg, index) => {
                const isPopular = pkg.bonus === "Popular";
                const isBestValue = pkg.bonus === "Best Value";
                const isHighlighted = isPopular || isBestValue;
                
                return (
                  <button
                    key={pkg.amountCents}
                    onClick={() => handlePurchase(pkg.amountCents)}
                    disabled={purchaseLoading !== null}
                    className={cn(
                      "relative w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left group",
                      isHighlighted 
                        ? "border-primary/30 bg-primary/5 hover:border-primary hover:bg-primary/10" 
                        : "border-border hover:border-primary/50 hover:bg-muted/50",
                      purchaseLoading === pkg.amountCents && "opacity-50 cursor-wait",
                      purchaseLoading !== null && purchaseLoading !== pkg.amountCents && "opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center transition-colors",
                        isHighlighted ? "bg-primary/15" : "bg-muted group-hover:bg-primary/10"
                      )}>
                        <Wallet className={cn(
                          "h-6 w-6 transition-colors",
                          isHighlighted ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                        )} />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-foreground">{pkg.label}</p>
                        <p className="text-sm text-muted-foreground">in credits</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {pkg.bonus && (
                        <Badge 
                          className={cn(
                            "font-medium",
                            isPopular && "bg-amber-500/15 text-amber-600 border-amber-500/30",
                            isBestValue && "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                          )}
                          variant="outline"
                        >
                          {isPopular && <Star className="h-3 w-3 mr-1" />}
                          {isBestValue && <CheckCircle className="h-3 w-3 mr-1" />}
                          {pkg.bonus}
                        </Badge>
                      )}
                      {purchaseLoading === pkg.amountCents ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : (
                        <ChevronRight className={cn(
                          "h-5 w-5 transition-colors",
                          isHighlighted ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                        )} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-2">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span>Secure checkout powered by Stripe</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Payment Method Modal */}
        {facilityId && (
          <AddPaymentMethodModal
            open={showPaymentMethodModal}
            onOpenChange={setShowPaymentMethodModal}
            facilityId={facilityId}
            onSuccess={() => setShowPaymentMethodModal(false)}
            cardOnly
          />
        )}
        </div>
      </div>
    </div>
  );
}
