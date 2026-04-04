import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Filter, Inbox, Mail, Building2, User, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminSupportTickets, SupportTicket, SupportTicketFilters } from "@/hooks/useAdminSupportTickets";
import { SupportTicketModal } from "@/components/admin/SupportTicketModal";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sourceLabels: Record<string, { label: string; icon: React.ElementType }> = {
  public_contact: { label: "Public", icon: Mail },
  provider_support: { label: "Provider", icon: Building2 },
  seeker_support: { label: "Seeker", icon: User },
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  new: { label: "New", color: "bg-blue-100 text-blue-800 border-blue-200", icon: AlertCircle },
  open: { label: "Open", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-purple-100 text-purple-800 border-purple-200", icon: Clock },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
  closed: { label: "Closed", color: "bg-slate-100 text-slate-800 border-slate-200", icon: CheckCircle2 },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-slate-100 text-slate-600" },
  normal: { label: "Normal", color: "bg-blue-100 text-blue-600" },
  high: { label: "High", color: "bg-amber-100 text-amber-600" },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-600" },
};

export default function AdminSupport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<SupportTicketFilters>({
    status: "all",
    source: "all",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [deepLinkLoading, setDeepLinkLoading] = useState(false);

  const { data: tickets = [], isLoading } = useAdminSupportTickets({
    ...filters,
    search: searchTerm || undefined,
  });

  // Handle deep link ?ticket=ID from admin notifications
  useEffect(() => {
    const ticketId = searchParams.get("ticket");
    if (ticketId && !selectedTicket) {
      setDeepLinkLoading(true);
      // Fetch the specific ticket to open
      supabase
        .from("support_tickets")
        .select("id, sender_name, sender_email, sender_user_id, subject, message, category, priority, status, source, assigned_to, assigned_by, assigned_at, resolved_by, resolved_at, resolution_notes, created_at, updated_at")
        .eq("id", ticketId)
        .single()
        .then(({ data, error }) => {
          if (data && !error) {
            setSelectedTicket(data as SupportTicket);
          } else {
            // Ticket not found - show error toast
            toast.error("Support ticket not found", {
              description: "The ticket may have been deleted or doesn't exist."
            });
          }
          setDeepLinkLoading(false);
          // Clear the query parameter
          searchParams.delete("ticket");
          setSearchParams(searchParams, { replace: true });
        });
    }
  }, [searchParams, selectedTicket, setSearchParams]);

  const statusCounts = tickets.reduce(
    (acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const newCount = statusCounts["new"] || 0;
  const openCount = statusCounts["open"] || 0;
  const inProgressCount = statusCounts["in_progress"] || 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Inbox className="h-5 w-5 sm:h-6 sm:w-6" />
            Support Inbox
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5 sm:mt-1">
            Manage support requests from all channels
          </p>
        </div>
        <div className="flex items-center gap-2">
          {newCount > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
              {newCount} New
            </Badge>
          )}
          {openCount + inProgressCount > 0 && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs">
              {openCount + inProgressCount} Open
            </Badge>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 sm:h-4 w-3.5 sm:w-4 text-slate-400" />
              <Input
                placeholder="Search by name, email, or message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 sm:pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex gap-2">
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
                  <SelectItem value="seeker_support">Seeker</SelectItem>
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
            </div>
          </div>

          {/* Status Tabs - horizontally scrollable */}
          <Tabs
            value={filters.status || "all"}
            onValueChange={(value) => setFilters({ ...filters, status: value })}
            className="mt-3 sm:mt-4"
          >
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
              <TabsList className="w-auto inline-flex sm:w-full justify-start bg-slate-100/50">
                <TabsTrigger value="all" className="data-[state=active]:bg-white text-xs sm:text-sm px-2 sm:px-3">
                  All ({tickets.length})
                </TabsTrigger>
                <TabsTrigger value="new" className="data-[state=active]:bg-white text-xs sm:text-sm px-2 sm:px-3">
                  New {newCount > 0 && `(${newCount})`}
                </TabsTrigger>
                <TabsTrigger value="open" className="data-[state=active]:bg-white text-xs sm:text-sm px-2 sm:px-3">
                  Open {openCount > 0 && `(${openCount})`}
                </TabsTrigger>
                <TabsTrigger value="in_progress" className="data-[state=active]:bg-white text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
                  In Progress {inProgressCount > 0 && `(${inProgressCount})`}
                </TabsTrigger>
                <TabsTrigger value="resolved" className="data-[state=active]:bg-white text-xs sm:text-sm px-2 sm:px-3">
                  Resolved
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Ticket List */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="text-base sm:text-lg">
            {isLoading ? "Loading..." : `${tickets.length} Tickets`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-slate-500">
              <Inbox className="h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4 text-slate-300" />
              <p className="text-base sm:text-lg font-medium">No tickets found</p>
              <p className="text-xs sm:text-sm">
                {searchTerm
                  ? "Try adjusting your search or filters"
                  : "Support requests will appear here"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tickets.map((ticket) => {
                const source = sourceLabels[ticket.source];
                const status = statusConfig[ticket.status];
                const priority = priorityConfig[ticket.priority];
                const SourceIcon = source?.icon || Mail;

                return (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Source Icon */}
                      <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <SourceIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="font-medium text-slate-900 text-sm sm:text-base">
                            {ticket.sender_name}
                          </span>
                          <span className="text-slate-400 hidden sm:inline">·</span>
                          <span className="text-xs sm:text-sm text-slate-500 hidden sm:inline">
                            {ticket.sender_email}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-slate-700 mt-0.5">
                          {ticket.category}
                        </p>
                        <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1 line-clamp-1">
                          {ticket.message}
                        </p>
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 flex-wrap">
                          <Badge variant="outline" className={cn("text-[10px] sm:text-xs", status.color)}>
                            {status.label}
                          </Badge>
                          {ticket.priority !== "normal" && (
                            <Badge variant="outline" className={cn("text-[10px] sm:text-xs", priority.color)}>
                              {priority.label}
                            </Badge>
                          )}
                          <span className="text-[10px] sm:text-xs text-slate-400">
                            {formatDistanceToNow(new Date(ticket.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Assignee - hidden on mobile */}
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
                          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                            <span className="text-[10px] sm:text-xs text-slate-400">?</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
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
      />
    </div>
  );
}
