import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow, subDays, startOfDay, endOfDay } from "date-fns";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Search,
  RefreshCw,
  Filter,
  Download,
  Clock,
  Activity,
  Ban,
  Eye,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

interface RateLimitLog {
  id: string;
  identifier: string;
  action_type: string;
  success: boolean | null;
  created_at: string;
  metadata: Record<string, any> | null;
}

interface SuspiciousActivity {
  identifier: string;
  action_type: string;
  failed_count: number;
  last_attempt: string;
  first_attempt: string;
}

const ITEMS_PER_PAGE = 25;

export default function AdminSecurityLogs() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [successFilter, setSuccessFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("7d");
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("activity");
  const [selectedLog, setSelectedLog] = useState<RateLimitLog | null>(null);

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case "24h":
        return { from: subDays(now, 1), to: now };
      case "7d":
        return { from: subDays(now, 7), to: now };
      case "30d":
        return { from: subDays(now, 30), to: now };
      case "custom":
        return { 
          from: customDateFrom ? startOfDay(customDateFrom) : subDays(now, 7), 
          to: customDateTo ? endOfDay(customDateTo) : now 
        };
      default:
        return { from: subDays(now, 7), to: now };
    }
  };

  const { from: dateFrom, to: dateTo } = getDateRange();

  // Fetch rate limit logs
  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ["rate-limit-logs", actionFilter, successFilter, dateFrom.toISOString(), dateTo.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("rate_limit_log")
        .select("*")
        .gte("created_at", dateFrom.toISOString())
        .lte("created_at", dateTo.toISOString())
        .order("created_at", { ascending: false })
        .limit(1000);

      if (actionFilter !== "all") {
        query = query.eq("action_type", actionFilter);
      }
      if (successFilter !== "all") {
        query = query.eq("success", successFilter === "success");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RateLimitLog[];
    },
  });

  // Fetch suspicious activity (high failed attempt counts)
  const { data: suspiciousActivity, isLoading: suspiciousLoading, refetch: refetchSuspicious } = useQuery({
    queryKey: ["suspicious-activity"],
    queryFn: async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from("rate_limit_log")
        .select("identifier, action_type, created_at")
        .eq("success", false)
        .gte("created_at", oneHourAgo);

      if (error) throw error;

      // Aggregate by identifier
      const counts: Record<string, SuspiciousActivity> = {};
      for (const record of data || []) {
        const key = `${record.identifier}:${record.action_type}`;
        if (!counts[key]) {
          counts[key] = {
            identifier: record.identifier,
            action_type: record.action_type,
            failed_count: 0,
            last_attempt: record.created_at,
            first_attempt: record.created_at,
          };
        }
        counts[key].failed_count++;
        if (record.created_at > counts[key].last_attempt) {
          counts[key].last_attempt = record.created_at;
        }
        if (record.created_at < counts[key].first_attempt) {
          counts[key].first_attempt = record.created_at;
        }
      }

      return Object.values(counts)
        .filter((a) => a.failed_count >= 3)
        .sort((a, b) => b.failed_count - a.failed_count);
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("security-logs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rate_limit_log" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["rate-limit-logs"] });
          queryClient.invalidateQueries({ queryKey: ["suspicious-activity"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Stats
  const stats = {
    totalLogs: logs?.length || 0,
    failedAttempts: logs?.filter((l) => l.success === false).length || 0,
    successfulLogins: logs?.filter((l) => l.success === true).length || 0,
    suspiciousCount: suspiciousActivity?.length || 0,
  };

  // Filter logs by search
  const filteredLogs = logs?.filter((log) =>
    searchQuery
      ? log.identifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action_type.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  // Pagination
  const totalPages = Math.ceil((filteredLogs?.length || 0) / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, actionFilter, successFilter, dateRange]);

  const exportLogs = () => {
    if (!filteredLogs) return;
    const csv = [
      ["Timestamp", "Identifier", "Action", "Success", "Metadata"].join(","),
      ...filteredLogs.map((log) =>
        [
          log.created_at,
          `"${log.identifier}"`,
          log.action_type,
          log.success ? "Yes" : "No",
          `"${JSON.stringify(log.metadata || {}).replace(/"/g, '""')}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `security-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    refetchLogs();
    refetchSuspicious();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Security Logs</h1>
          <p className="text-muted-foreground">
            Monitor login attempts and detect suspicious activity
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Total Logs
            </CardDescription>
            <CardTitle className="text-2xl">{stats.totalLogs}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5" />
              Failed Attempts
            </CardDescription>
            <CardTitle className="text-2xl text-destructive">{stats.failedAttempts}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Successful Logins
            </CardDescription>
            <CardTitle className="text-2xl text-emerald-600">{stats.successfulLogins}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Suspicious Activity
            </CardDescription>
            <CardTitle className="text-2xl text-amber-600">{stats.suspiciousCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            Activity Logs
          </TabsTrigger>
          <TabsTrigger value="suspicious" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Suspicious Activity
            {stats.suspiciousCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                {stats.suspiciousCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Activity Logs Tab */}
        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Login Activity Logs</CardTitle>
              <CardDescription>
                View and filter authentication events across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col lg:flex-row gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email or action..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-[150px]">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
                {dateRange === "custom" && (
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn(!customDateFrom && "text-muted-foreground")}>
                          {customDateFrom ? format(customDateFrom, "MMM d") : "From"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={customDateFrom} onSelect={setCustomDateFrom} />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn(!customDateTo && "text-muted-foreground")}>
                          {customDateTo ? format(customDateTo, "MMM d") : "To"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={customDateTo} onSelect={setCustomDateTo} />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Action Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="provider_login">Provider Login</SelectItem>
                    <SelectItem value="admin_login">Admin Login</SelectItem>
                    <SelectItem value="password_reset">Password Reset</SelectItem>
                    <SelectItem value="login">General Login</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={successFilter} onValueChange={setSuccessFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Logs Table */}
              {logsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Identifier</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[80px]">Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedLogs?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              No logs found for the selected filters
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedLogs?.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                  <div>
                                    <p className="text-sm">
                                      {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <code className="text-sm bg-muted px-1.5 py-0.5 rounded break-all">
                                  {log.identifier}
                                </code>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {log.action_type.replace(/_/g, " ")}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {log.success === true ? (
                                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Success
                                  </Badge>
                                ) : log.success === false ? (
                                  <Badge variant="destructive">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Failed
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">Unknown</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedLog(log)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{" "}
                        {Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs?.length || 0)} of{" "}
                        {filteredLogs?.length || 0} logs
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suspicious Activity Tab */}
        <TabsContent value="suspicious" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Suspicious Activity Monitor
              </CardTitle>
              <CardDescription>
                Identifiers with 3+ failed login attempts in the last hour are flagged as suspicious
              </CardDescription>
            </CardHeader>
            <CardContent>
              {suspiciousLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : suspiciousActivity && suspiciousActivity.length > 0 ? (
                <div className="space-y-3">
                  {suspiciousActivity.map((activity, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center justify-between rounded-lg p-4 border",
                        activity.failed_count >= 10
                          ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900"
                          : activity.failed_count >= 5
                          ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900"
                          : "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "p-2 rounded-full",
                          activity.failed_count >= 10
                            ? "bg-red-100 dark:bg-red-900"
                            : activity.failed_count >= 5
                            ? "bg-amber-100 dark:bg-amber-900"
                            : "bg-yellow-100 dark:bg-yellow-900"
                        )}>
                          <Shield className={cn(
                            "h-5 w-5",
                            activity.failed_count >= 10
                              ? "text-red-600"
                              : activity.failed_count >= 5
                              ? "text-amber-600"
                              : "text-yellow-600"
                          )} />
                        </div>
                        <div>
                          <p className="font-medium">{activity.identifier}</p>
                          <p className="text-sm text-muted-foreground">
                            {activity.action_type.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            First attempt: {format(new Date(activity.first_attempt), "HH:mm:ss")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={activity.failed_count >= 10 ? "destructive" : "secondary"}
                          className={cn(
                            activity.failed_count >= 10 ? "" : 
                            activity.failed_count >= 5 ? "bg-amber-100 text-amber-700" :
                            "bg-yellow-100 text-yellow-700"
                          )}
                        >
                          {activity.failed_count} failed attempts
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-2">
                          Last: {formatDistanceToNow(new Date(activity.last_attempt), { addSuffix: true })}
                        </p>
                        {activity.failed_count >= 5 && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            <Ban className="h-3 w-3 mr-1" />
                            Rate Limited
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground">No Suspicious Activity</h3>
                  <p className="text-muted-foreground mt-1">
                    No identifiers with 3+ failed attempts in the last hour
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Details</DialogTitle>
            <DialogDescription>
              Full information about this security event
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Timestamp</p>
                  <p className="text-sm">{format(new Date(selectedLog.created_at), "PPpp")}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  {selectedLog.success === true ? (
                    <Badge className="bg-emerald-100 text-emerald-700">Success</Badge>
                  ) : selectedLog.success === false ? (
                    <Badge variant="destructive">Failed</Badge>
                  ) : (
                    <Badge variant="secondary">Unknown</Badge>
                  )}
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Identifier</p>
                  <code className="text-sm bg-muted px-2 py-1 rounded block mt-1">
                    {selectedLog.identifier}
                  </code>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Action Type</p>
                  <p className="text-sm capitalize">{selectedLog.action_type.replace(/_/g, " ")}</p>
                </div>
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Metadata</p>
                    <pre className="text-xs bg-muted p-3 rounded mt-1 overflow-auto max-h-48">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
