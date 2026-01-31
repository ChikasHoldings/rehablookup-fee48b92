import { useState } from "react";
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
  Check,
  Percent,
  Star,
  TrendingUp,
  Award,
  ExternalLink,
  Trash2,
  AlertCircle,
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  const { selectedFacility } = useSelectedFacility();
  const facilityId = selectedFacility?.id;
  const { balanceFormatted, transactions, isLoading } = useProviderCredits(facilityId);
  const { data: proStatus } = useProStatus();
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
        return <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />;
      case "unlock":
        return <ArrowUpRight className="h-3.5 w-3.5 text-orange-600" />;
      case "refund":
        return <ArrowDownLeft className="h-3.5 w-3.5 text-blue-600" />;
      case "bonus":
        return <CheckCircle className="h-3.5 w-3.5 text-purple-600" />;
      default:
        return <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />;
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-foreground">Billing</h1>
          <p className="text-sm text-muted-foreground">
            Manage subscription, credits, and payment methods
          </p>
        </div>

        {/* Pro Subscription */}
        <Card>
          <CardContent className="p-0">
            {proStatus?.isPro ? (
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Pro Subscription</span>
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 border-0 text-xs">
                        Active
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {proStatus.currentPeriodEnd 
                        ? `Renews ${format(new Date(proStatus.currentPeriodEnd), "MMM d, yyyy")}`
                        : "Your subscription is active"
                      }
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                >
                  {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Manage"}
                </Button>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <span className="font-medium">Upgrade to Pro</span>
                      <p className="text-sm text-muted-foreground">$399/month</p>
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    onClick={handleUpgrade}
                    disabled={upgradeLoading || !facilityId}
                  >
                    {upgradeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upgrade"}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {PRO_BENEFITS.map((b, i) => {
                    const Icon = b.icon;
                    return (
                      <span key={i} className="flex items-center gap-1.5">
                        <Icon className="h-3 w-3" />
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
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <span className="font-medium">Credit Balance</span>
                  <p className="text-2xl font-semibold text-foreground">{balanceFormatted}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowPurchaseModal(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        {transactions.length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="divide-y divide-border">
                {transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                        {getTransactionIcon(tx.transaction_type)}
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {tx.transaction_type === "unlock" ? "Lead Unlock" : tx.transaction_type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(tx.created_at), "MMM d")}
                        </p>
                      </div>
                    </div>
                    <span className={cn("text-sm font-medium", getTransactionColor(tx.transaction_type))}>
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
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {paymentMethodsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : paymentMethods.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">No payment methods saved</p>
                <Button variant="outline" size="sm" onClick={() => setShowPaymentMethodModal(true)}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Card
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {paymentMethods.map((pm) => (
                  <div 
                    key={pm.id} 
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      pm.is_default ? "bg-muted/50" : "bg-background"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {pm.card_brand || "Card"} •••• {pm.last_four}
                          </span>
                          {pm.is_default && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Default</Badge>
                          )}
                        </div>
                        {pm.exp_month && pm.exp_year && (
                          <p className="text-xs text-muted-foreground">
                            Expires {pm.exp_month}/{pm.exp_year}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!pm.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={() => setDefaultPaymentMethod.mutate(pm.id)}
                          disabled={setDefaultPaymentMethod.isPending}
                        >
                          Set default
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm("Remove this card?")) {
                            deletePaymentMethod.mutate(pm.id);
                          }
                        }}
                        disabled={deletePaymentMethod.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPaymentMethodModal(true)}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add another card
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Purchase Credits Modal */}
        <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Credits</DialogTitle>
              <DialogDescription>
                Select a package to purchase
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-2">
              {CREDIT_PACKAGES.map((pkg) => (
                <button
                  key={pkg.amountCents}
                  onClick={() => handlePurchase(pkg.amountCents)}
                  disabled={purchaseLoading !== null}
                  className={cn(
                    "relative flex items-center justify-between p-3 rounded-lg border transition-colors text-left",
                    "hover:bg-muted/50 hover:border-primary/50",
                    purchaseLoading === pkg.amountCents && "opacity-50 cursor-wait"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{pkg.label}</p>
                      <p className="text-xs text-muted-foreground">in credits</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pkg.bonus && (
                      <Badge variant="secondary" className="text-[10px]">
                        {pkg.bonus}
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {purchaseLoading === pkg.amountCents && (
                    <Loader2 className="h-4 w-4 animate-spin absolute right-3" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Secure checkout via Stripe
            </p>
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
  );
}
