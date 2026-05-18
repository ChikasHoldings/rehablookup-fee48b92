import { forwardRef } from "react";
import {
  PieChart as PieChartIcon,
} from "lucide-react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip, 
  BarChart, Bar, XAxis, YAxis 
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Semantic chart colors
const CHART_COLORS = {
  success: "hsl(142, 71%, 45%)",
  warning: "hsl(45, 93%, 47%)",
  info: "hsl(217, 91%, 60%)",
  accent: "hsl(263, 70%, 50%)",
  muted: "hsl(215, 16%, 47%)",
};

const PLAN_COLORS = {
  free: "hsl(215, 16%, 47%)",
  pro: "hsl(45, 93%, 47%)",
};

interface SubscriptionBreakdown {
  name: string;
  value: number;
  color: string;
}

interface ProviderStats {
  total: number;
  approved: number;
  pending: number;
  suspended: number;
  pro: number;
  placement: number;
  featured?: number;
  verified?: number;
}

interface LeadStats {
  totalMonth: number;
  totalAll: number;
  verified: number;
  verificationRate: number;
  newLeads: number;
  assigned?: number;
}

interface DashboardChartsSectionProps {
  providerStats?: ProviderStats;
  leadStats?: LeadStats;
  subscriptionBreakdown?: SubscriptionBreakdown[];
  loadingProviders: boolean;
  loadingLeads: boolean;
  loadingBreakdown: boolean;
}

export const DashboardChartsSection = forwardRef<HTMLDivElement, DashboardChartsSectionProps>(
  function DashboardChartsSection({
    providerStats,
    leadStats,
    subscriptionBreakdown,
    loadingProviders,
    loadingLeads,
    loadingBreakdown,
  }, ref) {
  // Provider status data for bar chart - updated for Free/Pro model
  const providerStatusData = [
    { name: "Approved", value: providerStats?.approved || 0, fill: CHART_COLORS.success },
    { name: "Pending", value: providerStats?.pending || 0, fill: CHART_COLORS.warning },
    { name: "Pro", value: providerStats?.pro || 0, fill: CHART_COLORS.accent },
    { name: "Placement", value: providerStats?.placement || 0, fill: CHART_COLORS.info },
  ];

  // Lead funnel — flat-fee Pro model: all Pro leads are delivered with full
  // PII immediately, so the funnel reduces to total → verified.
  const leadFunnelData = [
    { name: "Leads", value: leadStats?.totalMonth || 0, fill: CHART_COLORS.muted },
    { name: "Verified", value: leadStats?.verified || 0, fill: CHART_COLORS.info },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Provider Status Bar Chart */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Provider Status</CardTitle>
          <CardDescription className="text-xs">Breakdown by status</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingProviders ? (
            <div className="h-[180px] flex items-center justify-center">
              <Skeleton className="h-full w-full" />
            </div>
          ) : (
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={providerStatusData} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-card border rounded-lg shadow-lg px-3 py-2">
                            <p className="text-sm font-medium">{payload[0].payload.name}</p>
                            <p className="text-xs text-muted-foreground">{payload[0].value} providers</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Funnel */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Lead Funnel</CardTitle>
          <CardDescription className="text-xs">This month's conversion</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingLeads ? (
            <div className="h-[180px] flex items-center justify-center">
              <Skeleton className="h-full w-full" />
            </div>
          ) : (
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadFunnelData} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-card border rounded-lg shadow-lg px-3 py-2">
                            <p className="text-sm font-medium">{payload[0].payload.name}</p>
                            <p className="text-xs text-muted-foreground">{payload[0].value} leads</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-2 pt-2 border-t flex justify-between text-xs text-muted-foreground">
            <span>Verification: {leadStats?.verificationRate || 0}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Pie Chart */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Subscriptions</CardTitle>
          <CardDescription className="text-xs">Distribution by plan</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingBreakdown ? (
            <div className="h-[180px] flex items-center justify-center">
              <Skeleton className="h-24 w-24 rounded-full" />
            </div>
          ) : subscriptionBreakdown && subscriptionBreakdown.some(item => item.value > 0) ? (
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subscriptionBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {subscriptionBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as SubscriptionBreakdown;
                        return (
                          <div className="bg-card border rounded-lg shadow-lg px-3 py-2">
                            <p className="text-sm font-medium">{data.name}</p>
                            <p className="text-xs text-muted-foreground">{data.value} subscribers</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    content={({ payload }) => (
                      <div className="flex justify-center gap-4 mt-2">
                        {payload?.map((entry, index) => (
                          <div key={`legend-${index}`} className="flex items-center gap-1.5 text-xs">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-muted-foreground">{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[180px] flex flex-col items-center justify-center text-muted-foreground">
              <PieChartIcon className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">No data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

DashboardChartsSection.displayName = "DashboardChartsSection";
