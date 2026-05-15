import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, Cell } from "recharts";
import { Building2, Crown, Shield, AlertTriangle, Handshake, CheckCircle, Database, Lock, Unlock, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface ProviderStatsChartsProps {
  statusCounts: {
    all: number;
    approved: number;
    pending: number;
    suspended: number;
    pro: number;
    placement: number;
    /** Bulk-imported SAMHSA facilities (data_source = "samhsa_import"). */
    samhsa?: number;
    /** Facilities with no owning provider account (user_id IS NULL). */
    unclaimed?: number;
    /** Facilities owned by a provider account (user_id IS NOT NULL). */
    claimed?: number;
    /** Open facility_claim_requests awaiting admin review. */
    pendingClaims?: number;
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
  
  const variantStyles: Record<string, string> = {
    default: "text-muted-foreground",
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
        "flex flex-col items-center justify-center px-3 py-2.5 rounded-lg transition-all min-w-[72px]",
        isActive 
          ? "bg-accent/10 ring-1 ring-accent" 
          : "hover:bg-muted/50"
      )}
    >
      <Icon className={cn("h-3.5 w-3.5 mb-1", variantStyles[variant])} />
      <span className="text-lg font-semibold tabular-nums leading-none">{value}</span>
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">{label}</span>
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
      <CardContent className="p-0">
        <div className="flex items-stretch flex-wrap">
          {/* ── Action Required ──────────────────────────────────────────────
              Provider-submission and claim-review queues. These two counters
              should ALWAYS lead the stats panel so admins see what needs
              their attention before anything else. When both are zero the
              admin queues are empty. */}
          <div className="flex flex-col p-3">
            <span className="text-[9px] uppercase tracking-wider text-rose-700/80 font-semibold mb-1 px-1">
              Action Required
            </span>
            <div className="flex items-center gap-0.5">
              <StatItem
                label="Approval Queue"
                value={statusCounts?.pending || 0}
                icon={Shield}
                tab="pending"
                activeTab={activeTab}
                onTabChange={onTabChange}
                variant="warning"
              />
              <StatItem
                label="Claim Queue"
                value={statusCounts?.pendingClaims || 0}
                icon={Bell}
                tab="pending_claims"
                activeTab={activeTab}
                onTabChange={onTabChange}
                variant="destructive"
              />
            </div>
          </div>

          <Separator orientation="vertical" className="h-auto" />

          {/* ── Directory State ─────────────────────────────────────────── */}
          <div className="flex flex-col p-3">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 px-1">
              Directory
            </span>
            <div className="flex items-center gap-0.5">
              <StatItem
                label="Total"
                value={statusCounts?.all || 0}
                icon={Building2}
                tab="all"
                activeTab={activeTab}
                onTabChange={onTabChange}
                variant="default"
              />
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
                label="Suspended"
                value={statusCounts?.suspended || 0}
                icon={AlertTriangle}
                tab="suspended"
                activeTab={activeTab}
                onTabChange={onTabChange}
                variant="destructive"
              />
            </div>
          </div>

          <Separator orientation="vertical" className="h-auto" />

          {/* ── Source ───────────────────────────────────────────────────
              Provenance + ownership state. Distinguishes the bulk SAMHSA
              import from provider-owned listings. */}
          <div className="flex flex-col p-3">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 px-1">
              Source
            </span>
            <div className="flex items-center gap-0.5">
              <StatItem
                label="SAMHSA"
                value={statusCounts?.samhsa || 0}
                icon={Database}
                tab="samhsa"
                activeTab={activeTab}
                onTabChange={onTabChange}
                variant="default"
              />
              <StatItem
                label="Unclaimed"
                value={statusCounts?.unclaimed || 0}
                icon={Unlock}
                tab="unclaimed"
                activeTab={activeTab}
                onTabChange={onTabChange}
                variant="warning"
              />
              <StatItem
                label="Claimed"
                value={statusCounts?.claimed || 0}
                icon={Lock}
                tab="claimed"
                activeTab={activeTab}
                onTabChange={onTabChange}
                variant="success"
              />
            </div>
          </div>

          <Separator orientation="vertical" className="h-auto" />

          {/* ── Membership ─────────────────────────────────────────────── */}
          <div className="flex flex-col p-3">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 px-1">
              Membership
            </span>
            <div className="flex items-center gap-0.5">
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
          </div>

          {/* Subscription Percentages - Hidden on small screens */}
          <div className="hidden lg:flex items-center gap-4 px-4 ml-auto border-l">
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5 text-accent" />
                <span className="text-sm font-medium tabular-nums">{proPercentage}%</span>
              </div>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Pro Rate</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1.5">
                <Handshake className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-medium tabular-nums">{placementPercentage}%</span>
              </div>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Placement Rate</span>
            </div>
          </div>

          {/* Mini Bar Chart - Hidden on smaller screens */}
          <div className="hidden xl:flex items-center px-4 border-l">
            <div className="w-[180px] h-[56px]">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 0, top: 4, bottom: 4 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" hide />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={8}>
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
