import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import {
  MapPin, Phone, Mail, MessageSquare, User, Building2,
  PhoneCall, CheckCircle, XCircle, Copy, ExternalLink, Calendar, Loader2, FileText,
  Clock, Shield, Heart, DollarSign, AlertTriangle, Users, RotateCcw
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ResponseTemplatesDrawer } from "@/components/provider/inquiries/ResponseTemplatesDrawer";
import { EmailLeadDialog } from "@/components/provider/leads/EmailLeadDialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InquiryTypeBadge, type InquiryType } from "@/components/provider/InquiryTypeBadge";
import { formatSourceLabel } from "@/lib/sourceLabels";
import { useLeadContactTracking } from "@/hooks/useLeadContactTracking";
import { useProStatus } from "@/hooks/useProStatus";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { LeadMessageThread } from "@/components/leads/LeadMessageThread";
import { capitalizeName, slugToLabel } from "@/lib/textCase";

type ResponseStatus = 'pending' | 'contacted' | 'responded' | 'closed';

interface InquiryDetailPanelProps {
  inquiry: {
    id: string;
    name: string;
    email: string;
    phone: string;
    facility_id: string;
    facility_name?: string;
    facility_city?: string;
    facility_state?: string;
    location_city_state: string | null;
    location_zip: string | null;
    level_of_care: string | null;
    urgency: string | null;
    inquiry_type: InquiryType | null;
    provider_response_status: string | null;
    provider_responded_at: string | null;
    provider_response_notes: string | null;
    created_at: string;
    message: string | null;
    source: string | null;
    who_seeking_help: string | null;
    insurance_type: string | null;
    insurance_provider: string | null;
    primary_substance: string[] | null;
    age_range: string | null;
    gender: string | null;
    preferred_contact: string | null;
    relationship_to_patient: string | null;
    budget_preference: string | null;
    dual_diagnosis: string | null;
    previous_treatment: string | null;
    previous_treatment_details: string | null;
    readiness_level: string | null;
    best_time_to_call: string | null;
    co_occurring_conditions: string[] | null;
    special_needs: string[] | null;
  };
}

