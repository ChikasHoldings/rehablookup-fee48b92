import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  User, Mail, Phone, MapPin, Calendar, CheckCircle, Shield,
  Send, KeyRound, Ban, Trash2, ShieldOff, Loader2, FileText,
  Clock, MessageSquare, Star, Heart, StickyNote, Save,
} from "lucide-react";
import { format } from "date-fns";
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

export function SeekerOverviewTab({
  user, email, phone, fullName, city, state, zipcode,
  isBanned, hasConcierge, userActivity, canModerateUsers,
  isSendingReset, onContactUser, onSendPasswordReset,
  onBanUser, onUnbanUser, onDeleteUser, onSaveNote, adminNotes,
}: SeekerOverviewTabProps) {
  const [noteText, setNoteText] = useState(adminNotes);
  const [saving, setSaving] = useState(false);

  const totalInquiries = userActivity?.conciergeInquiries?.length || 0;
  const activePlacements = userActivity?.conciergeInquiries?.filter(
    (i: any) => !["closed", "cancelled"].includes(i.status)
  ).length || 0;

  const handleSaveNote = async () => {
    setSaving(true);
    await onSaveNote(noteText);
    setSaving(false);
  };

  return (
    <div className="p-5 space-y-5">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: "Inquiries", value: totalInquiries, icon: MessageSquare, color: "text-primary" },
          { label: "Placements", value: totalInquiries, icon: Shield, color: "text-chart-3" },
          { label: "Active Cases", value: activePlacements, icon: Clock, color: "text-warning" },
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
