import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Users,
  Search,
  Filter,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  AlertCircle,
  Building2,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  location_city_state: string | null;
  location_zip: string | null;
  level_of_care: string | null;
  urgency: string | null;
  insurance_type: string | null;
  insurance_provider: string | null;
  who_seeking_help: string | null;
  primary_substance: string[] | null;
  message: string | null;
  email_verified: boolean;
  status: string;
  source: string | null;
  created_at: string;
  facility_id: string | null;
};

type Facility = {
  id: string;
  name: string;
  city: string;
  state: string;
};

export default function AdminLeads() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState(
    searchParams.get("unassigned") === "true" ? "unassigned" : "all"
  );
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  // Fetch leads
  const { data: leads, isLoading } = useQuery({
    queryKey: ["admin-leads", assignmentFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (assignmentFilter === "unassigned") {
        query = query.is("facility_id", null);
      } else if (assignmentFilter === "assigned") {
        query = query.not("facility_id", "is", null);
      }

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as Lead[];
    },
  });

  // Fetch facilities for assignment
  const { data: facilities } = useQuery({
    queryKey: ["admin-facilities-for-assignment"],
    queryFn: async () => {
      const { data } = await supabase
        .from("facilities")
        .select("id, name, city, state")
        .eq("status", "approved")
        .eq("suspended", false)
        .order("name");
      return data as Facility[];
    },
  });

  // Assign lead mutation
  const assignLead = useMutation({
    mutationFn: async ({ leadId, facilityId }: { leadId: string; facilityId: string }) => {
      const { error } = await supabase
        .from("leads")
        .update({ facility_id: facilityId })
        .eq("id", leadId);
      if (error) throw error;

      // Log admin action
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("admin_audit_log").insert({
        admin_user_id: user?.id,
        action_type: "lead_assigned",
        target_type: "lead",
        target_id: leadId,
        details: { facility_id: facilityId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      toast.success("Lead assigned successfully");
      setShowAssignDialog(false);
    },
    onError: () => {
      toast.error("Failed to assign lead");
    },
  });

  const openLeadDetail = (lead: Lead) => {
    setSelectedLead(lead);
    setShowDetailDialog(true);
  };

  const openAssignDialog = (lead: Lead) => {
    setSelectedLead(lead);
    setShowAssignDialog(true);
  };

  const handleAssign = (facilityId: string) => {
    if (!selectedLead) return;
    assignLead.mutate({ leadId: selectedLead.id, facilityId });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Leads Management</h1>
        <p className="text-muted-foreground">Review and route incoming leads</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Assignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leads</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Leads ({leads?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : leads && leads.length > 0 ? (
            <div className="space-y-2">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-background hover:bg-muted/50 transition-colors gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{lead.name}</p>
                      {lead.email_verified && (
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {lead.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {lead.phone}
                      </span>
                      {lead.location_city_state && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {lead.location_city_state}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {!lead.facility_id ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                          Unassigned
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                          Assigned
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground hidden md:block">
                        {format(new Date(lead.created_at), "MMM d, yyyy")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openLeadDetail(lead)}
                      >
                        View
                      </Button>
                      {!lead.facility_id && (
                        <Button
                          size="sm"
                          onClick={() => openAssignDialog(lead)}
                        >
                          Assign
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No leads found</p>
          )}
        </CardContent>
      </Card>

      {/* Lead Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
            <DialogDescription>
              Submitted {selectedLead && format(new Date(selectedLead.created_at), "MMMM d, yyyy 'at' h:mm a")}
            </DialogDescription>
          </DialogHeader>

          {selectedLead && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6 pr-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{selectedLead.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{selectedLead.email}</p>
                      {selectedLead.email_verified && (
                        <Badge variant="outline" className="text-green-600">Verified</Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedLead.phone}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">
                      {selectedLead.location_city_state || selectedLead.location_zip || "Not provided"}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Level of Care</p>
                    <p className="font-medium">{selectedLead.level_of_care || "Not specified"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Urgency</p>
                    <p className="font-medium">{selectedLead.urgency || "Not specified"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Insurance</p>
                    <p className="font-medium">
                      {selectedLead.insurance_type || "Not specified"}
                      {selectedLead.insurance_provider && ` - ${selectedLead.insurance_provider}`}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Seeking Help For</p>
                    <p className="font-medium">{selectedLead.who_seeking_help || "Not specified"}</p>
                  </div>
                </div>

                {selectedLead.primary_substance && selectedLead.primary_substance.length > 0 && (
                  <div className="border-t pt-4 space-y-2">
                    <p className="text-sm text-muted-foreground">Primary Substances</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedLead.primary_substance.map((substance) => (
                        <Badge key={substance} variant="secondary">
                          {substance}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLead.message && (
                  <div className="border-t pt-4 space-y-2">
                    <p className="text-sm text-muted-foreground">Message</p>
                    <p className="text-sm bg-muted p-3 rounded-lg">{selectedLead.message}</p>
                  </div>
                )}

                {!selectedLead.facility_id && (
                  <div className="border-t pt-4">
                    <Button
                      className="w-full"
                      onClick={() => {
                        setShowDetailDialog(false);
                        openAssignDialog(selectedLead);
                      }}
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Assign to Provider
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Lead to Provider</DialogTitle>
            <DialogDescription>
              Select a provider to receive this lead
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 pr-4">
              {facilities?.map((facility) => (
                <button
                  key={facility.id}
                  onClick={() => handleAssign(facility.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors text-left"
                >
                  <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{facility.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {facility.city}, {facility.state}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
