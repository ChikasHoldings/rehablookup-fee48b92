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
        .select("*")
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
        .select("*")
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
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Total Collected</p>
                  <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">
                    {formatCurrency(stats.totalCollected)}
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                    {stats.paidCount} invoices
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {formatCurrency(stats.thisMonthCollected)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {monthlyGrowth >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={`text-xs ${monthlyGrowth >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {monthlyGrowth >= 0 ? "+" : ""}{monthlyGrowth.toFixed(1)}% vs last month
                    </span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending + Overdue</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {formatCurrency(stats.pendingAmount + stats.overdueAmount)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {stats.pendingCount} pending
                    </Badge>
                    {stats.overdueCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {stats.overdueCount} overdue
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/20 dark:to-violet-900/10 border-violet-200 dark:border-violet-800">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-violet-700 dark:text-violet-300">Pro Discount Impact</p>
                  <p className="text-2xl font-bold text-violet-900 dark:text-violet-100 mt-1">
                    {formatCurrency(stats.totalDiscountSavings)}
                  </p>
                  <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
                    {stats.proDiscountCount} discounted invoices
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-violet-500/20 flex items-center justify-center">
                  <Percent className="h-6 w-6 text-violet-600" />
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
