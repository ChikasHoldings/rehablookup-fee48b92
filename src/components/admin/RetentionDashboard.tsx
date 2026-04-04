import { useState, useMemo, forwardRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Mail,
  UserCheck,
  TrendingUp,
  Clock,
  Target,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Calendar,
  BarChart3,
  Eye,
  MousePointerClick,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format, formatDistanceToNow, subDays, differenceInHours } from "date-fns";

interface OutreachRecord {
  id: string;
  alert_key: string;
  created_at: string;
  user_id: string;
  facilityId: string;
  facilityName: string;
  email: string;
  reEngaged: boolean;
  reEngagedAt: string | null;
  hoursToReEngage: number | null;
}

interface EmailTrackingStats {
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  openRate: number;
  clickRate: number;
}

interface OutreachMetrics {
  totalSent: number;
  reEngaged: number;
  reEngagementRate: number;
  avgHoursToReEngage: number;
  emailTracking: EmailTrackingStats;
  byPeriod: {
    last7Days: { sent: number; reEngaged: number };
    last30Days: { sent: number; reEngaged: number };
    allTime: { sent: number; reEngaged: number };
  };
}

export const RetentionDashboard = forwardRef<HTMLDivElement, object>(function RetentionDashboard(_, ref) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [dateRange, setDateRange] = useState("30");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["retention-metrics"],
    queryFn: async () => {
      // Fetch retention outreach alerts
      const { data: alerts, error: alertsError } = await supabase
        .from("subscription_alerts")
        .select("id, facility_id, alert_type, status, details, created_at, resolved_at")
        .eq("alert_type", "retention_outreach")
        .order("created_at", { ascending: false });

      if (alertsError) throw alertsError;

      // Fetch email tracking events
      const { data: trackingEvents } = await supabase
        .from("email_tracking_events")
        .select("*")
        .eq("email_type", "retention_outreach");

      // Calculate email tracking stats
      const delivered = trackingEvents?.filter(e => e.event_type === "email.delivered").length || 0;
      const opened = trackingEvents?.filter(e => e.event_type === "email.opened").length || 0;
      const clicked = trackingEvents?.filter(e => e.event_type === "email.clicked").length || 0;
      const bounced = trackingEvents?.filter(e => e.event_type === "email.bounced").length || 0;
      const totalTracked = delivered || (alerts?.length || 0);
      const openRate = totalTracked > 0 ? (opened / totalTracked) * 100 : 0;
      const clickRate = opened > 0 ? (clicked / opened) * 100 : 0;

      const emailTracking: EmailTrackingStats = {
        delivered,
        opened,
        clicked,
        bounced,
        openRate,
        clickRate,
      };

      // Get unique user IDs from alerts
      const userIds = [...new Set(alerts?.map(a => a.user_id) || [])];
      
      if (userIds.length === 0) {
        return {
          records: [],
          metrics: {
            totalSent: 0,
            reEngaged: 0,
            reEngagementRate: 0,
            avgHoursToReEngage: 0,
            emailTracking,
            byPeriod: {
              last7Days: { sent: 0, reEngaged: 0 },
              last30Days: { sent: 0, reEngaged: 0 },
              allTime: { sent: 0, reEngaged: 0 },
            },
          } as OutreachMetrics,
        };
      }

      // Fetch profiles for these users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, first_name, last_name")
        .in("user_id", userIds);

      // Fetch facilities for these users
      const { data: facilities } = await supabase
        .from("facilities")
        .select("id, name, user_id")
        .in("user_id", userIds);

      // Fetch login activity after outreach for each user
      const { data: activities } = await supabase
        .from("account_activity_log")
        .select("user_id, created_at, event_type")
        .in("user_id", userIds)
        .eq("event_type", "login")
        .order("created_at", { ascending: true });

      // Process records
      const records: OutreachRecord[] = (alerts || []).map(alert => {
        const profile = profiles?.find(p => p.user_id === alert.user_id);
        const facility = facilities?.find(f => f.user_id === alert.user_id);
        const facilityId = alert.alert_key.replace("retention_", "");
        
        // Find first login after this outreach
        const loginAfterOutreach = activities?.find(
          a => a.user_id === alert.user_id && new Date(a.created_at) > new Date(alert.created_at)
        );

        const reEngaged = !!loginAfterOutreach;
        const hoursToReEngage = loginAfterOutreach
          ? differenceInHours(new Date(loginAfterOutreach.created_at), new Date(alert.created_at))
          : null;

        return {
          id: alert.id,
          alert_key: alert.alert_key,
          created_at: alert.created_at,
          user_id: alert.user_id,
          facilityId: facility?.id || facilityId,
          facilityName: facility?.name || "Unknown Facility",
          email: profile?.email || "Unknown",
          reEngaged,
          reEngagedAt: loginAfterOutreach?.created_at || null,
          hoursToReEngage,
        };
      });

      // Calculate metrics
      const now = new Date();
      const sevenDaysAgo = subDays(now, 7);
      const thirtyDaysAgo = subDays(now, 30);

      const last7Days = records.filter(r => new Date(r.created_at) >= sevenDaysAgo);
      const last30Days = records.filter(r => new Date(r.created_at) >= thirtyDaysAgo);

      const totalSent = records.length;
      const reEngaged = records.filter(r => r.reEngaged).length;
      const reEngagementRate = totalSent > 0 ? (reEngaged / totalSent) * 100 : 0;

      const reEngagedRecords = records.filter(r => r.hoursToReEngage !== null);
      const avgHoursToReEngage = reEngagedRecords.length > 0
        ? reEngagedRecords.reduce((sum, r) => sum + (r.hoursToReEngage || 0), 0) / reEngagedRecords.length
        : 0;

      const metrics: OutreachMetrics = {
        totalSent,
        reEngaged,
        reEngagementRate,
        avgHoursToReEngage,
        emailTracking,
        byPeriod: {
          last7Days: {
            sent: last7Days.length,
            reEngaged: last7Days.filter(r => r.reEngaged).length,
          },
          last30Days: {
            sent: last30Days.length,
            reEngaged: last30Days.filter(r => r.reEngaged).length,
          },
          allTime: {
            sent: totalSent,
            reEngaged,
          },
        },
      };

      return { records, metrics };
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const filteredRecords = useMemo(() => {
    if (!data?.records) return [];
    const now = new Date();
    const cutoff = subDays(now, parseInt(dateRange));
    return data.records.filter(r => new Date(r.created_at) >= cutoff);
  }, [data?.records, dateRange]);

  const periodMetrics = useMemo(() => {
    const sent = filteredRecords.length;
    const reEngaged = filteredRecords.filter(r => r.reEngaged).length;
    const rate = sent > 0 ? (reEngaged / sent) * 100 : 0;
    const reEngagedRecords = filteredRecords.filter(r => r.hoursToReEngage !== null);
    const avgHours = reEngagedRecords.length > 0
      ? reEngagedRecords.reduce((sum, r) => sum + (r.hoursToReEngage || 0), 0) / reEngagedRecords.length
      : 0;
    return { sent, reEngaged, rate, avgHours };
  }, [filteredRecords]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card ref={ref}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Retention Dashboard</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[140px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">All time</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          <CardDescription>
            Track retention outreach effectiveness and provider re-engagement
          </CardDescription>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Metric Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="border-primary/20">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Emails Sent</p>
                      <p className="text-2xl font-bold">{periodMetrics.sent}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Re-Engaged</p>
                      <p className="text-2xl font-bold">{periodMetrics.reEngaged}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Re-engagement Rate</p>
                      <p className="text-2xl font-bold">{periodMetrics.rate.toFixed(1)}%</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <Target className="h-5 w-5 text-amber-600" />
                    </div>
                  </div>
                  <Progress 
                    value={periodMetrics.rate} 
                    className="mt-2 h-1.5"
                  />
                </CardContent>
              </Card>

              <Card className="border-blue-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg. Time to Re-engage</p>
                      <p className="text-2xl font-bold">
                        {periodMetrics.avgHours < 24 
                          ? `${Math.round(periodMetrics.avgHours)}h`
                          : `${Math.round(periodMetrics.avgHours / 24)}d`
                        }
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Email Engagement Metrics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Email Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Delivered</p>
                    </div>
                    <p className="text-lg font-semibold">{data?.metrics?.emailTracking?.delivered ?? 0}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Opened</p>
                    </div>
                    <p className="text-lg font-semibold">{data?.metrics?.emailTracking?.opened ?? 0}</p>
                    <p className="text-xs text-green-600 font-medium">
                      {(data?.metrics?.emailTracking?.openRate ?? 0).toFixed(1)}% rate
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Clicked</p>
                    </div>
                    <p className="text-lg font-semibold">{data?.metrics?.emailTracking?.clicked ?? 0}</p>
                    <p className="text-xs text-blue-600 font-medium">
                      {(data?.metrics?.emailTracking?.clickRate ?? 0).toFixed(1)}% CTR
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Bounced</p>
                    </div>
                    <p className="text-lg font-semibold">{data?.metrics?.emailTracking?.bounced ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Period Comparison */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Performance by Period</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Last 7 Days", data: data?.metrics.byPeriod.last7Days },
                    { label: "Last 30 Days", data: data?.metrics.byPeriod.last30Days },
                    { label: "All Time", data: data?.metrics.byPeriod.allTime },
                  ].map(({ label, data: periodData }) => {
                    const rate = periodData && periodData.sent > 0 
                      ? (periodData.reEngaged / periodData.sent) * 100 
                      : 0;
                    return (
                      <div key={label} className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                        <p className="text-lg font-semibold">{rate.toFixed(0)}%</p>
                        <p className="text-xs text-muted-foreground">
                          {periodData?.reEngaged || 0} / {periodData?.sent || 0}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Outreach History Table */}
            <div>
              <h4 className="text-sm font-medium mb-3">Recent Outreach History</h4>
              {filteredRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  <Mail className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No outreach emails sent in this period</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Re-engaged</TableHead>
                        <TableHead className="text-right">Time to Re-engage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.slice(0, 10).map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{record.facilityName}</p>
                              <p className="text-xs text-muted-foreground">{record.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(record.created_at), "MMM d, yyyy")}
                            </span>
                          </TableCell>
                          <TableCell>
                            {record.reEngaged ? (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                                Re-engaged
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {record.reEngagedAt ? (
                              <span className="text-sm">
                                {format(new Date(record.reEngagedAt), "MMM d, yyyy")}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {record.hoursToReEngage !== null ? (
                              <span className="text-sm font-medium">
                                {record.hoursToReEngage < 24 
                                  ? `${record.hoursToReEngage}h`
                                  : `${Math.round(record.hoursToReEngage / 24)}d`
                                }
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredRecords.length > 10 && (
                    <div className="text-center py-2 text-sm text-muted-foreground border-t">
                      Showing 10 of {filteredRecords.length} records
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
});

RetentionDashboard.displayName = "RetentionDashboard";
