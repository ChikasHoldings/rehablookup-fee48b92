import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addHours, addDays, isPast, formatDistanceToNow } from "date-fns";
import {
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  Copy,
  ExternalLink,
  Check,
  Plus,
  Trash2,
  Loader2,
  Send,
  Clock,
  ShieldCheck,
  ShieldX,
  User,
  MapPin,
  AlertTriangle,
  Stethoscope,
  CreditCard,
  Sparkles,
  BellOff,
  Bell,
  Building2,
  FileText,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LeadScoreBadge } from "@/components/provider/leads/LeadScoreBadge";
import { LeadStatusBadge, getStatusOptions, type LeadStatus } from "@/components/provider/leads/LeadStatusBadge";
import { EmailLeadDialog } from "@/components/provider/leads/EmailLeadDialog";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string | null;
  preferred_contact: string;
  created_at: string;
  status: string;
  facility_id: string | null;
  source: string | null;
  email_verified: boolean | null;
  snooze_until: string | null;
  who_seeking_help: string | null;
  location_zip: string | null;
  location_city_state: string | null;
  urgency: string | null;
  primary_substance: string[] | null;
  level_of_care: string | null;
  dual_diagnosis: string | null;
  insurance_type: string | null;
  insurance_provider: string | null;
  budget_preference: string | null;
}

interface LeadNote {
  id: string;
  lead_id: string;
  user_id: string;
  note: string;
  created_at: string;
}

interface LeadEmail {
  id: string;
  lead_id: string;
  sender_name: string;
  template_name: string;
  custom_note: string | null;
  created_at: string;
  status: string;
}

interface Facility {
  id: string;
  name: string;
  city: string;
  state: string;
}

interface LeadProfileModalProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin?: boolean;
  facilities?: Facility[];
  onAssign?: (leadId: string, facilityId: string) => void;
  isAssigning?: boolean;
}

