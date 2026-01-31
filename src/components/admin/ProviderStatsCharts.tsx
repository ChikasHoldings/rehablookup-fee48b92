import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer } from "recharts";
import { Building2, Crown, Shield, AlertTriangle, Handshake, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface StatItemProps {
  label: string;
  value: number;
  icon: React.ElementType;
  tab: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  variant?: "default" | "success" | "warning" | "destructive" | "accent" | "primary";
}

function StatItem({ label, value, icon: Icon, tab, activeTab, onTabChange, variant = "default" }: StatItemProps) {
  const isActive = activeTab === tab;
  
  const variantStyles = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
    accent: "text-accent",
    primary: "text-primary",
  };

  return (
    <button
      onClick={() => onTabChange(tab)}
      className={cn(
        "flex flex-col items-center justify-center p-3 rounded-lg transition-all text-center min-w-[80px]",
        isActive 
          ? "bg-accent/10 ring-1 ring-accent" 
          : "hover:bg-muted/50"
      )}
    >
      <Icon className={cn("h-4 w-4 mb-1", variantStyles[variant])} />
      <span className={cn("text-xl font-semibold tabular-nums", variantStyles[variant])}>
        {value}
      </span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
        {label}
      </span>
    </button>
  );
}

export function ProviderStatsCharts({ statusCounts, onTabChange, activeTab }: ProviderStatsChartsProps) {
  const barData = useMemo(() => {
    if (!statusCounts) return [];
    return [
      { name: "Approved", value: statusCounts.approved, fill: "hsl(var(--success))" },
      { name: "Pro", value: statusCounts.pro, fill: "hsl(var(--accent))" },
      { name: "Placement", value: statusCounts.placement, fill: "hsl(var(--primary))" },
      { name: "Pending", value: statusCounts.pending, fill: "hsl(var(--warning))" },
      { name: "Suspended", value: statusCounts.suspended, fill: "hsl(var(--destructive))" },
    ];
  }, [statusCounts]);

  const chartConfig: ChartConfig = {
    value: { label: "Providers" },
  };

  const proPercentage = useMemo(() => {
    if (!statusCounts || statusCounts.approved === 0) return 0;
    return Math.round((statusCounts.pro / statusCounts.approved) * 100);
  }, [statusCounts]);

  const placementPercentage = useMemo(() => {
    if (!statusCounts || statusCounts.approved === 0) return 0;
    return Math.round((statusCounts.placement / statusCounts.approved) * 100);
  }, [statusCounts]);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Stats Row */}
          <div className="flex items-center gap-1 flex-wrap">
            <StatItem
              label="Total"
              value={statusCounts?.all || 0}
              icon={Building2}
              tab="all"
              activeTab={activeTab}
              onTabChange={onTabChange}
              variant="default"
            />
            <div className="w-px h-10 bg-border mx-1 hidden sm:block" />
            <StatItem
              label="Approved"
              value={statusCounts?.approved || 0}
              icon={CheckCircle}
              tab="approved"
              activeTab={activeTab}
              onTabChange={onTabChange}
              variant="success"
            />
            <StatItem
              label="Pending"
              value={statusCounts?.pending || 0}
              icon={Shield}
              tab="pending"
              activeTab={activeTab}
              onTabChange={onTabChange}
              variant="warning"
            />
            <StatItem
              label="Suspended"
              value={statusCounts?.suspended || 0}
              icon={AlertTriangle}
              tab="suspended"
              activeTab={activeTab}
              onTabChange={onTabChange}
              variant="destructive"
            />
            <div className="w-px h-10 bg-border mx-1 hidden sm:block" />
            <StatItem
              label="Pro"
              value={statusCounts?.pro || 0}
              icon={Crown}
              tab="pro"
              activeTab={activeTab}
              onTabChange={onTabChange}
              variant="accent"
            />
            <StatItem
              label="Placement"
              value={statusCounts?.placement || 0}
              icon={Handshake}
              tab="placement"
              activeTab={activeTab}
              onTabChange={onTabChange}
              variant="primary"
            />
          </div>

          {/* Subscription Metrics */}
          <div className="flex items-center gap-4 ml-auto text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5 text-accent" />
              <span>{proPercentage}% Pro</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Handshake className="h-3.5 w-3.5 text-primary" />
              <span>{placementPercentage}% Placement</span>
            </div>
          </div>

          {/* Mini Bar Chart */}
          <div className="lg:w-[200px] h-[60px] hidden xl:block">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={[0, 2, 2, 0]} barSize={8}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
