import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Users, 
  Mail, 
  Phone, 
  Calendar, 
  MessageSquare, 
  TrendingUp, 
  Inbox,
  Copy,
  Check,
  ChevronRight,
  AlertCircle,
  Search,
  X,
  CalendarIcon,
  Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, isToday, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useProviderData } from "@/hooks/useProviderData";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { LeadStatusBadge, getStatusOptions, type LeadStatus } from "@/components/provider/leads/LeadStatusBadge";
import { LeadDetailDrawer } from "@/components/provider/leads/LeadDetailDrawer";
import { EmailLeadDialog } from "@/components/provider/leads/EmailLeadDialog";
import { 
  LeadUsageIndicator, 
  LeadLimitWarningBanner, 
  LeadLimitReachedBanner 
} from "@/components/provider/LeadUsageIndicator";
import { useSubscription } from "@/hooks/useSubscription";

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string | null;
  preferred_contact: string;
  created_at: string;
  status: string;
  facility_id: string;
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export default function ProviderLeadsPage() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailLead, setEmailLead] = useState<Lead | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: providerData } = useProviderData();
  const { data: subscription } = useSubscription();
  const facilityId = providerData?.facility?.id;
  
  // Get lead limit from subscription data
  const leadLimit = subscription?.lead_limit ?? 5;

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["provider-leads", facilityId],
    queryFn: async (): Promise<Lead[]> => {
      if (!facilityId) return [];

      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("facility_id", facilityId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Lead[];
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 2,
  });

  // Filtered leads based on search, status, and date range
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          lead.name.toLowerCase().includes(query) ||
          lead.email.toLowerCase().includes(query) ||
          lead.phone.includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== "all" && lead.status !== statusFilter) {
        return false;
      }

      // Date range filter
      if (dateRange.from || dateRange.to) {
        const leadDate = new Date(lead.created_at);
        if (dateRange.from && dateRange.to) {
          if (!isWithinInterval(leadDate, { 
            start: startOfDay(dateRange.from), 
            end: endOfDay(dateRange.to) 
          })) {
            return false;
          }
        } else if (dateRange.from) {
          if (leadDate < startOfDay(dateRange.from)) return false;
        } else if (dateRange.to) {
          if (leadDate > endOfDay(dateRange.to)) return false;
        }
      }

      return true;
    });
  }, [leads, searchQuery, statusFilter, dateRange]);

  // Update status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: LeadStatus }) => {
      const { error } = await supabase
        .from("leads")
        .update({ status })
        .eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-leads"] });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const thisMonthLeads = leads.filter(lead => {
    const leadDate = new Date(lead.created_at);
    return leadDate >= startOfMonth(new Date());
  });

  const todayLeads = leads.filter(lead => isToday(new Date(lead.created_at)));
  const newLeads = leads.filter(lead => lead.status === "new");

  const handleOpenLead = (lead: Lead) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  };

  const handleCopyContact = async (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `${lead.name}\nPhone: ${lead.phone}\nEmail: ${lead.email}`;
    await navigator.clipboard.writeText(text);
    setCopiedId(lead.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Contact info copied" });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateRange({ from: undefined, to: undefined });
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || dateRange.from || dateRange.to;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Leads</h1>
        <p className="text-muted-foreground mt-1">
          Patient inquiries received through RehabLookup
        </p>
      </div>

      {/* Lead Limit Banners */}
      <LeadLimitReachedBanner usedLeads={thisMonthLeads.length} leadLimit={leadLimit} />
      <LeadLimitWarningBanner usedLeads={thisMonthLeads.length} leadLimit={leadLimit} />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 rounded-full bg-primary/5" />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Leads
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            {isLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p className="text-3xl font-bold text-foreground">{leads.length}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        {/* This Month with Usage Indicator */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 rounded-full bg-blue-500/5" />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            {isLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <LeadUsageIndicator 
                usedLeads={thisMonthLeads.length} 
                leadLimit={leadLimit}
                variant="compact"
              />
            )}
            <p className="text-xs text-muted-foreground mt-2">{format(new Date(), "MMMM yyyy")}</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 rounded-full bg-green-500/5" />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              New Today
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            {isLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p className="text-3xl font-bold text-foreground">{todayLeads.length}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Fresh inquiries</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 rounded-full bg-amber-500/5" />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Awaiting Response
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            {isLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p className="text-3xl font-bold text-foreground">{newLeads.length}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">New leads</p>
          </CardContent>
        </Card>
      </div>

      {/* Leads Table */}
      <Card className="shadow-sm">
        <CardHeader className="border-b border-border bg-muted/30">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>All Leads</CardTitle>
                <p className="text-sm text-muted-foreground">Click a row to view details and add notes</p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {getStatusOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date Range */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal min-w-[200px]",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                        </>
                      ) : (
                        format(dateRange.from, "MMM d, yyyy")
                      )
                    ) : (
                      <span>Date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                    numberOfMonths={2}
                    className="p-3 pointer-events-auto"
                  />
                  {(dateRange.from || dateRange.to) && (
                    <div className="border-t p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setDateRange({ from: undefined, to: undefined })}
                      >
                        Clear dates
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
                  <X className="h-4 w-4" />
                  Clear filters
                </Button>
              )}
            </div>

            {/* Active Filters Summary */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5" />
                  Showing {filteredLeads.length} of {leads.length} leads
                </span>
                {statusFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    Status: {getStatusOptions().find(o => o.value === statusFilter)?.label}
                    <button onClick={() => setStatusFilter("all")}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {dateRange.from && (
                  <Badge variant="secondary" className="gap-1">
                    {dateRange.to 
                      ? `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d")}`
                      : `From ${format(dateRange.from, "MMM d")}`
                    }
                    <button onClick={() => setDateRange({ from: undefined, to: undefined })}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-12 w-32" />
                  <Skeleton className="h-12 w-24" />
                  <Skeleton className="h-12 w-32" />
                  <Skeleton className="h-12 w-32" />
                  <Skeleton className="h-12 w-28" />
                  <Skeleton className="h-12 w-24" />
                  <Skeleton className="h-12 flex-1" />
                </div>
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-20 px-4">
              <div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-5">
                <Users className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No leads yet</h3>
              <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                When families submit contact requests for your facility, they'll appear here. 
                Make sure your listing is complete to attract more inquiries.
              </p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No matching leads</h3>
              <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                Try adjusting your filters to find what you're looking for.
              </p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear all filters
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Contact Method</TableHead>
                    <TableHead className="font-semibold">Phone</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow 
                      key={lead.id} 
                      className="hover:bg-muted/30 cursor-pointer group"
                      onClick={() => handleOpenLead(lead)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {lead.name}
                          {lead.message && (
                            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {lead.preferred_contact === "email" ? (
                            <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                              <Mail className="h-3.5 w-3.5 text-blue-600" />
                            </div>
                          ) : (
                            <div className="h-7 w-7 rounded-lg bg-green-500/10 flex items-center justify-center">
                              <Phone className="h-3.5 w-3.5 text-green-600" />
                            </div>
                          )}
                          <span className="text-sm capitalize">{lead.preferred_contact}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <a 
                          href={`tel:${lead.phone}`} 
                          className="text-sm text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {lead.phone}
                        </a>
                      </TableCell>
                      <TableCell>
                        <a 
                          href={`mailto:${lead.email}`} 
                          className="text-sm text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {lead.email}
                        </a>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(lead.created_at), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={lead.status}
                          onValueChange={(value) => 
                            updateStatus.mutate({ leadId: lead.id, status: value as LeadStatus })
                          }
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <SelectValue>
                              <LeadStatusBadge status={lead.status as LeadStatus} />
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {getStatusOptions().map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Email lead"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEmailLead(lead);
                              setEmailDialogOpen(true);
                            }}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Copy contact"
                            onClick={(e) => handleCopyContact(lead, e)}
                          >
                            {copiedId === lead.id ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="View details"
                            onClick={() => handleOpenLead(lead)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Detail Drawer */}
      <LeadDetailDrawer
        lead={selectedLead}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      {/* Email Dialog */}
      <EmailLeadDialog
        lead={emailLead}
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
      />
    </div>
  );
}
