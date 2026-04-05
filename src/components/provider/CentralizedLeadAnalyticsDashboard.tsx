import React from "react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { 
  TrendingUp, Users, Target, ArrowUpRight, ArrowDownRight, BarChart3,
  PieChart as PieChartIcon, Building2, MessageSquare, Unlock,
} from "lucide-react";
import { useCentralizedLeadAnalytics } from "@/hooks/useCentralizedLeadAnalytics";
import { useProStatus } from "@/hooks/useProStatus";
import { useProviderFacilities } from "@/hooks/useProviderFacilities";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { type DateRange } from "@/hooks/useLeadAnalytics";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CentralizedLeadAnalyticsDashboardProps {
  dateRange?: DateRange;
  facilityId?: string;
}

const STATUS_COLORS: Record<string, string> = {
  New: "hsl(217, 91%, 60%)",
  Contacted: "hsl(38, 92%, 50%)",
  Qualified: "hsl(280, 65%, 60%)",
  Converted: "hsl(142, 71%, 45%)",
  Lost: "hsl(0, 84%, 60%)",
};

const STATUS_BADGES: Record<string, string> = {
  New: "bg-blue-500/10 text-blue-600 border-blue-200",
  Contacted: "bg-amber-500/10 text-amber-600 border-amber-200",
  Qualified: "bg-purple-500/10 text-purple-600 border-purple-200",
  Converted: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  Lost: "bg-red-500/10 text-red-600 border-red-200",
};

const FUNNEL_STAGES = [
  { key: "new" as const, label: "New", color: "bg-blue-500", textColor: "text-blue-600", desc: "Awaiting unlock" },
  { key: "contacted" as const, label: "Contacted", color: "bg-amber-500", textColor: "text-amber-600", desc: "Unlocked & reached out" },
  { key: "qualified" as const, label: "Qualified", color: "bg-purple-500", textColor: "text-purple-600", desc: "Good fit confirmed" },
  { key: "converted" as const, label: "Converted", color: "bg-emerald-500", textColor: "text-emerald-600", desc: "Admitted" },
];

