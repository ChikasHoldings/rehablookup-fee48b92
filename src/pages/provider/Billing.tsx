import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { lazy, Suspense } from "react";
const AddPaymentMethodModal = lazy(() => import("@/components/provider/AddPaymentMethodModal").then(m => ({ default: m.AddPaymentMethodModal })));

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
  const { balanceFormatted, transactions, isLoading, refetchCredits } = useProviderCredits(facilityId);
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
  const [deleteCardConfirm, setDeleteCardConfirm] = useState<{ id: string; isOpen: boolean }>({ id: "", isOpen: false });

  // Post-checkout polling: retry fetches for up to 30s to catch webhook processing
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  const startPostCheckoutPolling = (refetchFn: () => void, maxPolls = 6) => {
    // Clear any existing polling
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollCountRef.current = 0;
    
    // Poll every 5 seconds for up to 30 seconds
    pollingRef.current = setInterval(() => {
      pollCountRef.current += 1;
      refetchFn();
      if (pollCountRef.current >= maxPolls && pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }, 5000);
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Handle success/cancel URL params from Stripe checkout
  useEffect(() => {
    const proSuccess = searchParams.get("pro_success");
    const proCanceled = searchParams.get("pro_canceled");
    const creditsSuccess = searchParams.get("credits_success");
    const creditsCanceled = searchParams.get("credits_canceled");
    const purchaseCredits = searchParams.get("purchase_credits");

    if (proSuccess === "true") {
      toast.success("Welcome to Pro! Your benefits are now active.", { duration: 5000 });
      refetchProStatus();
      // Poll to catch delayed webhook processing
      startPostCheckoutPolling(() => refetchProStatus());
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
      // Poll to catch delayed webhook processing
      startPostCheckoutPolling(() => refetchCredits());
      searchParams.delete("credits_success");
      searchParams.delete("amount");
      setSearchParams(searchParams, { replace: true });
    }

    if (creditsCanceled === "true") {
      toast.info("Credit purchase was cancelled.");
      searchParams.delete("credits_canceled");
      setSearchParams(searchParams, { replace: true });
    }

    // Auto-open purchase modal when redirected from unlock with insufficient credits
    if (purchaseCredits === "true") {
      setShowPurchaseModal(true);
      searchParams.delete("purchase_credits");
      searchParams.delete("amount");
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
        try {
          const url = new URL(data.checkoutUrl);
          if (!url.hostname.endsWith("stripe.com")) throw new Error("Invalid checkout URL");
          window.open(data.checkoutUrl, "_blank");
        } catch { toast.error("Invalid checkout URL received."); }
        setShowPurchaseModal(false);
      }
    } catch (err) {
      console.error("Purchase error:", err);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setPurchaseLoading(null);
    }
  };

  const handleUpgrade = () => {
    navigate("/provider/pro-upgrade");
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        try {
          const url = new URL(data.url);
          if (!url.hostname.endsWith("stripe.com")) throw new Error("Invalid portal URL");
          window.open(data.url, "_blank");
        } catch { toast.error("Invalid billing portal URL received."); }
      }
    } catch (err) {
      console.error("Portal error:", err);
      toast.error("Unable to open billing portal. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleDeleteCard = () => {
    if (deleteCardConfirm.id) {
      deletePaymentMethod.mutate(deleteCardConfirm.id);
    }
    setDeleteCardConfirm({ id: "", isOpen: false });
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
      <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">Billing</h1>
          <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">
            Manage subscription, credits, and payment methods
          </p>
        </div>

        {/* Pro Subscription */}
        <Card>
          <CardContent className="p-4 sm:p-5 md:p-6">
            {proStatus?.isPro ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-amber-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base md:text-lg font-semibold">Pro Subscription</span>
                      {proStatus.cancelAtPeriodEnd ? (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 border-0">
                          Canceling
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 border-0">
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm md:text-base text-muted-foreground">
                      {proStatus.cancelAtPeriodEnd && proStatus.currentPeriodEnd
                        ? `Cancels ${format(new Date(proStatus.currentPeriodEnd), "MMMM d, yyyy")} — resubscribe anytime`
                        : proStatus.currentPeriodEnd 
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
                  className="w-full sm:w-auto"
                >
                  {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                  Manage
                </Button>
              </div>
            ) : (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-muted flex items-center justify-center">
                      <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <span className="text-base md:text-lg font-semibold">Upgrade to Pro</span>
                      <p className="text-sm md:text-base text-muted-foreground">$399/month</p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleUpgrade}
                    disabled={upgradeLoading || !facilityId}
                    className="w-full sm:w-auto"
                  >
                    {upgradeLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Upgrade
                  </Button>
                </div>
                <div className="flex flex-wrap gap-x-4 md:gap-x-6 gap-y-2 text-sm md:text-base text-muted-foreground">
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
          <CardContent className="p-4 sm:p-5 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm md:text-base text-muted-foreground">Credit Balance</p>
                  <p className="text-xl md:text-2xl font-bold text-foreground">{balanceFormatted}</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => setShowPurchaseModal(true)} className="w-full sm:w-auto">
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
                        onClick={() => setDeleteCardConfirm({ id: pm.id, isOpen: true })}
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
          <DialogContent className="w-[95vw] sm:max-w-lg p-0 overflow-hidden">
            {/* Header with balance */}
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 sm:p-6 border-b">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-11 w-11 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-primary/15 flex items-center justify-center">
                  <Wallet className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium">Current Balance</p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{balanceFormatted}</p>
                </div>
              </div>
            </div>
            
            {/* Package Selection */}
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div>
                <h3 className="font-semibold text-base sm:text-lg mb-0.5 sm:mb-1">Add Credits</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Select a package to add credits to your account</p>
              </div>
              
              <div className="grid gap-2 sm:gap-3">
                {CREDIT_PACKAGES.map((pkg) => (
                  <button
                    key={pkg.amountCents}
                    onClick={() => handlePurchase(pkg.amountCents)}
                    disabled={purchaseLoading !== null}
                    className={cn(
                      "flex items-center justify-between p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all text-left",
                      "hover:border-primary/50 hover:bg-primary/5",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      purchaseLoading === pkg.amountCents && "border-primary bg-primary/5"
                    )}
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-md sm:rounded-lg bg-muted flex items-center justify-center">
                        <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm sm:text-base text-foreground">{pkg.label}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {pkg.amountCents / 100} credits
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {pkg.bonus && (
                        <Badge 
                          variant={pkg.bonus === "Popular" ? "default" : "secondary"}
                          className={cn(
                            "text-xs sm:text-xs",
                            pkg.bonus === "Popular" && "bg-primary",
                            pkg.bonus === "Best Value" && "bg-emerald-600 text-white border-0"
                          )}
                        >
                          {pkg.bonus}
                        </Badge>
                      )}
                      {purchaseLoading === pkg.amountCents ? (
                        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-primary" />
                      ) : (
                        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              
              <p className="text-xs sm:text-xs text-center text-muted-foreground pt-1 sm:pt-2">
                Credits never expire • Secure checkout via Stripe
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Payment Method Modal - lazy loaded to defer Stripe.js */}
        {showPaymentMethodModal && (
          <Suspense fallback={null}>
            <AddPaymentMethodModal 
              open={showPaymentMethodModal} 
              onOpenChange={setShowPaymentMethodModal}
              facilityId={facilityId || ""}
            />
          </Suspense>
        )}

        {/* Delete Card Confirmation Dialog */}
        <AlertDialog open={deleteCardConfirm.isOpen} onOpenChange={(open) => setDeleteCardConfirm(prev => ({ ...prev, isOpen: open }))}>
          <AlertDialogContent className="w-[95vw] sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base sm:text-lg">Remove Payment Method</AlertDialogTitle>
              <AlertDialogDescription className="text-xs sm:text-sm">
                Are you sure you want to remove this card? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel className="h-9 sm:h-10 text-sm">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteCard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-9 sm:h-10 text-sm">
                Remove Card
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
      </div>
    </div>
  );
}
