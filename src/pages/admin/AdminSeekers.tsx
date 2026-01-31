import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";
import { UserProfileModal } from "@/components/admin/users/UserProfileModal";
import {
  Search,
  Users as UsersIcon,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  MessageSquare,
  Star,
  Heart,
  Mail,
  Shield,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
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
  // Aggregated fields from multiple sources
  email?: string;
  aggregated_phone?: string;
  aggregated_city?: string;
  aggregated_state?: string;
  aggregated_zipcode?: string;
  has_concierge?: boolean;
}

export default function AdminSeekers() {
  const { logError } = useAdminErrorHandler("AdminUsers");
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [verificationFilter, setVerificationFilter] = useState<"all" | "verified" | "unverified">("all");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Fetch users with aggregated data from multiple sources
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // Fetch base seeker profiles
      const { data: profiles, error } = await supabase
        .from("seeker_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        logError(error.message, "Failed to fetch users");
        throw error;
      }

      // Fetch user emails from auth.users via secure function
      const { data: emailsData } = await supabase.rpc("get_seeker_emails_for_admin");
      
      // Fetch additional details from concierge_inquiries
      const { data: conciergeData } = await supabase
        .from("concierge_inquiries")
        .select("user_id, user_email, user_phone, preferred_city, preferred_state")
        .not("user_id", "is", null);

      // Create lookup maps for aggregated data
      const emailMap = new Map<string, string>();
      const conciergeMap = new Map<string, { email?: string; phone?: string; city?: string; state?: string }>();
      const hasConciergeSet = new Set<string>();

      // Map emails from auth.users
      emailsData?.forEach((item: any) => {
        if (item.user_id && item.email) {
          emailMap.set(item.user_id, item.email);
        }
      });

      conciergeData?.forEach((item: any) => {
        if (item.user_id) {
          hasConciergeSet.add(item.user_id);
          if (!conciergeMap.has(item.user_id)) {
            conciergeMap.set(item.user_id, {
              email: item.user_email,
              phone: item.user_phone,
              city: item.preferred_city,
              state: item.preferred_state,
            });
          }
        }
      });

      // Merge data into profiles
      const enrichedProfiles = profiles?.map((profile: any) => {
        const authEmail = emailMap.get(profile.user_id);
        const concierge = conciergeMap.get(profile.user_id);

        return {
          ...profile,
          // Priority: auth email > concierge email
          email: authEmail || concierge?.email,
          aggregated_phone: profile.phone || concierge?.phone,
          aggregated_city: profile.city || concierge?.city,
          aggregated_state: profile.state || concierge?.state,
          aggregated_zipcode: profile.zipcode,
          has_concierge: hasConciergeSet.has(profile.user_id),
        };
      });

      return enrichedProfiles as UserProfile[];
    },
  });

  // Fetch user activity counts
  const { data: activityStats } = useQuery({
    queryKey: ["admin-user-activity-stats"],
    queryFn: async () => {
      const [favorites, inquiries, reviews, leads] = await Promise.all([
        supabase.from("user_favorites").select("user_id", { count: "exact", head: true }),
        supabase.from("concierge_inquiries").select("user_id", { count: "exact", head: true }).not("user_id", "is", null),
        supabase.from("facility_reviews").select("user_id", { count: "exact", head: true }),
        supabase.from("leads").select("seeker_user_id", { count: "exact", head: true }).not("seeker_user_id", "is", null),
      ]);

      return {
        favorites: favorites.count || 0,
        inquiries: inquiries.count || 0,
        reviews: reviews.count || 0,
        leads: leads.count || 0,
      };
    },
  });

  // Fetch activity counts per user
  const { data: userActivityCounts } = useQuery({
    queryKey: ["admin-user-activity-counts"],
    queryFn: async () => {
      const [favoriteCounts, inquiryCounts, reviewCounts, leadsCounts] = await Promise.all([
        supabase.from("user_favorites").select("user_id"),
        supabase.from("concierge_inquiries").select("user_id").not("user_id", "is", null),
        supabase.from("facility_reviews").select("user_id"),
        supabase.from("leads").select("seeker_user_id").not("seeker_user_id", "is", null),
      ]);

      const counts: Record<string, { favorites: number; inquiries: number; reviews: number; leads: number }> = {};

      favoriteCounts.data?.forEach((item: any) => {
        if (!counts[item.user_id]) counts[item.user_id] = { favorites: 0, inquiries: 0, reviews: 0, leads: 0 };
        counts[item.user_id].favorites++;
      });

      inquiryCounts.data?.forEach((item: any) => {
        if (!counts[item.user_id]) counts[item.user_id] = { favorites: 0, inquiries: 0, reviews: 0, leads: 0 };
        counts[item.user_id].inquiries++;
      });

      reviewCounts.data?.forEach((item: any) => {
        if (!counts[item.user_id]) counts[item.user_id] = { favorites: 0, inquiries: 0, reviews: 0, leads: 0 };
        counts[item.user_id].reviews++;
      });

      leadsCounts.data?.forEach((item: any) => {
        if (!counts[item.seeker_user_id]) counts[item.seeker_user_id] = { favorites: 0, inquiries: 0, reviews: 0, leads: 0 };
        counts[item.seeker_user_id].leads++;
      });

      return counts;
    },
  });

  const safeUsers = users || [];

  // Stats
  const totalCount = safeUsers.length;
  const verifiedCount = safeUsers.filter(u => u.phone_verified).length;
  const withEmailCount = safeUsers.filter(u => u.email).length;
  const thisMonthCount = safeUsers.filter(u => {
    const created = new Date(u.created_at);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  // Filtered users
  const filteredUsers = safeUsers.filter(user => {
    const matchesSearch = !searchQuery ||
      user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.aggregated_city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.aggregated_state?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesVerification = verificationFilter === "all" ||
      (verificationFilter === "verified" && user.phone_verified) ||
      (verificationFilter === "unverified" && !user.phone_verified);

    return matchesSearch && matchesVerification;
  });

  const getDisplayName = (user: UserProfile) => {
    if (user.display_name) return user.display_name;
    if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
    if (user.first_name) return user.first_name;
    return "Anonymous User";
  };

  const getInitials = (user: UserProfile) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user.first_name) return user.first_name.slice(0, 2).toUpperCase();
    return "U";
  };

  const getLocation = (user: UserProfile) => {
    const city = user.aggregated_city || user.city;
    const state = user.aggregated_state || user.state;
    const zip = user.aggregated_zipcode || user.zipcode;
    
    if (city && state) return `${city}, ${state}`;
    if (state) return state;
    if (zip) return zip;
    return null;
  };

  const openDetail = (user: UserProfile) => {
    setSelectedUser(user);
    setDetailDialogOpen(true);
  };

  const handleUserDeleted = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    queryClient.invalidateQueries({ queryKey: ["admin-user-activity-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-user-activity-counts"] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="text-muted-foreground">View and manage end-user accounts</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="relative overflow-hidden border-l-4 border-l-primary">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold">{isLoading ? <Skeleton className="h-9 w-12" /> : totalCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <UsersIcon className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">With Email</p>
                <p className="text-3xl font-bold">{isLoading ? <Skeleton className="h-9 w-12" /> : withEmailCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone Verified</p>
                <p className="text-3xl font-bold">{isLoading ? <Skeleton className="h-9 w-12" /> : verifiedCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-amber-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">New This Month</p>
                <p className="text-3xl font-bold">{isLoading ? <Skeleton className="h-9 w-12" /> : thisMonthCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Inquiries</p>
                <p className="text-3xl font-bold">{activityStats ? activityStats.inquiries + activityStats.leads : <Skeleton className="h-9 w-12" />}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, city, or state..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={verificationFilter} onValueChange={(v) => setVerificationFilter(v as typeof verificationFilter)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Verification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="verified">Phone Verified</SelectItem>
                <SelectItem value="unverified">Not Verified</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const counts = userActivityCounts?.[user.user_id] || { favorites: 0, inquiries: 0, reviews: 0, leads: 0 };
                  const totalInquiries = counts.inquiries + counts.leads;
                  return (
                    <TableRow 
                      key={user.id} 
                      className="group cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => openDetail(user)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {getInitials(user)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{getDisplayName(user)}</p>
                            {user.first_name && user.last_name && user.display_name && (
                              <p className="text-xs text-muted-foreground">{user.first_name} {user.last_name}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.email ? (
                          <div className="flex items-center gap-1.5 text-sm max-w-[200px]">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{user.email}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getLocation(user) ? (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            {getLocation(user)}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {(user.aggregated_phone || user.phone) ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            {user.aggregated_phone || user.phone}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 flex-wrap">
                          {totalInquiries > 0 && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <MessageSquare className="h-3 w-3" />
                              {totalInquiries}
                            </Badge>
                          )}
                          {counts.reviews > 0 && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <Star className="h-3 w-3" />
                              {counts.reviews}
                            </Badge>
                          )}
                          {counts.favorites > 0 && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <Heart className="h-3 w-3" />
                              {counts.favorites}
                            </Badge>
                          )}
                          {user.has_concierge && (
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200 gap-1 text-xs">
                              <Shield className="h-3 w-3" />
                            </Badge>
                          )}
                          {totalInquiries === 0 && counts.reviews === 0 && counts.favorites === 0 && !user.has_concierge && (
                            <span className="text-xs text-muted-foreground">No activity</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          user.phone_verified 
                            ? "bg-green-50 text-green-700 border-green-200" 
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        )}>
                          {user.phone_verified ? (
                            <><CheckCircle className="h-3 w-3 mr-1" /> Verified</>
                          ) : (
                            <><XCircle className="h-3 w-3 mr-1" /> No</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Profile Modal */}
      <UserProfileModal
        user={selectedUser}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onDeleted={handleUserDeleted}
      />
    </div>
  );
}
