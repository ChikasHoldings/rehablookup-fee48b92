import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis } from "recharts";
import { Building2, Crown, Shield, AlertTriangle, Handshake, CheckCircle } from "lucide-react";

interface ProviderStatsChartsProps {
  statusCounts: {
    all: number;
    approved: number;
    pending: number;
    suspended: number;
    pro: number;
    placement: number;
  } | undefined;
  onTabChange: (tab: string) => void;
  activeTab: string;
}

const STATUS_COLORS = {
  approved: "hsl(142 71% 45%)",
  pending: "hsl(48 96% 53%)",
  suspended: "hsl(0 84% 60%)",
  pro: "hsl(262 83% 58%)",
  placement: "hsl(199 89% 48%)",
};

export function ProviderStatsCharts({ statusCounts, onTabChange, activeTab }: ProviderStatsChartsProps) {
  const pieData = useMemo(() => {
    if (!statusCounts) return [];
    return [
      { name: "Approved", value: statusCounts.approved, status: "approved", fill: STATUS_COLORS.approved },
      { name: "Pending", value: statusCounts.pending, status: "pending", fill: STATUS_COLORS.pending },
      { name: "Suspended", value: statusCounts.suspended, status: "suspended", fill: STATUS_COLORS.suspended },
    ].filter(item => item.value > 0);
  }, [statusCounts]);

  const subscriptionData = useMemo(() => {
    if (!statusCounts) return [];
    const freeCount = Math.max(0, statusCounts.approved - statusCounts.pro);
    return [
      { name: "Pro", value: statusCounts.pro, fill: STATUS_COLORS.pro },
      { name: "Free", value: freeCount, fill: "hsl(var(--muted-foreground))" },
    ].filter(item => item.value > 0);
  }, [statusCounts]);

  const barData = useMemo(() => {
    if (!statusCounts) return [];
    return [
      { name: "Approved", value: statusCounts.approved, fill: STATUS_COLORS.approved },
      { name: "Pending", value: statusCounts.pending, fill: STATUS_COLORS.pending },
      { name: "Pro", value: statusCounts.pro, fill: STATUS_COLORS.pro },
      { name: "Placement", value: statusCounts.placement, fill: STATUS_COLORS.placement },
      { name: "Suspended", value: statusCounts.suspended, fill: STATUS_COLORS.suspended },
    ];
  }, [statusCounts]);

  const proPercentage = useMemo(() => {
    if (!statusCounts || statusCounts.approved === 0) return 0;
    return Math.round((statusCounts.pro / statusCounts.approved) * 100);
  }, [statusCounts]);

  const placementPercentage = useMemo(() => {
    if (!statusCounts || statusCounts.approved === 0) return 0;
    return Math.round((statusCounts.placement / statusCounts.approved) * 100);
  }, [statusCounts]);

  const chartConfig: ChartConfig = {
    value: { label: "Providers" },
    approved: { label: "Approved", color: STATUS_COLORS.approved },
    pending: { label: "Pending", color: STATUS_COLORS.pending },
    suspended: { label: "Suspended", color: STATUS_COLORS.suspended },
    pro: { label: "Pro", color: STATUS_COLORS.pro },
    placement: { label: "Placement", color: STATUS_COLORS.placement },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Summary Metrics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Provider Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <button
            onClick={() => onTabChange("all")}
            className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
              activeTab === "all" ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-muted"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium">Total Providers</span>
            </div>
            <span className="text-xl font-bold">{statusCounts?.all || 0}</span>
          </button>
          
          <button
            onClick={() => onTabChange("approved")}
            className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
              activeTab === "approved" ? "bg-green-500/10 ring-1 ring-green-500" : "hover:bg-muted"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-green-500/10">
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <span className="text-sm font-medium">Approved</span>
            </div>
            <span className="text-xl font-bold text-green-600">{statusCounts?.approved || 0}</span>
          </button>
          
          <button
            onClick={() => onTabChange("pending")}
            className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
              activeTab === "pending" ? "bg-amber-500/10 ring-1 ring-amber-500" : "hover:bg-muted"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-500/10">
                <Shield className="h-4 w-4 text-amber-500" />
              </div>
              <span className="text-sm font-medium">Pending Review</span>
            </div>
            <span className="text-xl font-bold text-amber-600">{statusCounts?.pending || 0}</span>
          </button>
          
          <button
            onClick={() => onTabChange("suspended")}
            className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
              activeTab === "suspended" ? "bg-red-500/10 ring-1 ring-red-500" : "hover:bg-muted"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-red-500/10">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              <span className="text-sm font-medium">Suspended</span>
            </div>
            <span className="text-xl font-bold text-red-600">{statusCounts?.suspended || 0}</span>
          </button>
        </CardContent>
      </Card>

      {/* Subscription Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Subscription Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[140px]">
            <PieChart>
              <Pie
                data={subscriptionData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                paddingAngle={2}
                dataKey="value"
              >
                {subscriptionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
          
          <div className="space-y-2 mt-2">
            <button
              onClick={() => onTabChange("pro")}
              className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                activeTab === "pro" ? "bg-purple-500/10 ring-1 ring-purple-500" : "hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-purple-500" />
                <span className="text-sm">Pro Members</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-purple-600">{statusCounts?.pro || 0}</span>
                <span className="text-xs text-muted-foreground">({proPercentage}%)</span>
              </div>
            </button>
            
            <button
              onClick={() => onTabChange("placement")}
              className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                activeTab === "placement" ? "bg-blue-500/10 ring-1 ring-blue-500" : "hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-2">
                <Handshake className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Placement Network</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-blue-600">{statusCounts?.placement || 0}</span>
                <span className="text-xs text-muted-foreground">({placementPercentage}%)</span>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Status Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Provider Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 10 }}>
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={70}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar 
                dataKey="value" 
                radius={[0, 4, 4, 0]}
              >
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
