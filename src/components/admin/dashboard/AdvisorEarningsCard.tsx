import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, Clock, CheckCircle2 } from "lucide-react";

export function AdvisorEarningsCard() {
  const { user } = useAdminAuth();

  const { data: earnings, isLoading } = useQuery({
    queryKey: ["advisor-earnings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("advisor_earnings")
        .select("*")
        .eq("advisor_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const all = data || [];
      const pending = all.filter(e => e.status === "pending");
      const approved = all.filter(e => e.status === "approved");
      const paid = all.filter(e => e.status === "paid");

      const totalPending = pending.reduce((sum, e) => sum + (e.commission_cents || 0), 0);
      const totalApproved = approved.reduce((sum, e) => sum + (e.commission_cents || 0), 0);
      const totalPaid = paid.reduce((sum, e) => sum + (e.commission_cents || 0), 0);
      const totalAll = totalPending + totalApproved + totalPaid;

      return {
        totalAll,
        totalPending,
        totalApproved,
        totalPaid,
        recentEntries: all.slice(0, 5),
        count: all.length,
      };
    },
    enabled: !!user?.id,
  });

  // Get commission rate from profile
  const { data: profile } = useQuery({
    queryKey: ["advisor-profile-rate", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("admin_user_profiles")
        .select("commission_rate, employment_type")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const isContractor = profile?.employment_type === "contractor";

  if (!isContractor) return null;

  const formatCents = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-success" />
              Earnings
            </CardTitle>
            <CardDescription className="text-xs">
              Commission rate: {profile?.commission_rate || 0}%
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs bg-success/10 text-success border-transparent">
            Contractor
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-warning/5 border border-warning/20">
                <Clock className="h-4 w-4 mx-auto text-warning mb-1" />
                <p className="text-lg font-bold tabular-nums">{formatCents(earnings?.totalPending || 0)}</p>
                <p className="text-[10px] text-muted-foreground">Pending</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-info/5 border border-info/20">
                <TrendingUp className="h-4 w-4 mx-auto text-info mb-1" />
                <p className="text-lg font-bold tabular-nums">{formatCents(earnings?.totalApproved || 0)}</p>
                <p className="text-[10px] text-muted-foreground">Approved</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-success/5 border border-success/20">
                <CheckCircle2 className="h-4 w-4 mx-auto text-success mb-1" />
                <p className="text-lg font-bold tabular-nums">{formatCents(earnings?.totalPaid || 0)}</p>
                <p className="text-[10px] text-muted-foreground">Paid</p>
              </div>
            </div>

            {/* Total */}
            <div className="p-3 rounded-lg bg-muted/50 border flex items-center justify-between">
              <span className="text-sm font-medium">Total Earnings</span>
              <span className="text-lg font-bold tabular-nums">{formatCents(earnings?.totalAll || 0)}</span>
            </div>

            {/* Recent */}
            {earnings?.recentEntries && earnings.recentEntries.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Recent Commissions</p>
                <div className="space-y-1.5">
                  {earnings.recentEntries.map((entry: any) => (
                    <div key={entry.id} className="flex items-center justify-between text-xs p-2 rounded border">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            entry.status === "paid" ? "bg-success/10 text-success" :
                            entry.status === "approved" ? "bg-info/10 text-info" :
                            "bg-warning/10 text-warning"
                          }`}
                        >
                          {entry.status}
                        </Badge>
                        <span className="text-muted-foreground">{entry.commission_rate}%</span>
                      </div>
                      <span className="font-medium tabular-nums">{formatCents(entry.commission_cents)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!earnings?.recentEntries || earnings.recentEntries.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-2">No earnings yet</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
