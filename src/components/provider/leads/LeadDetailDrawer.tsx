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
  Lock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LeadStatusBadge, getStatusOptions, type LeadStatus } from "./LeadStatusBadge";
import { EmailLeadDialog } from "./EmailLeadDialog";
import { useLeadUnlocks } from "@/hooks/useLeadUnlocks";
import { UnlockLeadButton } from "@/components/provider/UnlockLeadButton";
import { Lead } from "./LeadDetailPanel";

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

interface LeadDetailDrawerProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailDrawer({ lead, open, onOpenChange }: LeadDetailDrawerProps) {
  const [newNote, setNewNote] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Lead unlock status - used for UI control, not masking
  // Data from leads_provider_view is already masked/unmasked at the DB level
  const { isLeadUnlocked } = useLeadUnlocks(lead?.facility_id);
  const isUnlocked = lead ? isLeadUnlocked(lead.id) : false;
  
  // Display info directly from view data (already masked/unmasked by DB)
  const displayInfo = lead ? {
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    initials: isUnlocked
      ? lead.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
      : "??",
    isLocked: !isUnlocked,
  } : null;

  // Fetch notes for this lead
  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ["lead-notes", lead?.id],
    queryFn: async (): Promise<LeadNote[]> => {
      if (!lead?.id) return [];
      const { data, error } = await supabase
        .from("lead_notes")
        .select("id, lead_id, note, user_id, created_at")
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
      toast({ title: "Status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  // Snooze reminder mutation
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
        toast({ title: "Reminders snoozed", description: `Until ${format(snoozeUntil, "MMM d 'at' h:mm a")}` });
      } else {
        toast({ title: "Snooze removed", description: "Reminders are now active" });
      }
    },
    onError: () => {
      toast({ title: "Failed to update snooze", variant: "destructive" });
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
      toast({ title: "Note added" });
    },
    onError: () => {
      toast({ title: "Failed to add note", variant: "destructive" });
    },
  });

  // Delete note mutation
  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from("lead_notes")
        .delete()
        .eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-notes", lead?.id] });
      toast({ title: "Note deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete note", variant: "destructive" });
    },
  });

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      addNote.mutate(newNote.trim());
    }
  };

  if (!lead) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl">
                  {displayInfo?.name || "Unknown Lead"}
                </DialogTitle>
                {displayInfo?.isLocked && (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(lead.created_at), "MMMM d, yyyy 'at' h:mm a")}
              </DialogDescription>
            </div>
            <LeadStatusBadge status={lead.status as LeadStatus} />
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-120px)]">
            <div className="p-6 space-y-6">
              {/* Status Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Update Status</label>
                <Select
                  value={lead.status}
                  onValueChange={(value) => updateStatus.mutate(value as LeadStatus)}
                  disabled={updateStatus.isPending}
                >
                  <SelectTrigger className="w-full">
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

              {/* Snooze Reminders */}
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
                        Until {format(new Date(lead.snooze_until!), "MMM d 'at' h:mm a")} ({formatDistanceToNow(new Date(lead.snooze_until!), { addSuffix: true })})
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => snoozeReminder.mutate(null)}
                      disabled={snoozeReminder.isPending}
                      className="gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-100"
                    >
                      {snoozeReminder.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
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

              <Separator />

              {/* Contact Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  Contact Information
                  {displayInfo?.isLocked && (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Lock className="h-3 w-3" />
                      Locked
                    </Badge>
                  )}
                </h3>
                
                {displayInfo?.isLocked ? (
                  /* Locked State - Show unlock prompt */
                  <div className="p-6 rounded-lg bg-muted/30 text-center space-y-4">
                    <div className="h-12 w-12 rounded-full bg-muted mx-auto flex items-center justify-center">
                      <Lock className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Contact Details Locked</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Unlock to view phone and email
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-4 w-4" />
                        {displayInfo.phone}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-4 w-4" />
                        {displayInfo.email}
                      </span>
                    </div>
                    <UnlockLeadButton 
                      leadId={lead.id} 
                      facilityId={lead.facility_id}
                      inquiryType={(lead as any).inquiry_type || 'request_info'}
                      className="w-full max-w-xs mx-auto"
                    />
                  </div>
                ) : (
                  /* Unlocked State - Show full contact info */
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <Phone className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{displayInfo.phone}</p>
                          <p className="text-xs text-muted-foreground">
                            {lead.preferred_contact === "call" ? "Preferred contact" : "Phone"}
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                        >
                          <a href={`tel:${lead.phone}`}>
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Mail className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{displayInfo.email}</p>
                            {lead.email_verified ? (
                              <Badge variant="secondary" className="gap-1 text-xs bg-green-100 text-green-700 border-0">
                                <ShieldCheck className="h-3 w-3" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                                <ShieldX className="h-3 w-3" />
                                Unverified
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {lead.preferred_contact === "email" ? "Preferred contact" : "Email"}
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                        >
                          <a href={`mailto:${lead.email}`}>
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Message */}
              {lead.message && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Message from Lead
                    </h3>
                    <div className="p-4 rounded-lg bg-muted/50 text-sm">
                      {lead.message}
                    </div>
                  </div>
                </>
              )}

              {/* Qualified Intake Details */}
              {lead.source === "Request Help Page" && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Intake Details
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {lead.who_seeking_help && (
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Seeking help for</span>
                          </div>
                          <p className="text-sm font-medium capitalize">
                            {lead.who_seeking_help === "self" ? "Themselves" : "A loved one"}
                          </p>
                        </div>
                      )}
                      {(lead.location_zip || lead.location_city_state) && (
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Location</span>
                          </div>
                          <p className="text-sm font-medium">
                            {lead.location_city_state || lead.location_zip}
                          </p>
                        </div>
                      )}
                      {lead.urgency && (
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Urgency</span>
                          </div>
                          <p className="text-sm font-medium capitalize">
                            {lead.urgency === "immediate" ? "Immediate" : 
                             lead.urgency === "within-week" ? "Within a week" : "Flexible"}
                          </p>
                        </div>
                      )}
                      {lead.level_of_care && (
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                          <div className="flex items-center gap-2 mb-1">
                            <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Level of Care</span>
                          </div>
                          <p className="text-sm font-medium capitalize">
                            {lead.level_of_care === "not-sure" ? "Not sure" : lead.level_of_care}
                          </p>
                        </div>
                      )}
                      {lead.insurance_type && (
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                          <div className="flex items-center gap-2 mb-1">
                            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Insurance</span>
                          </div>
                          <p className="text-sm font-medium capitalize">
                            {lead.insurance_type === "ppo" ? "PPO / Private" :
                             lead.insurance_type === "self-pay" ? "Self-Pay" :
                             lead.insurance_type === "not-sure" ? "Not sure" :
                             lead.insurance_type}
                            {lead.insurance_provider && ` (${lead.insurance_provider})`}
                          </p>
                        </div>
                      )}
                      {lead.dual_diagnosis && (
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                          <div className="flex items-center gap-2 mb-1">
                            <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Mental Health Concern</span>
                          </div>
                          <p className="text-sm font-medium capitalize">
                            {lead.dual_diagnosis === "not-sure" ? "Not sure" : lead.dual_diagnosis}
                          </p>
                        </div>
                      )}
                    </div>
                    {lead.primary_substance && lead.primary_substance.length > 0 && (
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Substances of Concern</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {lead.primary_substance.map((substance, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {substance}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              <Separator />

              {/* Email History */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Email History
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {emails.length} sent
                  </Badge>
                </div>
                
                {emailsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : emails.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No emails sent yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {emails.map((email) => (
                      <div
                        key={email.id}
                        className="p-3 rounded-lg bg-blue-50/50 border border-blue-100"
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
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            {email.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(email.created_at), "MMM d, yyyy 'at' h:mm a")}
                          <span className="text-muted-foreground/50">•</span>
                          by {email.sender_name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Notes */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Internal Notes</h3>
                
                {/* Add Note */}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add a note about this lead..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                </div>
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

                {/* Notes List */}
                <div className="space-y-2 mt-4">
                  {notesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No notes yet. Add one above to track your follow-ups.
                    </p>
                  ) : (
                    notes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3 rounded-lg bg-muted/30 border border-border/50 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm flex-1">{note.note}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
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
                    ))
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <Separator />
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  className="gap-2" 
                  disabled={displayInfo?.isLocked}
                  asChild={!displayInfo?.isLocked}
                >
                  {displayInfo?.isLocked ? (
                    <>
                      <Phone className="h-4 w-4" />
                      Unlock to Call
                    </>
                  ) : (
                  <a href={`tel:${lead.phone}`}>
                    <Phone className="h-4 w-4" />
                    Call Lead
                  </a>
                  )}
                </Button>
                <Button 
                  variant="default" 
                  className="gap-2"
                  onClick={() => setEmailDialogOpen(true)}
                  disabled={displayInfo?.isLocked}
                >
                  <Mail className="h-4 w-4" />
                  {displayInfo?.isLocked ? "Unlock to Email" : "Email Lead"}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Email Dialog - Only render with real data when unlocked */}
      {isUnlocked && (
        <EmailLeadDialog
          lead={lead}
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
        />
      )}
    </>
  );
}
