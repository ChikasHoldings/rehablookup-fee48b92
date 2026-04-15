import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  User, Mail, Phone, MapPin, Calendar, CheckCircle, Shield,
  Send, KeyRound, Ban, Trash2, ShieldOff, Loader2, FileText,
  Clock, MessageSquare, Star, Heart, StickyNote, Save,
  Building2, Handshake, AlertTriangle, XCircle,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface SeekerOverviewTabProps {
  user: any;
  email: string | null | undefined;
  phone: string | null | undefined;
  fullName: string | null | undefined;
  city: string | null | undefined;
  state: string | null | undefined;
  zipcode: string | null | undefined;
  isBanned: boolean;
  hasConcierge: boolean;
  userActivity: any;
  canModerateUsers: boolean;
  isSendingReset: boolean;
  onContactUser: () => void;
  onSendPasswordReset: () => void;
  onBanUser: () => void;
  onUnbanUser: () => void;
  onDeleteUser: () => void;
  onSaveNote: (note: string) => void;
  adminNotes: string;
}

type PlacementJourneyStatus =
  | "not_started"
  | "intake_submitted"
  | "in_progress"
  | "matched"
  | "accepted"
  | "admitted"
  | "closed";

const journeyStatusConfig: Record<PlacementJourneyStatus, { label: string; color: string; icon: any }> = {
  not_started: { label: "Not Started", color: "bg-muted text-muted-foreground border-border", icon: Clock },
  intake_submitted: { label: "Intake Submitted", color: "bg-blue-500/10 text-blue-600 border-blue-500/30", icon: FileText },
  in_progress: { label: "In Progress", color: "bg-amber-500/10 text-amber-600 border-amber-500/30", icon: Clock },
  matched: { label: "Matched", color: "bg-purple-500/10 text-purple-600 border-purple-500/30", icon: Handshake },
  accepted: { label: "Accepted Provider", color: "bg-chart-3/10 text-chart-3 border-chart-3/30", icon: CheckCircle },
  admitted: { label: "Admitted", color: "bg-success/10 text-success border-success/30", icon: Building2 },
  closed: { label: "Closed / Inactive", color: "bg-muted text-muted-foreground border-border", icon: XCircle },
};

