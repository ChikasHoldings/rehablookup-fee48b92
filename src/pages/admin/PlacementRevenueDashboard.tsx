import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, subMonths } from "date-fns";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Percent,
  Users,
  FileText,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface Invoice {
  id: string;
  amount_cents: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  fee_type: string | null;
  discount_percent: number | null;
  discount_reason: string | null;
  waived: boolean | null;
  facility_id: string;
}

interface FeeEvent {
  id: string;
  event_type: string;
  amount_cents: number | null;
  created_at: string;
  details: Record<string, unknown> | null;
}

const COLORS = {
  primary: "hsl(var(--primary))",
  emerald: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  violet: "#8b5cf6",
  muted: "hsl(var(--muted-foreground))",
};

export default function PlacementRevenueDashboard() {
  // Fetch all placement invoices
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["admin-placement-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("placement_invoices")
        .select("id, case_id, inquiry_id, facility_id, amount_cents, fee_type, status, due_at, paid_at, created_at, override_amount_cents, override_reason, discount_percent, discount_reason, notes, receipt_url, stripe_payment_intent_id")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Invoice[];
    },
  });

  // Fetch fee events for trends
  const { data: feeEvents } = useQuery({
    queryKey: ["admin-fee-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("placement_fee_events")
        .select("id, invoice_id, inquiry_id, facility_id, event_type, amount_cents, actor_id, actor_type, details, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return (data || []) as FeeEvent[];
    },
  });

  // Calculate stats
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const stats = {
    totalCollected: invoices?.filter(i => i.status === "paid").reduce((sum, i) => sum + i.amount_cents, 0) || 0,
    thisMonthCollected: invoices?.filter(i => 
      i.status === "paid" && 
      i.paid_at && 
      new Date(i.paid_at) >= thisMonthStart
    ).reduce((sum, i) => sum + i.amount_cents, 0) || 0,
    lastMonthCollected: invoices?.filter(i => 
      i.status === "paid" && 
      i.paid_at && 
      new Date(i.paid_at) >= lastMonthStart &&
      new Date(i.paid_at) <= lastMonthEnd
    ).reduce((sum, i) => sum + i.amount_cents, 0) || 0,
    pendingAmount: invoices?.filter(i => i.status === "pending").reduce((sum, i) => sum + i.amount_cents, 0) || 0,
    overdueAmount: invoices?.filter(i => i.status === "overdue").reduce((sum, i) => sum + i.amount_cents, 0) || 0,
    failedAmount: invoices?.filter(i => i.status === "failed").reduce((sum, i) => sum + i.amount_cents, 0) || 0,
    waivedAmount: invoices?.filter(i => i.waived).reduce((sum, i) => sum + i.amount_cents, 0) || 0,
    totalDiscountSavings: invoices?.reduce((sum, i) => {
      if (i.discount_percent && i.discount_percent > 0 && i.status === "paid") {
        const originalAmount = i.amount_cents / (1 - i.discount_percent / 100);
        return sum + (originalAmount - i.amount_cents);
      }
      return sum;
    }, 0) || 0,
    proDiscountCount: invoices?.filter(i => i.discount_reason?.includes("Pro")).length || 0,
    invoiceCount: invoices?.length || 0,
    paidCount: invoices?.filter(i => i.status === "paid").length || 0,
    pendingCount: invoices?.filter(i => i.status === "pending").length || 0,
    overdueCount: invoices?.filter(i => i.status === "overdue").length || 0,
    failedCount: invoices?.filter(i => i.status === "failed").length || 0,
    waivedCount: invoices?.filter(i => i.waived).length || 0,
    uniqueProviders: new Set(invoices?.map(i => i.facility_id)).size,
  };

  const monthlyGrowth = stats.lastMonthCollected > 0
    ? ((stats.thisMonthCollected - stats.lastMonthCollected) / stats.lastMonthCollected) * 100
    : stats.thisMonthCollected > 0 ? 100 : 0;

  // Prepare monthly revenue chart data
  const last6Months = eachMonthOfInterval({
    start: subMonths(now, 5),
    end: now,
  });

  const monthlyRevenueData = last6Months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    
    const collected = invoices?.filter(i => 
      i.status === "paid" && 
      i.paid_at && 
      new Date(i.paid_at) >= monthStart &&
      new Date(i.paid_at) <= monthEnd
    ).reduce((sum, i) => sum + i.amount_cents, 0) || 0;

    const discounts = invoices?.filter(i => 
      i.status === "paid" && 
      i.paid_at && 
      new Date(i.paid_at) >= monthStart &&
      new Date(i.paid_at) <= monthEnd &&
      i.discount_percent && i.discount_percent > 0
    ).reduce((sum, i) => {
      const original = i.amount_cents / (1 - (i.discount_percent || 0) / 100);
      return sum + (original - i.amount_cents);
    }, 0) || 0;

    return {
      month: format(month, "MMM"),
      revenue: collected / 100,
      discounts: discounts / 100,
    };
  });

  // Status distribution for pie chart
  const statusDistribution = [
    { name: "Paid", value: stats.paidCount, color: COLORS.emerald },
    { name: "Pending", value: stats.pendingCount, color: COLORS.amber },
    { name: "Overdue", value: stats.overdueCount, color: COLORS.red },
    { name: "Failed", value: stats.failedCount, color: COLORS.red },
    { name: "Waived", value: stats.waivedCount, color: COLORS.muted },
  ].filter(s => s.value > 0);

  // Fee type distribution
  const feeTypeData = [
    { 
      name: "Flat Fee", 
      count: invoices?.filter(i => !i.fee_type || i.fee_type === "flat_fee").length || 0,
      amount: invoices?.filter(i => !i.fee_type || i.fee_type === "flat_fee").reduce((sum, i) => sum + i.amount_cents, 0) || 0,
    },
    { 
      name: "Commission", 
      count: invoices?.filter(i => i.fee_type === "commission").length || 0,
      amount: invoices?.filter(i => i.fee_type === "commission").reduce((sum, i) => sum + i.amount_cents, 0) || 0,
    },
  ];

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  };

  if (invoicesLoading) {
    return (
      <div className="min-h-full bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-20 w-full" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Placement Revenue</h1>
          <p className="text-muted-foreground mt-1">
            Track placement fees, Pro discounts, and revenue trends
          </p>
        </div>

        {/* Top Stats */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/10">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-emerald-500/15 shrink-0">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Collected</p>
                  <p className="text-lg sm:text-xl font-bold text-emerald-900 dark:text-emerald-100 leading-tight">{formatCurrency(stats.totalCollected)}</p>
                  <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">{stats.paidCount} invoices</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-primary/10 shrink-0">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">This Month</p>
                  <p className="text-lg sm:text-xl font-bold leading-tight">{formatCurrency(stats.thisMonthCollected)}</p>
                  <div className="flex items-center gap-0.5">
                    {monthlyGrowth >= 0 ? (
                      <TrendingUp className="h-2.5 w-2.5 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-2.5 w-2.5 text-destructive" />
                    )}
                    <span className={`text-[10px] ${monthlyGrowth >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                      {monthlyGrowth >= 0 ? "+" : ""}{monthlyGrowth.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-warning/10 shrink-0">
                  <Clock className="h-4 w-4 text-warning" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending</p>
                  <p className="text-lg sm:text-xl font-bold leading-tight">{formatCurrency(stats.pendingAmount + stats.overdueAmount)}</p>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">{stats.pendingCount} pending</span>
                    {stats.overdueCount > 0 && (
                      <span className="text-[10px] text-destructive font-medium">{stats.overdueCount} overdue</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-violet-200/60 dark:border-violet-800/40 bg-violet-50/50 dark:bg-violet-950/10">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-violet-500/15 shrink-0">
                  <Percent className="h-4 w-4 text-violet-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs font-medium text-violet-700 dark:text-violet-300 uppercase tracking-wider">Pro Discount</p>
                  <p className="text-lg sm:text-xl font-bold text-violet-900 dark:text-violet-100 leading-tight">{formatCurrency(stats.totalDiscountSavings)}</p>
                  <p className="text-[10px] text-violet-600/70 dark:text-violet-400/70">{stats.proDiscountCount} discounted</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Failed Payments</p>
                  <p className="text-lg font-bold">{formatCurrency(stats.failedAmount)}</p>
                </div>
                <Badge variant="destructive" className="ml-auto">{stats.failedCount}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Waived Fees</p>
                  <p className="text-lg font-bold">{formatCurrency(stats.waivedAmount)}</p>
                </div>
                <Badge variant="secondary" className="ml-auto">{stats.waivedCount}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unique Providers</p>
                  <p className="text-lg font-bold">{stats.uniqueProviders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          {/* Monthly Revenue Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue Trend</CardTitle>
              <CardDescription>Revenue collected vs Pro discounts applied</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis 
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} 
                      className="text-xs"
                    />
                    <Tooltip 
                      formatter={(value: number) => [`$${value.toFixed(2)}`, ""]}
                      labelClassName="font-medium"
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill={COLORS.emerald} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="discounts" name="Pro Discounts" fill={COLORS.violet} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Status Distribution</CardTitle>
              <CardDescription>Breakdown of all placement invoices by status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center">
                {statusDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground">No invoices yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fee Type Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Fee Type Breakdown</CardTitle>
            <CardDescription>Comparison of flat fee vs commission-based placements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {feeTypeData.map((type) => (
                <div 
                  key={type.name}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{type.name}</span>
                    <Badge variant="secondary">{type.count} invoices</Badge>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(type.amount)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Avg: {type.count > 0 ? formatCurrency(type.amount / type.count) : "$0"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