export function CentralizedLeadAnalyticsDashboard({ dateRange, facilityId }: CentralizedLeadAnalyticsDashboardProps) {
  const { data: analytics, isLoading } = useCentralizedLeadAnalytics(dateRange, facilityId);
  const { data: proStatus } = useProStatus();
  const { facilities } = useProviderFacilities();

  const isPro = proStatus?.isPro || false;
  const hasApprovedListing = facilities.some(f => f.status === "approved");

  if (isLoading || !analytics) return <AnalyticsSkeleton />;

  if (analytics.totalLeads === 0) {
    return (
      <div className="py-14 flex flex-col items-center text-center">
        <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
          <Users className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-1">No Inquiry Data Yet</h3>
        <p className="text-xs text-muted-foreground max-w-sm mb-4">
          {hasApprovedListing
            ? "Once families submit inquiries for your listings, analytics will appear here."
            : "Complete and submit your listing to start receiving inquiries."}
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link to={hasApprovedListing ? "/provider/inquiries" : "/provider/listings"}>
            {hasApprovedListing ? "View Inquiries" : "Complete Your Listing"}
          </Link>
        </Button>
      </div>
    );
  }

  const conversionRate = analytics.totalLeads > 0 
    ? Math.round((analytics.conversionFunnel.converted / analytics.totalLeads) * 100) : 0;
  const hasMultipleFacilities = !facilityId && analytics.facilityBreakdown.length > 1;
  const unlockedInquiries = analytics.conversionFunnel.contacted + analytics.conversionFunnel.qualified + analytics.conversionFunnel.converted;

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KPICard title="Total Inquiries" value={analytics.totalLeads} icon={MessageSquare} trend={analytics.growthRate} color="blue" />
        <KPICard title="This Period" value={analytics.thisMonthLeads} icon={TrendingUp} trend={analytics.growthRate} subtitle={`vs ${analytics.lastMonthLeads} prior`} color="primary" />
        <KPICard title="Unlocked" value={unlockedInquiries} icon={Unlock} subtitle={`of ${analytics.totalLeads} total`} color="purple" />
        <KPICard title="Conversion" value={`${conversionRate}%`} icon={Target} subtitle={`${analytics.conversionFunnel.converted} admitted`} color="emerald" />
      </div>

      {/* Conversion Funnel */}
      <div className="rounded-lg border overflow-hidden">
        <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center gap-2">
          <Target className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Conversion Funnel</span>
        </div>
        <div className="grid grid-cols-4 divide-x">
          {FUNNEL_STAGES.map((stage) => {
            const value = analytics.conversionFunnel[stage.key];
            const maxValue = Math.max(...Object.values(analytics.conversionFunnel), 1);
            const pct = Math.round((value / maxValue) * 100);
            return (
              <div key={stage.key} className="px-2 py-2 text-center">
                <p className={cn("text-base font-bold", stage.textColor)}>{value}</p>
                <p className="text-xs font-medium text-foreground">{stage.label}</p>
                <p className="text-[9px] text-muted-foreground mb-1.5">{stage.desc}</p>
                <div className="h-1 bg-muted rounded-full overflow-hidden mx-auto max-w-[80%]">
                  <div className={cn("h-full rounded-full transition-all duration-700", stage.color)} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Monthly Trend */}
        <div className="lg:col-span-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">Inquiry Trends</span>
            </div>
            {analytics.growthRate !== 0 && (
              <Badge variant="outline" className={cn("text-xs px-1.5 py-0",
                analytics.growthRate > 0 ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" : "bg-red-500/10 text-red-600 border-red-200"
              )}>
                {analytics.growthRate > 0 ? <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" /> : <ArrowDownRight className="h-2.5 w-2.5 mr-0.5" />}
                {Math.abs(analytics.growthRate)}%
              </Badge>
            )}
          </div>
          <div className="rounded-lg border bg-muted/10 p-3">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.monthlyTrends} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="leadGradCentral" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={30} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", boxShadow: "0 4px 12px -2px rgba(0,0,0,0.1)", padding: "8px 12px", fontSize: "12px" }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: 2, fontSize: "11px" }}
                    formatter={(value: number) => [`${value}`, "Inquiries"]}
                  />
                  <Area type="monotone" dataKey="leads" name="Inquiries" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#leadGradCentral)" dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 2.5 }} activeDot={{ r: 4, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Status Pie */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center gap-1.5">
            <PieChartIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">Status Breakdown</span>
          </div>
          <div className="rounded-lg border bg-muted/10 p-3">
            {analytics.statusBreakdown.length > 0 ? (
              <>
                <div className="h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={analytics.statusBreakdown} cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={3} dataKey="count" nameKey="status">
                        {analytics.statusBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || "hsl(var(--muted))"} stroke="hsl(var(--background))" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", boxShadow: "0 4px 12px -2px rgba(0,0,0,0.1)", fontSize: "12px" }}
                        formatter={(value: number, name: string) => [`${value} (${analytics.statusBreakdown.find(s => s.status === name)?.percentage || 0}%)`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-1 mt-2 justify-center">
                  {analytics.statusBreakdown.map((entry) => (
                    <Badge key={entry.status} variant="outline" className={cn("text-xs px-1.5 py-0", STATUS_BADGES[entry.status] || "")}>
                      {entry.status}: {entry.count}
                    </Badge>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[160px] flex flex-col items-center justify-center text-muted-foreground">
                <PieChartIcon className="h-8 w-8 mb-1.5 opacity-20" />
                <p className="text-xs">No data yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Per-Facility Breakdown */}
      {hasMultipleFacilities && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">By Location</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {analytics.facilityBreakdown.map((facility) => (
              <div key={facility.facilityId} className="p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-xs text-foreground truncate">{facility.facilityName}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">{facility.totalLeads} total</Badge>
                      <Badge variant="outline" className="text-xs px-1.5 py-0 bg-emerald-500/10 text-emerald-600 border-emerald-200">{facility.convertedLeads} converted</Badge>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-foreground">{facility.thisMonthLeads}</p>
                    <p className="text-xs text-muted-foreground">this period</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="rounded-lg border bg-primary/5 border-primary/15 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground text-xs">Ready to convert more inquiries?</p>
            <p className="text-xs text-muted-foreground mt-0.5">View and unlock pending inquiries to start conversations.</p>
          </div>
          <Button asChild size="sm" className="shrink-0 h-8 text-xs">
            <Link to="/provider/inquiries">View Inquiries</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════ Sub-Components ══════════════════════════ */

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-600" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-600" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-600" },
  primary: { bg: "bg-primary/10", text: "text-primary" },
};

function KPICard({ title, value, icon: Icon, trend, subtitle, color }: {
  title: string; value: number | string; icon: React.ComponentType<{ className?: string }>;
  trend?: number; subtitle?: string; color: string;
}) {
  const c = COLOR_MAP[color] || COLOR_MAP.blue;
  return (
    <div className="rounded-md border px-2.5 py-2 bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-1.5 mb-1">
        <div className={cn("h-5 w-5 rounded flex items-center justify-center shrink-0", c.bg)}>
          <Icon className={cn("h-3 w-3", c.text)} />
        </div>
        <p className="text-xs text-muted-foreground font-medium truncate">{title}</p>
        {trend !== undefined && trend !== 0 && (
          <span className={cn(
            "ml-auto text-[9px] font-semibold flex items-center shrink-0",
            trend > 0 ? "text-emerald-600" : "text-red-500"
          )}>
            {trend > 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-base font-bold text-foreground leading-none">{typeof value === "number" ? value.toLocaleString() : value}</p>
      {subtitle && <p className="text-[9px] text-muted-foreground/70 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-md" />)}
      </div>
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-56 rounded-lg" />
    </div>
  );
}
