import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addHours, addDays, isPast, formatDistanceToNow } from "date-fns";
import {
  Phone,
  Mail,
  MessageSquare,
  Copy,
  ExternalLink,
  Check,
  Plus,
  Trash2,
  Loader2,
  Clock,
  ShieldCheck,
  User,
  MapPin,
  AlertTriangle,
  Stethoscope,
  CreditCard,
  Sparkles,
  BellOff,
  Bell,
  Zap,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LeadScoreBadge } from "./LeadScoreBadge";
import { LeadStatusBadge, getStatusOptions, type LeadStatus } from "./LeadStatusBadge";
import { EmailLeadDialog } from "./EmailLeadDialog";
import { cn } from "@/lib/utils";
import { calculateLeadScore } from "@/lib/leadScoring";

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
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<LeadStatus | null>(null);
  const [lostReason, setLostReason] = useState("");
  const queryClient = useQueryClient();

  const { data: notes = [] } = useQuery({
    queryKey: ["lead-notes", lead?.id],
    queryFn: async (): Promise<LeadNote[]> => {
      if (!lead?.id) return [];
      const { data, error } = await supabase.from("lead_notes").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!lead?.id,
  });

  const { data: emails = [] } = useQuery({
    queryKey: ["lead-emails", lead?.id],
    queryFn: async (): Promise<LeadEmail[]> => {
      if (!lead?.id) return [];
      const { data, error } = await supabase.from("lead_emails").select("id, lead_id, sender_name, template_name, custom_note, created_at, status").eq("lead_id", lead.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!lead?.id,
  });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: LeadStatus) => {
      if (!lead) return;
      const { error } = await supabase.from("leads").update({ status: newStatus }).eq("id", lead.id);
      if (error) throw error;
      return newStatus;
    },
    onMutate: async (newStatus) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["provider-leads"] });
      // Snapshot the previous value
      const previousLeads = queryClient.getQueryData(["provider-leads"]);
      // Optimistically update
      queryClient.setQueryData(["provider-leads"], (old: Lead[] | undefined) => 
        old?.map(l => l.id === lead?.id ? { ...l, status: newStatus } : l)
      );
      return { previousLeads };
    },
    onError: (err, _, context) => {
      // Rollback on error
      if (context?.previousLeads) {
        queryClient.setQueryData(["provider-leads"], context.previousLeads);
      }
      toast.error("Failed to update status");
    },
    onSuccess: (newStatus) => {
      toast.success(`Status changed to ${newStatus?.replace("_", " ")}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-leads"] });
    },
  });

  const snoozeReminder = useMutation({
    mutationFn: async (snoozeUntil: Date | null) => {
      if (!lead) return;
      const { error } = await supabase.from("leads").update({ snooze_until: snoozeUntil?.toISOString() || null }).eq("id", lead.id);
      if (error) throw error;
    },
    onSuccess: (_, val) => { queryClient.invalidateQueries({ queryKey: ["provider-leads"] }); toast.success(val ? "Snoozed" : "Unsnooze"); },
  });

  const isSnoozed = lead?.snooze_until && !isPast(new Date(lead.snooze_until));

  const addNote = useMutation({
    mutationFn: async (note: string) => {
      if (!lead) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("lead_notes").insert({ lead_id: lead.id, user_id: user.id, note });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lead-notes", lead?.id] }); setNewNote(""); toast.success("Note added"); },
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from("lead_notes").delete().eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lead-notes", lead?.id] }); toast.success("Note deleted"); },
  });

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success("Copied");
  };

  // Empty state
  if (!lead) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center p-8 max-w-xs">
          <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <User className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <h3 className="font-medium text-foreground">Select a lead</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Click on a lead from the list to view their details and take action
          </p>
        </div>
      </div>
    );
  }

  const firstName = lead.name.split(" ")[0];
  const formatUrgency = (u: string | null) => ({ immediate: "Immediate", "within-week": "This Week", "within-month": "This Month", researching: "Researching" }[u || ""] || u || "—");
  const formatLevel = (l: string | null) => ({ detox: "Detox", residential: "Residential", php: "PHP", iop: "IOP", outpatient: "Outpatient", "not-sure": "Not Sure" }[l || ""] || l || "—");
  const formatInsurance = (t: string | null) => ({ ppo: "PPO/Private", medicaid: "Medicaid", medicare: "Medicare", "self-pay": "Self-Pay", "not-sure": "Not Sure" }[t || ""] || t || "—");
  
  const leadScore = calculateLeadScore(lead);
  const gradeAccentColor = {
    A: "border-l-green-500 bg-green-50/30",
    B: "border-l-blue-500 bg-blue-50/30",
    C: "border-l-amber-500 bg-amber-50/30",
    D: "border-l-slate-400 bg-slate-50/30",
  }[leadScore.grade];

  return (
    <div className="flex-1 flex flex-col bg-background min-h-0 overflow-hidden">
      {/* Header */}
      <div className={cn("flex-shrink-0 border-b border-l-4", gradeAccentColor)}>
        {/* Top row: Avatar, Name, Actions */}
        <div className="p-4 pb-3 flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-base font-semibold text-primary">
              {lead.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-foreground truncate leading-tight">{lead.name}</h2>
            <div className="flex items-center gap-1.5 mt-0.5 text-sm text-muted-foreground">
              {lead.location_city_state && (
                <>
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{lead.location_city_state}</span>
                  <span className="text-muted-foreground/40 mx-0.5">•</span>
                </>
              )}
              <span className="text-xs whitespace-nowrap">
                {formatDistanceToNow(new Date(lead.created_at), { addSuffix: false }).replace("about ", "")} ago
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2 flex-shrink-0">
            <div className="flex flex-col gap-1.5">
              <Button size="sm" variant="outline" className="gap-1.5 h-8 px-3 w-full justify-start" onClick={() => setShowEmailDialog(true)}>
                <Mail className="h-3.5 w-3.5" />
                Send email
              </Button>
              <Select 
                value={lead.status} 
                onValueChange={(v) => {
                  const newStatus = v as LeadStatus;
                  if (newStatus === "lost" || newStatus === "closed") {
                    setPendingStatus(newStatus);
                  } else {
                    updateStatus.mutate(newStatus);
                  }
                }} 
                disabled={updateStatus.isPending}
              >
                <SelectTrigger className={cn(
                  "w-[130px] h-8 text-xs font-medium transition-all",
                  updateStatus.isPending && "opacity-70"
                )}>
                  {updateStatus.isPending ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Updating...
                    </span>
                  ) : (
                    <SelectValue />
                  )}
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {getStatusOptions().map((o) => (
                    <SelectItem 
                      key={o.value} 
                      value={o.value}
                      className={cn(
                        "text-xs",
                        lead.status === o.value && "font-semibold"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className={cn(
                          "h-2 w-2 rounded-full",
                          o.value === "new" && "bg-blue-500",
                          o.value === "contacted" && "bg-amber-500",
                          o.value === "in_progress" && "bg-purple-500",
                          o.value === "converted" && "bg-green-500",
                          o.value === "lost" && "bg-red-500",
                          o.value === "closed" && "bg-slate-400",
                        )} />
                        {o.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Badges row */}
        <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
          <LeadScoreBadge lead={lead} size="sm" />
          {lead.email_verified && (
            <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50/80 h-6 text-xs px-2 font-medium">
              <ShieldCheck className="h-3 w-3" />
              Verified
            </Badge>
          )}
          {lead.source === "Request Help Page" && (
            <Badge className="bg-primary/10 text-primary border-0 gap-1 h-6 text-xs px-2 font-medium">
              <Sparkles className="h-3 w-3" />
              Qualified
            </Badge>
          )}
          {lead.urgency === "immediate" && (
            <Badge variant="destructive" className="gap-1 h-6 text-xs px-2 font-medium animate-pulse">
              <Zap className="h-3 w-3" />
              Urgent
            </Badge>
          )}
          {lead.urgency === "within_week" && (
            <Badge className="bg-amber-500 text-white border-0 gap-1 h-6 text-xs px-2 font-medium">
              <Clock className="h-3 w-3" />
              This Week
            </Badge>
          )}
          {lead.urgency === "within_month" && (
            <Badge variant="outline" className="gap-1 h-6 text-xs px-2 font-medium border-muted-foreground/30">
              <Clock className="h-3 w-3" />
              This Month
            </Badge>
          )}
        </div>
      </div>

      {/* Email Dialog */}
      <EmailLeadDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        lead={lead}
      />

      {/* Status Change Confirmation Dialog */}
      <AlertDialog 
        open={!!pendingStatus} 
        onOpenChange={(open) => {
          if (!open) {
            setPendingStatus(null);
            setLostReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {pendingStatus === "lost" ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Mark Lead as Lost?
                </>
              ) : (
                <>
                  <X className="h-5 w-5 text-slate-500" />
                  Close This Lead?
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatus === "lost" ? (
                <>
                  This will mark <span className="font-medium text-foreground">{lead.name}</span> as a lost lead. 
                  This action indicates the lead did not convert and will be reflected in your analytics.
                </>
              ) : (
                <>
                  This will close the lead for <span className="font-medium text-foreground">{lead.name}</span>. 
                  Closed leads are archived and won't appear in your active leads list.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {pendingStatus === "lost" && (
            <div className="py-2">
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Reason for losing this lead <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Textarea
                placeholder="e.g., Chose a different facility, No longer seeking treatment, Unable to reach..."
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                pendingStatus === "lost" && "bg-red-600 hover:bg-red-700",
                pendingStatus === "closed" && "bg-slate-600 hover:bg-slate-700"
              )}
              onClick={async () => {
                if (pendingStatus) {
                  // If there's a lost reason, add it as a note first
                  if (pendingStatus === "lost" && lostReason.trim()) {
                    await addNote.mutateAsync(`[Lost Reason] ${lostReason.trim()}`);
                  }
                  updateStatus.mutate(pendingStatus);
                  setPendingStatus(null);
                  setLostReason("");
                }
              }}
            >
              {pendingStatus === "lost" ? "Mark as Lost" : "Close Lead"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <TabsList className="flex-shrink-0 h-10 w-full justify-start rounded-none border-b bg-transparent px-4 gap-4">
          <TabsTrigger value="details" className="text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2.5 px-0">
            Details
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2.5 px-0 gap-1.5">
            Notes {notes.length > 0 && <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{notes.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2.5 px-0 gap-1.5">
            History {emails.length > 0 && <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{emails.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Details Tab */}
          <TabsContent value="details" className="p-4 space-y-6 mt-0 data-[state=inactive]:hidden">
            {/* Contact */}
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contact Information</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center">
                      <Phone className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{lead.phone}</p>
                      <p className="text-xs text-muted-foreground">{lead.preferred_contact === "call" ? "Preferred" : "Phone"}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopy(lead.phone, "phone")}>
                      {copiedField === "phone" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a href={`tel:${lead.phone}`}><ExternalLink className="h-4 w-4" /></a>
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{lead.email}</p>
                      <p className="text-xs text-muted-foreground">{lead.preferred_contact === "email" ? "Preferred" : "Email"}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopy(lead.email, "email")}>
                      {copiedField === "email" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a href={`mailto:${lead.email}`}><ExternalLink className="h-4 w-4" /></a>
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {/* Message */}
            {lead.message && (
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Message
                </h3>
                <div className="p-4 rounded-lg bg-muted/40 text-sm leading-relaxed">
                  {lead.message}
                </div>
              </section>
            )}

            {/* Intake Details */}
            {lead.source === "Request Help Page" && (
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Intake Details
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {lead.urgency && (
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1 mb-1">
                        <AlertTriangle className="h-3 w-3" /> Urgency
                      </p>
                      <p className="text-sm font-medium">{formatUrgency(lead.urgency)}</p>
                    </div>
                  )}
                  {lead.level_of_care && (
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1 mb-1">
                        <Stethoscope className="h-3 w-3" /> Level of Care
                      </p>
                      <p className="text-sm font-medium">{formatLevel(lead.level_of_care)}</p>
                    </div>
                  )}
                  {lead.insurance_type && (
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1 mb-1">
                        <CreditCard className="h-3 w-3" /> Insurance
                      </p>
                      <p className="text-sm font-medium">{formatInsurance(lead.insurance_type)}</p>
                    </div>
                  )}
                  {lead.location_city_state && (
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1 mb-1">
                        <MapPin className="h-3 w-3" /> Location
                      </p>
                      <p className="text-sm font-medium">{lead.location_city_state}</p>
                    </div>
                  )}
                  {lead.who_seeking_help && (
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1 mb-1">
                        <User className="h-3 w-3" /> Seeking For
                      </p>
                      <p className="text-sm font-medium capitalize">{lead.who_seeking_help}</p>
                    </div>
                  )}
                  {lead.dual_diagnosis && (
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-[10px] text-muted-foreground uppercase mb-1">Dual Diagnosis</p>
                      <p className="text-sm font-medium capitalize">{lead.dual_diagnosis}</p>
                    </div>
                  )}
                </div>
                {lead.primary_substance && lead.primary_substance.length > 0 && (
                  <div className="p-3 rounded-lg bg-muted/40 mt-3">
                    <p className="text-[10px] text-muted-foreground uppercase mb-2">Primary Substance(s)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {lead.primary_substance.map((s, i) => (
                        <Badge key={i} variant="secondary" className="capitalize">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Snooze */}
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <BellOff className="h-3.5 w-3.5" />
                Snooze Reminders
              </h3>
              {isSnoozed ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <BellOff className="h-5 w-5 text-amber-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800">Snoozed</p>
                    <p className="text-xs text-amber-600">Until {format(new Date(lead.snooze_until!), "MMM d, h:mm a")}</p>
                  </div>
                  <Button size="sm" variant="outline" className="border-amber-300 text-amber-700" onClick={() => snoozeReminder.mutate(null)} disabled={snoozeReminder.isPending}>
                    <Bell className="h-4 w-4 mr-1" /> Unsnooze
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {[{ label: "4 hours", fn: () => addHours(new Date(), 4) }, { label: "1 day", fn: () => addDays(new Date(), 1) }, { label: "3 days", fn: () => addDays(new Date(), 3) }, { label: "1 week", fn: () => addDays(new Date(), 7) }].map((opt) => (
                    <Button key={opt.label} variant="outline" size="sm" className="gap-1.5" onClick={() => snoozeReminder.mutate(opt.fn())} disabled={snoozeReminder.isPending}>
                      <Clock className="h-3.5 w-3.5" />
                      {opt.label}
                    </Button>
                  ))}
                </div>
              )}
            </section>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="p-4 space-y-4 mt-0 data-[state=inactive]:hidden">
            <div className="flex gap-2">
              <Input
                placeholder="Add a note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => { if (e.key === "Enter" && newNote.trim()) addNote.mutate(newNote.trim()); }}
              />
              <Button onClick={() => newNote.trim() && addNote.mutate(newNote.trim())} disabled={!newNote.trim() || addNote.isPending}>
                {addNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
            {notes.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No notes yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="group p-4 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                    <div className="flex justify-between gap-3">
                      <p className="text-sm flex-1">{note.note}</p>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => deleteNote.mutate(note.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="p-4 space-y-4 mt-0 data-[state=inactive]:hidden">
            {emails.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No emails sent yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {emails.map((email) => (
                  <div key={email.id} className="p-4 rounded-lg bg-muted/40">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{email.template_name}</span>
                      <Badge variant={email.status === "sent" ? "secondary" : "outline"} className={email.status === "sent" ? "bg-green-100 text-green-700" : ""}>
                        {email.status}
                      </Badge>
                    </div>
                    {email.custom_note && <p className="text-sm text-muted-foreground mb-2 line-clamp-2">"{email.custom_note}"</p>}
                    <p className="text-xs text-muted-foreground">Sent by {email.sender_name} • {format(new Date(email.created_at), "MMM d 'at' h:mm a")}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
