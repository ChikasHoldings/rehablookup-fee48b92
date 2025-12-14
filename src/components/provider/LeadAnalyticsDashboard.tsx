import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  TrendingUp, 
  Users, 
  Clock, 
  CheckCircle,
  Phone,
  Mail,
  MessageSquare,
  BarChart3,
  PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Target,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { useLeadAnalytics } from "@/hooks/useLeadAnalytics";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { type DateRange } from "@/hooks/useLeadAnalytics";

interface LeadAnalyticsDashboardProps {
  facilityId: string | undefined;
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

const STATUS_BG_COLORS: Record<string, string> = {
  New: "bg-blue-500/10 text-blue-600 border-blue-200",
  Contacted: "bg-amber-500/10 text-amber-600 border-amber-200",
  Qualified: "bg-purple-500/10 text-purple-600 border-purple-200",
  Converted: "bg-green-500/10 text-green-600 border-green-200",
  Lost: "bg-red-500/10 text-red-600 border-red-200",
};

export function LeadAnalyticsDashboard({ facilityId, dateRange }: LeadAnalyticsDashboardProps) {
  const { data: analytics, isLoading } = useLeadAnalytics(facilityId, dateRange);

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  if (!analytics || analytics.totalLeads === 0) {
    return <EmptyAnalytics />;
  }

  const conversionRate = analytics.totalLeads > 0 
    ? Math.round((analytics.conversionFunnel.converted / analytics.totalLeads) * 100)
    : 0;

  const responseRate = analytics.totalLeads > 0
    ? Math.round(((analytics.responseMetrics.respondedWithin24h + analytics.responseMetrics.respondedWithin48h) / analytics.totalLeads) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Leads"
          value={analytics.totalLeads}
          icon={Users}
          trend={analytics.growthRate}
          subtitle="All time"
          iconBg="bg-blue-500/10"
          iconColor="text-blue-600"
        />
        <StatCard
          title="This Month"
          value={analytics.thisMonthLeads}
          icon={TrendingUp}
          trend={analytics.growthRate}
          subtitle={`vs ${analytics.lastMonthLeads} last month`}
          iconBg="bg-green-500/10"
          iconColor="text-green-600"
        />
        <StatCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          icon={Target}
          subtitle={`${analytics.conversionFunnel.converted} converted`}
          iconBg="bg-purple-500/10"
          iconColor="text-purple-600"
        />
        <StatCard
          title="Response Rate"
          value={`${responseRate}%`}
          icon={Zap}
          subtitle={`Avg ${analytics.responseMetrics.avgResponseTime}h response`}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-600"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Monthly Trend - Larger */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Lead Trends</CardTitle>
                  <CardDescription className="text-xs">Monthly lead volume over time</CardDescription>
                </div>
              </div>
              {analytics.growthRate !== 0 && (
                <Badge 
                  variant="outline" 
                  className={analytics.growthRate > 0 
                    ? "bg-green-500/10 text-green-600 border-green-200" 
                    : "bg-red-500/10 text-red-600 border-red-200"
                  }
                >
                  {analytics.growthRate > 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                  {Math.abs(analytics.growthRate)}% vs last month
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.monthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    width={30}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                    formatter={(value: number) => [`${value} leads`, "Leads"]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="leads" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2.5}
                    fill="url(#leadGradient)"
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Breakdown - Smaller */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <PieChartIcon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Lead Status</CardTitle>
                <CardDescription className="text-xs">Current distribution</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="status"
                  >
                    {analytics.statusBreakdown.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={STATUS_COLORS[entry.status] || COLORS[index % COLORS.length]}
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                    formatter={(value: number, name: string) => [`${value} leads (${analytics.statusBreakdown.find(s => s.status === name)?.percentage || 0}%)`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {analytics.statusBreakdown.map((entry) => (
                <Badge 
                  key={entry.status} 
                  variant="outline" 
                  className={`text-[10px] px-2 py-0.5 ${STATUS_BG_COLORS[entry.status] || ""}`}
                >
                  {entry.status}: {entry.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Target className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-base">Conversion Funnel</CardTitle>
                <CardDescription className="text-xs">Lead progression stages</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: "New", value: analytics.conversionFunnel.new, color: "bg-blue-500", textColor: "text-blue-600" },
                { label: "Contacted", value: analytics.conversionFunnel.contacted, color: "bg-amber-500", textColor: "text-amber-600" },
                { label: "Qualified", value: analytics.conversionFunnel.qualified, color: "bg-purple-500", textColor: "text-purple-600" },
                { label: "Converted", value: analytics.conversionFunnel.converted, color: "bg-green-500", textColor: "text-green-600" },
              ].map((stage) => {
                const maxValue = Math.max(
                  analytics.conversionFunnel.new,
                  analytics.conversionFunnel.contacted,
                  analytics.conversionFunnel.qualified,
                  analytics.conversionFunnel.converted,
                  1
                );
                const percentage = Math.round((stage.value / maxValue) * 100);
                
                return (
                  <div key={stage.label} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">{stage.label}</span>
                      <span className={`text-sm font-semibold ${stage.textColor}`}>{stage.value}</span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${stage.color} rounded-full transition-all duration-700 ease-out`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Response Time */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-base">Response Times</CardTitle>
                <CardDescription className="text-xs">How quickly you respond</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <ResponseTimeItem
                icon={CheckCircle}
                label="Within 24h"
                value={analytics.responseMetrics.respondedWithin24h}
                bgColor="bg-green-500/10"
                iconColor="text-green-600"
                textColor="text-green-600"
              />
              <ResponseTimeItem
                icon={Clock}
                label="24-48h"
                value={analytics.responseMetrics.respondedWithin48h}
                bgColor="bg-amber-500/10"
                iconColor="text-amber-600"
                textColor="text-amber-600"
              />
              <ResponseTimeItem
                icon={AlertTriangle}
                label="Not Responded"
                value={analytics.responseMetrics.notResponded}
                bgColor="bg-red-500/10"
                iconColor="text-red-500"
                textColor="text-red-500"
              />
              
              {/* Response Rate Summary */}
              <div className="pt-3 border-t border-border">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-muted-foreground">Overall Response Rate</span>
                  <span className="text-sm font-semibold text-foreground">{responseRate}%</span>
                </div>
                <Progress value={responseRate} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Preference */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">Contact Preference</CardTitle>
                <CardDescription className="text-xs">How leads prefer to be contacted</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.contactPreference.map((pref) => {
                const total = analytics.contactPreference.reduce((sum, p) => sum + p.count, 0);
                const percentage = total > 0 ? Math.round((pref.count / total) * 100) : 0;
                const Icon = pref.method === "Call" ? Phone : pref.method === "Email" ? Mail : MessageSquare;
                
                return (
                  <div key={pref.method} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{pref.method}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{percentage}%</span>
                        <span className="text-sm font-semibold text-primary">{pref.count}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface ResponseTimeItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  bgColor: string;
  iconColor: string;
  textColor: string;
}

function ResponseTimeItem({ icon: Icon, label, value, bgColor, iconColor, textColor }: ResponseTimeItemProps) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl ${bgColor}`}>
      <div className="flex items-center gap-2.5">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className={`text-lg font-bold ${textColor}`}>{value}</span>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  subtitle?: string;
  iconBg?: string;
  iconColor?: string;
}

function StatCard({ title, value, icon: Icon, trend, subtitle, iconBg = "bg-primary/10", iconColor = "text-primary" }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            {trend !== undefined && trend !== 0 && (
              <Badge 
                variant="outline" 
                className={`text-[10px] px-1.5 py-0 ${
                  trend > 0 
                    ? "bg-green-500/10 text-green-600 border-green-200" 
                    : "bg-red-500/10 text-red-600 border-red-200"
                }`}
              >
                {trend > 0 ? (
                  <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" />
                ) : (
                  <ArrowDownRight className="h-2.5 w-2.5 mr-0.5" />
                )}
                {Math.abs(trend)}%
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-10 w-10 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[280px] w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[220px] w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[180px] w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function EmptyAnalytics() {
  return (
    <Card className="border-dashed border-2">
      <CardContent className="py-20 text-center">
        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-6">
          <BarChart3 className="h-10 w-10 text-primary/40" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">No analytics yet</h3>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Analytics will appear here once you start receiving leads. 
          Make sure your listing is complete and approved to attract inquiries.
        </p>
      </CardContent>
    </Card>
  );
}
