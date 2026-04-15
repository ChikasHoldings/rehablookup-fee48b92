import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserManagement } from "@/hooks/admin/useUserManagement";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  Heart,
  MessageSquare,
  Star,
  Trash2,
  Ban,
  KeyRound,
  Send,
  Shield,
  Clock,
  Loader2,
  ShieldOff,
  FileText,
  AlertCircle,
  Building2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

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
    deleteUser,
    banUser,
    unbanUser,
    sendPasswordReset,
    checkBanStatus,
    isDeleting,
    isBanning,
    isSendingReset,
  } = useUserManagement();

  useEffect(() => {
    if (user) setActiveTab("overview");
  }, [user]);

  useEffect(() => {
    if (user?.user_id) {
      checkBanStatus(user.user_id).then(setIsBanned);
    }
  }, [user?.user_id]);

  // Fetch aggregated user data
  const { data: aggregatedData } = useQuery({
    queryKey: ["admin-user-aggregated", user?.user_id],
    queryFn: async () => {
      if (!user?.user_id) return { email: null, phone: null, fullName: null, city: null, state: null, zipcode: null, sources: [] };

      const sources: string[] = [];
      let email: string | null = null;
      let phone: string | null = null;
      let fullName: string | null = null;
      let city: string | null = null;
      let state: string | null = null;
      let zipcode: string | null = null;

      const { data: emailsData } = await supabase.rpc("get_seeker_emails_for_admin");
      const authEmail = emailsData?.find((e: any) => e.user_id === user.user_id)?.email;
      if (authEmail) { email = authEmail; sources.push("Account Signup"); }

      const conciergeResult = await supabase
        .from("concierge_inquiries")
        .select("user_email, user_phone, user_name, preferred_city, preferred_state")
        .eq("user_id", user.user_id)
        .order("created_at", { ascending: false })
        .limit(1) as any;
      const concierge = conciergeResult.data?.[0] || null;

      if (concierge) {
        if (concierge.user_phone && !phone) phone = concierge.user_phone;
        if (concierge.user_name && !fullName) fullName = concierge.user_name;
        if (concierge.preferred_city && !city) city = concierge.preferred_city;
        if (concierge.preferred_state && !state) state = concierge.preferred_state;
      }

      if (user.first_name || user.last_name) {
        const profileName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
        if (!fullName && profileName) fullName = profileName;
      }
      if (user.phone && !phone) phone = user.phone;
      if (user.city && !city) city = user.city;
      if (user.state && !state) state = user.state;
      if (user.zipcode && !zipcode) zipcode = user.zipcode;

      return { email, phone, fullName, city, state, zipcode, sources };
    },
    enabled: !!user?.user_id && open,
  });

  // Fetch user activity
  const { data: userActivity } = useQuery({
    queryKey: ["admin-user-activity", user?.user_id],
    queryFn: async () => {
      if (!user?.user_id) return null;

      const [favorites, conciergeInquiries, reviews, activityLog] = await Promise.all([
        supabase.from("user_favorites").select("id, facility_id, created_at, facilities(name, city, state)").eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(20) as any,
        supabase.from("concierge_inquiries").select("id, status, created_at, primary_concern, level_of_care, user_name, user_email, user_phone, payment_status, preferred_city, preferred_state").eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(20) as any,
        supabase.from("facility_reviews").select("id, rating, review_text, status, created_at, facility_id").eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(20) as any,
        supabase.from("account_activity_log").select("id, event_type, event_description, created_at, metadata").eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(20) as any,
      ]);

      const reviewFacilityIds = reviews.data?.map((r: any) => r.facility_id).filter(Boolean) || [];
      let facilitiesMap: Record<string, any> = {};
      if (reviewFacilityIds.length > 0) {
        const { data: facilities } = await supabase.from("facilities").select("id, name, city, state").in("id", reviewFacilityIds);
        facilities?.forEach((f: any) => { facilitiesMap[f.id] = f; });
      }

      const enrichedReviews = reviews.data?.map((review: any) => ({ ...review, facilities: facilitiesMap[review.facility_id] || null })) || [];

      return {
        favorites: favorites.data || [],
        conciergeInquiries: conciergeInquiries.data || [],
        reviews: enrichedReviews,
        activityLog: activityLog.data || [],
      };
    },
    enabled: !!user?.user_id && open,
  });

  const email = aggregatedData?.email || user?.email;
  const phone = aggregatedData?.phone || user?.aggregated_phone || user?.phone;
  const fullName = aggregatedData?.fullName || (user?.first_name || user?.last_name ? `${user?.first_name || ""} ${user?.last_name || ""}`.trim() : null);
  const city = aggregatedData?.city || user?.aggregated_city || user?.city;
  const state = aggregatedData?.state || user?.aggregated_state || user?.state;
  const zipcode = aggregatedData?.zipcode || user?.aggregated_zipcode || user?.zipcode;

  const getDisplayName = () => {
    if (!user) return "Unknown";
    if (fullName) return fullName;
    if (user.display_name) return user.display_name;
    return "Verified User";
  };

  const getInitials = () => {
    if (!user) return "U";
    if (user.first_name && user.last_name) return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    if (user.first_name) return user.first_name.slice(0, 2).toUpperCase();
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

  const handleSendPasswordReset = async () => {
    if (!email) return;
    await sendPasswordReset.mutateAsync(email);
  };

  const handleContactUser = () => {
    if (email) window.location.href = `mailto:${email}?subject=RehabLookup Support`;
  };

  if (!user) return null;

  const hasConcierge = (userActivity?.conciergeInquiries?.length || 0) > 0;
  const totalInquiries = userActivity?.conciergeInquiries?.length || 0;

  const tabs = [
    { value: "overview", label: "Overview", icon: User },
    { value: "inquiries", label: "Inquiries", icon: MessageSquare, badge: totalInquiries },
    { value: "reviews", label: "Reviews", icon: Star, badge: userActivity?.reviews?.length || 0 },
    { value: "saved", label: "Saved", icon: Heart, badge: userActivity?.favorites?.length || 0 },
    { value: "activity", label: "Activity", icon: Clock },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl h-[92vh] p-0 flex flex-col overflow-hidden">
          {/* Header - matches Provider modal */}
          <DialogHeader className="p-5 pb-3 flex-shrink-0 border-b">
            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14 border-2 border-background shadow-lg flex-shrink-0">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-lg">{getDisplayName()}</DialogTitle>
                  {user.phone_verified && <CheckCircle className="h-4 w-4 text-success" />}
                  {isBanned && (
                    <Badge variant="destructive" className="gap-1 h-5 text-xs">
                      <Ban className="h-3 w-3" />Banned
                    </Badge>
                  )}
                </div>
                <DialogDescription className="text-muted-foreground flex items-center gap-1 mt-0.5 text-sm">
                  {getLocation() ? (
                    <><MapPin className="h-3.5 w-3.5" />{getLocation()}</>
                  ) : (
                    <><Mail className="h-3.5 w-3.5" />{email || "No email"}</>
                  )}
                  {" • "}Joined {format(new Date(user.created_at), "MMM d, yyyy")}
                </DialogDescription>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge variant="outline" className={cn(
                    "h-5 text-xs",
                    isBanned
                      ? "bg-destructive/10 text-destructive border-destructive/30"
                      : "bg-success/10 text-success border-success/30"
                  )}>
                    {isBanned ? "Banned" : "Active"}
                  </Badge>
                  {hasConcierge && (
                    <Badge variant="outline" className="text-chart-3 border-chart-3/30 gap-1 h-5 text-xs">
                      <Shield className="h-3 w-3" />Concierge
                    </Badge>
                  )}
                  <Badge variant="secondary" className="gap-1 h-5 text-xs">
                    <Heart className="h-3 w-3" />{userActivity?.favorites?.length || 0}
                  </Badge>
                  <Badge variant="secondary" className="gap-1 h-5 text-xs">
                    <MessageSquare className="h-3 w-3" />{totalInquiries}
                  </Badge>
                  <Badge variant="secondary" className="gap-1 h-5 text-xs">
                    <Star className="h-3 w-3" />{userActivity?.reviews?.length || 0}
                  </Badge>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Tabs - matches Provider modal */}
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
              {/* Overview Tab */}
              <TabsContent value="overview" className="m-0 data-[state=inactive]:hidden">
                <div className="p-5 space-y-5">
                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 p-4 rounded-xl border bg-card">
                    <Button variant="outline" size="sm" onClick={handleContactUser} disabled={!email} className="gap-2">
                      <Send className="h-4 w-4" />Contact User
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleSendPasswordReset} disabled={!email || isSendingReset} className="gap-2">
                      {isSendingReset ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                      Send Password Reset
                    </Button>
                    {canModerateUsers && (
                      <>
                        {isBanned ? (
                          <Button variant="outline" size="sm" onClick={handleUnban} className="gap-2 text-success hover:text-success">
                            <ShieldOff className="h-4 w-4" />Unban User
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => setBanDialogOpen(true)} className="gap-2 text-warning hover:text-warning">
                            <Ban className="h-4 w-4" />Ban User
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(true)} className="gap-2 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />Delete Account
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Info Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Contact Information */}
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
                            <Badge variant="outline" className="bg-success/10 text-success border-success/30">Yes</Badge>
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
                          <span className="text-muted-foreground">Created</span>
                          <span className="font-medium">{format(new Date(user.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Updated</span>
                          <span className="font-medium">{format(new Date(user.updated_at), "MMM d, yyyy 'at' h:mm a")}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Concierge User</span>
                          {hasConcierge ? (
                            <Badge variant="outline" className="bg-chart-3/10 text-chart-3 border-chart-3/30">Yes</Badge>
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
                          <span className="text-muted-foreground">Concierge Requests</span>
                          <span className="font-medium">{userActivity?.conciergeInquiries?.length || 0}</span>
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
                </div>
              </TabsContent>

              {/* Inquiries Tab */}
              <TabsContent value="inquiries" className="m-0 data-[state=inactive]:hidden">
                <div className="p-5 space-y-3">
                  {hasConcierge ? (
                    <>
                      <h4 className="font-semibold flex items-center gap-2 text-sm">
                        <Shield className="h-4 w-4 text-chart-3" />
                        Concierge Requests ({totalInquiries})
                      </h4>
                      {userActivity?.conciergeInquiries?.map((inquiry: any) => (
                        <div key={inquiry.id} className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{inquiry.primary_concern || "General Inquiry"}</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                <Badge variant="outline" className={cn("text-xs",
                                  inquiry.status === "matched" && "bg-success/10 text-success border-success/30",
                                  inquiry.status === "pending" && "bg-warning/10 text-warning border-warning/30",
                                  inquiry.status === "closed" && "bg-muted text-muted-foreground border-border"
                                )}>{inquiry.status}</Badge>
                                {inquiry.level_of_care && <Badge variant="secondary" className="text-xs">{inquiry.level_of_care}</Badge>}
                                {inquiry.payment_status && (
                                  <Badge variant="outline" className={cn("text-xs",
                                    (inquiry.payment_status === "paid" || inquiry.payment_status === "succeeded") && "bg-success/10 text-success border-success/30"
                                  )}>{inquiry.payment_status}</Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                                {inquiry.user_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{inquiry.user_email}</span>}
                                {inquiry.user_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{inquiry.user_phone}</span>}
                                {(inquiry.preferred_city || inquiry.preferred_state) && (
                                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{[inquiry.preferred_city, inquiry.preferred_state].filter(Boolean).join(", ")}</span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(inquiry.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="text-center py-16">
                      <MessageSquare className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                      <p className="text-muted-foreground font-medium">No inquiries found</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews" className="m-0 data-[state=inactive]:hidden">
                <div className="p-5 space-y-3">
                  {userActivity?.reviews?.length ? (
                    userActivity.reviews.map((review: any) => (
                      <div key={review.id} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{review.facilities?.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className={cn("h-4 w-4", i < review.rating ? "fill-warning text-warning" : "text-muted-foreground/30")} />
                                ))}
                              </div>
                              <Badge variant="outline" className={cn("text-xs",
                                review.status === "approved" && "bg-success/10 text-success border-success/30",
                                review.status === "pending" && "bg-warning/10 text-warning border-warning/30",
                                review.status === "rejected" && "bg-destructive/10 text-destructive border-destructive/30"
                              )}>{review.status}</Badge>
                            </div>
                            {review.review_text && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{review.review_text}</p>}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16">
                      <Star className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                      <p className="text-muted-foreground font-medium">No reviews written</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Saved Tab */}
              <TabsContent value="saved" className="m-0 data-[state=inactive]:hidden">
                <div className="p-5 space-y-3">
                  {userActivity?.favorites?.length ? (
                    userActivity.favorites.map((fav: any) => (
                      <div key={fav.id} className="p-3 rounded-lg border bg-card flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{fav.facilities?.name}</p>
                            <p className="text-xs text-muted-foreground">{fav.facilities?.city}, {fav.facilities?.state}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(fav.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16">
                      <Heart className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                      <p className="text-muted-foreground font-medium">No saved facilities</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="m-0 data-[state=inactive]:hidden">
                <div className="p-5 space-y-3">
                  {userActivity?.activityLog?.length ? (
                    userActivity.activityLog.map((activity: any) => (
                      <div key={activity.id} className="p-3 rounded-lg border bg-card flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm capitalize">{activity.event_type.replace(/_/g, " ")}</p>
                            <p className="text-xs text-muted-foreground truncate">{activity.event_description}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16">
                      <Clock className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                      <p className="text-muted-foreground font-medium">No activity recorded</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
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

      {/* Ban Confirmation */}
      <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-warning" />Ban User
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will prevent the user from accessing their account. You can unban them later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Reason for ban (optional)</label>
            <Textarea value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Enter reason for banning this user..." className="mt-2" />
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
