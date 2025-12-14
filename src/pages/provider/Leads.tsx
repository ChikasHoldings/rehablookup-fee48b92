import { useQuery } from "@tanstack/react-query";
import { Users, Mail, Phone, Calendar, MessageSquare, TrendingUp, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, isToday } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useProviderData } from "@/hooks/useProviderData";

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string | null;
  preferred_contact: string;
  created_at: string;
  facility_id: string;
}

export default function ProviderLeadsPage() {
  const { data: providerData } = useProviderData();
  const facilityId = providerData?.facility?.id;

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["provider-leads", facilityId],
    queryFn: async (): Promise<Lead[]> => {
      if (!facilityId) return [];

      // Get leads for user's facility
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("facility_id", facilityId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const thisMonthLeads = leads.filter(lead => {
    const leadDate = new Date(lead.created_at);
    return leadDate >= startOfMonth(new Date());
  });

  const todayLeads = leads.filter(lead => isToday(new Date(lead.created_at)));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Leads</h1>
        <p className="text-muted-foreground mt-1">
          Contact requests from families seeking treatment
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
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
              <p className="text-3xl font-bold text-foreground">{thisMonthLeads.length}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{format(new Date(), "MMMM yyyy")}</p>
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
      </div>

      {/* Leads Table */}
      <Card className="shadow-sm">
        <CardHeader className="border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>All Leads</CardTitle>
              <p className="text-sm text-muted-foreground">Contact requests for your facility</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-12 w-32" />
                  <Skeleton className="h-12 w-48" />
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
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Contact</TableHead>
                    <TableHead className="font-semibold">Preferred</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <a 
                            href={`tel:${lead.phone}`} 
                            className="flex items-center gap-2 text-sm text-primary hover:underline"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {lead.phone}
                          </a>
                          <a 
                            href={`mailto:${lead.email}`} 
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            {lead.email}
                          </a>
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
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(lead.created_at), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.message ? (
                          <div className="flex items-center gap-2 max-w-[300px]">
                            <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm text-muted-foreground truncate">
                              {lead.message}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground/50 italic">No message</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
