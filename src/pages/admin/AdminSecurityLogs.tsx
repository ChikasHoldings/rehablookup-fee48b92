import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Search,
  RefreshCw,
  Filter,
  Download,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";

interface RateLimitLog {
  id: string;
  identifier: string;
  action_type: string;
  success: boolean;
  created_at: string;
  metadata: Record<string, any> | null;
}

interface SuspiciousActivity {
  identifier: string;
  action_type: string;
  failed_count: number;
  last_attempt: string;
}

export default function AdminSecurityLogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [successFilter, setSuccessFilter] = useState<string>("all");

  // Fetch rate limit logs
  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ["rate-limit-logs", actionFilter, successFilter],
    queryFn: async () => {
      let query = supabase
        .from("rate_limit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

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
  const { data: suspiciousActivity, isLoading: suspiciousLoading } = useQuery({
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
          };
        }
        counts[key].failed_count++;
        if (record.created_at > counts[key].last_attempt) {
          counts[key].last_attempt = record.created_at;
        }
      }

      return Object.values(counts)
        .filter((a) => a.failed_count >= 3)
        .sort((a, b) => b.failed_count - a.failed_count);
    },
  });

  // Stats
  const stats = {
    totalLogs: logs?.length || 0,
    failedAttempts: logs?.filter((l) => !l.success).length || 0,
    successfulLogins: logs?.filter((l) => l.success).length || 0,
    uniqueIdentifiers: new Set(logs?.map((l) => l.identifier) || []).size,
  };

  // Filter logs by search
  const filteredLogs = logs?.filter((log) =>
    searchQuery
      ? log.identifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action_type.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const exportLogs = () => {
    if (!filteredLogs) return;
    const csv = [
      ["Timestamp", "Identifier", "Action", "Success", "Metadata"].join(","),
      ...filteredLogs.map((log) =>
        [
          log.created_at,
          log.identifier,
          log.action_type,
          log.success ? "Yes" : "No",
          JSON.stringify(log.metadata || {}),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `security-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
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
          <Button variant="outline" size="sm" onClick={() => refetchLogs()}>
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
            <CardDescription>Total Logs</CardDescription>
            <CardTitle className="text-2xl">{stats.totalLogs}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed Attempts</CardDescription>
            <CardTitle className="text-2xl text-destructive">{stats.failedAttempts}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Successful Logins</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">{stats.successfulLogins}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unique Identifiers</CardDescription>
            <CardTitle className="text-2xl">{stats.uniqueIdentifiers}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Suspicious Activity Alert */}
      {suspiciousActivity && suspiciousActivity.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Suspicious Activity Detected
            </CardTitle>
            <CardDescription className="text-amber-600 dark:text-amber-500">
              The following identifiers have multiple failed login attempts in the last hour
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suspiciousActivity.slice(0, 5).map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-lg p-3 border border-amber-200 dark:border-amber-800"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-amber-600" />
                    <div>
                      <p className="font-medium text-sm">{activity.identifier}</p>
                      <p className="text-xs text-muted-foreground">{activity.action_type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive">{activity.failed_count} failed</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(activity.last_attempt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Login Activity Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or action..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Identifier</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs?.map((log) => (
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
                          <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                            {log.identifier}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {log.action_type.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.success ? (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Success
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <code className="text-xs text-muted-foreground">
                              {(log.metadata as any).error_type || JSON.stringify(log.metadata)}
                            </code>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}