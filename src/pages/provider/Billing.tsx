import { useState, useEffect, useRef, useMemo } from "react";
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
  ChevronRight,
  AlertTriangle,
  Receipt,
  ShieldCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  { amountCents: 20000, label: "$200", credits: 200, bonusCents: 0, badge: null, perLead: "~4-13 leads" },
  { amountCents: 50000, label: "$500", credits: 500, bonusCents: 0, badge: null, perLead: "~10-33 leads" },
  { amountCents: 100000, label: "$1,000", credits: 1000, bonusCents: 10000, badge: "Best Value", perLead: "~20-66 leads + $100 bonus" },
];

const PRO_BENEFITS = [
  { icon: Percent, label: "20% off unlocks" },
  { icon: Star, label: "Featured placement" },
  { icon: TrendingUp, label: "Priority ranking" },
  { icon: Award, label: "Pro badge" },
];

const TX_LABELS: Record<string, string> = {
  purchase: "Credit Purchase",
  unlock: "Lead Unlock",
  refund: "Refund",
  bonus: "Bonus Credits",
};

function isCardExpiringSoon(expMonth?: number, expYear?: number): boolean {
  if (!expMonth || !expYear) return false;
  const now = new Date();
  const expDate = new Date(expYear, expMonth); // month after expiry
  const twoMonths = new Date(now.getFullYear(), now.getMonth() + 2, now.getDate());
  return expDate <= twoMonths;
}

function isCardExpired(expMonth?: number, expYear?: number): boolean {
  if (!expMonth || !expYear) return false;
  const now = new Date();
  return new Date(expYear, expMonth) <= now;
}

