import { useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  History, 
  Phone, 
  Mail, 
  MapPin,
  Download,
  Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProviderFacilities } from "@/hooks/useProviderFacilities";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { InquiryTypeBadge, getInquiryTypeLabel, type InquiryType } from "@/components/provider/InquiryTypeBadge";

interface UnlockedLead {
  id: string;
  lead_id: string;
  facility_id: string;
  unlock_price_cents: number;
  unlocked_at: string;
  lead: {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: string;
    location_city_state: string | null;
    level_of_care: string | null;
    inquiry_type: InquiryType | null;
    created_at: string;
  } | null;
}

interface CreditTransaction {
  id: string;
  amount_cents: number;
  transaction_type: string;
  description: string | null;
  inquiry_type: string | null;
  base_price_cents: number | null;
  discount_applied: boolean | null;
  discount_amount_cents: number | null;
  created_at: string;
  reference_id: string | null;
}

export function UnlockHistoryTab() {
  const { facilities } = useProviderFacilities();
  const facilityIds = useMemo(() => facilities.map(f => f.id), [facilities]);

  // Fetch unlocks with lead data
  const { data: unlocks = [], isLoading } = useQuery({
    queryKey: ["unlock-history", facilityIds],
    queryFn: async (): Promise<UnlockedLead[]> => {
      if (facilityIds.length === 0) return [];

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      const { data, error } = await supabase
        .from("lead_unlocks")
        .select(`
          id,
          lead_id,
          facility_id,
          unlock_price_cents,
          unlocked_at,
          lead:leads (
            id,
            name,
            email,
            phone,
            status,
            location_city_state,
            level_of_care,
            inquiry_type,
            created_at
          )
        `)
        .eq("provider_id", session.user.id)
        .order("unlocked_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as UnlockedLead[];
    },
    enabled: facilityIds.length > 0,
    staleTime: 1000 * 60 * 2,
  });

  // Fetch credit transactions for detailed pricing info
  const { data: transactions = [] } = useQuery({
    queryKey: ["credit-transactions-history", facilityIds],
    queryFn: async (): Promise<CreditTransaction[]> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      const { data, error } = await supabase
        .from("credit_transactions")
        .select("id, amount_cents, transaction_type, description, inquiry_type, base_price_cents, discount_applied, discount_amount_cents, created_at, reference_id")
        .eq("provider_id", session.user.id)
        .eq("transaction_type", "unlock")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as CreditTransaction[];
    },
    staleTime: 1000 * 60 * 2,
  });

  // Create a map of lead_id -> transaction for quick lookup
  const transactionMap = useMemo(() => {
    const map = new Map<string, CreditTransaction>();
    transactions.forEach(t => {
      if (t.reference_id) {
        map.set(t.reference_id, t);
      }
    });
    return map;
  }, [transactions]);

  const totalSpent = useMemo(() => {
    return unlocks.reduce((sum, u) => sum + u.unlock_price_cents, 0);
  }, [unlocks]);

  const totalSaved = useMemo(() => {
    return transactions.reduce((sum, t) => sum + (t.discount_amount_cents || 0), 0);
  }, [transactions]);

  const handleExportCSV = () => {
    if (unlocks.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["Name", "Email", "Phone", "Location", "Care Type", "Inquiry Type", "Unlock Date", "Base Price", "Discount", "Price Paid"];
    const rows = unlocks.map(u => {
      const tx = transactionMap.get(u.lead_id);
      return [
        u.lead?.name || "",
        u.lead?.email || "",
        u.lead?.phone || "",
        u.lead?.location_city_state || "",
        u.lead?.level_of_care || "",
        getInquiryTypeLabel(u.lead?.inquiry_type),
        format(new Date(u.unlocked_at), "yyyy-MM-dd HH:mm"),
        tx?.base_price_cents ? `$${(tx.base_price_cents / 100).toFixed(2)}` : "",
        tx?.discount_amount_cents ? `$${(tx.discount_amount_cents / 100).toFixed(2)}` : "$0.00",
        `$${(u.unlock_price_cents / 100).toFixed(2)}`
      ];
    });

    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `unlock-history-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export complete");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "contacted":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Contacted</Badge>;
      case "responded":
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Responded</Badge>;
      case "closed":
        return <Badge variant="secondary" className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">Closed</Badge>;
      default:
        return <Badge variant="secondary">New</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Unlocks</p>
            <p className="text-2xl font-bold">{unlocks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Spent</p>
            <p className="text-2xl font-bold">${(totalSpent / 100).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-emerald-500" />
              Pro Savings
            </p>
            <p className="text-2xl font-bold text-emerald-600">${(totalSaved / 100).toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Export Button */}
      {unlocks.length > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      )}

      {/* Unlock List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            Unlocked Inquiries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : unlocks.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No unlocked inquiries yet</p>
              <Button variant="outline" className="mt-4" asChild>
                <Link to="/provider/inquiries">View Inquiries</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {unlocks.map((unlock) => {
                const tx = transactionMap.get(unlock.lead_id);
                const hasDiscount = tx?.discount_applied && tx?.discount_amount_cents && tx.discount_amount_cents > 0;
                
                return (
                  <div 
                    key={unlock.id}
                    className="p-4 rounded-lg border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <InquiryTypeBadge type={unlock.lead?.inquiry_type} />
                          <span className="font-semibold">{unlock.lead?.name || "Unknown"}</span>
                          {unlock.lead && getStatusBadge(unlock.lead.status)}
                        </div>
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          {unlock.lead?.phone && (
                            <a href={`tel:${unlock.lead.phone}`} className="flex items-center gap-1 hover:text-foreground">
                              <Phone className="h-3.5 w-3.5" />
                              {unlock.lead.phone}
                            </a>
                          )}
                          {unlock.lead?.email && (
                            <a href={`mailto:${unlock.lead.email}`} className="flex items-center gap-1 hover:text-foreground">
                              <Mail className="h-3.5 w-3.5" />
                              {unlock.lead.email}
                            </a>
                          )}
                          {unlock.lead?.location_city_state && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {unlock.lead.location_city_state}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Unlocked {format(new Date(unlock.unlocked_at), "MMM d, yyyy")}</span>
                          {hasDiscount ? (
                            <span className="flex items-center gap-1">
                              <span className="line-through">${((tx?.base_price_cents || 0) / 100).toFixed(2)}</span>
                              <span className="font-medium text-foreground">${(unlock.unlock_price_cents / 100).toFixed(2)}</span>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                <Zap className="h-2.5 w-2.5 mr-0.5" />
                                Pro
                              </Badge>
                            </span>
                          ) : (
                            <span>Paid ${(unlock.unlock_price_cents / 100).toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}