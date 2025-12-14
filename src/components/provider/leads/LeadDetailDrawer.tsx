import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
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
  ShieldX
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
  source: string | null;
  email_verified: boolean | null;
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
              <div>
                <DialogTitle className="text-xl">{lead.name}</DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(lead.created_at), "MMMM d, yyyy 'at' h:mm a")}
                </DialogDescription>
              </div>
              <LeadStatusBadge status={lead.status as LeadStatus} />
            </div>
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

              <Separator />

              {/* Contact Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Contact Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <Phone className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{lead.phone}</p>
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
                          <p className="text-sm font-medium">{lead.email}</p>
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
                <Button variant="outline" className="gap-2" asChild>
                  <a href={`tel:${lead.phone}`}>
                    <Phone className="h-4 w-4" />
                    Call Lead
                  </a>
                </Button>
                <Button 
                  variant="default" 
                  className="gap-2"
                  onClick={() => setEmailDialogOpen(true)}
                >
                  <Mail className="h-4 w-4" />
                  Email Lead
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <EmailLeadDialog
        lead={lead}
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
      />
    </>
  );
}