export default function ProviderBillingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedFacility } = useSelectedFacility();
  const facilityId = selectedFacility?.id;
  const { balanceFormatted, balance, transactions, isLoading, refetchCredits } = useProviderCredits(facilityId);
  const { data: proStatus, isLoading: proLoading, refetch: refetchProStatus } = useProStatus();
  const { 
    paymentMethods: allPaymentMethods, 
    isLoading: paymentMethodsLoading,
    deletePaymentMethod,
    setDefaultPaymentMethod,
  } = useProviderPaymentMethods(facilityId);
  
  const paymentMethods = useMemo(() => allPaymentMethods.filter(pm => pm.type === "card"), [allPaymentMethods]);
  
  const [purchaseLoading, setPurchaseLoading] = useState<number | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [deleteCardConfirm, setDeleteCardConfirm] = useState<{ id: string; isOpen: boolean }>({ id: "", isOpen: false });
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  // Post-checkout polling
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  const startPostCheckoutPolling = (refetchFn: () => void, maxPolls = 6) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollCountRef.current = 0;
    pollingRef.current = setInterval(() => {
      pollCountRef.current += 1;
      refetchFn();
      if (pollCountRef.current >= maxPolls && pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }, 5000);
  };

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
      const bonus = searchParams.get("bonus");
      const formattedAmount = amount ? `$${(parseInt(amount, 10) / 100).toFixed(0)}` : "";
      const bonusCents = bonus ? parseInt(bonus, 10) : 0;
      const bonusMsg = bonusCents > 0 ? ` + $${(bonusCents / 100).toFixed(0)} bonus credits!` : "";
      toast.success(`${formattedAmount} credits added to your account${bonusMsg}`, { duration: 6000 });
      refetchCredits();
      startPostCheckoutPolling(() => refetchCredits());
      searchParams.delete("credits_success");
      searchParams.delete("amount");
      searchParams.delete("bonus");
      setSearchParams(searchParams, { replace: true });
    }

    if (creditsCanceled === "true") {
      toast.info("Credit purchase was cancelled.");
      searchParams.delete("credits_canceled");
      setSearchParams(searchParams, { replace: true });
    }

    if (purchaseCredits === "true") {
      setShowPurchaseModal(true);
      searchParams.delete("purchase_credits");
      searchParams.delete("amount");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, refetchCredits, refetchProStatus]);

  const purchaseDebounceRef = useRef(false);

  const handlePurchase = async (amountCents: number) => {
    if (!facilityId) {
      toast.error("No facility selected. Please select a facility first.");
      return;
    }
    if (purchaseDebounceRef.current) return;
    purchaseDebounceRef.current = true;

    setPurchaseLoading(amountCents);
    try {
      const { data, error } = await supabase.functions.invoke("purchase-credits", {
        body: { amountCents, facilityId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.checkoutUrl) {
        try {
          const url = new URL(data.checkoutUrl);
          if (!url.hostname.endsWith("stripe.com")) throw new Error("Invalid checkout URL");
          window.open(data.checkoutUrl, "_blank");
        } catch { toast.error("Invalid checkout URL received."); }
        setShowPurchaseModal(false);
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to start checkout.";
      console.error("Purchase error:", err);
      toast.error(message);
    } finally {
      setPurchaseLoading(null);
      setTimeout(() => { purchaseDebounceRef.current = false; }, 2000);
    }
  };

  const handleUpgrade = () => {
    navigate("/provider/pro-upgrade");
  };

  const portalDebounceRef = useRef(false);

  const handleManageSubscription = async () => {
    if (portalDebounceRef.current) return;
    portalDebounceRef.current = true;
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
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
      setTimeout(() => { portalDebounceRef.current = false; }, 2000);
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

  const visibleTransactions = showAllTransactions ? transactions : transactions.slice(0, 8);

  // Determine if any cards are expiring or expired
  const hasExpiringCards = paymentMethods.some(pm => isCardExpiringSoon(pm.exp_month, pm.exp_year) && !isCardExpired(pm.exp_month, pm.exp_year));

  return (
    <div className="min-h-full bg-background">
      <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="max-w-5xl mx-auto space-y-5 md:space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">Billing</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Manage subscription, credits, and payment methods
          </p>
        </div>

        {/* Pro Subscription */}
        <Card>
          <CardContent className="p-4 sm:p-5 md:p-6">
            {proLoading ? (
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56" />
                </div>
              </div>
            ) : proStatus?.isPro ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-amber-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base md:text-lg font-semibold">Pro Subscription</span>
                      {proStatus.cancelAtPeriodEnd ? (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 border-0 text-xs">
                          Canceling
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 border-0 text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-muted flex items-center justify-center">
                      <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <span className="text-base md:text-lg font-semibold">Upgrade to Pro</span>
                      <p className="text-sm text-muted-foreground">$399/month · Save on every lead unlock</p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleUpgrade}
                    disabled={upgradeLoading || !facilityId}
                    className="w-full sm:w-auto"
                  >
                    {upgradeLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    View Benefits
                  </Button>
                </div>
                <div className="flex flex-wrap gap-x-4 md:gap-x-6 gap-y-1.5 text-sm text-muted-foreground">
                  {PRO_BENEFITS.map((b, i) => {
                    const Icon = b.icon;
                    return (
                      <span key={i} className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" />
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
            {isLoading ? (
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-7 w-32" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className={cn(
                    "h-10 w-10 md:h-12 md:w-12 rounded-lg flex items-center justify-center",
                    balance > 0 ? "bg-primary/10" : "bg-muted"
                  )}>
                    <Wallet className={cn(
                      "h-5 w-5 md:h-6 md:w-6",
                      balance > 0 ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Credit Balance</p>
                    <p className="text-xl md:text-2xl font-bold tabular-nums text-foreground">{balanceFormatted}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button variant="outline" onClick={() => setShowPurchaseModal(true)} className="flex-1 sm:flex-none">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Credits
                  </Button>
                </div>
              </div>
            )}
            {!isLoading && balance === 0 && transactions.length === 0 && (
              <div className="mt-4 pt-4 border-t text-center">
                <p className="text-sm text-muted-foreground">
                  Credits are used to unlock lead contact information. Purchase credits to get started.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="h-5 w-5 text-muted-foreground" />
                Transaction History
              </CardTitle>
              {transactions.length > 0 && (
                <Badge variant="secondary" className="text-xs tabular-nums">
                  {transactions.length} total
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-8 text-center">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Receipt className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No transactions yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your credit purchases and lead unlocks will appear here
                </p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-border">
                  {visibleTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                          {getTransactionIcon(tx.transaction_type)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {TX_LABELS[tx.transaction_type] || tx.transaction_type}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{format(new Date(tx.created_at), "MMM d, yyyy")}</span>
                            {tx.description && (
                              <>
                                <span>·</span>
                                <span className="truncate">{tx.description}</span>
                              </>
                            )}
                          </div>
                          {tx.discount_applied && tx.discount_amount_cents && tx.discount_amount_cents > 0 && (
                            <p className="text-xs text-emerald-600 mt-0.5">
                              Pro saved ${(tx.discount_amount_cents / 100).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={cn("font-semibold text-sm tabular-nums shrink-0 ml-3", getTransactionColor(tx.transaction_type))}>
                        {tx.transaction_type === "unlock" ? "−" : "+"}${(Math.abs(tx.amount_cents) / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                {transactions.length > 8 && (
                  <div className="pt-3 border-t mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-sm text-muted-foreground"
                      onClick={() => setShowAllTransactions(!showAllTransactions)}
                    >
                      {showAllTransactions ? "Show less" : `Show all ${transactions.length} transactions`}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                Payment Methods
              </CardTitle>
              {hasExpiringCards && (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 border-0 text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Expiring soon
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {paymentMethodsLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-5" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : paymentMethods.length === 0 ? (
              <div className="py-6 text-center">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-3">No payment methods saved</p>
                <Button variant="outline" size="sm" onClick={() => setShowPaymentMethodModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Card
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {paymentMethods.map((pm) => {
                  const expired = isCardExpired(pm.exp_month, pm.exp_year);
                  const expiringSoon = !expired && isCardExpiringSoon(pm.exp_month, pm.exp_year);
                  return (
                    <div 
                      key={pm.id} 
                      className={cn(
                        "flex items-center justify-between p-3.5 rounded-lg border transition-colors",
                        pm.is_default && "bg-muted/50 border-primary/20",
                        expired && "border-destructive/30 bg-destructive/5",
                        expiringSoon && !expired && "border-amber-500/30 bg-amber-500/5"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CreditCard className={cn(
                          "h-5 w-5 shrink-0",
                          expired ? "text-destructive" : "text-muted-foreground"
                        )} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {(pm.card_brand || "Card").charAt(0).toUpperCase() + (pm.card_brand || "Card").slice(1)} •••• {pm.last_four}
                            </span>
                            {pm.is_default && (
                              <Badge variant="secondary" className="text-xs h-5">Default</Badge>
                            )}
                            {expired && (
                              <Badge variant="destructive" className="text-xs h-5">Expired</Badge>
                            )}
                            {expiringSoon && (
                              <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 border-0 text-xs h-5">
                                Expiring soon
                              </Badge>
                            )}
                          </div>
                          {pm.exp_month && pm.exp_year && (
                            <p className={cn(
                              "text-xs mt-0.5",
                              expired ? "text-destructive" : "text-muted-foreground"
                            )}>
                              Expires {String(pm.exp_month).padStart(2, '0')}/{pm.exp_year}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!pm.is_default && !expired && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-8"
                            onClick={() => setDefaultPaymentMethod.mutate(pm.id)}
                            disabled={setDefaultPaymentMethod.isPending}
                          >
                            Set default
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteCardConfirm({ id: pm.id, isOpen: true })}
                          disabled={deletePaymentMethod.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPaymentMethodModal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add another card
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security note */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pb-4">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>All payments are securely processed via Stripe. We never store card details.</span>
        </div>

        {/* Purchase Credits Modal */}
        <Dialog open={showPurchaseModal} onOpenChange={(open) => {
          if (!purchaseLoading) setShowPurchaseModal(open);
        }}>
          <DialogContent className="w-[95vw] sm:max-w-lg p-0 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 sm:p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-primary/15 flex items-center justify-center">
                    <Wallet className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium">Current Balance</p>
                    <p className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground">{balanceFormatted}</p>
                  </div>
                </div>
                {proStatus?.isPro && (
                  <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Pro 20% off
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Package Selection */}
            <div className="p-5 sm:p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-base sm:text-lg">Add Credits</h3>
                <p className="text-sm text-muted-foreground">Select a package — credits are used to unlock lead contact info</p>
              </div>
              
              <div className="grid gap-2.5">
                {CREDIT_PACKAGES.map((pkg) => {
                  const isPkgLoading = purchaseLoading === pkg.amountCents;
                  const isDisabled = purchaseLoading !== null;
                  return (
                    <button
                      key={pkg.amountCents}
                      onClick={() => handlePurchase(pkg.amountCents)}
                      disabled={isDisabled}
                      className={cn(
                        "flex items-center justify-between p-3.5 sm:p-4 rounded-xl border-2 transition-all text-left group",
                        "hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm",
                        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                        "disabled:opacity-60 disabled:cursor-not-allowed",
                        isPkgLoading && "border-primary bg-primary/5 shadow-sm",
                        pkg.badge === "Best Value" && !isDisabled && "border-emerald-500/40 bg-emerald-50/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center font-bold text-sm",
                          pkg.badge === "Best Value" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                        )}>
                          {pkg.label}
                        </div>
                        <div>
                          <p className="font-semibold text-sm sm:text-base text-foreground">
                            {pkg.credits} credits
                            {pkg.bonusCents > 0 && (
                              <span className="text-emerald-600 font-bold ml-1">+ ${(pkg.bonusCents / 100).toFixed(0)} bonus</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{pkg.perLead}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {pkg.badge && (
                          <Badge 
                            variant="secondary"
                            className="text-xs whitespace-nowrap bg-emerald-600 text-white border-0"
                          >
                            {pkg.badge}
                          </Badge>
                        )}
                        {isPkgLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {/* Trust signals */}
              <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Credits never expire
                </span>
                <span className="flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5" />
                  Secure via Stripe
                </span>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Payment Method Modal */}
        {showPaymentMethodModal && (
          <Suspense fallback={null}>
            <AddPaymentMethodModal 
              open={showPaymentMethodModal} 
              onOpenChange={setShowPaymentMethodModal}
              facilityId={facilityId || ""}
            />
          </Suspense>
        )}

        {/* Delete Card Confirmation */}
        <AlertDialog open={deleteCardConfirm.isOpen} onOpenChange={(open) => setDeleteCardConfirm(prev => ({ ...prev, isOpen: open }))}>
          <AlertDialogContent className="w-[95vw] sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base sm:text-lg">Remove Payment Method</AlertDialogTitle>
              <AlertDialogDescription className="text-sm">
                Are you sure you want to remove this card? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel className="h-9 text-sm">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteCard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-9 text-sm">
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