export function LeadProfileModal({
  lead,
  open,
  onOpenChange,
  isAdmin = false,
  facilities = [],
  onAssign,
  isAssigning = false,
}: LeadProfileModalProps) {
  const [newNote, setNewNote] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("");
  const queryClient = useQueryClient();

  // Fetch notes for this lead
  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ["lead-notes", lead?.id],
    queryFn: async (): Promise<LeadNote[]> => {
      if (!lead?.id) return [];
      const { data, error } = await supabase
        .from("lead_notes")
        .select("*")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!lead?.id && open,
  });

  // Fetch email history for this lead
  const { data: emails = [], isLoading: emailsLoading } = useQuery({
    queryKey: ["lead-emails", lead?.id],
    queryFn: async (): Promise<LeadEmail[]> => {
      if (!lead?.id) return [];
      const { data, error } = await supabase
        .from("lead_emails")
        .select("id, lead_id, sender_name, template_name, custom_note, created_at, status")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!lead?.id && open,
  });

  // Fetch assigned facility details for admin view
  const { data: assignedFacility } = useQuery({
    queryKey: ["lead-facility", lead?.facility_id],
    queryFn: async (): Promise<Facility | null> => {
      if (!lead?.facility_id) return null;
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, city, state")
        .eq("id", lead.facility_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!lead?.facility_id && open && isAdmin,
  });

  // Update status mutation
  const updateStatus = useMutation({
    mutationFn: async (newStatus: LeadStatus) => {
      if (!lead) return;
      const { error } = await supabase
        .from("leads")
        .update({ status: newStatus })
        .eq("id", lead.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-leads"] });
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      toast.success("Status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  // Snooze reminder mutation (provider only)
  const snoozeReminder = useMutation({
    mutationFn: async (snoozeUntil: Date | null) => {
      if (!lead) return;
      const { error } = await supabase
        .from("leads")
        .update({ snooze_until: snoozeUntil?.toISOString() || null })
        .eq("id", lead.id);
      if (error) throw error;
    },
    onSuccess: (_, snoozeUntil) => {
      queryClient.invalidateQueries({ queryKey: ["provider-leads"] });
      if (snoozeUntil) {
        toast.success("Reminders snoozed", {
          description: `Until ${format(snoozeUntil, "MMM d 'at' h:mm a")}`,
        });
      } else {
        toast.success("Snooze removed");
      }
    },
    onError: () => {
      toast.error("Failed to update snooze");
    },
  });

  const isSnoozed = lead?.snooze_until && !isPast(new Date(lead.snooze_until));

  // Add note mutation
  const addNote = useMutation({
    mutationFn: async (note: string) => {
      if (!lead) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("lead_notes")
        .insert({ lead_id: lead.id, user_id: user.id, note });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-notes", lead?.id] });
      setNewNote("");
      toast.success("Note added");
    },
    onError: () => {
      toast.error("Failed to add note");
    },
  });

  // Delete note mutation
  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from("lead_notes").delete().eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-notes", lead?.id] });
      toast.success("Note deleted");
    },
    onError: () => {
      toast.error("Failed to delete note");
    },
  });

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success("Copied to clipboard");
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      addNote.mutate(newNote.trim());
    }
  };

  const handleAssignLead = () => {
    if (lead && selectedFacilityId && onAssign) {
      onAssign(lead.id, selectedFacilityId);
    }
  };

  if (!lead) return null;

  const formatUrgency = (urgency: string | null) => {
    if (!urgency) return "Not specified";
    const map: Record<string, string> = {
      immediate: "Immediate (ASAP)",
      "within-week": "Within a Week",
      "within-month": "Within a Month",
      researching: "Just Researching",
    };
    return map[urgency] || urgency;
  };

  const formatLevelOfCare = (level: string | null) => {
    if (!level) return "Not specified";
    const map: Record<string, string> = {
      detox: "Detox",
      residential: "Residential Inpatient",
      php: "Partial Hospitalization (PHP)",
      iop: "Intensive Outpatient (IOP)",
      outpatient: "Outpatient",
      "not-sure": "Not Sure",
    };
    return map[level] || level;
  };

  const formatInsurance = (type: string | null) => {
    if (!type) return "Not specified";
    const map: Record<string, string> = {
      ppo: "PPO / Private Insurance",
      medicaid: "Medicaid",
      medicare: "Medicare",
      "self-pay": "Self-Pay / Cash",
      "not-sure": "Not Sure",
    };
    return map[type] || type;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b bg-muted/30">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <DialogTitle className="text-xl font-semibold truncate">
                    {lead.name}
                  </DialogTitle>
                  <LeadStatusBadge status={lead.status as LeadStatus} />
                  {lead.source === "Request Help Page" ? (
                    <Badge className="gap-1 text-xs bg-primary/10 text-primary border-primary/20">
                      <Sparkles className="h-3 w-3" />
                      Qualified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <FileText className="h-3 w-3" />
                      Direct
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(lead.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                  {lead.email_verified && (
                    <span className="flex items-center gap-1 text-green-600">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Email Verified
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0">
                <LeadScoreBadge lead={lead} />
              </div>
            </div>
          </DialogHeader>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="border-b px-6">
              <TabsList className="h-12 w-full justify-start bg-transparent gap-4 p-0">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="intake"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3"
                >
                  Intake Details
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3"
                >
                  Activity & Notes
                </TabsTrigger>
                <TabsTrigger
                  value="communications"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3"
                >
                  Communications
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              {/* Overview Tab */}
              <TabsContent value="overview" className="p-6 space-y-6 mt-0">
                {/* Status Update */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Select
                    value={lead.status}
                    onValueChange={(value) => updateStatus.mutate(value as LeadStatus)}
                    disabled={updateStatus.isPending}
                  >
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getStatusOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Contact Information */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Contact Information</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Phone */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <Phone className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{lead.phone}</p>
                          <p className="text-xs text-muted-foreground">
                            {lead.preferred_contact === "call" ? "Preferred" : "Phone"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCopy(lead.phone, "phone")}
                        >
                          {copiedField === "phone" ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={`tel:${lead.phone}`}>
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Mail className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{lead.email}</p>
                            {lead.email_verified ? (
                              <Badge variant="secondary" className="gap-1 text-xs bg-green-100 text-green-700 border-0 flex-shrink-0">
                                <ShieldCheck className="h-3 w-3" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-xs text-muted-foreground flex-shrink-0">
                                <ShieldX className="h-3 w-3" />
                                Unverified
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {lead.preferred_contact === "email" ? "Preferred" : "Email"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCopy(lead.email, "email")}
                        >
                          {copiedField === "email" ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={`mailto:${lead.email}`}>
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location */}
                {(lead.location_city_state || lead.location_zip) && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">Location</h3>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border w-fit">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {lead.location_city_state || lead.location_zip}
                      </span>
                    </div>
                  </div>
                )}

                {/* Message */}
                {lead.message && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Message
                    </h3>
                    <div className="p-4 rounded-lg bg-muted/50 border text-sm whitespace-pre-wrap">
                      {lead.message}
                    </div>
                  </div>
                )}

                {/* Admin: Assignment Info (Read-only) */}
                {isAdmin && (
                  <div className="space-y-3 p-4 rounded-lg bg-muted/50 border">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Assignment Details
                    </h3>
                    {lead.facility_id && assignedFacility ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{assignedFacility.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {assignedFacility.city}, {assignedFacility.state}
                            </p>
                          </div>
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            Assigned
                          </Badge>
                        </div>
                        {(lead as any).assignment_reason && (
                          <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                            {(lead as any).assignment_reason}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50">
                          Unassigned
                        </Badge>
                        {(lead as any).assignment_reason && (
                          <p className="text-xs text-muted-foreground">
                            Reason: {(lead as any).assignment_reason}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground italic">
                          Leads are automatically assigned by the system
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Provider: Snooze Reminders */}
                {!isAdmin && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <BellOff className="h-4 w-4" />
                      Snooze Reminders
                    </label>
                    {isSnoozed ? (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <BellOff className="h-4 w-4 text-amber-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-800">Reminders snoozed</p>
                          <p className="text-xs text-amber-600">
                            Until {format(new Date(lead.snooze_until!), "MMM d 'at' h:mm a")} (
                            {formatDistanceToNow(new Date(lead.snooze_until!), { addSuffix: true })})
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => snoozeReminder.mutate(null)}
                          disabled={snoozeReminder.isPending}
                          className="gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-100"
                        >
                          {snoozeReminder.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Bell className="h-3.5 w-3.5" />
                          )}
                          Unsnooze
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => snoozeReminder.mutate(addHours(new Date(), 4))}
                          disabled={snoozeReminder.isPending}
                          className="gap-1.5"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          4 hours
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => snoozeReminder.mutate(addDays(new Date(), 1))}
                          disabled={snoozeReminder.isPending}
                          className="gap-1.5"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          1 day
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => snoozeReminder.mutate(addDays(new Date(), 3))}
                          disabled={snoozeReminder.isPending}
                          className="gap-1.5"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          3 days
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => snoozeReminder.mutate(addDays(new Date(), 7))}
                          disabled={snoozeReminder.isPending}
                          className="gap-1.5"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          1 week
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Button variant="outline" className="gap-2" asChild>
                    <a href={`tel:${lead.phone}`}>
                      <Phone className="h-4 w-4" />
                      Call Lead
                    </a>
                  </Button>
                  <Button className="gap-2" onClick={() => setEmailDialogOpen(true)}>
                    <Mail className="h-4 w-4" />
                    Email Lead
                  </Button>
                </div>
              </TabsContent>

              {/* Intake Details Tab */}
              <TabsContent value="intake" className="p-6 space-y-6 mt-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Who Seeking Help */}
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Seeking Help For
                      </span>
                    </div>
                    <p className="text-sm font-medium">
                      {lead.who_seeking_help === "self"
                        ? "Themselves"
                        : lead.who_seeking_help === "loved-one"
                        ? "A Loved One"
                        : "Not specified"}
                    </p>
                  </div>

                  {/* Urgency */}
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Urgency
                      </span>
                    </div>
                    <p className="text-sm font-medium">{formatUrgency(lead.urgency)}</p>
                  </div>

                  {/* Level of Care */}
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-2 mb-2">
                      <Stethoscope className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Level of Care
                      </span>
                    </div>
                    <p className="text-sm font-medium">{formatLevelOfCare(lead.level_of_care)}</p>
                  </div>

                  {/* Insurance */}
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Insurance
                      </span>
                    </div>
                    <p className="text-sm font-medium">
                      {formatInsurance(lead.insurance_type)}
                      {lead.insurance_provider && (
                        <span className="text-muted-foreground"> ({lead.insurance_provider})</span>
                      )}
                    </p>
                  </div>

                  {/* Dual Diagnosis */}
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-2 mb-2">
                      <Stethoscope className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Mental Health Concern
                      </span>
                    </div>
                    <p className="text-sm font-medium capitalize">
                      {lead.dual_diagnosis === "not-sure"
                        ? "Not Sure"
                        : lead.dual_diagnosis || "Not specified"}
                    </p>
                  </div>

                  {/* Budget */}
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Budget Preference
                      </span>
                    </div>
                    <p className="text-sm font-medium capitalize">
                      {lead.budget_preference || "Not specified"}
                    </p>
                  </div>
                </div>

                {/* Primary Substances */}
                {lead.primary_substance && lead.primary_substance.length > 0 && (
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-2 mb-3">
                      <Stethoscope className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Substances of Concern
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {lead.primary_substance.map((substance, idx) => (
                        <Badge key={idx} variant="secondary">
                          {substance}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="p-4 rounded-lg bg-muted/30 border space-y-3">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Submission Metadata
                  </h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Source</span>
                      <span className="font-medium">{lead.source || "Direct"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Submitted</span>
                      <span className="font-medium">
                        {format(new Date(lead.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email Verified</span>
                      <span className="font-medium">{lead.email_verified ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Activity & Notes Tab */}
              <TabsContent value="activity" className="p-6 space-y-6 mt-0">
                {/* Add Note */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Add Note</h3>
                  <Textarea
                    placeholder="Add a note about this lead..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[100px] resize-none"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || addNote.isPending}
                    className="gap-2"
                  >
                    {addNote.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Add Note
                  </Button>
                </div>

                {/* Notes List */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    Internal Notes ({notes.length})
                  </h3>
                  {notesLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No notes yet. Add one above to track your follow-ups.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {notes.map((note) => (
                        <div
                          key={note.id}
                          className="p-4 rounded-lg bg-muted/50 border group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm flex-1 whitespace-pre-wrap">{note.note}</p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                              onClick={() => deleteNote.mutate(note.id)}
                              disabled={deleteNote.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Communications Tab */}
              <TabsContent value="communications" className="p-6 space-y-6 mt-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Email History ({emails.length})
                  </h3>
                  <Button size="sm" className="gap-2" onClick={() => setEmailDialogOpen(true)}>
                    <Mail className="h-4 w-4" />
                    Send Email
                  </Button>
                </div>

                {emailsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : emails.length === 0 ? (
                  <div className="text-center py-12">
                    <Mail className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">No emails sent yet</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 gap-2"
                      onClick={() => setEmailDialogOpen(true)}
                    >
                      <Send className="h-4 w-4" />
                      Send First Email
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {emails.map((email) => (
                      <div
                        key={email.id}
                        className="p-4 rounded-lg bg-blue-50/50 border border-blue-100"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {email.template_name}
                            </p>
                            {email.custom_note && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                "{email.custom_note}"
                              </p>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className="text-xs bg-green-50 text-green-700 border-green-200"
                          >
                            {email.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(email.created_at), "MMM d, yyyy 'at' h:mm a")}
                          <span className="text-muted-foreground/50">•</span>
                          by {email.sender_name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <EmailLeadDialog lead={lead} open={emailDialogOpen} onOpenChange={setEmailDialogOpen} />
    </>
  );
}
