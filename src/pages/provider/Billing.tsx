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
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  { amountCents: 100000, label: "$1,000", bonus: "Most Popular" },
];

const PRO_BENEFITS = [
  { icon: Percent, title: "20% Off All Unlocks", description: "Save on every inquiry you unlock" },
  { icon: Star, title: "Featured Placement", description: "Homepage & search visibility" },
  { icon: TrendingUp, title: "Priority Ranking", description: "Top of search results" },
  { icon: Award, title: "Pro Badge", description: "Stand out with verification" },
];

export default function ProviderBillingPage() {
  const { selectedFacility } = useSelectedFacility();
  const facilityId = selectedFacility?.id;
  const { balance, balanceFormatted, transactions, isLoading, refetch } = useProviderCredits(facilityId);
  const { data: proStatus, isLoading: proLoading } = useProStatus();
  const { 
    paymentMethods: allPaymentMethods, 
    isLoading: paymentMethodsLoading,
    deletePaymentMethod,
    setDefaultPaymentMethod,
  } = useProviderPaymentMethods(facilityId);
  
  // Filter to cards only - ACH is exclusive to Placement Network
  const paymentMethods = allPaymentMethods.filter(pm => pm.type === "card");
  const defaultPaymentMethod = paymentMethods.find(pm => pm.is_default) || paymentMethods[0] || null;
  
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
        return "text-orange-600";
      default:
        return "text-foreground";
    }
  };

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your cards, credits, and Pro subscription
          </p>
        </div>

        {/* Pro Subscription Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Pro Subscription
          </h2>
          
          {proStatus?.isPro ? (
            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">Pro Active</h3>
                        <Badge className="bg-amber-500 text-white">Active</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {proStatus.currentPeriodEnd 
                          ? `Renews ${format(new Date(proStatus.currentPeriodEnd), "MMM d, yyyy")}`
                          : "Your Pro subscription is active"
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
                    {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-1.5" />}
                    Manage
                  </Button>
                </div>
                {/* Inline benefits for Pro users */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-amber-500/20">
                  {PRO_BENEFITS.map((b, i) => {
                    const Icon = b.icon;
                    return (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Icon className="h-4 w-4 text-amber-600" />
                        <span className="text-muted-foreground">{b.title}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 border-dashed border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Upgrade to Pro</h3>
                      <p className="text-sm text-muted-foreground">
                        Get 20% off unlocks, featured placement & priority ranking
                      </p>
                    </div>
                  </div>
                  <Button 
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white gap-2 whitespace-nowrap"
                    onClick={handleUpgrade}
                    disabled={upgradeLoading || !facilityId}
                  >
                    {upgradeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    $399/mo
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Credits Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Credits
          </h2>
          
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Available Balance</p>
                  <p className="text-3xl font-bold text-foreground">{balanceFormatted}</p>
                </div>
                <Button onClick={() => setShowPurchaseModal(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Credits
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          {transactions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {transactions.slice(0, 5).map((tx) => (
                    <div 
                      key={tx.id} 
                      className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center">
                          {getTransactionIcon(tx.transaction_type)}
                        </div>
                        <div>
                          <p className="font-medium text-sm capitalize">
                            {tx.transaction_type === "unlock" ? "Lead Unlock" : tx.transaction_type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(tx.created_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <span className={cn("font-semibold text-sm", getTransactionColor(tx.transaction_type))}>
                        {tx.transaction_type === "unlock" ? "-" : "+"}
                        ${(Math.abs(tx.amount_cents) / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Payment Methods Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            Saved Cards
          </h2>

          {!paymentMethodsLoading && paymentMethods.length === 0 && (
            <Alert className="border-amber-500/30 bg-amber-500/5">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription>
                Add a card for automated Pro billing and easy credit purchases.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardContent className="p-4 space-y-3">
              {paymentMethodsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : paymentMethods.length === 0 ? (
                <div className="text-center py-6">
                  <CreditCard className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No cards saved yet</p>
                </div>
              ) : (
                paymentMethods.map((pm) => (
                  <div 
                    key={pm.id} 
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-colors",
                      pm.is_default ? "bg-muted/50 border-primary/30" : "hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-9 w-9 rounded-full flex items-center justify-center",
                        pm.is_default ? "bg-primary/20" : "bg-muted"
                      )}>
                        <CreditCard className={cn("h-4 w-4", pm.is_default ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">
                            {pm.card_brand || "Card"} •••• {pm.last_four}
                          </p>
                          {pm.is_default && <Badge variant="secondary" className="text-xs">Default</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {pm.exp_month && pm.exp_year ? `Expires ${pm.exp_month}/${pm.exp_year}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!pm.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => setDefaultPaymentMethod.mutate(pm.id)}
                          disabled={setDefaultPaymentMethod.isPending}
                        >
                          Set Default
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
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
                ))
              )}
              
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => setShowPaymentMethodModal(true)}
              >
                <Plus className="h-4 w-4" />
                Add Card
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Purchase Credits Modal */}
        <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Credits</DialogTitle>
              <DialogDescription>
                Choose a credit package to purchase
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              {CREDIT_PACKAGES.map((pkg) => (
                <button
                  key={pkg.amountCents}
                  onClick={() => handlePurchase(pkg.amountCents)}
                  disabled={purchaseLoading !== null}
                  className={cn(
                    "relative flex items-center justify-between p-4 rounded-lg border-2 transition-all",
                    "hover:border-primary hover:bg-primary/5",
                    purchaseLoading === pkg.amountCents && "opacity-50 cursor-wait"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Wallet className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-lg">{pkg.label}</p>
                      <p className="text-sm text-muted-foreground">in credits</p>
                    </div>
                  </div>
                  {pkg.bonus && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-0">
                      {pkg.bonus}
                    </Badge>
                  )}
                  {purchaseLoading === pkg.amountCents && (
                    <Loader2 className="h-5 w-5 animate-spin absolute right-4" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Secure payment powered by Stripe
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
