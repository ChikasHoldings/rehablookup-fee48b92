import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Globe, DollarSign, User, Clock, Building2, FileText, Send, CheckCircle,
  CreditCard, Loader2, Plus, MessageSquare, History, AlertCircle, Receipt,
  ExternalLink, RefreshCw, XCircle
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new: { label: "New", variant: "default" },
  reviewing: { label: "Reviewing", variant: "secondary" },
  matching: { label: "Placing", variant: "secondary" },
  matched: { label: "Facilities Found", variant: "outline" },
  introductions_sent: { label: "Intros Sent", variant: "outline" },
  in_contact: { label: "In Contact", variant: "secondary" },
  admitted: { label: "Admitted", variant: "default" },
  closed: { label: "Closed", variant: "destructive" },
};

interface InternationalCase {
  id: string;
  user_id: string | null;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  client_country: string;
  status: string;
  payment_status: string;
  payment_amount_cents: number;
  refund_type: string | null;
  intake_data: Record<string, unknown>;
  intake_submitted_at: string | null;
  assigned_advisor_id: string | null;
  admin_notes: string | null;
  matched_facility_ids: string[] | null;
  accepted_facility_id: string | null;
  admission_confirmed_at: string | null;
  facility_fee_cents: number;
  facility_fee_status: string | null;
  facility_invoice_id: string | null;
  preferred_language: string | null;
  priority: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  caseData: InternationalCase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InternationalCaseDetailSheet({ caseData, open, onOpenChange }: Props) {
  const [activeTab, setActiveTab] = useState("overview");
  const [actionDialog, setActionDialog] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedAdvisor, setSelectedAdvisor] = useState("");
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [selectedFacilityForAccept, setSelectedFacilityForAccept] = useState("");
  const [refundType, setRefundType] = useState<"refunded" | "credited">("refunded");
  const [admissionRefundChoice, setAdmissionRefundChoice] = useState<"refund" | "credit">("refund");
  const [newNote, setNewNote] = useState("");
  const [searchFacility, setSearchFacility] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch admin staff for advisor assignment
  const { data: adminStaff } = useQuery({
    queryKey: ["admin-staff-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_user_profiles")
        .select("user_id, first_name, last_name, display_name, admin_role")
        .in("admin_role", ["super_admin", "manager", "advisor"])
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch case notes
  const { data: caseNotes, isLoading: notesLoading } = useQuery({
    queryKey: ["international-case-notes", caseData?.id],
    queryFn: async () => {
      if (!caseData?.id) return [];
      const { data, error } = await supabase
        .from("international_case_notes")
        .select("*")
        .eq("case_id", caseData.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && !!caseData?.id,
  });

  // Fetch case events/history
  const { data: caseEvents } = useQuery({
    queryKey: ["international-case-events", caseData?.id],
    queryFn: async () => {
      if (!caseData?.id) return [];
      const { data, error } = await supabase
        .from("international_case_events")
        .select("*")
        .eq("case_id", caseData.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: open && !!caseData?.id,
  });

  // Fetch facilities for matching
  const { data: facilities } = useQuery({
    queryKey: ["facilities-for-matching"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, city, state, facility_type")
        .eq("status", "approved")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open && (actionDialog === "invite" || actionDialog === "accept"),
  });

  // Manage case mutation
  const manageCaseMutation = useMutation({
    mutationFn: async ({ action, data }: { action: string; data?: Record<string, unknown> }) => {
      const { data: result, error } = await supabase.functions.invoke("manage-international-case", {
        body: { action, caseId: caseData?.id, data },
      });
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Action completed successfully." });
      queryClient.invalidateQueries({ queryKey: ["admin-international-cases"] });
      queryClient.invalidateQueries({ queryKey: ["admin-international-stats"] });
      queryClient.invalidateQueries({ queryKey: ["international-case-notes", caseData?.id] });
      queryClient.invalidateQueries({ queryKey: ["international-case-events", caseData?.id] });
      setActionDialog(null);
      setNewNote("");
      setSelectedFacilities([]);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message || "Action failed", variant: "destructive" });
    },
  });

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    manageCaseMutation.mutate({ action: "add_note", data: { content: newNote } });
  };

  const handleStatusChange = () => {
    if (!selectedStatus) return;
    manageCaseMutation.mutate({ action: "update_status", data: { status: selectedStatus } });
  };

  const handleAssignAdvisor = () => {
    if (!selectedAdvisor) return;
    manageCaseMutation.mutate({ action: "assign_advisor", data: { advisorId: selectedAdvisor } });
  };

  const handleInviteFacilities = () => {
    if (selectedFacilities.length === 0) return;
    manageCaseMutation.mutate({ action: "invite_facilities", data: { facilityIds: selectedFacilities } });
  };

  const handleMarkAccepted = () => {
    if (!selectedFacilityForAccept) return;
    manageCaseMutation.mutate({ action: "mark_facility_accepted", data: { facilityId: selectedFacilityForAccept } });
  };

  const handleConfirmAdmission = () => {
    if (!caseData?.accepted_facility_id) return;
    manageCaseMutation.mutate({ 
      action: "confirm_admission", 
      data: { 
        facilityId: caseData.accepted_facility_id,
        clientFeeResolution: admissionRefundChoice, // 'refund' or 'credit'
      } 
    });
  };

  const handleRefund = () => {
    manageCaseMutation.mutate({ action: "refund_client_fee", data: { refundType } });
  };

  const filteredFacilities = facilities?.filter(f => 
    f.name.toLowerCase().includes(searchFacility.toLowerCase()) ||
    f.city.toLowerCase().includes(searchFacility.toLowerCase())
  );

  if (!caseData) return null;

  const intakeData = caseData.intake_data || {};
  const currentAdvisor = adminStaff?.find(a => a.user_id === caseData.assigned_advisor_id);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              {caseData.client_name}
            </SheetTitle>
            <SheetDescription className="flex flex-wrap gap-2">
              <Badge variant={STATUS_CONFIG[caseData.status]?.variant || "secondary"}>
                {STATUS_CONFIG[caseData.status]?.label || caseData.status}
              </Badge>
              <Badge variant={(caseData.payment_status === "paid" || caseData.payment_status === "succeeded") ? "default" : "outline"}>
                ${(caseData.payment_amount_cents / 100).toFixed(0)} {caseData.payment_status}
              </Badge>
              {caseData.refund_type && <Badge variant="secondary">Fee {caseData.refund_type}</Badge>}
              {caseData.priority && <Badge variant="outline">{caseData.priority} priority</Badge>}
            </SheetDescription>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="intake">Intake</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Contact Info */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" /> Contact Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Email:</span> {caseData.client_email}</div>
                  {caseData.client_phone && <div><span className="text-muted-foreground">Phone:</span> {caseData.client_phone}</div>}
                  <div><span className="text-muted-foreground">Country:</span> {caseData.client_country}</div>
                  <div><span className="text-muted-foreground">Language:</span> {caseData.preferred_language || "English"}</div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Clock className="h-4 w-4" /> Created
                  </div>
                  <div className="font-medium">{format(new Date(caseData.created_at), "MMM d, yyyy 'at' h:mm a")}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <User className="h-4 w-4" /> Assigned Advisor
                  </div>
                  <div className="font-medium">
                    {currentAdvisor 
                      ? (currentAdvisor.display_name || `${currentAdvisor.first_name} ${currentAdvisor.last_name}`)
                      : "Unassigned"}
                  </div>
                </div>
              </div>

              {/* Matched Facilities with Status */}
              {caseData.matched_facility_ids && caseData.matched_facility_ids.length > 0 && (
                <FacilityMatchesSection caseId={caseData.id} matchedIds={caseData.matched_facility_ids} />
              )}

              {/* Facility Invoice Section */}
              {(caseData.status === "admitted" || caseData.facility_invoice_id) && (
                <FacilityInvoiceSection 
                  caseId={caseData.id}
                  invoiceId={caseData.facility_invoice_id}
                  feeStatus={caseData.facility_fee_status}
                  feeCents={caseData.facility_fee_cents}
                  onAction={(action, data) => manageCaseMutation.mutate({ action, data })}
                  isPending={manageCaseMutation.isPending}
                />
              )}

              {/* Actions */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setActionDialog("status")}>
                    Update Status
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setActionDialog("advisor")}>
                    {caseData.assigned_advisor_id ? "Reassign Advisor" : "Assign Advisor"}
                  </Button>
                  {["new", "reviewing", "matching"].includes(caseData.status) && (
                    <Button size="sm" variant="outline" onClick={() => setActionDialog("invite")}>
                      <Send className="h-3.5 w-3.5 mr-1" /> Invite Facilities
                    </Button>
                  )}
                  {caseData.matched_facility_ids && caseData.matched_facility_ids.length > 0 && !caseData.accepted_facility_id && (
                    <Button size="sm" variant="outline" onClick={() => setActionDialog("accept")}>
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Mark Facility Accepted
                    </Button>
                  )}
                  {caseData.accepted_facility_id && caseData.status !== "admitted" && (
                    <Button size="sm" variant="default" onClick={() => setActionDialog("admission")} disabled={manageCaseMutation.isPending}>
                      <Building2 className="h-3.5 w-3.5 mr-1" /> Confirm Admission
                    </Button>
                  )}
                  {(caseData.payment_status === "paid" || caseData.payment_status === "succeeded") && !caseData.refund_type && (
                    <Button size="sm" variant="outline" onClick={() => setActionDialog("refund")}>
                      <CreditCard className="h-3.5 w-3.5 mr-1" /> Refund/Credit $299
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="intake" className="space-y-4 mt-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Full Intake Data
                </h4>
                {Object.keys(intakeData).length > 0 ? (
                  <div className="grid gap-3 text-sm">
                    {Object.entries(intakeData).map(([key, value]) => (
                      <div key={key} className="flex justify-between border-b pb-2 last:border-0">
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                        <span className="font-medium text-right max-w-[60%]">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No intake data submitted yet</p>
                )}
              </div>

              {/* Quick Reference Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">Urgency</div>
                  <div className="font-medium">{(intakeData.urgency as string) || "—"}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">Budget</div>
                  <div className="font-medium">{(intakeData.budget_range as string) || "—"}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">Rehab Style</div>
                  <div className="font-medium">{(intakeData.rehab_style as string) || "—"}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">Primary Concern</div>
                  <div className="font-medium">{(intakeData.primary_concern as string) || "—"}</div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4 mt-4">
              {/* Add Note */}
              <div className="bg-muted/30 rounded-lg p-4">
                <Label className="text-sm font-medium mb-2 block">Add Internal Note</Label>
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note about this case..."
                  className="mb-2"
                />
                <Button 
                  size="sm" 
                  onClick={handleAddNote} 
                  disabled={!newNote.trim() || manageCaseMutation.isPending}
                >
                  {manageCaseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                  Add Note
                </Button>
              </div>

              {/* Notes List */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Case Notes ({caseNotes?.length || 0})
                </h4>
                {notesLoading ? (
                  <div className="text-center py-4 text-muted-foreground">Loading notes...</div>
                ) : caseNotes?.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">No notes yet</div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3 pr-4">
                      {caseNotes?.map((note) => (
                        <div key={note.id} className="bg-muted/30 rounded-lg p-3">
                          <div className="text-xs text-muted-foreground mb-1">
                            {format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4 mt-4">
              <h4 className="font-medium flex items-center gap-2">
                <History className="h-4 w-4" /> Activity Timeline
              </h4>
              {caseEvents?.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">No activity yet</div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-4">
                    {caseEvents?.map((event) => (
                      <div key={event.id} className="flex gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium capitalize">{event.event_type.replace(/_/g, " ")}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(event.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </div>
                          {event.event_data && Object.keys(event.event_data as object).length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {JSON.stringify(event.event_data)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Status Change Dialog */}
      <Dialog open={actionDialog === "status"} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Case Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button onClick={handleStatusChange} disabled={!selectedStatus || manageCaseMutation.isPending}>
              {manageCaseMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Advisor Dialog */}
      <Dialog open={actionDialog === "advisor"} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Advisor</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Select Advisor</Label>
            <Select value={selectedAdvisor} onValueChange={setSelectedAdvisor}>
              <SelectTrigger>
                <SelectValue placeholder="Select advisor..." />
              </SelectTrigger>
              <SelectContent>
                {adminStaff?.map((staff) => (
                  <SelectItem key={staff.user_id} value={staff.user_id}>
                    {staff.display_name || `${staff.first_name} ${staff.last_name}`} ({staff.admin_role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button onClick={handleAssignAdvisor} disabled={!selectedAdvisor || manageCaseMutation.isPending}>
              {manageCaseMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Facilities Dialog */}
      <Dialog open={actionDialog === "invite"} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite Facilities</DialogTitle>
            <DialogDescription>Select facilities to send this case to for review.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search facilities..."
              value={searchFacility}
              onChange={(e) => setSearchFacility(e.target.value)}
            />
            <ScrollArea className="h-[300px] border rounded-md p-2">
              <div className="space-y-2">
                {filteredFacilities?.map((facility) => (
                  <div key={facility.id} className="flex items-center gap-2 p-2 hover:bg-muted rounded">
                    <Checkbox
                      checked={selectedFacilities.includes(facility.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedFacilities([...selectedFacilities, facility.id]);
                        } else {
                          setSelectedFacilities(selectedFacilities.filter(id => id !== facility.id));
                        }
                      }}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{facility.name}</div>
                      <div className="text-xs text-muted-foreground">{facility.city}, {facility.state}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="text-sm text-muted-foreground">
              {selectedFacilities.length} facilities selected
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button onClick={handleInviteFacilities} disabled={selectedFacilities.length === 0 || manageCaseMutation.isPending}>
              {manageCaseMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Send Invitations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Facility Accepted Dialog */}
      <Dialog open={actionDialog === "accept"} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Facility Accepted</DialogTitle>
            <DialogDescription>Which facility has accepted this client?</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Select Facility</Label>
            <Select value={selectedFacilityForAccept} onValueChange={setSelectedFacilityForAccept}>
              <SelectTrigger>
                <SelectValue placeholder="Select facility..." />
              </SelectTrigger>
              <SelectContent>
                {caseData.matched_facility_ids?.map((facId) => {
                  const fac = facilities?.find(f => f.id === facId);
                  return (
                    <SelectItem key={facId} value={facId}>
                      {fac?.name || facId}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button onClick={handleMarkAccepted} disabled={!selectedFacilityForAccept || manageCaseMutation.isPending}>
              {manageCaseMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Admission Dialog - with Refund/Credit choice */}
      <Dialog open={actionDialog === "admission"} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Admission</DialogTitle>
            <DialogDescription>
              This will mark the case as admitted, create a $4,500 facility invoice, and process the client's $299 fee.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium mb-1">Admitting Facility</p>
              <p className="text-sm text-muted-foreground">
                {facilities?.find(f => f.id === caseData.accepted_facility_id)?.name || "Selected facility"}
              </p>
            </div>
            
            <div className="space-y-3">
              <Label className="text-sm font-medium">Client Fee Resolution ($299)</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="clientFeeResolution"
                    value="refund"
                    checked={admissionRefundChoice === "refund"}
                    onChange={() => setAdmissionRefundChoice("refund")}
                    className="h-4 w-4 text-primary"
                  />
                  <div>
                    <p className="font-medium text-sm">Refund $299</p>
                    <p className="text-xs text-muted-foreground">Process refund to client's original payment method via Stripe</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="clientFeeResolution"
                    value="credit"
                    checked={admissionRefundChoice === "credit"}
                    onChange={() => setAdmissionRefundChoice("credit")}
                    className="h-4 w-4 text-primary"
                  />
                  <div>
                    <p className="font-medium text-sm">Credit $299</p>
                    <p className="text-xs text-muted-foreground">Mark as credited for future services (no Stripe refund)</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                This action will also create a $4,500 facility invoice
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button onClick={handleConfirmAdmission} disabled={manageCaseMutation.isPending}>
              {manageCaseMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm Admission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Standalone Refund Dialog (for cases already admitted without resolution) */}
      <Dialog open={actionDialog === "refund"} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund or Credit Client Fee</DialogTitle>
            <DialogDescription>
              The client paid $299 for placement coordination.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Resolution Type</Label>
            <Select value={refundType} onValueChange={(v) => setRefundType(v as "refunded" | "credited")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="refunded">Refund to original payment method</SelectItem>
                <SelectItem value="credited">Credit for future services</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button onClick={handleRefund} disabled={manageCaseMutation.isPending}>
              {manageCaseMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {refundType === "refunded" ? "Process Refund" : "Mark as Credited"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Sub-component to display facility matches with statuses
function FacilityMatchesSection({ caseId, matchedIds }: { caseId: string; matchedIds: string[] }) {
  const { data: matches } = useQuery({
    queryKey: ["international-case-matches", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("international_case_facility_matches")
        .select(`
          *,
          facilities (id, name, city, state)
        `)
        .eq("case_id", caseId);
      if (error) throw error;
      return data;
    },
  });

  const { data: facilitiesData } = useQuery({
    queryKey: ["facilities-by-ids", matchedIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, city, state")
        .in("id", matchedIds);
      if (error) throw error;
      return data;
    },
    enabled: matchedIds.length > 0,
  });

  const STATUS_BADGE: Record<string, { label: string; className: string }> = {
    invited: { label: "Invited", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
    accepted: { label: "Interested", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
    declined: { label: "Declined", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  };

  return (
    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <h4 className="font-medium mb-3 flex items-center gap-2">
        <Building2 className="h-4 w-4" /> Invited Facilities ({matchedIds.length})
      </h4>
      <div className="space-y-2">
        {matchedIds.map((facId) => {
          const match = matches?.find((m) => m.facility_id === facId);
          const facility = match?.facilities || facilitiesData?.find((f) => f.id === facId);
          const status = match?.status || "invited";
          const statusConfig = STATUS_BADGE[status] || STATUS_BADGE.invited;

          return (
            <div key={facId} className="flex items-center justify-between text-sm bg-white dark:bg-gray-900 rounded px-3 py-2">
              <div>
                <span className="font-medium">{facility?.name || "Unknown Facility"}</span>
                {facility?.city && (
                  <span className="text-muted-foreground ml-2">
                    {facility.city}, {facility.state}
                  </span>
                )}
              </div>
              <Badge className={statusConfig.className} variant="outline">
                {statusConfig.label}
              </Badge>
            </div>
          );
        })}
      </div>
      {matches?.some((m) => m.status === "accepted") && (
        <p className="text-sm text-green-600 font-medium mt-3">
          ✓ One or more facilities have expressed interest
        </p>
      )}
    </div>
  );
}

// Sub-component for managing facility invoices
interface FacilityInvoiceSectionProps {
  caseId: string;
  invoiceId: string | null;
  feeStatus: string | null;
  feeCents: number;
  onAction: (action: string, data?: Record<string, unknown>) => void;
  isPending: boolean;
}

function FacilityInvoiceSection({ caseId, invoiceId, feeStatus, feeCents, onAction, isPending }: FacilityInvoiceSectionProps) {
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const { toast } = useToast();

  // Fetch invoice details if we have an ID
  const { data: invoice, isLoading } = useQuery({
    queryKey: ["international-facility-invoice", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      const { data, error } = await supabase
        .from("international_facility_invoices")
        .select(`
          *,
          facilities (name, email)
        `)
        .eq("id", invoiceId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });

  const INVOICE_STATUS_BADGE: Record<string, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-gray-100 text-gray-600" },
    pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
    sent: { label: "Sent", className: "bg-blue-100 text-blue-800" },
    paid: { label: "Paid", className: "bg-green-100 text-green-800" },
    uncollectible: { label: "Failed", className: "bg-red-100 text-red-800" },
    void: { label: "Voided", className: "bg-gray-100 text-gray-500" },
    waived: { label: "Waived", className: "bg-purple-100 text-purple-800" },
  };

  const statusConfig = INVOICE_STATUS_BADGE[invoice?.status || feeStatus || "pending"] || INVOICE_STATUS_BADGE.pending;

  const handleIssueInvoice = () => {
    if (!invoiceId) {
      toast({ title: "Error", description: "No invoice created for this case", variant: "destructive" });
      return;
    }
    onAction("issue_facility_invoice", { invoiceId });
  };

  const handleResendInvoice = () => {
    if (!invoiceId) return;
    onAction("resend_facility_invoice", { invoiceId });
  };

  const handleVoidInvoice = () => {
    if (!invoiceId || !voidReason.trim()) return;
    onAction("void_facility_invoice", { invoiceId, reason: voidReason });
    setShowVoidDialog(false);
    setVoidReason("");
  };

  return (
    <>
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Receipt className="h-4 w-4" /> Facility Invoice ($4,500)
        </h4>
        
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading invoice...</div>
        ) : (
          <div className="space-y-3">
            {/* Invoice Status */}
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">${(feeCents / 100).toLocaleString()}</span>
              <Badge className={statusConfig.className} variant="outline">
                {statusConfig.label}
              </Badge>
            </div>

            {/* Invoice Details */}
            {invoice && (
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Facility: {invoice.facilities?.name || "Unknown"}</div>
                {invoice.sent_at && <div>Sent: {format(new Date(invoice.sent_at), "MMM d, yyyy")}</div>}
                {invoice.due_date && <div>Due: {format(new Date(invoice.due_date), "MMM d, yyyy")}</div>}
                {invoice.paid_at && <div>Paid: {format(new Date(invoice.paid_at), "MMM d, yyyy")}</div>}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {/* Issue Invoice - only if draft/pending */}
              {(!invoice || invoice.status === "draft" || invoice.status === "pending") && (
                <Button 
                  size="sm" 
                  onClick={handleIssueInvoice}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                  Issue $4,500 Invoice
                </Button>
              )}

              {/* Resend Invoice - only if sent/unpaid */}
              {invoice?.status === "sent" && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleResendInvoice}
                  disabled={isPending}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Resend
                </Button>
              )}

              {/* View in Stripe - if we have stripe_invoice_id */}
              {invoice?.stripe_invoice_id && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.open(`https://dashboard.stripe.com/invoices/${invoice.stripe_invoice_id}`, "_blank")}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  View in Stripe
                </Button>
              )}

              {/* Void Invoice - only if not paid/void/waived */}
              {invoice && !["paid", "void", "waived"].includes(invoice.status) && (
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowVoidDialog(true)}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Void
                </Button>
              )}
            </div>

            {/* Status Messages */}
            {invoice?.status === "paid" && (
              <p className="text-sm text-green-600 font-medium flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> Invoice paid in full
              </p>
            )}
            {invoice?.status === "uncollectible" && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> Payment failed - follow up required
              </p>
            )}
          </div>
        )}
      </div>

      {/* Void Dialog */}
      <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Invoice</DialogTitle>
            <DialogDescription>
              This will mark the $4,500 facility invoice as void and cancel it in Stripe.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Reason for voiding</Label>
            <Textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Enter reason..."
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVoidDialog(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleVoidInvoice}
              disabled={!voidReason.trim() || isPending}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Void Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
