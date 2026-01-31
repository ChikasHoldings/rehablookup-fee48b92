import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, Cell } from "recharts";
import { Users, Clock, CheckCircle, TrendingUp, FileText, Send, MessageCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConciergeStatsChartsProps {
  stats: Record<string, number> | undefined;
  onStatusClick: (status: string) => void;
  activeStatus: string;
}

interface StatItemProps {
  label: string;
  value: number;
  icon: React.ElementType;
  status: string;
  activeStatus: string;
  onStatusClick: (status: string) => void;
  variant?: "default" | "success" | "warning" | "destructive" | "accent" | "primary" | "muted";
}

function StatItem({ label, value, icon: Icon, status, activeStatus, onStatusClick, variant = "default" }: StatItemProps) {
  const isActive = activeStatus === status;
  
  const variantStyles = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
    accent: "text-accent",
    primary: "text-primary",
    muted: "text-muted-foreground",
  };

  return (
    <button
      onClick={() => onStatusClick(status)}
      className={cn(
        "flex flex-col items-center justify-center p-2.5 rounded-lg transition-all text-center min-w-[70px]",
        isActive 
          ? "bg-accent/10 ring-1 ring-accent" 
          : "hover:bg-muted/50"
      )}
    >
      <Icon className={cn("h-3.5 w-3.5 mb-0.5", variantStyles[variant])} />
      <span className={cn("text-lg font-semibold tabular-nums", variantStyles[variant])}>
        {value}
      </span>
      <span className="text-[9px] text-muted-foreground uppercase tracking-wide font-medium leading-tight">
        {label}
      </span>
    </button>
  );
}

export function ConciergeStatsCharts({ stats, onStatusClick, activeStatus }: ConciergeStatsChartsProps) {
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
    if (!stats) return 0;
    const closedAndPlaced = (stats.placed || 0) + (stats.closed || 0);
    if (closedAndPlaced === 0) return 0;
    return Math.round((stats.placed || 0) / closedAndPlaced * 100);
  }, [stats]);

  const barData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "New", value: stats.new || 0, fill: "hsl(var(--primary))" },
      { name: "Reviewing", value: stats.reviewing || 0, fill: "hsl(var(--accent))" },
      { name: "Matching", value: stats.matching || 0, fill: "hsl(var(--warning))" },
      { name: "Matched", value: stats.matched || 0, fill: "hsl(var(--accent))" },
      { name: "Intros", value: stats.introductions_sent || 0, fill: "hsl(var(--primary))" },
      { name: "Contact", value: stats.in_contact || 0, fill: "hsl(var(--accent))" },
      { name: "Placed", value: stats.placed || 0, fill: "hsl(var(--success))" },
      { name: "Closed", value: stats.closed || 0, fill: "hsl(var(--muted-foreground))" },
    ];
  }, [stats]);

  const chartConfig: ChartConfig = {
    value: { label: "Cases" },
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col xl:flex-row xl:items-center gap-4">
          {/* Summary Stats */}
          <div className="flex items-center gap-1">
            <StatItem
              label="Total"
              value={totalCases}
              icon={Users}
              status="all"
              activeStatus={activeStatus}
              onStatusClick={onStatusClick}
              variant="default"
            />
            <StatItem
              label="Active"
              value={activeCases}
              icon={Clock}
              status="all"
              activeStatus={activeStatus}
              onStatusClick={() => {}}
              variant="warning"
            />
          </div>

          <div className="w-px h-10 bg-border hidden xl:block" />

          {/* Pipeline Stages */}
          <div className="flex items-center gap-1 flex-wrap">
            <StatItem
              label="New"
              value={stats?.new || 0}
              icon={FileText}
              status="new"
              activeStatus={activeStatus}
              onStatusClick={onStatusClick}
              variant="primary"
            />
            <StatItem
              label="Reviewing"
              value={stats?.reviewing || 0}
              icon={Clock}
              status="reviewing"
              activeStatus={activeStatus}
              onStatusClick={onStatusClick}
              variant="accent"
            />
            <StatItem
              label="Matching"
              value={stats?.matching || 0}
              icon={Users}
              status="matching"
              activeStatus={activeStatus}
              onStatusClick={onStatusClick}
              variant="warning"
            />
            <StatItem
              label="Matched"
              value={stats?.matched || 0}
              icon={CheckCircle}
              status="matched"
              activeStatus={activeStatus}
              onStatusClick={onStatusClick}
              variant="accent"
            />
            <StatItem
              label="Intros"
              value={stats?.introductions_sent || 0}
              icon={Send}
              status="introductions_sent"
              activeStatus={activeStatus}
              onStatusClick={onStatusClick}
              variant="primary"
            />
            <StatItem
              label="Contact"
              value={stats?.in_contact || 0}
              icon={MessageCircle}
              status="in_contact"
              activeStatus={activeStatus}
              onStatusClick={onStatusClick}
              variant="accent"
            />
            <StatItem
              label="Placed"
              value={stats?.placed || 0}
              icon={CheckCircle}
              status="placed"
              activeStatus={activeStatus}
              onStatusClick={onStatusClick}
              variant="success"
            />
            <StatItem
              label="Closed"
              value={stats?.closed || 0}
              icon={XCircle}
              status="closed"
              activeStatus={activeStatus}
              onStatusClick={onStatusClick}
              variant="muted"
            />
          </div>

          {/* Placement Rate & Mini Chart */}
          <div className="flex items-center gap-4 xl:ml-auto">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-muted-foreground">Placement Rate:</span>
              <span className="font-semibold text-success">{placementRate}%</span>
            </div>

            {/* Mini Bar Chart */}
            <div className="w-[180px] h-[50px] hidden 2xl:block">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" hide />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[0, 2, 2, 0]} barSize={5}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
