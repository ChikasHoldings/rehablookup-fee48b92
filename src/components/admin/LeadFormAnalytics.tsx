import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Eye, MousePointerClick, Mail, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadFormAnalyticsProps {
  dateRange: { from: Date; to: Date };
}

const FUNNEL_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

const STEP_LABELS: Record<string, string> = {
  page_view: "Page Views",
  step_view: "Started Form",
  step_complete: "Step Completed",
  verification_code_sent: "Email Verification Started",
  email_verified: "Email Verified",
  form_submit_success: "Form Submitted",
  form_submit_start: "Submit Attempted",
  form_submit_error: "Submit Error",
  spam_blocked: "Spam Blocked",
};

export function LeadFormAnalytics({ dateRange }: LeadFormAnalyticsProps) {
  // Fetch analytics data from request_help_analytics table
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ["lead-form-analytics", dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("request_help_analytics")
        .select("id, event_type, step_number, source, facility_id, created_at, metadata")
        .gte("created_at", dateRange.from.toISOString())
        .lte("created_at", dateRange.to.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 2,
  });

  // Calculate funnel metrics
  const funnelMetrics = useMemo(() => {
    if (!analyticsData) return null;

    const counts: Record<string, number> = {};
    analyticsData.forEach(event => {
      counts[event.event_type] = (counts[event.event_type] || 0) + 1;
    });

    const pageViews = counts["page_view"] || 0;
    const formStarts = (counts["step_view"] || 0);
    const verificationStarted = counts["verification_code_sent"] || 0;
    const verified = counts["email_verified"] || 0;
    const submitted = counts["form_submit_success"] || 0;
    const errors = counts["form_submit_error"] || 0;
    const spamBlocked = counts["spam_blocked"] || 0;

    // Calculate conversion rates
    const viewToStart = pageViews > 0 ? (formStarts / pageViews) * 100 : 0;
    const startToVerification = formStarts > 0 ? (verificationStarted / formStarts) * 100 : 0;
    const verificationToSubmit = verificationStarted > 0 ? (submitted / verificationStarted) * 100 : 0;
    const overallConversion = pageViews > 0 ? (submitted / pageViews) * 100 : 0;

    return {
      pageViews,
      formStarts,
      verificationStarted,
      verified,
      submitted,
      errors,
      spamBlocked,
      viewToStart,
      startToVerification,
      verificationToSubmit,
      overallConversion,
    };
  }, [analyticsData]);

  // Daily trend data
  const dailyTrend = useMemo(() => {
    if (!analyticsData) return [];

    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    
    return days.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayEvents = analyticsData.filter(e => 
        format(new Date(e.created_at), "yyyy-MM-dd") === dayStr
      );

      const views = dayEvents.filter(e => e.event_type === "page_view").length;
      const starts = dayEvents.filter(e => e.event_type === "step_view").length;
      const submissions = dayEvents.filter(e => e.event_type === "form_submit_success").length;

      return {
        date: format(day, "MMM d"),
        views,
        starts,
        submissions,
        conversionRate: views > 0 ? ((submissions / views) * 100).toFixed(1) : "0",
      };
    });
  }, [analyticsData, dateRange]);

  // Step drop-off analysis
  const dropOffAnalysis = useMemo(() => {
    if (!analyticsData) return [];

    // Group step_view events by step number
    const stepViews = analyticsData.filter(e => e.event_type === "step_view");
    const stepCounts: Record<number, number> = {};
    
    stepViews.forEach(event => {
      const step = event.step_number || 1;
      stepCounts[step] = (stepCounts[step] || 0) + 1;
    });

    const steps = [
      { step: 1, name: "About You", count: stepCounts[1] || 0 },
      { step: 2, name: "Treatment Details", count: stepCounts[2] || 0 },
      { step: 3, name: "Contact Info", count: stepCounts[3] || 0 },
    ];

    // Calculate drop-off rates
    return steps.map((s, index) => {
      const prevCount = index === 0 ? (funnelMetrics?.pageViews || 0) : steps[index - 1].count;
      const dropOff = prevCount > 0 ? ((prevCount - s.count) / prevCount) * 100 : 0;
      return {
        ...s,
        dropOff: dropOff.toFixed(1),
        retention: (100 - dropOff).toFixed(1),
      };
    });
  }, [analyticsData, funnelMetrics]);

  // Source breakdown
  const sourceBreakdown = useMemo(() => {
    if (!analyticsData) return [];

    const sources: Record<string, { views: number; submissions: number }> = {};
    
    analyticsData.forEach(event => {
      const source = event.source || "direct";
      if (!sources[source]) {
        sources[source] = { views: 0, submissions: 0 };
      }
      if (event.event_type === "page_view") {
        sources[source].views++;
      }
      if (event.event_type === "form_submit_success") {
        sources[source].submissions++;
      }
    });

    return Object.entries(sources).map(([source, data]) => ({
      source: source.charAt(0).toUpperCase() + source.slice(1),
      views: data.views,
      submissions: data.submissions,
      conversionRate: data.views > 0 ? ((data.submissions / data.views) * 100).toFixed(1) : "0",
    })).sort((a, b) => b.views - a.views);
  }, [analyticsData]);

  // Funnel chart data
  const funnelData = useMemo(() => {
    if (!funnelMetrics) return [];
    return [
      { name: "Page Views", value: funnelMetrics.pageViews, fill: FUNNEL_COLORS[0] },
      { name: "Started Form", value: funnelMetrics.formStarts, fill: FUNNEL_COLORS[1] },
      { name: "Email Verification", value: funnelMetrics.verificationStarted, fill: FUNNEL_COLORS[2] },
      { name: "Submitted", value: funnelMetrics.submitted, fill: FUNNEL_COLORS[3] },
    ];
  }, [funnelMetrics]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{funnelMetrics?.pageViews.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total form page visits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Form Starts</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{funnelMetrics?.formStarts.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              {funnelMetrics?.viewToStart.toFixed(1)}% of visitors started
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Verified</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{funnelMetrics?.verified.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              {funnelMetrics?.startToVerification.toFixed(1)}% verification rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submissions</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{funnelMetrics?.submitted.toLocaleString() || 0}</div>
            <div className="flex items-center gap-2">
              <Badge variant={funnelMetrics?.overallConversion && funnelMetrics.overallConversion > 5 ? "default" : "secondary"}>
                {funnelMetrics?.overallConversion.toFixed(1)}% conversion
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>Lead form completion stages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {funnelData.map((stage, index) => {
                const maxValue = funnelData[0]?.value || 1;
                const percentage = ((stage.value / maxValue) * 100).toFixed(0);
                const dropOff = index > 0 
                  ? (((funnelData[index - 1].value - stage.value) / funnelData[index - 1].value) * 100).toFixed(0)
                  : null;

                return (
                  <div key={stage.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{stage.name}</span>
                        {dropOff && Number(dropOff) > 30 && (
                          <Badge variant="destructive" className="text-xs">
                            -{dropOff}% drop
                          </Badge>
                        )}
                      </div>
                      <span className="text-muted-foreground">{stage.value.toLocaleString()}</span>
                    </div>
                    <div className="relative">
                      <Progress value={Number(percentage)} className="h-8" />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                        {percentage}%
                      </span>
                    </div>
                    {index < funnelData.length - 1 && (
                      <div className="flex justify-center py-1">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step Drop-off Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Step Drop-off Analysis</CardTitle>
            <CardDescription>Where users abandon the form</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {dropOffAnalysis.map((step, index) => (
                <div key={step.step} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        Number(step.dropOff) > 40 
                          ? "bg-destructive/10 text-destructive" 
                          : "bg-primary/10 text-primary"
                      )}>
                        {step.step}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{step.name}</p>
                        <p className="text-xs text-muted-foreground">{step.count} users reached</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {Number(step.dropOff) > 40 ? (
                        <div className="flex items-center gap-1 text-destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-medium">{step.dropOff}% drop</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-green-600">
                          <TrendingUp className="h-4 w-4" />
                          <span className="text-sm font-medium">{step.retention}% retained</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Progress 
                    value={Number(step.retention)} 
                    className={cn("h-2", Number(step.dropOff) > 40 && "[&>div]:bg-destructive")}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Conversion Trend</CardTitle>
          <CardDescription>Form views, starts, and submissions over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="views" 
                  name="Page Views"
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="starts" 
                  name="Form Starts"
                  stroke="hsl(var(--chart-2))" 
                  fill="hsl(var(--chart-2))" 
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="submissions" 
                  name="Submissions"
                  stroke="hsl(var(--chart-3))" 
                  fill="hsl(var(--chart-3))" 
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Source Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Traffic Source Performance</CardTitle>
          <CardDescription>Conversion rates by traffic source</CardDescription>
        </CardHeader>
        <CardContent>
          {sourceBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No source data available</p>
          ) : (
            <div className="space-y-4">
              {sourceBreakdown.map(source => (
                <div key={source.source} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">{source.source}</p>
                    <p className="text-sm text-muted-foreground">
                      {source.views} views → {source.submissions} submissions
                    </p>
                  </div>
                  <Badge variant={Number(source.conversionRate) > 5 ? "default" : "secondary"}>
                    {source.conversionRate}% conv.
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Errors & Spam */}
      {(funnelMetrics?.errors || funnelMetrics?.spamBlocked) ? (
        <Card>
          <CardHeader>
            <CardTitle>Issues Detected</CardTitle>
            <CardDescription>Submission errors and spam prevention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {funnelMetrics.errors > 0 && (
                <div className="flex items-center gap-4 p-4 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                  <div>
                    <p className="font-medium text-destructive">{funnelMetrics.errors} Submit Errors</p>
                    <p className="text-sm text-muted-foreground">Users experienced errors during submission</p>
                  </div>
                </div>
              )}
              {funnelMetrics.spamBlocked > 0 && (
                <div className="flex items-center gap-4 p-4 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-medium text-green-600">{funnelMetrics.spamBlocked} Spam Blocked</p>
                    <p className="text-sm text-muted-foreground">Bot submissions prevented by honeypot</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
