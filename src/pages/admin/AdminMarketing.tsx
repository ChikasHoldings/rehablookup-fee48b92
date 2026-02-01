import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Megaphone,
  Users,
  Mail,
  TrendingUp,
  Search,
  ChevronDown,
  ExternalLink,
  Phone,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MarketingLead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  location_city_state: string | null;
  location_zip: string | null;
  urgency: string | null;
  level_of_care: string | null;
  insurance_type: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  facilities_requested: string[] | null;
  followup_email_sent: boolean;
  converted_to_concierge: boolean;
  status: string;
  created_at: string;
  admin_notes: string | null;
}

export default function AdminMarketing() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<MarketingLead | null>(null);

  // Fetch marketing leads
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["admin-marketing-leads", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("marketing_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as MarketingLead[];
    },
  });

  // Filter leads by search
  const filteredLeads = leads.filter((lead) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      lead.first_name?.toLowerCase().includes(searchLower) ||
      lead.last_name?.toLowerCase().includes(searchLower) ||
      lead.email?.toLowerCase().includes(searchLower) ||
      lead.phone?.includes(searchQuery)
    );
  });

  // Calculate stats
  const totalLeads = leads.length;
  const convertedLeads = leads.filter((l) => l.converted_to_concierge).length;
  const pendingFollowup = leads.filter(
    (l) => !l.followup_email_sent && (l.facilities_requested?.length || 0) === 0
  ).length;
  const engagedLeads = leads.filter(
    (l) => (l.facilities_requested?.length || 0) > 0
  ).length;

  const getStatusBadge = (lead: MarketingLead) => {
    if (lead.converted_to_concierge) {
      return <Badge className="bg-violet-100 text-violet-700">Concierge</Badge>;
    }
    if ((lead.facilities_requested?.length || 0) > 0) {
      return <Badge className="bg-green-100 text-green-700">Engaged</Badge>;
    }
    if (lead.followup_email_sent) {
      return <Badge className="bg-blue-100 text-blue-700">Followed Up</Badge>;
    }
    return <Badge variant="secondary">New</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Marketing Leads
          </h1>
          <p className="text-muted-foreground">
            Leads captured from paid advertising campaigns
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalLeads}</p>
                <p className="text-sm text-muted-foreground">Total Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{engagedLeads}</p>
                <p className="text-sm text-muted-foreground">Engaged</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 rounded-lg">
                <ExternalLink className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{convertedLeads}</p>
                <p className="text-sm text-muted-foreground">Concierge</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Mail className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingFollowup}</p>
                <p className="text-sm text-muted-foreground">Pending F/U</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No marketing leads found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedLead(lead)}
                  >
                    <TableCell className="font-medium">
                      {lead.first_name} {lead.last_name}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{lead.email}</div>
                        <div className="text-muted-foreground">{lead.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {lead.location_city_state || lead.location_zip || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {lead.utm_source || "direct"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {lead.facilities_requested?.length || 0}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(lead)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(lead.created_at), "MMM d, h:mm a")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedLead?.first_name} {selectedLead?.last_name}
            </DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              {/* Contact Info */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${selectedLead.email}`} className="text-primary hover:underline">
                    {selectedLead.email}
                  </a>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${selectedLead.phone}`} className="text-primary hover:underline">
                    {selectedLead.phone}
                  </a>
                </div>
                {(selectedLead.location_city_state || selectedLead.location_zip) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {selectedLead.location_city_state || selectedLead.location_zip}
                  </div>
                )}
              </div>

              {/* Clinical Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Urgency:</span>
                  <p className="font-medium">{selectedLead.urgency || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Level of Care:</span>
                  <p className="font-medium">{selectedLead.level_of_care || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Insurance:</span>
                  <p className="font-medium">{selectedLead.insurance_type || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Facilities Requested:</span>
                  <p className="font-medium">{selectedLead.facilities_requested?.length || 0}</p>
                </div>
              </div>

              {/* UTM Tracking */}
              {(selectedLead.utm_source || selectedLead.utm_campaign) && (
                <div className="bg-blue-50 rounded-lg p-3 text-sm">
                  <p className="font-medium text-blue-800 mb-1">Campaign Tracking</p>
                  <div className="text-blue-700 space-y-1">
                    {selectedLead.utm_source && <div>Source: {selectedLead.utm_source}</div>}
                    {selectedLead.utm_campaign && <div>Campaign: {selectedLead.utm_campaign}</div>}
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="flex items-center gap-2 pt-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                {getStatusBadge(selectedLead)}
                {selectedLead.followup_email_sent && (
                  <Badge variant="outline" className="text-xs">
                    Follow-up Sent
                  </Badge>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
