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
  FileText,
  Zap,
  X,
  Send,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LeadScoreBadge } from "./LeadScoreBadge";
import { LeadStatusBadge, getStatusOptions, type LeadStatus } from "./LeadStatusBadge";
import { cn } from "@/lib/utils";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string | null;
  preferred_contact: string;
  created_at: string;
  status: string;
  facility_id: string;
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

interface LeadDetailPanelProps {
  lead: Lead | null;
  onClose: () => void;
  facilityName?: string;
}

export function LeadDetailPanel({ lead, onClose, facilityName }: LeadDetailPanelProps) {
  const [newNote, setNewNote] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState("welcome");
  const [emailNote, setEmailNote] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const queryClient = useQueryClient();

  // Fetch notes
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
    enabled: !!lead?.id,
  });

  // Fetch email history
  const { data: emails = [] } = useQuery({
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
    enabled: !!lead?.id,
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
      toast.success("Status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  // Snooze mutation
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
        toast.success("Reminders snoozed");
      } else {
        toast.success("Snooze removed");
      }
    },
  });

  const isSnoozed = lead?.snooze_until && !isPast(new Date(lead.snooze_until));

  // Add note mutation
  const addNote = useMutation({
    mutationFn: async (note: string) => {
      if (!lead) return;
      const { data: { user } } = await supabase.auth.getUser();
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
  });

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success("Copied");
  };

  const handleSendEmail = async () => {
    if (!lead) return;
    setIsSendingEmail(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("user_id", user.id)
        .single();

      const senderName = profile ? `${profile.first_name} ${profile.last_name}` : "Provider";
      const templateNames: Record<string, string> = {
        welcome: "Welcome & Introduction",
        followup: "Follow-up",
        info: "Information Request",
      };

      const { error } = await supabase.functions.invoke("send-lead-email", {
        body: {
          leadId: lead.id,
          leadEmail: lead.email,
          leadName: lead.name,
          facilityId: lead.facility_id,
          facilityName: facilityName || "Our Facility",
          templateId: emailTemplate,
          templateName: templateNames[emailTemplate] || emailTemplate,
          customNote: emailNote || null,
          senderName,
          senderUserId: user.id,
        },
      });

      if (error) throw error;
      toast.success("Email sent successfully");
      setShowEmailForm(false);
      setEmailNote("");
      queryClient.invalidateQueries({ queryKey: ["lead-emails", lead.id] });
    } catch (error) {
      toast.error("Failed to send email");
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (!lead) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20 border-l">
        <div className="text-center p-8">
          <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <h3 className="font-medium text-muted-foreground">Select a lead</h3>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Click on a lead to view details
          </p>
        </div>
      </div>
    );
  }

  const firstName = lead.name.split(" ")[0];

  const formatUrgency = (urgency: string | null) => {
    const map: Record<string, string> = {
      immediate: "Immediate",
      "within-week": "Within a Week",
      "within-month": "Within a Month",
      researching: "Researching",
    };
    return map[urgency || ""] || urgency || "Not specified";
  };

  const formatLevelOfCare = (level: string | null) => {
    const map: Record<string, string> = {
      detox: "Detox",
      residential: "Residential",
      php: "PHP",
      iop: "IOP",
      outpatient: "Outpatient",
      "not-sure": "Not Sure",
    };
    return map[level || ""] || level || "Not specified";
  };

  const formatInsurance = (type: string | null) => {
    const map: Record<string, string> = {
      ppo: "PPO / Private",
      medicaid: "Medicaid",
      medicare: "Medicare",
      "self-pay": "Self-Pay",
      "not-sure": "Not Sure",
    };
    return map[type || ""] || type || "Not specified";
  };

  return (
    <div className="flex-1 flex flex-col bg-background border-l min-h-0">
      {/* Header */}
      <div className="p-4 border-b bg-muted/30 flex-shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-primary">
                {lead.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-foreground truncate">{lead.name}</h2>
                {lead.source === "Request Help Page" && (
                  <Badge className="gap-1 text-[10px] px-1.5 bg-primary text-white flex-shrink-0">
                    <Sparkles className="h-2.5 w-2.5" />
                    Qualified
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {format(new Date(lead.created_at), "MMM d, yyyy")}
                <span className="text-muted-foreground/50">•</span>
                {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <LeadStatusBadge status={lead.status as LeadStatus} size="sm" />
          <LeadScoreBadge lead={lead} size="sm" />
          {lead.urgency === "immediate" && (
            <Badge variant="destructive" className="gap-1 text-[10px] px-1.5">
              <Zap className="h-2.5 w-2.5" />
              Urgent
            </Badge>
          )}
          {lead.email_verified && (
            <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 bg-green-100 text-green-700">
              <ShieldCheck className="h-2.5 w-2.5" />
              Verified
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-b flex items-center gap-2 flex-wrap flex-shrink-0">
        <Button size="sm" variant="outline" className="gap-1.5 h-8" asChild>
          <a href={`tel:${lead.phone}`}>
            <Phone className="h-3.5 w-3.5 text-green-600" />
            Call
          </a>
        </Button>
        <Button 
          size="sm" 
          variant={showEmailForm ? "secondary" : "outline"} 
          className="gap-1.5 h-8"
          onClick={() => setShowEmailForm(!showEmailForm)}
        >
          <Mail className="h-3.5 w-3.5 text-blue-600" />
          Email
        </Button>
        <div className="flex-1" />
        <Select
          value={lead.status}
          onValueChange={(value) => updateStatus.mutate(value as LeadStatus)}
          disabled={updateStatus.isPending}
        >
          <SelectTrigger className="w-[130px] h-8 text-xs">
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

      {/* Inline Email Form */}
      {showEmailForm && (
        <div className="p-3 border-b bg-blue-50/50 space-y-2 flex-shrink-0">
          <Select value={emailTemplate} onValueChange={setEmailTemplate}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="welcome">Welcome & Introduction</SelectItem>
              <SelectItem value="followup">Follow-up</SelectItem>
              <SelectItem value="info">Information Request</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Add a personal note (optional)..."
            value={emailNote}
            onChange={(e) => setEmailNote(e.target.value)}
            className="min-h-[60px] text-sm resize-none"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-8 gap-1.5" onClick={handleSendEmail} disabled={isSendingEmail}>
              {isSendingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send Email
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowEmailForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="h-9 w-full justify-start rounded-none border-b bg-transparent px-3 flex-shrink-0">
          <TabsTrigger value="details" className="text-xs h-7 rounded-sm data-[state=active]:bg-muted">
            Details
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs h-7 rounded-sm data-[state=active]:bg-muted gap-1">
            Notes
            {notes.length > 0 && <span className="text-[10px] text-muted-foreground">({notes.length})</span>}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs h-7 rounded-sm data-[state=active]:bg-muted gap-1">
            History
            {emails.length > 0 && <span className="text-[10px] text-muted-foreground">({emails.length})</span>}
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* Details Tab */}
          <TabsContent value="details" className="p-4 space-y-4 mt-0">
            {/* Contact Info */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</h3>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-sm">{lead.phone}</span>
                    {lead.preferred_contact === "call" && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1">Preferred</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(lead.phone, "phone")}>
                      {copiedField === "phone" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                      <a href={`tel:${lead.phone}`}><ExternalLink className="h-3 w-3" /></a>
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                    <span className="text-sm truncate">{lead.email}</span>
                    {lead.preferred_contact === "email" && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1 flex-shrink-0">Preferred</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(lead.email, "email")}>
                      {copiedField === "email" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                      <a href={`mailto:${lead.email}`}><ExternalLink className="h-3 w-3" /></a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Message */}
            {lead.message && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Message</h3>
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  {lead.message}
                </div>
              </div>
            )}

            {/* Intake Details (Qualified Leads) */}
            {lead.source === "Request Help Page" && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary" />
                  Intake Details
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {lead.urgency && (
                    <div className="p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
                        <AlertTriangle className="h-3 w-3" />
                        Urgency
                      </div>
                      <p className="text-sm font-medium">{formatUrgency(lead.urgency)}</p>
                    </div>
                  )}
                  {lead.level_of_care && (
                    <div className="p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
                        <Stethoscope className="h-3 w-3" />
                        Level of Care
                      </div>
                      <p className="text-sm font-medium">{formatLevelOfCare(lead.level_of_care)}</p>
                    </div>
                  )}
                  {lead.insurance_type && (
                    <div className="p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
                        <CreditCard className="h-3 w-3" />
                        Insurance
                      </div>
                      <p className="text-sm font-medium">{formatInsurance(lead.insurance_type)}</p>
                    </div>
                  )}
                  {lead.location_city_state && (
                    <div className="p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
                        <MapPin className="h-3 w-3" />
                        Location
                      </div>
                      <p className="text-sm font-medium">{lead.location_city_state}</p>
                    </div>
                  )}
                  {lead.who_seeking_help && (
                    <div className="p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
                        <User className="h-3 w-3" />
                        Seeking Help For
                      </div>
                      <p className="text-sm font-medium capitalize">{lead.who_seeking_help}</p>
                    </div>
                  )}
                  {lead.dual_diagnosis && (
                    <div className="p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
                        <FileText className="h-3 w-3" />
                        Dual Diagnosis
                      </div>
                      <p className="text-sm font-medium capitalize">{lead.dual_diagnosis}</p>
                    </div>
                  )}
                </div>
                {lead.primary_substance && lead.primary_substance.length > 0 && (
                  <div className="p-2 rounded-lg bg-muted/50">
                    <div className="text-[10px] text-muted-foreground mb-1">Primary Substance(s)</div>
                    <div className="flex flex-wrap gap-1">
                      {lead.primary_substance.map((s, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] h-5 capitalize">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Snooze */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <BellOff className="h-3 w-3" />
                Snooze Reminders
              </h3>
              {isSnoozed ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                  <BellOff className="h-3.5 w-3.5 text-amber-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-amber-800">Snoozed until</p>
                    <p className="text-[10px] text-amber-600">
                      {format(new Date(lead.snooze_until!), "MMM d 'at' h:mm a")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] gap-1 text-amber-700 border-amber-300"
                    onClick={() => snoozeReminder.mutate(null)}
                    disabled={snoozeReminder.isPending}
                  >
                    <Bell className="h-3 w-3" />
                    Unsnooze
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "4h", fn: () => addHours(new Date(), 4) },
                    { label: "1d", fn: () => addDays(new Date(), 1) },
                    { label: "3d", fn: () => addDays(new Date(), 3) },
                    { label: "1w", fn: () => addDays(new Date(), 7) },
                  ].map((opt) => (
                    <Button
                      key={opt.label}
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] gap-1"
                      onClick={() => snoozeReminder.mutate(opt.fn())}
                      disabled={snoozeReminder.isPending}
                    >
                      <Clock className="h-3 w-3" />
                      {opt.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="p-4 space-y-3 mt-0">
            <div className="flex gap-2">
              <Input
                placeholder="Add a note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newNote.trim()) {
                    addNote.mutate(newNote.trim());
                  }
                }}
              />
              <Button
                size="sm"
                className="h-8 gap-1"
                onClick={() => newNote.trim() && addNote.mutate(newNote.trim())}
                disabled={!newNote.trim() || addNote.isPending}
              >
                {addNote.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Add
              </Button>
            </div>

            {notes.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No notes yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notes.map((note) => (
                  <div key={note.id} className="group p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm flex-1">{note.note}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteNote.mutate(note.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="p-4 space-y-3 mt-0">
            {emails.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No emails sent yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {emails.map((email) => (
                  <div key={email.id} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{email.template_name}</span>
                      <Badge
                        variant={email.status === "sent" ? "secondary" : "outline"}
                        className={cn(
                          "text-[10px] h-4",
                          email.status === "sent" && "bg-green-100 text-green-700"
                        )}
                      >
                        {email.status}
                      </Badge>
                    </div>
                    {email.custom_note && (
                      <p className="text-xs text-muted-foreground mb-1 line-clamp-2">
                        "{email.custom_note}"
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      Sent by {email.sender_name} • {format(new Date(email.created_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
