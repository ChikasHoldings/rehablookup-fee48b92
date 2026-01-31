import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserManagement } from "@/hooks/admin/useUserManagement";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
  ExternalLink,
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
  
  const { 
    deleteUser, 
    banUser, 
    unbanUser, 
    sendPasswordReset, 
    checkBanStatus,
    isDeleting, 
    isBanning, 
    isSendingReset 
  } = useUserManagement();

  // Check ban status when user changes
  useEffect(() => {
    if (user?.user_id) {
      checkBanStatus(user.user_id).then(setIsBanned);
    }
  }, [user?.user_id]);

  // Fetch user email from edge function or RPC
  const { data: userEmail } = useQuery({
    queryKey: ["admin-user-email", user?.user_id],
    queryFn: async (): Promise<string | null> => {
      if (!user?.user_id) return null;
      
      // Try to get email from concierge inquiries
      const { data: inquiry } = await supabase
        .from("concierge_inquiries")
        .select("user_email")
        .eq("user_id", user.user_id)
        .limit(1)
        .maybeSingle();
      
      return inquiry?.user_email || null;
    },
    enabled: !!user?.user_id && !user?.email,
  });

  // Fetch user activity
  const { data: userActivity, isLoading: activityLoading } = useQuery({
    queryKey: ["admin-user-activity", user?.user_id],
    queryFn: async (): Promise<{
      favorites: any[];
      inquiries: any[];
      reviews: any[];
      activityLog: any[];
    } | null> => {
      if (!user?.user_id) return null;

      const [favorites, inquiries, reviews, activityLog] = await Promise.all([
        supabase
          .from("user_favorites")
          .select("id, facility_id, created_at, facilities(name, city, state)")
          .eq("user_id", user.user_id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("concierge_inquiries")
          .select("id, status, created_at, primary_concern, level_of_care, user_name, user_email, user_phone, payment_status")
          .eq("user_id", user.user_id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("facility_reviews")
          .select("id, rating, review_text, status, created_at, facilities(name)")
          .eq("user_id", user.user_id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("account_activity_log")
          .select("id, event_type, event_description, created_at, metadata")
          .eq("user_id", user.user_id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      return {
        favorites: favorites.data || [],
        inquiries: inquiries.data || [],
        reviews: reviews.data || [],
        activityLog: activityLog.data || [],
      };
    },
    enabled: !!user?.user_id,
  });

  const email = user?.email || userEmail;
  
  const getDisplayName = () => {
    if (!user) return "Unknown";
    if (user.display_name) return user.display_name;
    if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
    if (user.first_name) return user.first_name;
    return "Anonymous User";
  };

  const getInitials = () => {
    if (!user) return "U";
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user.first_name) return user.first_name.slice(0, 2).toUpperCase();
    return "U";
  };

  const getLocation = () => {
    if (!user) return null;
    if (user.city && user.state) return `${user.city}, ${user.state}`;
    if (user.state) return user.state;
    if (user.zipcode) return user.zipcode;
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
    if (email) {
      window.location.href = `mailto:${email}?subject=RehabLookup Support`;
    }
  };

  if (!user) return null;

  const hasConcierge = (userActivity?.inquiries?.length || 0) > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Profile
              {isBanned && (
                <Badge variant="destructive" className="ml-2">
                  <Ban className="h-3 w-3 mr-1" />
                  Banned
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6">
            {/* Profile Header */}
            <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50">
              <Avatar className="h-20 w-20 border-2 border-background shadow-md">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold truncate">{getDisplayName()}</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  {email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{email}</span>
                    </div>
                  )}
                  {user.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>{user.phone}</span>
                      {user.phone_verified && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  )}
                  {getLocation() && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>{getLocation()}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>Joined {format(new Date(user.created_at), "MMM d, yyyy")}</span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex flex-wrap gap-3 mt-4">
                  <Badge variant="secondary" className="gap-1">
                    <Heart className="h-3 w-3" />
                    {userActivity?.favorites?.length || 0} Saved
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {userActivity?.inquiries?.length || 0} Inquiries
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3" />
                    {userActivity?.reviews?.length || 0} Reviews
                  </Badge>
                  {hasConcierge && (
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200 gap-1">
                      <Shield className="h-3 w-3" />
                      Concierge User
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 p-4 rounded-xl border bg-card">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleContactUser}
                disabled={!email}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Contact User
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSendPasswordReset}
                disabled={!email || isSendingReset}
                className="gap-2"
              >
                {isSendingReset ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Send Password Reset
              </Button>
              {isBanned ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleUnban}
                  className="gap-2 text-green-600 hover:text-green-700"
                >
                  <ShieldOff className="h-4 w-4" />
                  Unban User
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setBanDialogOpen(true)}
                  className="gap-2 text-amber-600 hover:text-amber-700"
                >
                  <Ban className="h-4 w-4" />
                  Ban User
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setDeleteDialogOpen(true)}
                className="gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete Account
              </Button>
            </div>

            <Separator />

            {/* Activity Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="inquiries" className="gap-1.5 text-xs sm:text-sm">
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Inquiries</span>
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">{userActivity?.inquiries?.length || 0}</Badge>
                </TabsTrigger>
                <TabsTrigger value="reviews" className="gap-1.5 text-xs sm:text-sm">
                  <Star className="h-4 w-4" />
                  <span className="hidden sm:inline">Reviews</span>
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">{userActivity?.reviews?.length || 0}</Badge>
                </TabsTrigger>
                <TabsTrigger value="saved" className="gap-1.5 text-xs sm:text-sm">
                  <Heart className="h-4 w-4" />
                  <span className="hidden sm:inline">Saved</span>
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">{userActivity?.favorites?.length || 0}</Badge>
                </TabsTrigger>
                <TabsTrigger value="activity" className="gap-1.5 text-xs sm:text-sm">
                  <Clock className="h-4 w-4" />
                  <span className="hidden sm:inline">Activity</span>
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Contact Information */}
                  <div className="p-4 rounded-xl border bg-card">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      Contact Information
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Full Name</span>
                        <span className="font-medium">
                          {user.first_name || user.last_name 
                            ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                            : 'Not provided'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Display Name</span>
                        <span className="font-medium">{user.display_name || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email</span>
                        <span className="font-medium">{email || 'Not available'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone</span>
                        <span className="font-medium">{user.phone || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone Verified</span>
                        <span className="font-medium">
                          {user.phone_verified ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Yes</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">No</Badge>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Location Information */}
                  <div className="p-4 rounded-xl border bg-card">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      Location
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">City</span>
                        <span className="font-medium">{user.city || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">State</span>
                        <span className="font-medium">{user.state || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Zip Code</span>
                        <span className="font-medium">{user.zipcode || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Account Details */}
                  <div className="p-4 rounded-xl border bg-card">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Account Details
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">User ID</span>
                        <span className="font-mono text-xs">{user.user_id.slice(0, 8)}...</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created</span>
                        <span className="font-medium">{format(new Date(user.created_at), "MMM d, yyyy h:mm a")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Updated</span>
                        <span className="font-medium">{format(new Date(user.updated_at), "MMM d, yyyy h:mm a")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account Status</span>
                        <span className="font-medium">
                          {isBanned ? (
                            <Badge variant="destructive">Banned</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Engagement Summary */}
                  <div className="p-4 rounded-xl border bg-card">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      Engagement Summary
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Concierge User</span>
                        <span className="font-medium">
                          {hasConcierge ? (
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200">Yes</Badge>
                          ) : (
                            <Badge variant="outline">No</Badge>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Saved Facilities</span>
                        <span className="font-medium">{userActivity?.favorites?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Inquiries Submitted</span>
                        <span className="font-medium">{userActivity?.inquiries?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Reviews Written</span>
                        <span className="font-medium">{userActivity?.reviews?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Inquiries Tab */}
              <TabsContent value="inquiries" className="mt-4">
                {activityLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : userActivity?.inquiries?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>No inquiries submitted</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {userActivity?.inquiries?.map((inquiry: any) => (
                      <div key={inquiry.id} className="p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className={cn(
                                inquiry.status === 'matched' && "bg-green-50 text-green-700 border-green-200",
                                inquiry.status === 'pending' && "bg-amber-50 text-amber-700 border-amber-200",
                                inquiry.status === 'closed' && "bg-slate-50 text-slate-500 border-slate-200"
                              )}>
                                {inquiry.status}
                              </Badge>
                              {inquiry.level_of_care && (
                                <Badge variant="secondary">{inquiry.level_of_care}</Badge>
                              )}
                              {inquiry.payment_status === 'paid' && (
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Paid</Badge>
                              )}
                            </div>
                            {inquiry.primary_concern && (
                              <p className="text-sm text-muted-foreground mt-2">{inquiry.primary_concern}</p>
                            )}
                            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                              {inquiry.user_name && <span>Name: {inquiry.user_name}</span>}
                              {inquiry.user_phone && <span>Phone: {inquiry.user_phone}</span>}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                            {formatDistanceToNow(new Date(inquiry.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews" className="mt-4">
                {activityLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : userActivity?.reviews?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Star className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>No reviews written</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {userActivity?.reviews?.map((review: any) => (
                      <div key={review.id} className="p-4 rounded-xl border bg-card">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{review.facilities?.name || "Unknown Facility"}</p>
                              <Badge variant="outline" className={cn(
                                review.status === 'approved' && "bg-green-50 text-green-700 border-green-200",
                                review.status === 'pending' && "bg-amber-50 text-amber-700 border-amber-200",
                                review.status === 'rejected' && "bg-red-50 text-red-700 border-red-200"
                              )}>
                                {review.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={cn(
                                    "h-4 w-4",
                                    i < review.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"
                                  )}
                                />
                              ))}
                              <span className="ml-2 text-sm text-muted-foreground">({review.rating}/5)</span>
                            </div>
                            {review.review_text && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{review.review_text}</p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                            {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Saved Facilities Tab */}
              <TabsContent value="saved" className="mt-4">
                {activityLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : userActivity?.favorites?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Heart className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>No saved facilities</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {userActivity?.favorites?.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Heart className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{item.facilities?.name || "Unknown Facility"}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.facilities?.city}, {item.facilities?.state}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Activity Log Tab */}
              <TabsContent value="activity" className="mt-4">
                {activityLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : userActivity?.activityLog?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>No activity recorded</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {userActivity?.activityLog?.map((activity: any) => (
                      <div key={activity.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium capitalize">{activity.event_type.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-muted-foreground">{activity.event_description}</p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete User Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account for <strong>{getDisplayName()}</strong> and remove all associated data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Saved facilities</li>
                <li>Submitted reviews</li>
                <li>Inquiry history</li>
                <li>Activity logs</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ban Confirmation Dialog */}
      <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <Ban className="h-5 w-5" />
              Ban User
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                You are about to ban <strong>{getDisplayName()}</strong>. This will prevent them from accessing their account.
              </p>
              <div>
                <label className="text-sm font-medium text-foreground">Reason for ban (optional)</label>
                <Textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Enter reason for banning this user..."
                  className="mt-1"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBan}
              disabled={isBanning}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {isBanning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Ban User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
