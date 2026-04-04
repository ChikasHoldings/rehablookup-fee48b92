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
  Activity,
  TrendingUp,
  Heart,
  UserCheck,
  Zap,
  Briefcase,
  Medal,
  Scale,
  Brain,
  History,
  Target,
  Users,
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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatSourceLabel } from "@/lib/sourceLabels";
import { LeadStatusBadge, getStatusOptions, type LeadStatus } from "@/components/provider/leads/LeadStatusBadge";
import { EmailLeadDialog } from "@/components/provider/leads/EmailLeadDialog";
import { Lead } from "@/components/provider/leads/LeadDetailPanel";

// Re-export Lead for backwards compatibility
export type { Lead };

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

  // Fetch unlock history for admin view
  const { data: unlockHistory = [] } = useQuery({
    queryKey: ["lead-unlocks", lead?.id],
    queryFn: async () => {
      if (!lead?.id) return [];
      const { data, error } = await supabase
        .from("lead_unlocks")
        .select("id, facility_id, unlocked_at, unlock_price_cents")
        .eq("lead_id", lead.id)
        .order("unlocked_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!lead?.id && open && isAdmin,
  });

  // Fetch facility names for unlock history
  const unlockFacilityIds = unlockHistory.map(u => u.facility_id).filter(Boolean);
  const { data: unlockFacilities = [] } = useQuery({
    queryKey: ["unlock-facilities", unlockFacilityIds.join(",")],
    queryFn: async () => {
      if (!unlockFacilityIds.length) return [];
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, city, state")
        .in("id", unlockFacilityIds);
      if (error) return [];
      return data || [];
    },
    enabled: unlockFacilityIds.length > 0 && isAdmin,
  });

  const unlockFacilitiesMap = new Map(unlockFacilities.map(f => [f.id, f]));

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

  const firstName = lead.name.split(" ")[0];

  const formatUrgency = (urgency: string | null) => {
    if (!urgency) return null;
    const map: Record<string, string> = {
      immediate: "Immediate (ASAP)",
      "within-week": "Within a Week",
      "within-month": "Within a Month",
      flexible: "Flexible",
      researching: "Just Researching",
      not_sure: "Not Sure",
    };
    return map[urgency] || urgency;
  };

  const getUrgencyColor = (urgency: string | null) => {
    const colors: Record<string, string> = {
      immediate: "text-red-600 bg-red-50 border-red-200",
      "within-week": "text-amber-600 bg-amber-50 border-amber-200",
      "within-month": "text-blue-600 bg-blue-50 border-blue-200",
      researching: "text-slate-600 bg-slate-50 border-slate-200",
    };
    return colors[urgency || ""] || "text-muted-foreground bg-muted border-border";
  };

  const formatLevelOfCare = (level: string | null) => {
    if (!level) return null;
    const map: Record<string, string> = {
      detox: "Medical Detox",
      inpatient: "Inpatient / Residential",
      residential: "Residential Inpatient",
      php: "Partial Hospitalization (PHP)",
      iop: "Intensive Outpatient (IOP)",
      outpatient: "Outpatient",
      "sober-living": "Sober Living",
      mat: "Medication-Assisted Treatment",
      "dual-diagnosis": "Dual Diagnosis",
      "not-sure": "Not Sure — Needs Guidance",
    };
    return map[level] || level;
  };

  const formatInsurance = (type: string | null) => {
    if (!type) return null;
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
        <DialogContent className="max-w-3xl h-[90vh] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
          {/* Enhanced Header */}
          <DialogHeader className="p-6 pb-5 border-b bg-gradient-to-r from-muted/50 via-muted/30 to-transparent">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-semibold text-primary">
                  {lead.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </span>
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <DialogTitle className="text-xl font-semibold truncate">
                    {lead.name}
                  </DialogTitle>
                  {lead.source === "Request Help Page" ? (
                    <Badge className="gap-1.5 text-xs font-semibold bg-primary text-white border-primary shadow-sm">
                      <Sparkles className="h-3 w-3" />
                      Qualified Lead
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1.5 text-xs font-medium">
                      <FileText className="h-3 w-3" />
                      Profile Lead
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(lead.created_at), "MMM d, yyyy")}
                    <span className="text-muted-foreground/50">•</span>
                    {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                  </span>
                  {lead.email_verified && (
                    <span className="flex items-center gap-1.5 text-green-600">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Verified
                    </span>
                  )}
                </div>

                {/* Quick Stats Row */}
                <div className="flex items-center gap-3 mt-3">
                  <LeadStatusBadge status={lead.status as LeadStatus} />
                  {lead.urgency === "immediate" && (
                    <>
                      <Separator orientation="vertical" className="h-4" />
                      <Badge variant="destructive" className="gap-1 text-xs animate-pulse">
                        <Zap className="h-3 w-3" />
                        Urgent
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="border-b px-6 bg-muted/20">
              <TabsList className="h-11 w-full justify-start bg-transparent gap-1 p-0">
                <TabsTrigger
                  value="overview"
                  className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  <User className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="intake"
                  className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  <FileText className="h-4 w-4" />
                  Intake
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  <Activity className="h-4 w-4" />
                  Notes
                  {notes.length > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                      {notes.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="communications"
                  className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  <Mail className="h-4 w-4" />
                  Emails
                  {emails.length > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                      {emails.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 overflow-auto">
              {/* Overview Tab */}
              <TabsContent value="overview" className="p-6 space-y-6 mt-0">
                {/* Quick Actions Bar */}
                <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-muted/30 border">
                  <Button variant="outline" className="gap-2 flex-1 sm:flex-none" asChild>
                    <a href={`tel:${lead.phone}`}>
                      <Phone className="h-4 w-4 text-green-600" />
                      Call {firstName}
                    </a>
                  </Button>
                  <Button className="gap-2 flex-1 sm:flex-none" onClick={() => setEmailDialogOpen(true)}>
                    <Mail className="h-4 w-4" />
                    Send Email
                  </Button>
                  <div className="flex-1 sm:flex-none sm:ml-auto">
                    <Select
                      value={lead.status}
                      onValueChange={(value) => updateStatus.mutate(value as LeadStatus)}
                      disabled={updateStatus.isPending}
                    >
                      <SelectTrigger className="w-full sm:w-[160px]">
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
                </div>

                {/* Contact Cards */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-primary" />
                    Contact Information
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Phone Card */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-50/50 border border-green-100">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                          <Phone className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{lead.phone}</p>
                          <p className="text-xs text-muted-foreground">
                            {lead.preferred_contact === "call" ? "✓ Preferred contact" : "Phone number"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 hover:bg-green-100"
                          onClick={() => handleCopy(lead.phone, "phone")}
                        >
                          {copiedField === "phone" ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-green-100" asChild>
                          <a href={`tel:${lead.phone}`}>
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </a>
                        </Button>
                      </div>
                    </div>

                    {/* Email Card */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-50/50 border border-blue-100">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                          <Mail className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground truncate">{lead.email}</p>
                            {lead.email_verified ? (
                              <Badge className="gap-1 text-[10px] px-1.5 py-0 h-5 bg-green-100 text-green-700 border-green-200">
                                <ShieldCheck className="h-3 w-3" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0 h-5">
                                <ShieldX className="h-3 w-3" />
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {lead.preferred_contact === "email" ? "✓ Preferred contact" : "Email address"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 hover:bg-blue-100"
                          onClick={() => handleCopy(lead.email, "email")}
                        >
                          {copiedField === "email" ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-blue-100" asChild>
                          <a href={`mailto:${lead.email}`}>
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Details Grid */}
                <div className="grid gap-3 sm:grid-cols-3">
                  {/* Location */}
                  {(lead.location_city_state || lead.location_zip) && (
                    <div className="p-4 rounded-xl bg-muted/50 border">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Location
                        </span>
                      </div>
                      <p className="text-sm font-medium">
                        {lead.location_city_state || lead.location_zip}
                      </p>
                    </div>
                  )}

                  {/* Urgency */}
                  <div className={`p-4 rounded-xl border ${getUrgencyColor(lead.urgency)}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase tracking-wide">
                        Urgency
                      </span>
                    </div>
                    <p className="text-sm font-medium">{formatUrgency(lead.urgency)}</p>
                  </div>
                </div>

                {/* Message */}
                {lead.message && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      Message from {firstName}
                    </h3>
                    <div className="p-4 rounded-xl bg-muted/30 border text-sm leading-relaxed whitespace-pre-wrap">
                      "{lead.message}"
                    </div>
                  </div>
                )}

                {/* Admin: Facility Info */}
                {isAdmin && lead.facility_id && assignedFacility && (
                  <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Assigned Facility
                    </h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{assignedFacility.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {assignedFacility.city}, {assignedFacility.state}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin: Reassign Facility */}
                {isAdmin && facilities.length > 0 && onAssign && (
                  <div className="space-y-3 p-4 rounded-xl bg-muted/30 border">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      {lead.facility_id ? "Reassign" : "Assign"} to Facility
                    </h3>
                    <div className="flex gap-2">
                      <Select value={selectedFacilityId} onValueChange={setSelectedFacilityId}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select facility..." />
                        </SelectTrigger>
                        <SelectContent>
                          {facilities.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.name} — {f.city}, {f.state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        onClick={handleAssignLead}
                        disabled={!selectedFacilityId || isAssigning}
                      >
                        {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Admin: Unlock History */}
                {isAdmin && unlockHistory.length > 0 && (
                  <div className="space-y-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Unlock History ({unlockHistory.length})
                    </h3>
                    <div className="space-y-2">
                      {unlockHistory.map((unlock) => {
                        const facility = unlockFacilitiesMap.get(unlock.facility_id);
                        return (
                          <div key={unlock.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-white/60">
                            <div>
                              <p className="font-medium">{facility?.name || "Unknown Facility"}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(unlock.unlocked_at), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">
                              ${((unlock.unlock_price_cents || 0) / 100).toFixed(0)} paid
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {isAdmin && unlockHistory.length === 0 && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="flex items-center gap-2 text-sm text-amber-700">
                      <ShieldX className="h-4 w-4" />
                      <span className="font-medium">Not yet unlocked by any provider</span>
                    </div>
                  </div>
                )}

                {/* Admin: Redistribution Status */}
                {isAdmin && lead.redistribution_status && (
                  <div className="p-4 rounded-xl bg-muted/30 border">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Distribution Status</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="capitalize">
                        {lead.redistribution_status === "exclusive" ? "Exclusive Window" :
                         lead.redistribution_status === "extended" ? "Redistributed" :
                         lead.redistribution_status === "expired" ? "Expired" :
                         lead.redistribution_status}
                      </Badge>
                      {lead.exclusive_until && (
                        <span className="text-xs text-muted-foreground">
                          Exclusive until {format(new Date(lead.exclusive_until), "MMM d, h:mm a")}
                        </span>
                      )}
                      {lead.extended_until && (
                        <span className="text-xs text-muted-foreground">
                          Extended until {format(new Date(lead.extended_until), "MMM d, h:mm a")}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Provider: Snooze Reminders */}
                {!isAdmin && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <BellOff className="h-4 w-4 text-muted-foreground" />
                      Reminder Settings
                    </h3>
                    {isSnoozed ? (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                        <BellOff className="h-5 w-5 text-amber-600 flex-shrink-0" />
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
                          Resume
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-sm text-muted-foreground mr-2">Snooze for:</span>
                        {[
                          { label: "4 hours", value: addHours(new Date(), 4) },
                          { label: "1 day", value: addDays(new Date(), 1) },
                          { label: "3 days", value: addDays(new Date(), 3) },
                          { label: "1 week", value: addDays(new Date(), 7) },
                        ].map((option) => (
                          <Button
                            key={option.label}
                            variant="outline"
                            size="sm"
                            onClick={() => snoozeReminder.mutate(option.value)}
                            disabled={snoozeReminder.isPending}
                            className="gap-1.5"
                          >
                            <Clock className="h-3.5 w-3.5" />
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Intake Details Tab */}
              <TabsContent value="intake" className="p-6 space-y-6 mt-0">
                {/* Demographics Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Demographics & Background
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Who Seeking Help */}
                    <div className="p-4 rounded-xl bg-muted/50 border">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                          <Heart className="h-4 w-4 text-violet-600" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Seeking Help For
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {lead.who_seeking_help === "self"
                          ? "Themselves"
                          : lead.who_seeking_help === "loved-one"
                          ? "A Loved One"
                          : "Themselves"}
                      </p>
                    </div>

                    {/* Relationship to Patient */}
                    {lead.relationship_to_patient && (
                      <div className="p-4 rounded-xl bg-muted/50 border">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-8 w-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-pink-600" />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Relationship
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-foreground capitalize">
                          {lead.relationship_to_patient === "self" ? "Self (Patient)" : lead.relationship_to_patient.replace(/-/g, ' ')}
                        </p>
                      </div>
                    )}

                    {/* Age Range */}
                    {lead.age_range && (
                      <div className="p-4 rounded-xl bg-muted/50 border">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Age Range
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          {lead.age_range} years old
                        </p>
                      </div>
                    )}

                    {/* Gender */}
                    {lead.gender && (
                      <div className="p-4 rounded-xl bg-muted/50 border">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-purple-600" />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Gender
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-foreground capitalize">
                          {lead.gender === "prefer-not-say" ? "Prefer not to say" : lead.gender}
                        </p>
                      </div>
                    )}

                    {/* Location */}
                    {(lead.location_city_state || lead.location_zip) && (
                      <div className="p-4 rounded-xl bg-muted/50 border">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-8 w-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
                            <MapPin className="h-4 w-4 text-teal-600" />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Location
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          {lead.location_city_state || lead.location_zip}
                        </p>
                        {lead.location_zip && lead.location_city_state && (
                          <p className="text-xs text-muted-foreground mt-1">ZIP: {lead.location_zip}</p>
                        )}
                      </div>
                    )}

                    {/* Employment Status */}
                    {lead.employment_status && (
                      <div className="p-4 rounded-xl bg-muted/50 border">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-8 w-8 rounded-lg bg-slate-500/10 flex items-center justify-center">
                            <Briefcase className="h-4 w-4 text-slate-600" />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Employment
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-foreground capitalize">
                          {lead.employment_status.replace(/-/g, ' ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Treatment Details Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-primary" />
                    Treatment Details
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Urgency */}
                    <div className={`p-4 rounded-xl border ${getUrgencyColor(lead.urgency)}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-8 w-8 rounded-lg bg-current/10 flex items-center justify-center">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-medium uppercase tracking-wide">
                          Timeline
                        </span>
                      </div>
                      <p className="text-sm font-semibold">{formatUrgency(lead.urgency)}</p>
                    </div>

                    {/* Readiness Level */}
                    {lead.readiness_level && (
                      <div className="p-4 rounded-xl bg-muted/50 border">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <Target className="h-4 w-4 text-green-600" />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Readiness
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-foreground capitalize">
                          {lead.readiness_level === "ready-now" ? "Ready to Start Now" :
                           lead.readiness_level === "considering" ? "Seriously Considering" :
                           lead.readiness_level === "researching" ? "Early Research" :
                           lead.readiness_level === "helping-someone" ? "Helping Someone Else" :
                           lead.readiness_level.replace(/-/g, ' ')}
                        </p>
                      </div>
                    )}

                    {/* Level of Care */}
                    <div className="p-4 rounded-xl bg-muted/50 border">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Stethoscope className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Level of Care
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{formatLevelOfCare(lead.level_of_care)}</p>
                    </div>

                    {/* Previous Treatment */}
                    {lead.previous_treatment && (
                      <div className="p-4 rounded-xl bg-muted/50 border">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <History className="h-4 w-4 text-amber-600" />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Previous Treatment
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-foreground capitalize">
                          {lead.previous_treatment === "none" ? "No Previous Treatment" :
                           lead.previous_treatment === "once" ? "One Time Before" :
                           lead.previous_treatment === "multiple" ? "Multiple Experiences" :
                           lead.previous_treatment === "currently-in" ? "Currently in Treatment" :
                           lead.previous_treatment.replace(/-/g, ' ')}
                        </p>
                        {lead.previous_treatment_details && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {lead.previous_treatment_details}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Dual Diagnosis */}
                    <div className="p-4 rounded-xl bg-muted/50 border">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-8 w-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                          <Brain className="h-4 w-4 text-pink-600" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Dual Diagnosis
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-foreground capitalize">
                        {lead.dual_diagnosis === "not-sure"
                          ? "Uncertain"
                          : lead.dual_diagnosis === "yes"
                          ? "Co-occurring Concern"
                          : lead.dual_diagnosis === "no"
                          ? "No Concern Indicated"
                          : "—"}
                      </p>
                    </div>

                    {/* Veteran Status */}
                    {lead.veteran_status && lead.veteran_status !== "none" && (
                      <div className="p-4 rounded-xl bg-muted/50 border">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                            <Medal className="h-4 w-4 text-red-600" />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Military Status
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-foreground capitalize">
                          {lead.veteran_status === "veteran" ? "Veteran" :
                           lead.veteran_status === "active-duty" ? "Active Duty Military" :
                           lead.veteran_status === "family-of-veteran" ? "Family of Veteran" :
                           lead.veteran_status.replace(/-/g, ' ')}
                        </p>
                      </div>
                    )}

                    {/* Legal Involvement */}
                    {lead.legal_involvement && lead.legal_involvement !== "none" && (
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <Scale className="h-4 w-4 text-amber-600" />
                          </div>
                          <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">
                            Legal Involvement
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-amber-800 capitalize">
                          {lead.legal_involvement === "court-ordered" ? "Court Ordered" :
                           lead.legal_involvement === "drug-court" ? "Drug Court Participant" :
                           lead.legal_involvement === "probation" ? "On Probation/Parole" :
                           lead.legal_involvement === "pending" ? "Pending Legal Matters" :
                           lead.legal_involvement.replace(/-/g, ' ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Primary Substances */}
                {lead.primary_substance && lead.primary_substance.length > 0 && (
                  <div className="p-4 rounded-xl bg-muted/50 border">
                    <div className="flex items-center gap-2 mb-3">
                      <Stethoscope className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Substances of Concern
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {lead.primary_substance.map((substance, idx) => (
                        <Badge key={idx} variant="secondary" className="capitalize">
                          {substance}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Co-occurring Conditions */}
                {lead.co_occurring_conditions && lead.co_occurring_conditions.length > 0 && (
                  <div className="p-4 rounded-xl bg-pink-50 border border-pink-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="h-4 w-4 text-pink-600" />
                      <span className="text-xs font-medium text-pink-700 uppercase tracking-wide">
                        Co-occurring Conditions
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {lead.co_occurring_conditions.map((condition, idx) => (
                        <Badge key={idx} variant="outline" className="capitalize border-pink-300 text-pink-700 bg-pink-50">
                          {condition === "ptsd" ? "PTSD/Trauma" : 
                           condition === "adhd" ? "ADHD" : 
                           condition.replace(/-/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Insurance & Budget Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Insurance & Budget
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Insurance */}
                    <div className="p-4 rounded-xl bg-muted/50 border">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <CreditCard className="h-4 w-4 text-emerald-600" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Insurance Type
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {formatInsurance(lead.insurance_type)}
                      </p>
                      {lead.insurance_provider && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Provider: {lead.insurance_provider}
                        </p>
                      )}
                    </div>

                    {/* Budget */}
                    <div className="p-4 rounded-xl bg-muted/50 border">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                          <CreditCard className="h-4 w-4 text-amber-600" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Budget Preference
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-foreground capitalize">
                        {lead.budget_preference === "low" ? "Budget-conscious" :
                         lead.budget_preference === "medium" ? "Moderate" :
                         lead.budget_preference === "flexible" ? "Flexible / Cost not a concern" :
                         lead.budget_preference || "To be discussed"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Special Requirements */}
                {lead.special_needs && lead.special_needs.length > 0 && (
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="h-4 w-4 text-purple-600" />
                      <span className="text-xs font-medium text-purple-700 uppercase tracking-wide">
                        Special Requirements
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {lead.special_needs.map((need, idx) => (
                        <Badge key={idx} variant="outline" className="capitalize border-purple-300 text-purple-700 bg-purple-50">
                          {need.replace(/-/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contact Preferences */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    Contact Preferences
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Preferred Contact Method */}
                    <div className="p-4 rounded-xl bg-muted/50 border">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          {lead.preferred_contact === "call" ? (
                            <Phone className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Mail className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Preferred Contact
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-foreground capitalize">
                        {lead.preferred_contact === "call" ? "Phone Call" : "Email"}
                      </p>
                    </div>

                    {/* Best Time to Call */}
                    {lead.best_time_to_call && (
                      <div className="p-4 rounded-xl bg-muted/50 border">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-orange-600" />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Best Time to Call
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-foreground capitalize">
                          {lead.best_time_to_call === "morning" ? "Morning (8am-12pm)" :
                           lead.best_time_to_call === "afternoon" ? "Afternoon (12pm-5pm)" :
                           lead.best_time_to_call === "evening" ? "Evening (5pm-8pm)" :
                           lead.best_time_to_call === "anytime" ? "Anytime" :
                           lead.best_time_to_call.replace(/-/g, ' ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Message */}
                {lead.message && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      Message from {firstName}
                    </h3>
                    <div className="p-4 rounded-xl bg-muted/30 border text-sm leading-relaxed whitespace-pre-wrap">
                      "{lead.message}"
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Submission Details
                  </h4>
                  <div className="grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <span className="text-muted-foreground block text-xs">Source</span>
                      <span className="font-medium">{formatSourceLabel(lead.source)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Submitted</span>
                      <span className="font-medium">
                        {format(new Date(lead.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Email Status</span>
                      <span className="font-medium flex items-center gap-1">
                        {lead.email_verified ? (
                          <>
                            <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                            Verified
                          </>
                        ) : (
                          <>
                            <ShieldX className="h-3.5 w-3.5 text-muted-foreground" />
                            Unverified
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Activity & Notes Tab */}
              <TabsContent value="activity" className="p-6 space-y-6 mt-0">
                {/* Add Note Section */}
                <div className="p-4 rounded-xl bg-muted/30 border space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Plus className="h-4 w-4 text-primary" />
                    Add Internal Note
                  </h3>
                  <Textarea
                    placeholder={`Add a note about ${firstName}... (e.g., "Called and left voicemail", "Scheduled tour for Friday")`}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[100px] resize-none bg-background"
                  />
                  <div className="flex justify-end">
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
                      Save Note
                    </Button>
                  </div>
                </div>

                {/* Notes Timeline */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    Notes Timeline ({notes.length})
                  </h3>
                  {notesLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  ) : notes.length === 0 ? (
                    <div className="text-center py-12 px-4 rounded-xl bg-muted/30 border border-dashed">
                      <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">No notes yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Add your first note to track conversations and follow-ups
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notes.map((note, index) => (
                        <div
                          key={note.id}
                          className="relative pl-6 pb-4"
                        >
                          {/* Timeline line */}
                          {index < notes.length - 1 && (
                            <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-border" />
                          )}
                          {/* Timeline dot */}
                          <div className="absolute left-0 top-1.5 h-6 w-6 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          </div>
                          {/* Note content */}
                          <div className="p-4 rounded-xl bg-muted/50 border group hover:border-primary/20 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm flex-1 whitespace-pre-wrap leading-relaxed">{note.note}</p>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive flex-shrink-0"
                                onClick={() => deleteNote.mutate(note.id)}
                                disabled={deleteNote.isPending}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                              <Clock className="h-3 w-3" />
                              {format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Communications Tab */}
              <TabsContent value="communications" className="p-6 space-y-6 mt-0">
                {/* Send Email CTA */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Send className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Send a follow-up email</p>
                      <p className="text-xs text-muted-foreground">
                        Choose from professional templates
                      </p>
                    </div>
                  </div>
                  <Button className="gap-2" onClick={() => setEmailDialogOpen(true)}>
                    <Mail className="h-4 w-4" />
                    Compose
                  </Button>
                </div>

                {/* Email History */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    Email History ({emails.length})
                  </h3>
                  {emailsLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  ) : emails.length === 0 ? (
                    <div className="text-center py-12 px-4 rounded-xl bg-muted/30 border border-dashed">
                      <Mail className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">No emails sent yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Start a conversation with {firstName}
                      </p>
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
                      {emails.map((email, index) => (
                        <div
                          key={email.id}
                          className="relative pl-6 pb-4"
                        >
                          {/* Timeline line */}
                          {index < emails.length - 1 && (
                            <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-blue-200" />
                          )}
                          {/* Timeline dot */}
                          <div className="absolute left-0 top-1.5 h-6 w-6 rounded-full bg-blue-100 border-2 border-background flex items-center justify-center">
                            <Mail className="h-3 w-3 text-blue-600" />
                          </div>
                          {/* Email content */}
                          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="font-medium text-foreground">
                                  {email.template_name}
                                </p>
                                {email.custom_note && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2 italic">
                                    "{email.custom_note}"
                                  </p>
                                )}
                              </div>
                              <Badge
                                className="text-xs bg-green-100 text-green-700 border-green-200 capitalize flex-shrink-0"
                              >
                                {email.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(email.created_at), "MMM d, yyyy 'at' h:mm a")}
                              </span>
                              <span className="text-muted-foreground/50">•</span>
                              <span>by {email.sender_name}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <EmailLeadDialog lead={lead} open={emailDialogOpen} onOpenChange={setEmailDialogOpen} facilityId={lead.facility_id} />
    </>
  );
}
