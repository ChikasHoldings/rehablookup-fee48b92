import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Crown, Wallet, AlertTriangle, Handshake, CheckCircle, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { Facility } from "../ProviderListItem";

interface ProviderBillingTabProps {
  provider: Facility;
  proSubscription: any;
  creditBalance: number;
  placementStats: { introductions: number; placements: number };
}

export function ProviderBillingTab({ provider, proSubscription, creditBalance, placementStats }: ProviderBillingTabProps) {
  // Fetch credit transaction history
  const { data: transactions } = useQuery({
    queryKey: ["admin-provider-transactions", provider.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("credit_transactions")
        .select("id, amount_cents, transaction_type, description, created_at, base_price_cents, discount_amount_cents, discount_applied")
        .eq("provider_id", provider.user_id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  // Fetch all pro subscriptions (including expired)
  const { data: allSubs } = useQuery({
    queryKey: ["admin-provider-all-subs", provider.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("pro_subscriptions")
        .select("id, facility_id, status, price_cents, created_at, current_period_end, unlock_discount_percent, stripe_subscription_id")
        .eq("provider_id", provider.user_id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const totalPurchases = transactions?.filter((t) => t.transaction_type === "purchase").reduce((s, t) => s + t.amount_cents, 0) || 0;
  const totalUnlockSpend = transactions?.filter((t) => t.transaction_type === "unlock").reduce((s, t) => s + t.amount_cents, 0) || 0;

  const txTypeLabel: Record<string, { label: string; color: string; icon: any }> = {
    purchase: { label: "Credit Purchase", color: "text-emerald-600", icon: ArrowUpRight },
    unlock: { label: "Lead Unlock", color: "text-destructive", icon: ArrowDownRight },
    refund: { label: "Refund", color: "text-blue-600", icon: ArrowUpRight },
    admin_credit: { label: "Admin Credit", color: "text-purple-600", icon: ArrowUpRight },
    placement_fee: { label: "Placement Fee", color: "text-amber-600", icon: ArrowDownRight },
  };

  return (
    <div className="p-6 space-y-6">
      {/* Pro Subscription Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          {proSubscription ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                  <Crown className="h-3 w-3 mr-1" />Pro Active
                </Badge>
                <div>
                  <p className="font-semibold">${proSubscription.price_cents ? (proSubscription.price_cents / 100).toFixed(0) : "—"}/mo</p>
                  {proSubscription.current_period_end && (
                    <p className="text-sm text-muted-foreground">Renews {format(new Date(proSubscription.current_period_end), "PPP")}</p>
                  )}
                </div>
              </div>
              <Badge className="bg-success/10 text-success border-success/20">{proSubscription.unlock_discount_percent}% Discount</Badge>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground">No active Pro subscription</p>
              <p className="text-sm text-muted-foreground mt-1">Free tier — pay-per-unlock model</p>
            </div>
          )}

          {/* Subscription history */}
          {allSubs && allSubs.length > 1 && (
            <div className="mt-4 pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-2 font-medium uppercase">Subscription History</p>
              <div className="space-y-1.5">
                {allSubs.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between text-sm">
                    <span>{format(new Date(sub.created_at), "MMM d, yyyy")}</span>
                    <Badge variant="outline" className={`text-xs ${sub.status === "active" ? "text-emerald-600" : "text-muted-foreground"}`}>{sub.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit Balance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-emerald-500" />
            Credit Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-3xl font-bold text-success">${((creditBalance || 0) / 100).toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Available for lead unlocks</p>
            </div>
            {(creditBalance || 0) < 5000 && (
              <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Low Balance</Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">Total Purchased</p>
              <p className="font-semibold text-emerald-600">${(totalPurchases / 100).toFixed(2)}</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">Total Unlock Spend</p>
              <p className="font-semibold text-destructive">${(totalUnlockSpend / 100).toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Placement Network */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Handshake className="h-4 w-4 text-purple-500" />
            Placement Network
          </CardTitle>
        </CardHeader>
        <CardContent>
          {provider.concierge_network_opted_in ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-chart-3 border-chart-3/30 gap-1">
                  <CheckCircle className="h-3 w-3" />Opted In
                </Badge>
                {provider.concierge_terms_accepted_at && (
                  <p className="text-sm text-muted-foreground">Signed {format(new Date(provider.concierge_terms_accepted_at), "PPP")}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-2xl font-bold">{placementStats?.introductions || 0}</p>
                  <p className="text-xs text-muted-foreground">Introductions</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-chart-3">{placementStats?.placements || 0}</p>
                  <p className="text-xs text-muted-foreground">Placements</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground">Not opted into Placement Network</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction History */}
      {transactions && transactions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => {
                    const info = txTypeLabel[tx.transaction_type] || { label: tx.transaction_type, color: "", icon: DollarSign };
                    const Icon = info.icon;
                    const isCredit = ["purchase", "refund", "admin_credit"].includes(tx.transaction_type);
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm">{format(new Date(tx.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs gap-1 ${info.color}`}>
                            <Icon className="h-3 w-3" />{info.label}
                          </Badge>
                        </TableCell>
                        <TableCell className={`font-mono text-sm ${isCredit ? "text-emerald-600" : "text-destructive"}`}>
                          {isCredit ? "+" : "-"}${(tx.amount_cents / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{tx.description || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
