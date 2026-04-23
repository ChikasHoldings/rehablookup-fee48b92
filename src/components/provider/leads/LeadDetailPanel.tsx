import { useState } from "react";
import { useLeadContactTracking } from "@/hooks/useLeadContactTracking";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
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
  Zap,
  X,
  Share2,
  Star,
  Lock,
  Smartphone,
  Briefcase,
  Scale,
  Medal,
  History,
  Brain,
  Target,
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
import { LeadStatusBadge, getStatusOptions, type LeadStatus } from "./LeadStatusBadge";
import { EmailLeadDialog } from "./EmailLeadDialog";

import { cn } from "@/lib/utils";
import { formatSourceLabel } from "@/lib/sourceLabels";
import { useLeadUnlocks } from "@/hooks/useLeadUnlocks";
import { UnlockLeadButton } from "@/components/provider/UnlockLeadButton";

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
  special_needs: string[] | null;
  qualified: boolean | null;
  exclusivity: string | null;
  // Additional fields
  assignment_status: string | null;
  assignment_reason: string | null;
  assigned_at: string | null;
  validation_status: string | null;
  quality_flag: string | null;
  routing_order: number | null;
  shared_with: string[] | null;
  follow_up_reminder_sent_at: string | null;
  ip_hash: string | null;
  qualification_reason: string | null;
  // NEW: Industry-standard fields
  age_range: string | null;
  gender: string | null;
  relationship_to_patient: string | null;
  previous_treatment: string | null;
  previous_treatment_details: string | null;
  co_occurring_conditions: string[] | null;
  employment_status: string | null;
  veteran_status: string | null;
  legal_involvement: string | null;
  readiness_level: string | null;
  best_time_to_call: string | null;
  // Redistribution fields
  redistribution_status: string | null;
  exclusive_until: string | null;
  extended_until: string | null;
  original_facility_id: string | null;
  provider_response_status: string | null;
  provider_responded_at: string | null;
  inquiry_type: string | null;
  is_unlocked?: boolean;
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
  exclusivity?: 'shared' | 'exclusive' | null;
}