export function InquiryDetailPanel({ inquiry }: InquiryDetailPanelProps) {
  const queryClient = useQueryClient();
  const { trackContact } = useLeadContactTracking();
  const { data: proStatus } = useProStatus(inquiry.facility_id);
  // Non-Pro (including downgraded) facilities are view-only: the provider
  // can see the lead but can't respond through the app. Optimistic —
  // treat as allowed until the tier query resolves so the common (Pro)
  // case never flashes the gate; only an explicit `isPro === false` locks it.
  const canRespond = proStatus?.isPro !== false;
  const [responseNotes, setResponseNotes] = useState("");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  // Track which specific status button is in-flight so the spinner only
  // renders on the button the provider just clicked (instead of every
  // non-active button).
  const [pendingStatus, setPendingStatus] = useState<ResponseStatus | null>(null);

  // Clear local-only state when switching to a different inquiry —
  // otherwise notes typed for lead A would carry over to lead B's textarea.
  useEffect(() => {
    setResponseNotes("");
    setEmailDialogOpen(false);
    setPendingStatus(null);
  }, [inquiry.id]);

  const updateStatus = useMutation({
    mutationFn: async ({ status, notes }: { status: ResponseStatus; notes?: string }) => {
      // Defence-in-depth: non-Pro facilities are view-only. The UI hides
      // the controls, but guard here too so a stale render can't fire.
      if (!canRespond) throw new Error("Upgrade to Pro to respond to leads");
      // BUGFIX: Scope update to both lead id AND facility_id for defence-in-depth.
      // RLS enforces this at the DB level, but explicit client-side scoping prevents
      // accidental cross-facility mutations if RLS policies are ever misconfigured.
      // .select().maybeSingle() so a 0-row update (RLS no longer matches —
      // e.g. a downgraded provider firing from a stale render) surfaces as
      // an error instead of a false success that also emails the seeker.
      const { data: updatedRow, error } = await supabase
        .from("leads")
        .update({
          provider_response_status: status === 'pending' ? null : status,
          provider_responded_at: status !== 'pending' ? new Date().toISOString() : null,
          ...(notes !== undefined ? { provider_response_notes: notes || null } : {}),
        } as never)
        .eq("id", inquiry.id)
        .eq("facility_id", inquiry.facility_id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!updatedRow) {
        throw new Error("Couldn't update this lead — it may no longer be assigned to your facility. Refresh and try again.");
      }
    },
    onSuccess: (_, { status }) => {
      // Targeted invalidation — the broad `["provider-inquiries"]` prefix
      // would invalidate every cached facility-set as well; constrain to
      // the keys we know about.
      queryClient.invalidateQueries({ queryKey: ["provider-inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["recent-leads"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpi-strip"] });
      // Clear the notes textarea on success so the next status change
      // starts with a fresh note. The previous note is still visible
      // below the textarea via `inquiry.provider_response_notes`.
      setResponseNotes("");
      toast.success(status === "pending" ? "Reverted to pending" : `Marked as ${status}`);

      // Notify the seeker — fire-and-forget. The edge function:
      //  • derives the seeker email + facility name from leadId
      //  • dedups via idempotencyKey `seeker-facility_contacted_you-${leadId}`
      //    so toggling status from "contacted" → "scheduled" doesn't
      //    re-send (the first transition already covered "we got back
      //    to you")
      //  • honors the seeker's email_lead_alerts preference
      // Skip when status reverts to pending — that's a correction, not a
      // response.
      if (status !== "pending") {
        // Route tour requests through the tour-aware notification
        // function so the seeker gets tour-specific copy ("your tour
        // proposal is being scheduled") instead of the generic
        // "facility_contacted_you" email. Earlier this branch always
        // hit send-seeker-emails, so a provider acknowledging a tour
        // request silently sent the wrong template.
        // A lead "tour_request" is NOT a concierge_tour_requests row, so
        // send-tour-notifications (which looks a tour up by id) can't resolve a
        // lead id — that path 400'd/404'd silently and the seeker got nothing.
        // Route all lead acknowledgements through send-seeker-emails, which
        // reliably notifies the seeker (generic copy beats no email).
        void supabase.functions
          .invoke("send-seeker-emails", { body: { type: "facility_contacted_you", leadId: inquiry.id } })
          .catch((err) => {
            // Best-effort: the status update itself succeeded; only the
            // seeker notification stumbled. Surface a non-blocking
            // warning toast so the provider knows the seeker may need a
            // manual follow-up rather than the silent log we used to
            // emit. (Network panel still captures the actual error for
            // ops triage.)
            console.warn(`[InquiryDetailPanel] send-seeker-emails failed`, err);
            toast.warning(
              "Status saved, but we couldn't send the client notification. Reach out directly to confirm.",
            );
          });
      }
    },
    onError: (err) => {
      console.error("[InquiryDetail] Status update failed:", err);
      toast.error("Failed to update status. Please try again.");
    },
    onSettled: () => setPendingStatus(null),
  });

  const handleStatusClick = (status: ResponseStatus) => {
    setPendingStatus(status);
    updateStatus.mutate({ status, notes: responseNotes || undefined });
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error(`Couldn't copy ${label}. Please copy it manually.`);
    }
  };

  const currentStatus = (inquiry.provider_response_status || 'pending') as ResponseStatus;
  // PII is exposed directly from leads_provider_view to the facility owner.
  const displayName = capitalizeName(inquiry.name);
  const displayEmail = inquiry.email;
  const displayPhone = inquiry.phone;

  const statusButtons = [
    { status: 'contacted' as ResponseStatus, label: 'Contacted', icon: PhoneCall, activeClass: 'bg-blue-600 text-white hover:bg-blue-700' },
    { status: 'responded' as ResponseStatus, label: 'Responded', icon: CheckCircle, activeClass: 'bg-emerald-600 text-white hover:bg-emerald-700' },
    { status: 'closed' as ResponseStatus, label: 'Closed', icon: XCircle, activeClass: 'bg-slate-600 text-white hover:bg-slate-700' },
  ];

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <h2 className="text-lg font-semibold text-foreground truncate">{displayName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <InquiryTypeBadge type={inquiry.inquiry_type} size="sm" />
                {inquiry.location_city_state && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {inquiry.location_city_state}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Lead unlocking retired — full inquiry contact info delivered
              directly to Pro subscribers. */}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-5 space-y-6">
        {/* Contact Actions */}
        <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Contact Information
            </h3>
            <div className="grid gap-3">
              {/* Phone */}
              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{displayPhone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => copyToClipboard(displayPhone, "Phone")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" className="gap-1.5" asChild>
                    <a
                      href={`tel:${displayPhone}`}
                      onClick={() => trackContact(inquiry.id, inquiry.facility_id, "call")}
                      aria-label={`Call ${displayName}`}
                    >
                      <PhoneCall className="h-4 w-4" />
                      Call
                    </a>
                  </Button>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium">{displayEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => copyToClipboard(displayEmail, "Email")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setEmailDialogOpen(true)}
                    disabled={!canRespond}
                    aria-label={`Send email to ${displayName}`}
                  >
                    <Mail className="h-4 w-4" />
                    Send email
                  </Button>
                </div>
              </div>
            </div>
            {/* Open the email client as a fallback to the in-platform send. */}
            <a
              href={`mailto:${displayEmail}`}
              onClick={() => trackContact(inquiry.id, inquiry.facility_id, "email")}
              className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
              Open in your email app instead
            </a>
            {/* Response Templates — Pro-only (responding through the app) */}
            {canRespond && (
              <ResponseTemplatesDrawer
                leadName={displayName}
                facilityName={inquiry.facility_name}
                trigger={
                  <Button variant="outline" size="sm" className="w-full gap-1.5 mt-2">
                    <FileText className="h-3.5 w-3.5" />
                    Use Response Template
                  </Button>
                }
              />
            )}
          </div>

          {/* Platform email send — templated, tracked, with per-template
              cooldown via the send-lead-email edge function. Same dialog
              the dashboard lead drawer uses, now available here too. */}
          <EmailLeadDialog
            lead={{ id: inquiry.id, name: displayName, email: displayEmail }}
            open={emailDialogOpen && canRespond}
            onOpenChange={setEmailDialogOpen}
            facilityId={inquiry.facility_id}
          />

        {/* Status Management — Pro-only. Non-Pro facilities (incl.
            downgraded) can view the lead but not respond through the app. */}
        {!canRespond ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                <Lock className="h-4 w-4 text-amber-600" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">Responding is a Pro feature</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  You can view this inquiry's full details. Upgrade to Pro to respond,
                  track status, and send messages from the app.
                </p>
                <Button asChild size="sm" className="mt-2.5 gap-1.5 bg-[#1B365D] hover:bg-[#142a4a]">
                  <Link to="/provider/billing?upgrade=pro">Upgrade to Pro</Link>
                </Button>
              </div>
            </div>
          </div>
        ) : (
        <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Response Status
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {statusButtons.map(({ status, label, icon: Icon, activeClass }) => {
                const showSpinner = updateStatus.isPending && pendingStatus === status;
                return (
                  <Button
                    key={status}
                    variant={currentStatus === status ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "gap-1.5 transition-all",
                      currentStatus === status && activeClass,
                    )}
                    onClick={() => handleStatusClick(status)}
                    // Only disable the sibling buttons during a pending
                    // mutation, not the one the user actively clicked
                    // (that one shows its own spinner). Previously the
                    // shared `disabled={isPending}` gray-blocked the
                    // whole row, making it look like nothing was
                    // responding.
                    disabled={updateStatus.isPending && pendingStatus !== status}
                    aria-label={`Mark inquiry as ${label.toLowerCase()}`}
                    aria-pressed={currentStatus === status}
                  >
                    {showSpinner ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                    {label}
                  </Button>
                );
              })}
              {/* Allow reverting a tracked status back to pending — useful
                  when an admin mis-clicks or wants to re-queue a lead. */}
              {currentStatus !== "pending" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => handleStatusClick("pending")}
                  // Match the per-button disable rule on the status
                  // trio above — the Revert button stays clickable
                  // unless ITS own revert is mid-flight.
                  disabled={updateStatus.isPending && pendingStatus !== "pending"}
                  aria-label="Revert to pending"
                >
                  {updateStatus.isPending && pendingStatus === "pending" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  Reset
                </Button>
              )}
            </div>
            {inquiry.provider_responded_at && (
              <p className="text-xs text-muted-foreground">
                Last updated {formatDistanceToNow(new Date(inquiry.provider_responded_at), { addSuffix: true })}
              </p>
            )}
            {/* Optional notes for status update */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Notes (optional)</label>
              <Textarea
                placeholder="Add notes about your response or outcome..."
                value={responseNotes}
                onChange={(e) => setResponseNotes(e.target.value)}
                className="text-sm min-h-[60px] resize-none"
                rows={2}
              />
              {inquiry.provider_response_notes && (
                <p className="text-xs text-muted-foreground italic">
                  Previous note: {inquiry.provider_response_notes}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Two-way message thread (Pro only). Non-Pro sees the upgrade
            prompt above instead. */}
        {canRespond && (
          <>
            <Separator />
            <LeadMessageThread leadId={inquiry.id} viewerType="provider" counterpartName={displayName} />
          </>
        )}

        <Separator />

        {/* Inquiry Details */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Inquiry Details
          </h3>
          <div className="grid gap-3">
            {inquiry.level_of_care && (
              <DetailRow icon={MessageSquare} label="Level of Care" value={slugToLabel(inquiry.level_of_care)} />
            )}
            {inquiry.who_seeking_help && (
              <DetailRow icon={User} label="Seeking Help For" value={slugToLabel(inquiry.who_seeking_help)} />
            )}
            {inquiry.relationship_to_patient && (
              <DetailRow icon={Users} label="Relationship to Patient" value={slugToLabel(inquiry.relationship_to_patient)} />
            )}
            {inquiry.urgency && (
              <DetailRow icon={AlertTriangle} label="Urgency / Timeline" value={slugToLabel(inquiry.urgency)} />
            )}
            {inquiry.readiness_level && (
              <DetailRow icon={Clock} label="Readiness Level" value={slugToLabel(inquiry.readiness_level)} />
            )}
            {inquiry.preferred_contact && (
              <DetailRow icon={Phone} label="Preferred Contact Method" value={slugToLabel(inquiry.preferred_contact)} />
            )}
            {inquiry.best_time_to_call && (
              <DetailRow icon={Clock} label="Best Time to Call" value={slugToLabel(inquiry.best_time_to_call)} />
            )}
            {inquiry.source && (
              <DetailRow icon={ExternalLink} label="Source" value={formatSourceLabel(inquiry.source)} />
            )}
            <DetailRow 
              icon={Calendar} 
              label="Submitted" 
              value={format(new Date(inquiry.created_at), "MMM d, yyyy 'at' h:mm a")} 
            />
          </div>
        </div>

        {/* Patient Profile */}
        {(inquiry.age_range || inquiry.gender || inquiry.location_zip) && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Patient Profile
              </h3>
              <div className="grid gap-3">
                {inquiry.age_range && (
                  <DetailRow icon={User} label="Age Range" value={inquiry.age_range} />
                )}
                {inquiry.gender && (
                  <DetailRow icon={User} label="Gender" value={slugToLabel(inquiry.gender)} />
                )}
                {inquiry.location_zip && (
                  <DetailRow icon={MapPin} label="ZIP Code" value={inquiry.location_zip} />
                )}
              </div>
            </div>
          </>
        )}

        {/* Clinical Details */}
        {(inquiry.primary_substance?.length || inquiry.dual_diagnosis || inquiry.co_occurring_conditions?.length || inquiry.previous_treatment) && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Clinical Details
              </h3>
              <div className="grid gap-3">
                {inquiry.primary_substance && inquiry.primary_substance.length > 0 && (
                  <DetailRow icon={AlertTriangle} label="Primary Substance(s)" value={inquiry.primary_substance.join(", ")} />
                )}
                {inquiry.dual_diagnosis && (
                  <DetailRow icon={Heart} label="Dual Diagnosis" value={slugToLabel(inquiry.dual_diagnosis)} />
                )}
                {inquiry.co_occurring_conditions && inquiry.co_occurring_conditions.length > 0 && (
                  <DetailRow icon={Heart} label="Co-occurring Conditions" value={inquiry.co_occurring_conditions.join(", ")} />
                )}
                {inquiry.previous_treatment && (
                  <DetailRow icon={Clock} label="Previous Treatment" value={slugToLabel(inquiry.previous_treatment)} />
                )}
                {inquiry.previous_treatment_details && (
                  <DetailRow icon={FileText} label="Treatment Details" value={inquiry.previous_treatment_details} />
                )}
                {inquiry.special_needs && inquiry.special_needs.length > 0 && (
                  <DetailRow icon={Shield} label="Special Needs" value={inquiry.special_needs.map(slugToLabel).join(", ")} />
                )}
              </div>
            </div>
          </>
        )}

        {/* Insurance & Budget */}
        {(inquiry.insurance_type || inquiry.insurance_provider || inquiry.budget_preference) && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Insurance & Budget
              </h3>
              <div className="grid gap-3">
                {inquiry.insurance_type && (
                  <DetailRow icon={Shield} label="Insurance Type" value={slugToLabel(inquiry.insurance_type)} />
                )}
                {inquiry.insurance_provider && (
                  <DetailRow icon={Shield} label="Insurance Provider" value={capitalizeName(inquiry.insurance_provider)} />
                )}
                {inquiry.budget_preference && (
                  <DetailRow icon={DollarSign} label="Budget Preference" value={slugToLabel(inquiry.budget_preference)} />
                )}
              </div>
            </div>
          </>
        )}

        {/* Message */}
        {inquiry.message && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Message
              </h3>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {inquiry.message}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Facility Info */}
        {inquiry.facility_name && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Inquired To
              </h3>
              <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{inquiry.facility_name}</p>
                  {inquiry.facility_city && inquiry.facility_state && (
                    <p className="text-sm text-muted-foreground">
                      {inquiry.facility_city}, {inquiry.facility_state}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
