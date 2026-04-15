import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserManagement } from "@/hooks/admin/useUserManagement";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  User, Mail, MapPin, CheckCircle, Heart, MessageSquare, Star,
  Ban, Shield, Clock, Loader2, AlertCircle, Handshake, FileText, Send,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { SeekerOverviewTab } from "./tabs/SeekerOverviewTab";
import { SeekerInquiriesTab } from "./tabs/SeekerInquiriesTab";
import { SeekerPlacementsTab } from "./tabs/SeekerPlacementsTab";
import { SeekerReviewsTab } from "./tabs/SeekerReviewsTab";
import { SeekerActivityTab } from "./tabs/SeekerActivityTab";
import { SeekerCommunicationsTab } from "./tabs/SeekerCommunicationsTab";
import { SeekerSavedTab } from "./tabs/SeekerSavedTab";
import { SeekerAuditLogTab } from "./tabs/SeekerAuditLogTab";

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  phone_verified: boolean | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
  created_at: string;
  updated_at: string;
  email?: string;
  aggregated_phone?: string;
  aggregated_city?: string;
  aggregated_state?: string;
  aggregated_zipcode?: string;
  has_concierge?: boolean;
}

interface UserProfileModalProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function UserProfileModal({ user, open, onOpenChange, onDeleted }: UserProfileModalProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [isBanned, setIsBanned] = useState(false);

  const { adminRole, isSuperAdmin } = useAdminAuth();
  const canModerateUsers = isSuperAdmin || adminRole === "super_admin" || adminRole === "manager";

  const {
    deleteUser, banUser, unbanUser, sendPasswordReset, checkBanStatus,
    isDeleting, isBanning, isSendingReset,
  } = useUserManagement();

  useEffect(() => { if (user) setActiveTab("overview"); }, [user]);

  useEffect(() => {
    if (user?.user_id) checkBanStatus(user.user_id).then(setIsBanned);
  }, [user?.user_id]);

  // Placement journey status for header
  const { data: placementJourney } = useQuery({
    queryKey: ["admin-seeker-journey-header", user?.user_id],
    queryFn: async () => {
      if (!user?.user_id) return null;
      const { data: inqs } = await supabase
        .from("concierge_inquiries")
        .select("id, status, placed_facility_id, placement_confirmed, admission_status")
        .eq("user_id", user.user_id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (!inqs?.length) return { status: "not_started", admitted: false };
      const admitted = inqs.some((i: any) => i.placement_confirmed || i.admission_status === "admitted");
      const placed = inqs.some((i: any) => i.placed_facility_id);
      const matched = inqs.some((i: any) => ["matched", "introductions_sent", "in_contact"].includes(i.status));
      const active = inqs.some((i: any) => ["reviewing", "matching"].includes(i.status));
      if (admitted) return { status: "admitted", admitted: true };
      if (placed) return { status: "accepted", admitted: false };
      if (matched) return { status: "matched", admitted: false };
      if (active) return { status: "in_progress", admitted: false };
      return { status: "intake_submitted", admitted: false };
    },
    enabled: !!user?.user_id && open,
  });

  // Aggregated data
  const { data: aggregatedData } = useQuery({
    queryKey: ["admin-user-aggregated", user?.user_id],
    queryFn: async () => {
      if (!user?.user_id) return { email: null, phone: null, fullName: null, city: null, state: null, zipcode: null, sources: [] };
      const sources: string[] = [];
      let email: string | null = null, phone: string | null = null, fullName: string | null = null;
      let city: string | null = null, state: string | null = null, zipcode: string | null = null;

      const { data: emailsData } = await supabase.rpc("get_seeker_emails_for_admin");
      const authEmail = emailsData?.find((e: any) => e.user_id === user.user_id)?.email;
      if (authEmail) { email = authEmail; sources.push("Account Signup"); }

      const { data: conciergeData } = await supabase.from("concierge_inquiries")
        .select("user_email, user_phone, user_name, preferred_city, preferred_state")
        .eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(1);
      const concierge = conciergeData?.[0];
      if (concierge) {
        if (concierge.user_phone && !phone) phone = concierge.user_phone;
        if (concierge.user_name && !fullName) fullName = concierge.user_name;
        if (concierge.preferred_city && !city) city = concierge.preferred_city;
        if (concierge.preferred_state && !state) state = concierge.preferred_state;
      }
      if (user.first_name || user.last_name) {
        const n = `${user.first_name || ""} ${user.last_name || ""}`.trim();
        if (!fullName && n) fullName = n;
      }
      if (user.phone && !phone) phone = user.phone;
      if (user.city && !city) city = user.city;
      if (user.state && !state) state = user.state;
      if (user.zipcode && !zipcode) zipcode = user.zipcode;
      return { email, phone, fullName, city, state, zipcode, sources };
    },
    enabled: !!user?.user_id && open,
  });

  // Activity counts
  const { data: userActivity } = useQuery({
    queryKey: ["admin-user-activity", user?.user_id],
    queryFn: async () => {
      if (!user?.user_id) return null;
      const [favorites, conciergeInquiries, reviews, activityLog] = await Promise.all([
        supabase.from("user_favorites").select("id, facility_id, created_at").eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(20),
        supabase.from("concierge_inquiries").select("id, status, created_at, primary_concern").eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(20),
        supabase.from("facility_reviews").select("id, rating, status, created_at").eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(20),
        supabase.from("account_activity_log").select("id, event_type, created_at").eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(20),
      ]);
      return {
        favorites: favorites.data || [],
        conciergeInquiries: conciergeInquiries.data || [],
        reviews: reviews.data || [],
        activityLog: activityLog.data || [],
      };
    },
    enabled: !!user?.user_id && open,
  });

  // Admin notes
  const { data: adminNotes } = useQuery({
    queryKey: ["admin-seeker-notes", user?.user_id],
    queryFn: async () => {
      if (!user?.user_id) return "";
      const { data } = await supabase.from("admin_audit_log")
        .select("details")
        .eq("target_id", user.user_id)
        .eq("target_type", "seeker")
        .eq("action_type", "seeker_note")
        .order("created_at", { ascending: false })
        .limit(1);
      return (data?.[0]?.details as any)?.note || "";
    },
    enabled: !!user?.user_id && open,
  });

  const email = aggregatedData?.email || user?.email;
  const phone = aggregatedData?.phone || user?.aggregated_phone || user?.phone;
  const fullName = aggregatedData?.fullName || (user?.first_name || user?.last_name ? `${user?.first_name || ""} ${user?.last_name || ""}`.trim() : null);
  const city = aggregatedData?.city || user?.aggregated_city || user?.city;
  const state = aggregatedData?.state || user?.aggregated_state || user?.state;
  const zipcode = aggregatedData?.zipcode || user?.aggregated_zipcode || user?.zipcode;

  const getDisplayName = () => fullName || user?.display_name || "Verified User";
  const getInitials = () => {
    if (user?.first_name && user?.last_name) return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    if (user?.first_name) return user.first_name.slice(0, 2).toUpperCase();
    return "U";
  };
  const getLocation = () => {
    if (city && state) return `${city}, ${state}`;
    if (state) return state;
    if (zipcode) return zipcode;
    return null;
  };

  const handleDelete = async () => {
    if (!user) return;
    await deleteUser.mutateAsync(user);
    setDeleteDialogOpen(false);
    onOpenChange(false);
    onDeleted?.();
  };

  const handleBan = async () => {
    if (!user) return;
    await banUser.mutateAsync({ user, reason: banReason });
    setBanDialogOpen(false);
    setIsBanned(true);
    setBanReason("");
  };

  const handleUnban = async () => {
    if (!user) return;
    await unbanUser.mutateAsync(user);
    setIsBanned(false);
  };

  const handleSaveNote = async (note: string) => {
    const { data: { user: admin } } = await supabase.auth.getUser();
    if (admin && user) {
      await supabase.from("admin_audit_log").insert({
        admin_user_id: admin.id,
        action_type: "seeker_note",
        target_type: "seeker",
        target_id: user.user_id,
        details: { note },
      });
      toast.success("Note saved");
    }
  };

  if (!user) return null;

  const hasConcierge = (userActivity?.conciergeInquiries?.length || 0) > 0;
  const totalInquiries = userActivity?.conciergeInquiries?.length || 0;

  const tabs = [
    { value: "overview", label: "Overview", icon: User },
    { value: "inquiries", label: "Inquiries", icon: MessageSquare, badge: totalInquiries },
    { value: "placements", label: "Placements", icon: Handshake },
    { value: "reviews", label: "Reviews", icon: Star, badge: userActivity?.reviews?.length || 0 },
    { value: "activity", label: "Activity", icon: Clock },
    { value: "communications", label: "Comms", icon: Send },
    { value: "saved", label: "Saved", icon: Heart, badge: userActivity?.favorites?.length || 0 },
    { value: "audit", label: "Audit Log", icon: FileText },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl h-[92vh] p-0 flex flex-col overflow-hidden">
          {/* Header */}
          <DialogHeader className="p-5 pb-3 flex-shrink-0 border-b">
            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14 border-2 border-background shadow-lg flex-shrink-0">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-lg">{getDisplayName()}</DialogTitle>
                  {user.phone_verified && <CheckCircle className="h-4 w-4 text-success" />}
                  {isBanned && <Badge variant="destructive" className="gap-1 h-5 text-xs"><Ban className="h-3 w-3" />Banned</Badge>}
                </div>
                <DialogDescription className="text-muted-foreground flex items-center gap-1 mt-0.5 text-sm">
                  {getLocation() ? <><MapPin className="h-3.5 w-3.5" />{getLocation()}</> : <><Mail className="h-3.5 w-3.5" />{email || "No email"}</>}
                  {" • "}Joined {format(new Date(user.created_at), "MMM d, yyyy")}
                </DialogDescription>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge variant="outline" className={cn("h-5 text-xs",
                    isBanned ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-success/10 text-success border-success/30"
                  )}>{isBanned ? "Banned" : "Active"}</Badge>
                  {hasConcierge && (
                    <Badge variant="outline" className="text-chart-3 border-chart-3/30 gap-1 h-5 text-xs"><Shield className="h-3 w-3" />Concierge</Badge>
                  )}
                  <Badge variant="secondary" className="gap-1 h-5 text-xs"><Heart className="h-3 w-3" />{userActivity?.favorites?.length || 0}</Badge>
                  <Badge variant="secondary" className="gap-1 h-5 text-xs"><MessageSquare className="h-3 w-3" />{totalInquiries}</Badge>
                  <Badge variant="secondary" className="gap-1 h-5 text-xs"><Star className="h-3 w-3" />{userActivity?.reviews?.length || 0}</Badge>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="px-5 border-b flex-shrink-0 overflow-x-auto">
              <TabsList className="h-10 w-max justify-start bg-transparent border-none p-0 gap-1">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-2.5 pb-2.5 text-xs gap-1.5 whitespace-nowrap"
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <Badge variant="secondary" className="ml-1 h-4 text-[10px] px-1">{tab.badge}</Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="overview" className="m-0 data-[state=inactive]:hidden">
                <SeekerOverviewTab
                  user={user}
                  email={email}
                  phone={phone}
                  fullName={fullName}
                  city={city}
                  state={state}
                  zipcode={zipcode}
                  isBanned={isBanned}
                  hasConcierge={hasConcierge}
                  userActivity={userActivity}
                  canModerateUsers={canModerateUsers}
                  isSendingReset={isSendingReset}
                  onContactUser={() => email && (window.location.href = `mailto:${email}?subject=RehabLookup Support`)}
                  onSendPasswordReset={() => email && sendPasswordReset.mutateAsync(email)}
                  onBanUser={() => setBanDialogOpen(true)}
                  onUnbanUser={handleUnban}
                  onDeleteUser={() => setDeleteDialogOpen(true)}
                  onSaveNote={handleSaveNote}
                  adminNotes={adminNotes || ""}
                />
              </TabsContent>

              <TabsContent value="inquiries" className="m-0 data-[state=inactive]:hidden">
                <SeekerInquiriesTab userId={user.user_id} />
              </TabsContent>

              <TabsContent value="placements" className="m-0 data-[state=inactive]:hidden">
                <SeekerPlacementsTab userId={user.user_id} />
              </TabsContent>

              <TabsContent value="reviews" className="m-0 data-[state=inactive]:hidden">
                <SeekerReviewsTab userId={user.user_id} />
              </TabsContent>

              <TabsContent value="activity" className="m-0 data-[state=inactive]:hidden">
                <SeekerActivityTab userId={user.user_id} />
              </TabsContent>

              <TabsContent value="communications" className="m-0 data-[state=inactive]:hidden">
                <SeekerCommunicationsTab userId={user.user_id} />
              </TabsContent>

              <TabsContent value="saved" className="m-0 data-[state=inactive]:hidden">
                <SeekerSavedTab userId={user.user_id} />
              </TabsContent>

              <TabsContent value="audit" className="m-0 data-[state=inactive]:hidden">
                <SeekerAuditLogTab userId={user.user_id} />
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />Delete User Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ban Dialog */}
      <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-warning" />Ban User
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will prevent the user from accessing their account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Reason (optional)</label>
            <Textarea value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Enter reason..." className="mt-2" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBan} disabled={isBanning} className="bg-warning text-warning-foreground hover:bg-warning/90">
              {isBanning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Ban User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
