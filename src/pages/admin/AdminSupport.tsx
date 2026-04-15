import { useState, useEffect, useMemo, useCallback } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useSearchParams } from "react-router-dom";
import { Search, Filter, Inbox, Mail, Building2, User, Clock, CheckCircle2, AlertCircle, Download, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAdminSupportTickets, SupportTicket, SupportTicketFilters } from "@/hooks/useAdminSupportTickets";
import { SupportTicketModal } from "@/components/admin/SupportTicketModal";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const sourceLabels: Record<string, { label: string; icon: React.ElementType }> = {
  public_contact: { label: "Public", icon: Mail },
  provider_support: { label: "Provider", icon: Building2 },
  seeker_support: { label: "Client", icon: User },
};

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  new: { label: "New", className: "bg-info/10 text-info border-info/30", icon: AlertCircle },
  open: { label: "Open", className: "bg-warning/10 text-warning border-warning/30", icon: Clock },
  in_progress: { label: "In Progress", className: "bg-chart-3/10 text-chart-3 border-chart-3/30", icon: Clock },
  resolved: { label: "Resolved", className: "bg-success/10 text-success border-success/30", icon: CheckCircle2 },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground border-border", icon: CheckCircle2 },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-muted text-muted-foreground" },
  normal: { label: "Normal", className: "bg-info/10 text-info" },
  high: { label: "High", className: "bg-warning/10 text-warning" },
  urgent: { label: "Urgent", className: "bg-destructive/10 text-destructive" },
};

