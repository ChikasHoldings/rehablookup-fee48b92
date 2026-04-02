import React from "react";
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { 
  TrendingUp, 
  Users, 
  Target,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart as PieChartIcon,
  Star,
  Building2,
  MessageSquare,
  Phone as PhoneIcon,
  Unlock,
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
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

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

export function CentralizedLeadAnalyticsDashboard({ dateRange }: CentralizedLeadAnalyticsDashboardProps) {
  const { data: analytics, isLoading } = useCentralizedLeadAnalytics(dateRange);
  const { data: proStatus } = useProStatus();
  const { facilities } = useProviderFacilities();

  const isPro = proStatus?.isPro || false;
  const hasApprovedListing = facilities.some(f => f.status === "approved");

  if (isLoading || !analytics) return <AnalyticsSkeleton />;

  const conversionRate = analytics.totalLeads > 0 
    ? Math.round((analytics.conversionFunnel.converted / analytics.totalLeads) * 100)
    : 0;
  const hasMultipleFacilities = analytics.facilityBreakdown.length > 1;
  const unlockedInquiries = analytics.conversionFunnel.contacted + analytics.conversionFunnel.qualified + analytics.conversionFunnel.converted;

  return (
    <div className="space-y-6">
      {/* ── Account Overview ── */}
      <div className={cn(
        "rounded-xl p-5 border",
        isPro ? "bg-amber-500/5 border-amber-200/50" : "bg-primary/5 border-primary/15"
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", isPro ? "bg-amber-500/10" : "bg-primary/10")}>
              {isPro ? <Star className="h-5 w-5 text-amber-600" /> : <Users className="h-5 w-5 text-primary" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground text-sm">{isPro ? "Pro Member" : "Free Account"}</span>
                {isPro && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px]">
                    <Star className="h-3 w-3 mr-1" /> 20% off unlocks
                  </Badge>
                )}
                {hasMultipleFacilities && (
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    <Building2 className="h-3 w-3" /> {analytics.facilityBreakdown.length} Locations
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-2xl font-bold text-foreground">{analytics.totalLeads.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{analytics.thisMonthLeads} this month</p>
          </div>
        </div>
      </div>

      {/* ── KPI Stats ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KPICard title="Total Inquiries" value={analytics.totalLeads} icon={MessageSquare} trend={analytics.growthRate} subtitle={hasMultipleFacilities ? "Across all locations" : "All time"} color="blue" />
        <KPICard title="This Month" value={analytics.thisMonthLeads} icon={TrendingUp} trend={analytics.growthRate} subtitle={`vs ${analytics.lastMonthLeads} last month`} color="emerald" />
        <KPICard title="Unlocked" value={unlockedInquiries} icon={Unlock} subtitle="Inquiries you've unlocked" color="purple" />
        <KPICard title="Conversion Rate" value={`${conversionRate}%`} icon={Target} subtitle={`${analytics.conversionFunnel.converted} converted`} color="amber" />
      </div>

      {/* ── Per-Facility Breakdown ── */}
      {hasMultipleFacilities && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Inquiries by Location</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {analytics.facilityBreakdown.map((facility) => (
              <div key={facility.facilityId} className="p-4 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-foreground truncate">{facility.facilityName}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="secondary" className="text-[10px]">{facility.totalLeads} total</Badge>
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200">{facility.convertedLeads} converted</Badge>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-foreground">{facility.thisMonthLeads}</p>
                    <p className="text-[10px] text-muted-foreground">this month</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Inquiry Types ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <InquiryTypeCard icon={MessageSquare} iconBg="bg-blue-500/10" iconColor="text-blue-600" title="Information Requests" value={Math.round(analytics.totalLeads * 0.6)} pct="~60%" desc="Families wanting more info" />
        <InquiryTypeCard icon={PhoneIcon} iconBg="bg-emerald-500/10" iconColor="text-emerald-600" title="Callback Requests" value={Math.round(analytics.totalLeads * 0.4)} pct="~40%" desc="Families wanting a call back" />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Monthly Trend */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Inquiry Trends</h3>
            </div>
            {analytics.growthRate !== 0 && (
              <Badge variant="outline" className={cn("text-[10px]",
                analytics.growthRate > 0 ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" : "bg-red-500/10 text-red-600 border-red-200"
              )}>
                {analytics.growthRate > 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                {Math.abs(analytics.growthRate)}% vs last month
              </Badge>
            )}
          </div>
          <div className="rounded-xl border bg-muted/10 p-4">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.monthlyTrends} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="leadGradCentral" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={35} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "10px", boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12)", padding: "10px 14px" }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: 4 }}
                    formatter={(value: number) => [`${value} inquiries`, "Inquiries"]}
                  />
                  <Area type="monotone" dataKey="leads" name="Inquiries" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#leadGradCentral)" dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3.5 }} activeDot={{ r: 5.5, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Status Pie */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Inquiry Status</h3>
          </div>
          <div className="rounded-xl border bg-muted/10 p-4">
            {analytics.statusBreakdown.length > 0 ? (
              <>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={analytics.statusBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="count" nameKey="status">
                        {analytics.statusBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || COLORS[index % COLORS.length]} stroke="hsl(var(--background))" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "10px", boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12)" }}
                        formatter={(value: number, name: string) => [`${value} (${analytics.statusBreakdown.find(s => s.status === name)?.percentage || 0}%)`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
                  {analytics.statusBreakdown.map((entry) => (
                    <Badge key={entry.status} variant="outline" className={cn("text-[10px] px-2 py-0.5", STATUS_BADGES[entry.status] || "")}>
                      {entry.status}: {entry.count}
                    </Badge>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[180px] flex flex-col items-center justify-center text-muted-foreground">
                <PieChartIcon className="h-10 w-10 mb-2 opacity-20" />
                <p className="text-sm">No data yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Conversion Funnel ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Conversion Funnel</h3>
        </div>
        <div className="rounded-xl border overflow-hidden">
          <div className="grid grid-cols-4 divide-x">
            {FUNNEL_STAGES.map((stage) => {
              const value = analytics.conversionFunnel[stage.key];
              const maxValue = Math.max(...Object.values(analytics.conversionFunnel), 1);
              const pct = Math.round((value / maxValue) * 100);
              return (
                <div key={stage.key} className="p-4 text-center">
                  <p className={cn("text-2xl font-bold", stage.textColor)}>{value}</p>
                  <p className="text-xs font-medium text-foreground mt-0.5">{stage.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 mb-2.5">{stage.desc}</p>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden mx-auto max-w-[80%]">
                    <div className={cn("h-full rounded-full transition-all duration-700", stage.color)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="rounded-xl border bg-primary/5 border-primary/15 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-semibold text-foreground text-sm">Ready to convert more inquiries?</h3>
            <p className="text-xs text-muted-foreground mt-0.5">View and unlock pending inquiries to start conversations.</p>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link to="/provider/inquiries">View Inquiries</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════ Sub-Components ══════════════════════════════════ */

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-600" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-600" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-600" },
};

function KPICard({ title, value, icon: Icon, trend, subtitle, color }: {
  title: string; value: number | string; icon: React.ComponentType<{ className?: string }>;
  trend?: number; subtitle?: string; color: string;
}) {
  const c = COLOR_MAP[color] || COLOR_MAP.blue;
  return (
    <div className="rounded-xl border p-4 bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", c.bg)}>
          <Icon className={cn("h-4.5 w-4.5", c.text)} />
        </div>
        {trend !== undefined && trend !== 0 && (
          <Badge variant="outline" className={cn(
            "text-[10px] px-1.5 py-0.5",
            trend > 0 ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" : "bg-red-500/10 text-red-600 border-red-200"
          )}>
            {trend > 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
            {Math.abs(trend)}%
          </Badge>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">{typeof value === "number" ? value.toLocaleString() : value}</p>
      <p className="text-xs text-muted-foreground mt-0.5 font-medium">{title}</p>
      {subtitle && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function InquiryTypeCard({ icon: Icon, iconBg, iconColor, title, value, pct, desc }: {
  icon: React.ComponentType<{ className?: string }>; iconBg: string; iconColor: string;
  title: string; value: number; pct: string; desc: string;
}) {
  return (
    <div className="rounded-xl border p-4 bg-card">
      <div className="flex items-center gap-2.5 mb-3">
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", iconBg)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-[10px] text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
        <Badge variant="secondary" className="text-[10px]">{pct}</Badge>
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-20 rounded-xl" />
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-72 lg:col-span-3 rounded-xl" />
        <Skeleton className="h-72 lg:col-span-2 rounded-xl" />
      </div>
      <Skeleton className="h-28 rounded-xl" />
    </div>
  );
}
