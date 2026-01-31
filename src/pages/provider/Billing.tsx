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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useSearchParams } from "react-router-dom";
import { AddPaymentMethodModal } from "@/components/provider/AddPaymentMethodModal";

const CREDIT_PACKAGES = [
  { amountCents: 10000, label: "$100", bonus: null },
  { amountCents: 25000, label: "$250", bonus: null },
  { amountCents: 50000, label: "$500", bonus: "Best Value" },
  { amountCents: 100000, label: "$1,000", bonus: "Most Popular" },
];

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

export default function ProviderBillingPage() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "payment-methods";
  
  const { selectedFacility } = useSelectedFacility();
  const facilityId = selectedFacility?.id;
  const { balance, balanceFormatted, transactions, isLoading, refetch } = useProviderCredits(facilityId);
  const { data: proStatus, isLoading: proLoading } = useProStatus();
  const { 
    paymentMethods: allPaymentMethods, 
    defaultPaymentMethod: defaultPaymentMethodAll,
    hasPaymentMethod,
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Billing</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your payment methods, credits, and Pro subscription
          </p>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="payment-methods" className="gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Payment Methods</span>
              <span className="sm:hidden">Cards</span>
            </TabsTrigger>
            <TabsTrigger value="credits" className="gap-2">
              <Wallet className="h-4 w-4" />
              Credits
            </TabsTrigger>
            <TabsTrigger value="pro" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Pro Subscription</span>
              <span className="sm:hidden">Pro</span>
            </TabsTrigger>
          </TabsList>

          {/* Payment Methods Tab */}
          <TabsContent value="payment-methods" className="space-y-6">
            {/* Default Card */}
            {defaultPaymentMethod ? (
              <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 border-emerald-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <CreditCard className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-lg">
                            {defaultPaymentMethod.card_brand || "Card"} •••• {defaultPaymentMethod.last_four}
                          </p>
                          <Badge className="bg-emerald-500 text-white">Default</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {defaultPaymentMethod.exp_month && defaultPaymentMethod.exp_year
                            ? `Expires ${defaultPaymentMethod.exp_month}/${defaultPaymentMethod.exp_year}`
                            : "Used for automated billing"
                          }
                        </p>
                      </div>
                    </div>
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Alert className="border-amber-500/30 bg-amber-500/5">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription>
                  Add a card to enable automated billing for Pro subscription and easy credit purchases.
                </AlertDescription>
              </Alert>
            )}

            {/* Saved Payment Methods List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  Saved Cards
                </CardTitle>
                <CardDescription>
                  Manage your saved cards for billing and credit purchases
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {paymentMethodsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : paymentMethods.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">No cards saved</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add a card for Pro subscription and credit purchases
                    </p>
                  </div>
                ) : (
                  paymentMethods.map((pm) => (
                    <div 
                      key={pm.id} 
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg border transition-colors",
                        pm.is_default ? "bg-muted/50 border-primary/30" : "hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center",
                          pm.is_default ? "bg-primary/20" : "bg-muted"
                        )}>
                          <CreditCard className={cn("h-5 w-5", pm.is_default ? "text-primary" : "text-muted-foreground")} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {pm.card_brand || "Card"} •••• {pm.last_four}
                            </p>
                            {pm.is_default && (
                              <Badge variant="secondary" className="text-xs">Default</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {pm.exp_month && pm.exp_year
                              ? `Expires ${pm.exp_month}/${pm.exp_year}`
                              : `Added ${format(new Date(pm.created_at), "MMM d, yyyy")}`
                            }
                          </p>
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
                            Set Default
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (confirm("Remove this payment method?")) {
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
                  className="w-full gap-2 mt-2"
                  onClick={() => setShowPaymentMethodModal(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add Card
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Credits Tab */}
          <TabsContent value="credits" className="space-y-6">
            {/* Balance Card */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Available Credits</p>
                    <p className="text-4xl font-bold text-foreground">{balanceFormatted}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Use credits to unlock inquiries
                    </p>
                  </div>
                  <Button 
                    size="lg" 
                    className="gap-2"
                    onClick={() => setShowPurchaseModal(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add Credits
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Transaction History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  Transaction History
                </CardTitle>
                <CardDescription>Your recent credit transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <Wallet className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">No transactions yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Purchase credits to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((tx) => (
                      <div 
                        key={tx.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-background flex items-center justify-center">
                            {getTransactionIcon(tx.transaction_type)}
                          </div>
                          <div>
                            <p className="font-medium text-sm capitalize">
                              {tx.transaction_type === "unlock" ? "Lead Unlock" : tx.transaction_type}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                            {tx.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{tx.description}</p>
                            )}
                          </div>
                        </div>
                        <span className={cn(
                          "font-semibold",
                          getTransactionColor(tx.transaction_type)
                        )}>
                          {tx.transaction_type === "unlock" ? "-" : "+"}
                          ${(Math.abs(tx.amount_cents) / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pro Subscription Tab */}
          <TabsContent value="pro" className="space-y-6">
            {/* Status Card */}
            {proStatus?.isPro ? (
              <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
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
              <Card className="border-2 border-dashed border-primary/30">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 mb-4">
                      <Sparkles className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Upgrade to Pro</h3>
                    <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                      Boost your facility's visibility and save on every inquiry unlock
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
                      Upgrade to Pro – $399/mo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Benefits */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Pro Benefits</h2>
              <div className="grid gap-3">
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
            <Card>
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
          </TabsContent>
        </Tabs>

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