export function SeekerOverviewTab({
  user, email, phone, fullName, city, state, zipcode,
  isBanned, hasConcierge, userActivity, canModerateUsers,
  isSendingReset, onContactUser, onSendPasswordReset,
  onBanUser, onUnbanUser, onDeleteUser, onSaveNote, adminNotes,
}: SeekerOverviewTabProps) {
  const [noteText, setNoteText] = useState(adminNotes);
  const [saving, setSaving] = useState(false);

  // Fetch placement journey data with full detail
  const { data: placementData } = useQuery({
    queryKey: ["admin-seeker-placement-journey", user?.user_id],
    queryFn: async () => {
      const { data: inqs } = await supabase
        .from("concierge_inquiries")
        .select("id, status, created_at, updated_at, primary_concern, assigned_advisor_id, placed_facility_id, placement_confirmed, placement_confirmed_at, admission_status, matched_facility_ids, admin_matched_facility_ids, closed_at, level_of_care, timeline_urgency")
        .eq("user_id", user.user_id)
        .order("created_at", { ascending: false });

      if (!inqs?.length) return { cases: [], journeyStatus: "not_started" as PlacementJourneyStatus, admittedCase: null, placedFacility: null, advisor: null };

      // Find most advanced case
      const statusPriority: Record<string, number> = {
        placed: 6, in_contact: 5, introductions_sent: 4, matched: 3, matching: 2, reviewing: 1, new: 0, closed: -1,
      };

      const activeCases = inqs.filter((i: any) => i.status !== "closed");
      const sortedCases = [...inqs].sort((a: any, b: any) => (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0));
      const topCase = sortedCases[0];

      // Determine journey status
      let journeyStatus: PlacementJourneyStatus = "intake_submitted";
      if (topCase.placement_confirmed || topCase.admission_status === "admitted") {
        journeyStatus = "admitted";
      } else if (topCase.placed_facility_id) {
        journeyStatus = "accepted";
      } else if (["matched", "introductions_sent", "in_contact"].includes(topCase.status)) {
        journeyStatus = "matched";
      } else if (["reviewing", "matching"].includes(topCase.status)) {
        journeyStatus = "in_progress";
      } else if (topCase.status === "closed" && activeCases.length === 0) {
        journeyStatus = "closed";
      }

      // Resolve placed facility
      let placedFacility = null;
      const placedCase = inqs.find((i: any) => i.placed_facility_id);
      if (placedCase?.placed_facility_id) {
        const { data: fac } = await supabase
          .from("facilities")
          .select("id, name, city, state")
          .eq("id", placedCase.placed_facility_id)
          .single();
        placedFacility = fac;
      }

      // Resolve advisor
      let advisor = null;
      const advisorId = topCase.assigned_advisor_id;
      if (advisorId) {
        const { data: adv } = await supabase
          .from("admin_user_profiles")
          .select("user_id, first_name, last_name, display_name")
          .eq("user_id", advisorId)
          .single();
        advisor = adv ? (adv.display_name || `${adv.first_name || ""} ${adv.last_name || ""}`.trim()) : null;
      }

      return {
        cases: inqs,
        journeyStatus,
        admittedCase: placedCase || null,
        placedFacility,
        advisor,
      };
    },
    enabled: !!user?.user_id,
  });

  const totalInquiries = userActivity?.conciergeInquiries?.length || 0;
  const activePlacements = userActivity?.conciergeInquiries?.filter(
    (i: any) => !["closed", "cancelled"].includes(i.status)
  ).length || 0;
  const placedCount = placementData?.cases?.filter((c: any) => c.placement_confirmed || c.admission_status === "admitted").length || 0;

  const journeyStatus = placementData?.journeyStatus || (hasConcierge ? "intake_submitted" : "not_started");
  const journeyConfig = journeyStatusConfig[journeyStatus as PlacementJourneyStatus];
  const JourneyIcon = journeyConfig?.icon || Clock;

  const handleSaveNote = async () => {
    setSaving(true);
    await onSaveNote(noteText);
    setSaving(false);
  };

  return (
    <div className="p-5 space-y-5">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Inquiries", value: totalInquiries, icon: MessageSquare, color: "text-primary" },
          { label: "Active Cases", value: activePlacements, icon: Clock, color: "text-warning" },
          { label: "Admitted", value: placedCount, icon: Building2, color: "text-success" },
          { label: "Reviews", value: userActivity?.reviews?.length || 0, icon: Star, color: "text-amber-500" },
          { label: "Saved", value: userActivity?.favorites?.length || 0, icon: Heart, color: "text-destructive" },
          { label: "Activity Log", value: userActivity?.activityLog?.length || 0, icon: FileText, color: "text-muted-foreground" },
        ].map((kpi) => (
          <div key={kpi.label} className="p-3 rounded-xl border bg-card text-center">
            <kpi.icon className={cn("h-4 w-4 mx-auto mb-1", kpi.color)} />
            <p className="text-xl font-bold tabular-nums">{kpi.value}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Placement Journey Status */}
      <div className="p-4 rounded-xl border bg-card">
        <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
          <Handshake className="h-4 w-4 text-primary" />Placement Journey
        </h4>

        {/* Journey Status Indicator */}
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-muted/30">
          <div className={cn("h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0", journeyConfig?.color)}>
            <JourneyIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{journeyConfig?.label}</p>
            <p className="text-xs text-muted-foreground">
              {journeyStatus === "not_started" && "Client has not submitted any placement intake"}
              {journeyStatus === "intake_submitted" && `${placementData?.cases?.length || 0} placement intake(s) submitted`}
              {journeyStatus === "in_progress" && "Case is being reviewed and prepared for matching"}
              {journeyStatus === "matched" && "Client has been matched with provider(s)"}
              {journeyStatus === "accepted" && "Client has accepted a provider"}
              {journeyStatus === "admitted" && "Client has been admitted to a facility"}
              {journeyStatus === "closed" && "All placement cases are closed"}
            </p>
          </div>
          {placementData?.advisor && (
            <Badge variant="outline" className="gap-1 text-xs flex-shrink-0">
              <User className="h-3 w-3" />{placementData.advisor}
            </Badge>
          )}
        </div>

        {/* Admission Indicator */}
        <div className={cn(
          "p-3 rounded-lg border-2",
          placedCount > 0
            ? "border-success/40 bg-success/5"
            : "border-border bg-muted/20"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
              placedCount > 0 ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
            )}>
              {placedCount > 0 ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">
                Admitted via Placement: {placedCount > 0 ? "Yes" : "No"}
              </p>
              {placedCount > 0 && placementData?.placedFacility && (
                <div className="mt-1.5 space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{placementData.placedFacility.name}</span>
                    <span className="text-muted-foreground">{placementData.placedFacility.city}, {placementData.placedFacility.state}</span>
                  </div>
                  {placementData.admittedCase?.placement_confirmed_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span>Admission Date: {format(new Date(placementData.admittedCase.placement_confirmed_at), "MMM d, yyyy")}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground font-mono text-[10px]">Case ID: {placementData.admittedCase?.id?.slice(0, 8)}</span>
                  </div>
                </div>
              )}
              {placedCount === 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {journeyStatus === "not_started"
                    ? "No placement intake submitted yet"
                    : "Placement in progress — not yet admitted"}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Actions */}
      <div className="flex flex-wrap gap-2 p-4 rounded-xl border bg-card">
        <Button variant="outline" size="sm" onClick={onContactUser} disabled={!email} className="gap-2">
          <Send className="h-4 w-4" />Contact User
        </Button>
        <Button variant="outline" size="sm" onClick={onSendPasswordReset} disabled={!email || isSendingReset} className="gap-2">
          {isSendingReset ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          Password Reset
        </Button>
        {canModerateUsers && (
          <>
            {isBanned ? (
              <Button variant="outline" size="sm" onClick={onUnbanUser} className="gap-2 text-success hover:text-success">
                <ShieldOff className="h-4 w-4" />Unban
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={onBanUser} className="gap-2 text-warning hover:text-warning">
                <Ban className="h-4 w-4" />Ban User
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onDeleteUser} className="gap-2 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />Delete Account
            </Button>
          </>
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contact Info */}
        <div className="p-4 rounded-xl border bg-card">
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-primary" />Contact Information
          </h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-start">
              <span className="text-muted-foreground">Full Name</span>
              <span className="font-medium text-right max-w-[60%]">{fullName || "Not provided"}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium text-right max-w-[60%] break-all">{email || "Not available"}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium text-right max-w-[60%]">{phone || "Not provided"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Phone Verified</span>
              {user.phone_verified ? (
                <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                  <CheckCircle className="h-3 w-3 mr-1" />Yes
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-muted text-muted-foreground border-border">No</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="p-4 rounded-xl border bg-card">
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-primary" />Location
          </h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">City</span>
              <span className="font-medium">{city || "Not provided"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">State</span>
              <span className="font-medium">{state || "Not provided"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Zip Code</span>
              <span className="font-medium">{zipcode || "Not provided"}</span>
            </div>
          </div>
        </div>

        {/* Account Status */}
        <div className="p-4 rounded-xl border bg-card">
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-primary" />Account Status
          </h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status</span>
              {isBanned ? (
                <Badge variant="destructive">Banned</Badge>
              ) : (
                <Badge variant="outline" className="bg-success/10 text-success border-success/30">Active</Badge>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Signup Date</span>
              <span className="font-medium">{format(new Date(user.created_at), "MMM d, yyyy")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated</span>
              <span className="font-medium">{format(new Date(user.updated_at), "MMM d, yyyy")}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Concierge</span>
              {hasConcierge ? (
                <Badge variant="outline" className="bg-chart-3/10 text-chart-3 border-chart-3/30">Active</Badge>
              ) : (
                <Badge variant="outline" className="bg-muted text-muted-foreground border-border">No</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Engagement Summary */}
        <div className="p-4 rounded-xl border bg-card">
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-primary" />Engagement Summary
          </h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Placement Requests</span>
              <span className="font-medium">{totalInquiries}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active Cases</span>
              <span className="font-medium">{activePlacements}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Admissions</span>
              <span className="font-medium">{placedCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reviews Written</span>
              <span className="font-medium">{userActivity?.reviews?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Facilities Saved</span>
              <span className="font-medium">{userActivity?.favorites?.length || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Notes */}
      <div className="p-4 rounded-xl border bg-card">
        <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
          <StickyNote className="h-4 w-4 text-primary" />Admin Notes
        </h4>
        <Textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add internal notes about this seeker..."
          className="min-h-[80px] text-sm"
        />
        <div className="flex justify-end mt-2">
          <Button size="sm" onClick={handleSaveNote} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Note
          </Button>
        </div>
      </div>
    </div>
  );
}
