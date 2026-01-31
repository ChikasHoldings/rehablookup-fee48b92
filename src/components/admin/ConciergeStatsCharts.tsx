import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Users, Clock, CheckCircle, TrendingUp } from "lucide-react";

interface ConciergeStatsChartsProps {
  stats: Record<string, number> | undefined;
  onStatusClick: (status: string) => void;
  activeStatus: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: "hsl(var(--chart-1))",
  reviewing: "hsl(var(--chart-2))",
  matching: "hsl(var(--chart-3))",
  matched: "hsl(var(--chart-4))",
  introductions_sent: "hsl(var(--chart-5))",
  in_contact: "hsl(142 76% 36%)",
  placed: "hsl(142 71% 45%)",
  closed: "hsl(var(--muted-foreground))",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  reviewing: "Reviewing",
  matching: "Matching",
  matched: "Matched",
  introductions_sent: "Intros Sent",
  in_contact: "In Contact",
  placed: "Placed",
  closed: "Closed",
};

export function ConciergeStatsCharts({ stats, onStatusClick, activeStatus }: ConciergeStatsChartsProps) {
  const chartData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats)
      .filter(([_, value]) => value > 0)
      .map(([status, value]) => ({
        name: STATUS_LABELS[status] || status,
        value,
        status,
        fill: STATUS_COLORS[status] || "hsl(var(--muted))",
      }));
  }, [stats]);

  const barData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "New", value: stats.new || 0, fill: STATUS_COLORS.new },
      { name: "Reviewing", value: stats.reviewing || 0, fill: STATUS_COLORS.reviewing },
      { name: "Matching", value: stats.matching || 0, fill: STATUS_COLORS.matching },
      { name: "Matched", value: stats.matched || 0, fill: STATUS_COLORS.matched },
      { name: "Intros Sent", value: stats.introductions_sent || 0, fill: STATUS_COLORS.introductions_sent },
      { name: "In Contact", value: stats.in_contact || 0, fill: STATUS_COLORS.in_contact },
      { name: "Placed", value: stats.placed || 0, fill: STATUS_COLORS.placed },
      { name: "Closed", value: stats.closed || 0, fill: STATUS_COLORS.closed },
    ];
  }, [stats]);

  const totalCases = useMemo(() => {
    if (!stats) return 0;
    return Object.values(stats).reduce((sum, val) => sum + val, 0);
  }, [stats]);

  const activeCases = useMemo(() => {
    if (!stats) return 0;
    return (stats.new || 0) + (stats.reviewing || 0) + (stats.matching || 0) + 
           (stats.matched || 0) + (stats.introductions_sent || 0) + (stats.in_contact || 0);
  }, [stats]);

  const placementRate = useMemo(() => {
    if (!stats || totalCases === 0) return 0;
    const closedAndPlaced = (stats.placed || 0) + (stats.closed || 0);
    if (closedAndPlaced === 0) return 0;
    return Math.round((stats.placed || 0) / closedAndPlaced * 100);
  }, [stats, totalCases]);

  const chartConfig: ChartConfig = {
    value: { label: "Cases" },
    new: { label: "New", color: STATUS_COLORS.new },
    reviewing: { label: "Reviewing", color: STATUS_COLORS.reviewing },
    matching: { label: "Matching", color: STATUS_COLORS.matching },
    matched: { label: "Matched", color: STATUS_COLORS.matched },
    introductions_sent: { label: "Intros Sent", color: STATUS_COLORS.introductions_sent },
    in_contact: { label: "In Contact", color: STATUS_COLORS.in_contact },
    placed: { label: "Placed", color: STATUS_COLORS.placed },
    closed: { label: "Closed", color: STATUS_COLORS.closed },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Summary Metrics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm">Total Cases</span>
            </div>
            <span className="text-2xl font-bold">{totalCases}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <span className="text-sm">Active Cases</span>
            </div>
            <span className="text-2xl font-bold">{activeCases}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <span className="text-sm">Placed</span>
            </div>
            <span className="text-2xl font-bold">{stats?.placed || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </div>
              <span className="text-sm">Placement Rate</span>
            </div>
            <span className="text-2xl font-bold">{placementRate}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Status Distribution Pie */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[180px]">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                onClick={(data) => onStatusClick(data.status)}
                className="cursor-pointer"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.fill}
                    stroke={activeStatus === entry.status ? "hsl(var(--primary))" : "transparent"}
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {chartData.slice(0, 4).map((item) => (
              <button
                key={item.status}
                onClick={() => onStatusClick(item.status)}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${
                  activeStatus === item.status 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: item.fill }}
                />
                {item.name}: {item.value}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Pipeline Stages</CardTitle>
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
                className="cursor-pointer"
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