export default function AdminSupport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<SupportTicketFilters>({
    status: "all",
    source: "all",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 350);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [deepLinkLoading, setDeepLinkLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading } = useAdminSupportTickets({
    ...filters,
    search: debouncedSearch || undefined,
  });

  // Sync selected ticket with fresh query data
  useEffect(() => {
    if (selectedTicket) {
      const fresh = tickets.find((t) => t.id === selectedTicket.id);
      if (fresh && JSON.stringify(fresh) !== JSON.stringify(selectedTicket)) {
        setSelectedTicket(fresh);
      }
    }
  }, [tickets, selectedTicket]);

  // Handle deep link ?ticket=ID from admin notifications
  useEffect(() => {
    const ticketId = searchParams.get("ticket");
    if (ticketId && !selectedTicket) {
      setDeepLinkLoading(true);
      supabase
        .from("support_tickets")
        .select("id, sender_name, sender_email, sender_user_id, subject, message, category, priority, status, source, assigned_to, assigned_by, assigned_at, resolved_by, resolved_at, resolution_notes, created_at, updated_at")
        .eq("id", ticketId)
        .single()
        .then(({ data, error }) => {
          if (data && !error) {
            setSelectedTicket(data as SupportTicket);
          } else {
            toast.error("Support ticket not found", {
              description: "The ticket may have been deleted or doesn't exist."
            });
          }
          setDeepLinkLoading(false);
          searchParams.delete("ticket");
          setSearchParams(searchParams, { replace: true });
        });
    }
  }, [searchParams, selectedTicket, setSearchParams]);

  const statusCounts = useMemo(() => {
    return tickets.reduce(
      (acc, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [tickets]);

  const newCount = statusCounts["new"] || 0;
  const openCount = statusCounts["open"] || 0;
  const inProgressCount = statusCounts["in_progress"] || 0;
  const resolvedCount = statusCounts["resolved"] || 0;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === tickets.length ? new Set() : new Set(tickets.map((t) => t.id))
    );
  }, [tickets]);

  const handleExportCSV = useCallback(() => {
    if (tickets.length === 0) return;
    const headers = ["ID", "Status", "Priority", "Source", "Category", "Subject", "Sender Name", "Sender Email", "Created At", "Assigned To"];
    const rows = tickets.map((t) => [
      t.id,
      t.status,
      t.priority,
      t.source,
      t.category,
      t.subject || "",
      t.sender_name,
      t.sender_email,
      t.created_at,
      t.assigned_admin?.display_name || "Unassigned",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `support-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }, [tickets]);

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      const { error } = await supabase
        .from("support_tickets")
        .delete()
        .in("id", Array.from(selectedIds));
      if (error) throw error;
      toast.success(`${selectedIds.size} ticket(s) deleted`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    } catch (err) {
      console.error("Bulk delete failed:", err);
      toast.error("Failed to delete tickets");
    } finally {
      setBulkDeleting(false);
      setBulkDeleteOpen(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <AdminPageHeader
        icon={Inbox}
        iconGradient="bg-gradient-to-br from-emerald-500 to-teal-600"
        title="Support Inbox"
        subtitle="Manage support requests from all channels"
        badges={[
          ...(newCount > 0 ? [{ label: "New", value: newCount, className: "bg-info/10 text-info" }] : []),
          ...(openCount + inProgressCount > 0 ? [{ label: "Open", value: openCount + inProgressCount, className: "bg-warning/10 text-warning" }] : []),
        ]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">New</p>
            <p className="text-xl sm:text-2xl font-bold text-info tabular-nums">{newCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Open / In Progress</p>
            <p className="text-xl sm:text-2xl font-bold text-warning tabular-nums">{openCount + inProgressCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Resolved</p>
            <p className="text-xl sm:text-2xl font-bold text-success tabular-nums">{resolvedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Total</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">{tickets.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 sm:h-4 w-3.5 sm:w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 sm:pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select
                value={filters.source || "all"}
                onValueChange={(value) => setFilters({ ...filters, source: value })}
              >
                <SelectTrigger className="w-[120px] sm:w-[140px] h-9 text-xs sm:text-sm">
                  <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="public_contact">Public</SelectItem>
                  <SelectItem value="provider_support">Provider</SelectItem>
                  <SelectItem value="seeker_support">Client</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.assignedTo || "all"}
                onValueChange={(value) =>
                  setFilters({ ...filters, assignedTo: value === "all" ? undefined : value })
                }
              >
                <SelectTrigger className="w-[110px] sm:w-[140px] h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={tickets.length === 0} className="h-9 text-xs sm:text-sm">
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export
              </Button>
              {selectedIds.size > 0 && (
                <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)} className="h-9 text-xs sm:text-sm">
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete ({selectedIds.size})
                </Button>
              )}
            </div>
          </div>

          {/* Status Tabs */}
          <Tabs
            value={filters.status || "all"}
            onValueChange={(value) => setFilters({ ...filters, status: value })}
            className="mt-3 sm:mt-4"
          >
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
              <TabsList className="w-auto inline-flex sm:w-full justify-start bg-muted/50">
                <TabsTrigger value="all" className="data-[state=active]:bg-background text-xs sm:text-sm px-2 sm:px-3 tabular-nums">
                  All ({tickets.length})
                </TabsTrigger>
                <TabsTrigger value="new" className="data-[state=active]:bg-background text-xs sm:text-sm px-2 sm:px-3 tabular-nums">
                  New {newCount > 0 && `(${newCount})`}
                </TabsTrigger>
                <TabsTrigger value="open" className="data-[state=active]:bg-background text-xs sm:text-sm px-2 sm:px-3 tabular-nums">
                  Open {openCount > 0 && `(${openCount})`}
                </TabsTrigger>
                <TabsTrigger value="in_progress" className="data-[state=active]:bg-background text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap tabular-nums">
                  In Progress {inProgressCount > 0 && `(${inProgressCount})`}
                </TabsTrigger>
                <TabsTrigger value="resolved" className="data-[state=active]:bg-background text-xs sm:text-sm px-2 sm:px-3 tabular-nums">
                  Resolved {resolvedCount > 0 && `(${resolvedCount})`}
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Ticket List */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg tabular-nums">
              {isLoading ? <Skeleton className="h-5 w-24" /> : `${tickets.length} Tickets`}
            </CardTitle>
            {tickets.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.size === tickets.length && tickets.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-xs text-muted-foreground">Select all</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-4 sm:px-6 py-3 sm:py-4 flex items-start gap-3 sm:gap-4">
                  <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-full max-w-md" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-14 rounded-full" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-muted-foreground">
              <Inbox className="h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4 text-muted-foreground/40" />
              <p className="text-base sm:text-lg font-medium">No tickets found</p>
              <p className="text-xs sm:text-sm">
                {searchTerm
                  ? "Try adjusting your search or filters"
                  : "Support requests will appear here"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {tickets.map((ticket) => {
                const source = sourceLabels[ticket.source];
                const status = statusConfig[ticket.status];
                const priority = priorityConfig[ticket.priority];
                const SourceIcon = source?.icon || Mail;

                return (
                  <div
                    key={ticket.id}
                    className="flex items-start gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(ticket.id)}
                        onCheckedChange={() => toggleSelect(ticket.id)}
                      />
                    </div>
                    <button
                      onClick={() => setSelectedTicket(ticket)}
                      className="flex-1 text-left flex items-start gap-3 sm:gap-4 min-w-0"
                    >
                      <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center">
                        <SourceIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="font-medium text-foreground text-sm sm:text-base">
                            {ticket.sender_name}
                          </span>
                          <span className="text-muted-foreground hidden sm:inline">·</span>
                          <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline truncate max-w-[200px]">
                            {ticket.sender_email}
                          </span>
                        </div>
                        {ticket.subject && (
                          <p className="text-xs sm:text-sm font-medium text-foreground/80 mt-0.5 line-clamp-1">
                            {ticket.subject}
                          </p>
                        )}
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-1">
                          {ticket.category} — {ticket.message}
                        </p>
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 flex-wrap">
                          <Badge variant="outline" className={cn("text-[10px] sm:text-xs", status?.className)}>
                            {status?.label || ticket.status}
                          </Badge>
                          {ticket.priority !== "normal" && (
                            <Badge variant="outline" className={cn("text-[10px] sm:text-xs", priority?.className)}>
                              {priority?.label || ticket.priority}
                            </Badge>
                          )}
                          <span className="text-[10px] sm:text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(ticket.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex-shrink-0 hidden sm:block">
                        {ticket.assigned_admin ? (
                          <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                            <AvatarImage src={ticket.assigned_admin.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px] sm:text-xs bg-primary/10 text-primary">
                              {ticket.assigned_admin.display_name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                            <span className="text-[10px] sm:text-xs text-muted-foreground">?</span>
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket Detail Modal */}
      <SupportTicketModal
        ticket={selectedTicket}
        open={!!selectedTicket}
        onOpenChange={(open) => !open && setSelectedTicket(null)}
        onDeleted={() => {
          setSelectedTicket(null);
          queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
        }}
      />

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} ticket(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected support tickets and their notes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