export function LeadDetailPanel({ lead, onClose, facilityName, exclusivity }: LeadDetailPanelProps) {
  const [newNote, setNewNote] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<LeadStatus | null>(null);
  const [lostReason, setLostReason] = useState("");
  const queryClient = useQueryClient();
  const { trackContact } = useLeadContactTracking();
  
  // Lead unlock status - used for UI control (show/hide buttons), not for masking
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

  const { data: notes = [] } = useQuery({
    queryKey: ["lead-notes", lead?.id],
    queryFn: async (): Promise<LeadNote[]> => {
      if (!lead?.id) return [];
      const { data, error } = await supabase.from("lead_notes").select("id, lead_id, note, user_id, created_at").eq("lead_id", lead.id).order("created_at", { ascending: false });
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
      // Client-side guard mirrors the DB trigger so we don't ship a doomed write.
      const { validateTransition } = await import("@/lib/statusTransitions");
      const check = validateTransition("lead", lead.status, newStatus);
      if (!check.ok) throw new Error(check.reason || "Invalid status change");
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
  const formatUrgency = (u: string | null) => ({ immediate: "Immediate", "within-week": "This Week", "within-month": "This Month", researching: "Researching" }[u || ""] || u || "Not provided");
  const formatLevel = (l: string | null) => ({ detox: "Detox", residential: "Residential", php: "PHP", iop: "IOP", outpatient: "Outpatient", "not-sure": "Not Sure" }[l || ""] || l || "Not provided");
  const formatInsurance = (t: string | null) => ({ ppo: "PPO/Private", medicaid: "Medicaid", medicare: "Medicare", "self-pay": "Self-Pay", "not-sure": "Not Sure" }[t || ""] || t || "Not provided");

  return (
    <div className="flex-1 flex flex-col bg-background min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b">
        {/* Top row: Avatar, Name, Actions */}
        <div className="p-4 pb-3 flex items-center gap-3">
          <div className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0",
            displayInfo?.isLocked ? "bg-muted" : "bg-primary/10"
          )}>
            <span className={cn(
              "text-base font-semibold",
              displayInfo?.isLocked ? "text-muted-foreground" : "text-primary"
            )}>
              {displayInfo?.initials || "??"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground truncate leading-tight">
                {displayInfo?.name || "Unknown Lead"}
              </h2>
              {displayInfo?.isLocked && (
                <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
            </div>
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
              <Button 
                size="sm" 
                variant="outline" 
                className="gap-1.5 h-8 px-3 w-full justify-start" 
                onClick={() => setShowEmailDialog(true)}
                disabled={displayInfo?.isLocked}
                title={displayInfo?.isLocked ? "Unlock lead to send email" : "Send email"}
              >
                <Mail className="h-3.5 w-3.5" />
                {displayInfo?.isLocked ? "Locked" : "Send email"}
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
          {exclusivity === 'shared' && (
            <Badge variant="outline" className="gap-1 h-6 text-xs px-2 font-medium border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              <Share2 className="h-3 w-3" />
              Shared (Max 2 Providers)
            </Badge>
          )}
          {exclusivity === 'exclusive' && (
            <Badge variant="outline" className="gap-1 h-6 text-xs px-2 font-medium border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              <Star className="h-3 w-3" />
              Exclusive
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

      {/* Email Dialog - Only render with real data when unlocked */}
      {isUnlocked && (
        <EmailLeadDialog
          open={showEmailDialog}
          onOpenChange={setShowEmailDialog}
          lead={lead}
        />
      )}

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
          <TabsContent value="details" className="p-4 space-y-4 mt-0 data-[state=inactive]:hidden">
            {/* Message/Note - Prominent display */}
            {lead.message && (
              <section className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-4">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Message from {firstName}
                </h3>
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {lead.message}
                </p>
              </section>
            )}

            {/* Contact Info - Card style */}
            <section className="bg-card border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-muted/30 border-b">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  Contact Information
                  {displayInfo?.isLocked && (
                    <Badge variant="outline" className="ml-2 gap-1 text-xs">
                      <Lock className="h-3 w-3" />
                      Locked
                    </Badge>
                  )}
                </h3>
              </div>
              
              {displayInfo?.isLocked ? (
                /* Locked State - Show unlock prompt */
                <div className="p-6 text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                    <Lock className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Contact Details Locked</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Unlock this lead to view phone, email, and take action
                    </p>
                  </div>
                  <div className="space-y-2">
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
                  </div>
                  <UnlockLeadButton 
                    leadId={lead.id} 
                    facilityId={lead.facility_id}
                    inquiryType={(lead as any).inquiry_type || 'request_info'}
                    className="w-full max-w-xs mx-auto"
                  />
                </div>
              ) : (
                /* Unlocked State - Show full contact info with prominent CTAs */
                <div className="p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
                  {/* Quick Action Buttons - Prominent CTAs */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      className="h-14 flex-col gap-1 bg-green-600 hover:bg-green-700 text-white"
                      asChild
                    >
                      <a href={`tel:${lead.phone}`} onClick={() => trackContact(lead.id, lead.facility_id, "call")}>
                        <Phone className="h-5 w-5" />
                        <span className="text-xs font-medium">📞 Call Now</span>
                      </a>
                    </Button>
                    <Button 
                      className="h-14 flex-col gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                      asChild
                    >
                      <a href={`sms:${lead.phone}`} onClick={() => trackContact(lead.id, lead.facility_id, "sms")}>
                        <Smartphone className="h-5 w-5" />
                        <span className="text-xs font-medium">Send SMS</span>
                      </a>
                    </Button>
                    <Button 
                      className="h-14 flex-col gap-1"
                      variant="outline"
                      onClick={() => { trackContact(lead.id, lead.facility_id, "email"); setShowEmailDialog(true); }}
                    >
                      <Mail className="h-5 w-5" />
                      <span className="text-xs font-medium">📧 Email</span>
                    </Button>
                  </div>

                  {/* Best Time to Call - Prominent if available */}
                  {lead.best_time_to_call && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
                      <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">Best time to call:</span>
                      <span className="font-semibold text-foreground capitalize">
                        {lead.best_time_to_call.replace(/-/g, ' ')}
                      </span>
                    </div>
                  )}
                  
                  {/* Contact Details */}
                  <div className="space-y-2">
                    {/* Phone */}
                    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                          <Phone className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-base font-semibold text-foreground">{displayInfo.phone}</p>
                          <p className="text-xs text-muted-foreground">{lead.preferred_contact === "call" ? "✓ Preferred" : "Phone"}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopy(lead.phone, "phone")}>
                          {copiedField === "phone" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    {/* Email */}
                    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                          <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-foreground truncate">{displayInfo.email}</p>
                          <p className="text-xs text-muted-foreground">{lead.preferred_contact === "email" ? "✓ Preferred" : "Email"}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopy(lead.email, "email")}>
                          {copiedField === "email" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    {/* Location */}
                    {(lead.location_city_state || lead.location_zip) && (
                      <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                            <MapPin className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <p className="text-base font-semibold text-foreground">
                              {lead.location_city_state || lead.location_zip}
                            </p>
                            {lead.location_city_state && lead.location_zip && (
                              <p className="text-xs text-muted-foreground">ZIP: {lead.location_zip}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Treatment Details - Card style */}
            {(lead.urgency || lead.level_of_care || lead.insurance_type || lead.insurance_provider || 
              lead.who_seeking_help || lead.dual_diagnosis || lead.budget_preference || 
              lead.location_city_state || lead.location_zip || 
              (lead.primary_substance && lead.primary_substance.length > 0) ||
              (lead.special_needs && lead.special_needs.length > 0)) && (
              <section className="bg-card border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-muted/30 border-b">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-primary" />
                    Treatment Details
                  </h3>
                </div>
                <div className="p-4">
                  {/* Key Details Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {lead.who_seeking_help && (
                      <div className="p-3 rounded-lg bg-muted/40">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                          <User className="h-3 w-3" /> Seeking For
                        </p>
                        <p className="text-sm font-semibold text-foreground capitalize">{lead.who_seeking_help.replace(/-|_/g, ' ')}</p>
                      </div>
                    )}
                    {lead.urgency && (
                      <div className={cn(
                        "p-3 rounded-lg",
                        lead.urgency === "immediate" ? "bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800" : "bg-muted/40"
                      )}>
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                          <AlertTriangle className="h-3 w-3" /> Urgency
                        </p>
                        <p className={cn(
                          "text-sm font-semibold",
                          lead.urgency === "immediate" ? "text-red-700 dark:text-red-400" : "text-foreground"
                        )}>{formatUrgency(lead.urgency)}</p>
                      </div>
                    )}
                    {lead.level_of_care && (
                      <div className="p-3 rounded-lg bg-muted/40">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                          <Stethoscope className="h-3 w-3" /> Level of Care
                        </p>
                        <p className="text-sm font-semibold text-foreground">{formatLevel(lead.level_of_care)}</p>
                      </div>
                    )}
                    {(lead.insurance_type || lead.insurance_provider) && (
                      <div className="p-3 rounded-lg bg-muted/40">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                          <CreditCard className="h-3 w-3" /> Insurance
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                          {lead.insurance_provider || formatInsurance(lead.insurance_type)}
                        </p>
                        {lead.insurance_provider && lead.insurance_type && (
                          <p className="text-xs text-muted-foreground">{formatInsurance(lead.insurance_type)}</p>
                        )}
                      </div>
                    )}
                    {(lead.location_city_state || lead.location_zip) && (
                      <div className="p-3 rounded-lg bg-muted/40">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                          <MapPin className="h-3 w-3" /> Location
                        </p>
                        <p className="text-sm font-semibold text-foreground">{lead.location_city_state || lead.location_zip}</p>
                        {lead.location_city_state && lead.location_zip && (
                          <p className="text-xs text-muted-foreground">{lead.location_zip}</p>
                        )}
                      </div>
                    )}
                    {lead.dual_diagnosis && (
                      <div className="p-3 rounded-lg bg-muted/40">
                        <p className="text-xs text-muted-foreground mb-1">Mental Health Support</p>
                        <p className="text-sm font-semibold text-foreground capitalize">{lead.dual_diagnosis}</p>
                      </div>
                    )}
                    {lead.budget_preference && (
                      <div className="p-3 rounded-lg bg-muted/40">
                        <p className="text-xs text-muted-foreground mb-1">Budget</p>
                        <p className="text-sm font-semibold text-foreground capitalize">{lead.budget_preference.replace(/-/g, ' ')}</p>
                      </div>
                    )}
                  </div>

                  {/* Substances */}
                  {lead.primary_substance && lead.primary_substance.length > 0 && (
                    <div className="p-3 rounded-lg bg-muted/40 mt-3">
                      <p className="text-xs text-muted-foreground mb-2">Primary Substance(s)</p>
                      <div className="flex flex-wrap gap-1.5">
                        {lead.primary_substance.map((s, i) => (
                          <Badge key={i} variant="secondary" className="capitalize text-xs h-6 px-2 font-medium">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Special Needs */}
                  {lead.special_needs && lead.special_needs.length > 0 && (
                    <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 dark:bg-purple-950/30 dark:border-purple-800 mt-3">
                      <p className="text-xs text-muted-foreground mb-2">Special Requirements</p>
                      <div className="flex flex-wrap gap-1.5">
                        {lead.special_needs.map((need, i) => (
                          <Badge key={i} variant="outline" className="capitalize text-xs h-6 px-2 font-medium border-purple-300 text-purple-700 dark:text-purple-300">
                            {need.replace(/-/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* NEW: Clinical & Background Section - Industry-standard fields */}
            {(lead.age_range || lead.gender || lead.relationship_to_patient || 
              lead.previous_treatment || lead.readiness_level || lead.legal_involvement ||
              lead.veteran_status || lead.employment_status ||
              (lead.co_occurring_conditions && lead.co_occurring_conditions.length > 0)) && (
              <section className="bg-card border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-muted/30 border-b">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    Clinical & Background
                  </h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Demographics */}
                    {lead.age_range && (
                      <div className="p-3 rounded-lg bg-muted/40">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                          <User className="h-3 w-3" /> Age Range
                        </p>
                        <p className="text-sm font-semibold text-foreground">{lead.age_range}</p>
                      </div>
                    )}
                    {lead.gender && (
                      <div className="p-3 rounded-lg bg-muted/40">
                        <p className="text-xs text-muted-foreground mb-1">Gender</p>
                        <p className="text-sm font-semibold text-foreground capitalize">{lead.gender.replace(/-/g, ' ')}</p>
                      </div>
                    )}
                    {lead.relationship_to_patient && lead.relationship_to_patient !== "self" && (
                      <div className="p-3 rounded-lg bg-muted/40">
                        <p className="text-xs text-muted-foreground mb-1">Relationship</p>
                        <p className="text-sm font-semibold text-foreground capitalize">{lead.relationship_to_patient.replace(/-/g, ' ')}</p>
                      </div>
                    )}
                    
                    {/* Readiness - Important for conversion */}
                    {lead.readiness_level && (
                      <div className={cn(
                        "p-3 rounded-lg",
                        lead.readiness_level === "ready-now" 
                          ? "bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800"
                          : "bg-muted/40"
                      )}>
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                          <Target className="h-3 w-3" /> Readiness
                        </p>
                        <p className={cn(
                          "text-sm font-semibold capitalize",
                          lead.readiness_level === "ready-now" ? "text-green-700 dark:text-green-400" : "text-foreground"
                        )}>
                          {lead.readiness_level.replace(/-/g, ' ')}
                        </p>
                      </div>
                    )}
                    
                    {/* Previous Treatment */}
                    {lead.previous_treatment && (
                      <div className="p-3 rounded-lg bg-muted/40">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                          <History className="h-3 w-3" /> Previous Treatment
                        </p>
                        <p className="text-sm font-semibold text-foreground capitalize">{lead.previous_treatment.replace(/-/g, ' ')}</p>
                      </div>
                    )}
                    
                    {/* Employment */}
                    {lead.employment_status && (
                      <div className="p-3 rounded-lg bg-muted/40">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                          <Briefcase className="h-3 w-3" /> Employment
                        </p>
                        <p className="text-sm font-semibold text-foreground capitalize">{lead.employment_status.replace(/-/g, ' ')}</p>
                      </div>
                    )}
                    
                    {/* Legal Involvement - Important for compliance */}
                    {lead.legal_involvement && lead.legal_involvement !== "none" && (
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                          <Scale className="h-3 w-3" /> Legal Status
                        </p>
                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 capitalize">
                          {lead.legal_involvement.replace(/-/g, ' ')}
                        </p>
                      </div>
                    )}
                    
                    {/* Veteran Status */}
                    {lead.veteran_status && lead.veteran_status !== "none" && (
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                          <Medal className="h-3 w-3" /> Military Status
                        </p>
                        <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 capitalize">
                          {lead.veteran_status.replace(/-/g, ' ')}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Co-occurring Conditions */}
                  {lead.co_occurring_conditions && lead.co_occurring_conditions.length > 0 && (
                    <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 dark:bg-purple-950/30 dark:border-purple-800 mt-3">
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Brain className="h-3 w-3" /> Co-occurring Conditions
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {lead.co_occurring_conditions.map((condition, i) => (
                          <Badge key={i} variant="outline" className="capitalize text-xs h-6 px-2 font-medium border-purple-300 text-purple-700 dark:text-purple-300">
                            {condition.replace(/-/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Previous Treatment Details */}
                  {lead.previous_treatment_details && (
                    <div className="p-3 rounded-lg bg-muted/40 mt-3">
                      <p className="text-xs text-muted-foreground mb-1">Treatment History Details</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{lead.previous_treatment_details}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Lead Status & Quality - Card style */}
            <section className="bg-card border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-muted/30 border-b">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Lead Status
                </h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  {lead.qualified !== null && (
                    <div className={cn(
                      "p-3 rounded-lg",
                      lead.qualified ? "bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800" : "bg-muted/40"
                    )}>
                      <p className="text-xs text-muted-foreground mb-1">Qualification</p>
                      <p className={cn(
                        "text-sm font-semibold flex items-center gap-1.5",
                        lead.qualified ? "text-green-700 dark:text-green-400" : "text-foreground"
                      )}>
                        {lead.qualified ? <><Sparkles className="h-3.5 w-3.5" /> Qualified</> : "Direct Lead"}
                      </p>
                    </div>
                  )}
                  {lead.exclusivity && (
                    <div className={cn(
                      "p-3 rounded-lg",
                      lead.exclusivity === "exclusive" 
                        ? "bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800" 
                        : "bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800"
                    )}>
                      <p className="text-xs text-muted-foreground mb-1">Exclusivity</p>
                      <p className={cn(
                        "text-sm font-semibold capitalize flex items-center gap-1.5",
                        lead.exclusivity === "exclusive" ? "text-amber-700 dark:text-amber-400" : "text-blue-700 dark:text-blue-400"
                      )}>
                        {lead.exclusivity === "exclusive" ? <><Star className="h-3.5 w-3.5" /> Exclusive</> : <><Share2 className="h-3.5 w-3.5" /> Shared</>}
                      </p>
                    </div>
                  )}
                  {lead.validation_status && (
                    <div className={cn(
                      "p-3 rounded-lg",
                      lead.validation_status === "valid" 
                        ? "bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800" 
                        : "bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
                    )}>
                      <p className="text-xs text-muted-foreground mb-1">Validation</p>
                      <p className={cn(
                        "text-sm font-semibold capitalize",
                        lead.validation_status === "valid" ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"
                      )}>{lead.validation_status.replace(/-|_/g, ' ')}</p>
                    </div>
                  )}
                  {lead.assignment_status && (
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-xs text-muted-foreground mb-1">Assignment</p>
                      <p className="text-sm font-semibold text-foreground capitalize">{lead.assignment_status.replace(/-|_/g, ' ')}</p>
                    </div>
                  )}
                </div>

                {/* Qualification Info - only show qualification reason, not assignment reason */}
                {lead.qualification_reason && (
                  <div className="mt-3 space-y-2">
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-xs text-muted-foreground mb-1">Qualification Details</p>
                      <p className="text-sm text-foreground">{lead.qualification_reason}</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Source & Timestamp */}
            <section className="bg-muted/30 rounded-xl p-4">
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Source</span>
                  <span className="font-medium text-foreground">
                    {formatSourceLabel(lead.source)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Submitted</span>
                  <span className="font-medium text-foreground">{format(new Date(lead.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                </div>
                {lead.assigned_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Received</span>
                    <span className="font-medium text-foreground">{format(new Date(lead.assigned_at), "MMM d, yyyy 'at' h:mm a")}</span>
                  </div>
                )}
              </div>
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
