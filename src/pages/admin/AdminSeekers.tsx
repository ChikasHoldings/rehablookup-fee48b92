import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";
import { UserProfileModal } from "@/components/admin/users/UserProfileModal";
import { Button } from "@/components/ui/button";
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

const ITEMS_PER_PAGE = 20;

export default function AdminSeekers() {
  const { logError } = useAdminErrorHandler("AdminUsers");
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [verificationFilter, setVerificationFilter] = useState<"all" | "verified" | "unverified">("all");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch total count for pagination
  const { data: totalCount } = useQuery({
    queryKey: ["admin-users-count", verificationFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("seeker_profiles")
        .select("id", { count: "exact", head: true });

      if (verificationFilter === "verified") {
        query = query.eq("phone_verified", true);
      } else if (verificationFilter === "unverified") {
        query = query.or("phone_verified.is.null,phone_verified.eq.false");
      }

      // Server-side name/location search
      if (searchQuery && searchQuery.length >= 2) {
        const q = searchQuery.trim();
        query = query.or(`display_name.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,city.ilike.%${q}%,state.ilike.%${q}%`);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch users with aggregated data from multiple sources - PAGINATED
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", currentPage, verificationFilter, searchQuery],
    queryFn: async () => {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Fetch base seeker profiles with pagination
      let profileQuery = supabase
        .from("seeker_profiles")
        .select("id, user_id, first_name, last_name, display_name, phone, city, state, zipcode, phone_verified, phone_verified_at, avatar_url, created_at, updated_at")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (verificationFilter === "verified") {
        profileQuery = profileQuery.eq("phone_verified", true);
      } else if (verificationFilter === "unverified") {
        profileQuery = profileQuery.or("phone_verified.is.null,phone_verified.eq.false");
      }

      // Server-side name/location search
      if (searchQuery && searchQuery.length >= 2) {
        const q = searchQuery.trim();
        profileQuery = profileQuery.or(`display_name.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,city.ilike.%${q}%,state.ilike.%${q}%`);
      }

      const { data: profiles, error } = await profileQuery;

      if (error) {
        logError(error.message, "Failed to fetch users");
        throw error;
      }

      // Fetch user emails from auth.users via secure function
      const { data: emailsData } = await supabase.rpc("get_seeker_emails_for_admin");
      
      // Fetch user phones from all sources via secure function
      const { data: phonesData } = await supabase.rpc("get_seeker_phones_for_admin");
      
      // Fetch additional details from concierge_inquiries
      const { data: conciergeData } = await supabase
        .from("concierge_inquiries")
        .select("user_id, user_email, user_phone, preferred_city, preferred_state")
        .not("user_id", "is", null);

      // Create lookup maps for aggregated data
      const emailMap = new Map<string, string>();
      const phoneMap = new Map<string, string>();
      const conciergeMap = new Map<string, { email?: string; phone?: string; city?: string; state?: string }>();
      const hasConciergeSet = new Set<string>();

      // Map emails from auth.users
      emailsData?.forEach((item: any) => {
        if (item.user_id && item.email) {
          emailMap.set(item.user_id, item.email);
        }
      });

      // Map phones - profile source takes priority
      phonesData?.forEach((item: any) => {
        if (item.user_id && item.phone) {
          // Only set if not already set (profile comes first in the union)
          if (!phoneMap.has(item.user_id)) {
            phoneMap.set(item.user_id, item.phone);
          }
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
        const aggregatedPhone = phoneMap.get(profile.user_id);
        const concierge = conciergeMap.get(profile.user_id);

        return {
          ...profile,
          // Priority: auth email > concierge email
          email: authEmail || concierge?.email,
          aggregated_phone: aggregatedPhone || profile.phone || concierge?.phone,
          aggregated_city: profile.city || concierge?.city,
          aggregated_state: profile.state || concierge?.state,
          aggregated_zipcode: profile.zipcode,
          has_concierge: hasConciergeSet.has(profile.user_id),
        };
      });

      return enrichedProfiles as UserProfile[];
    },
  });

  // Fetch global stats for KPI bar (independent of pagination)
  const { data: globalStats } = useQuery({
    queryKey: ["admin-users-global-stats"],
    queryFn: async () => {
      const [allResult, verifiedResult, conciergeResult, favorites, inquiries, reviews] = await Promise.all([
        supabase.from("seeker_profiles").select("id", { count: "exact", head: true }),
        supabase.from("seeker_profiles").select("id", { count: "exact", head: true }).eq("phone_verified", true),
        supabase.from("concierge_inquiries").select("user_id", { count: "exact", head: true }).not("user_id", "is", null),
        supabase.from("user_favorites").select("user_id", { count: "exact", head: true }),
        supabase.from("concierge_inquiries").select("user_id", { count: "exact", head: true }).not("user_id", "is", null),
        supabase.from("facility_reviews").select("user_id", { count: "exact", head: true }),
      ]);

      const total = allResult.count || 0;
      const verified = verifiedResult.count || 0;

      return {
        total,
        verified,
        unverified: total - verified,
        concierge: conciergeResult.count || 0,
        favorites: favorites.count || 0,
        inquiries: inquiries.count || 0,
        reviews: reviews.count || 0,
      };
    },
  });

  // Fetch activity counts per user
  const { data: userActivityCounts } = useQuery({
    queryKey: ["admin-user-activity-counts"],
    queryFn: async () => {
      const [favoriteCounts, inquiryCounts, reviewCounts] = await Promise.all([
        supabase.from("user_favorites").select("user_id").limit(5000),
        supabase.from("concierge_inquiries").select("user_id").not("user_id", "is", null).limit(5000),
        supabase.from("facility_reviews").select("user_id").limit(5000),
      ]);

      const counts: Record<string, { favorites: number; inquiries: number; reviews: number }> = {};

      favoriteCounts.data?.forEach((item: any) => {
        if (!counts[item.user_id]) counts[item.user_id] = { favorites: 0, inquiries: 0, reviews: 0 };
        counts[item.user_id].favorites++;
      });

      inquiryCounts.data?.forEach((item: any) => {
        if (!counts[item.user_id]) counts[item.user_id] = { favorites: 0, inquiries: 0, reviews: 0 };
        counts[item.user_id].inquiries++;
      });

      reviewCounts.data?.forEach((item: any) => {
        if (!counts[item.user_id]) counts[item.user_id] = { favorites: 0, inquiries: 0, reviews: 0 };
        counts[item.user_id].reviews++;
      });

      return counts;
    },
  });

  const safeUsers = users || [];
  const totalPages = Math.ceil((totalCount || 0) / ITEMS_PER_PAGE);

  // Stats from current page data
  const pageCount = safeUsers.length;
  const thisMonthCount = safeUsers.filter(u => {
    const created = new Date(u.created_at);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  // Client-side search filter on the current page of data
  const filteredUsers = safeUsers.filter(user => {
    const matchesSearch = !searchQuery ||
      user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.aggregated_city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.aggregated_state?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  // Reset page on filter change
  const handleFilterChange = (value: "all" | "verified" | "unverified") => {
    setVerificationFilter(value);
    setCurrentPage(1);
  };

  const getDisplayName = (user: UserProfile) => {
    if (user.display_name) return user.display_name;
    if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
    if (user.first_name) return user.first_name;
    return "Verified User";
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

      {/* Enterprise KPI Summary Bar */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-stretch">
            {/* Primary Stats */}
            <div className="flex items-center gap-0.5 p-3">
              <button
                onClick={() => handleFilterChange("all")}
                className={cn(
                  "flex flex-col items-center justify-center px-3 py-2.5 rounded-lg transition-all min-w-[72px]",
                  verificationFilter === "all" ? "bg-accent/10 ring-1 ring-accent" : "hover:bg-muted/50"
                )}
              >
                <UsersIcon className="h-3.5 w-3.5 text-muted-foreground mb-1" />
                <span className="text-lg font-semibold tabular-nums leading-none">{isLoading ? "—" : (totalCount || 0)}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">Total</span>
              </button>
              <button
                onClick={() => handleFilterChange("all")}
                className="flex flex-col items-center justify-center px-3 py-2.5 rounded-lg transition-all min-w-[72px] hover:bg-muted/50"
              >
                <Calendar className="h-3.5 w-3.5 text-warning mb-1" />
                <span className="text-lg font-semibold tabular-nums leading-none">{isLoading ? "—" : thisMonthCount}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">This Month</span>
              </button>
              <button
                onClick={() => handleFilterChange("verified")}
                className={cn(
                  "flex flex-col items-center justify-center px-3 py-2.5 rounded-lg transition-all min-w-[72px]",
                  verificationFilter === "verified" ? "bg-accent/10 ring-1 ring-accent" : "hover:bg-muted/50"
                )}
              >
                <CheckCircle className="h-3.5 w-3.5 text-success mb-1" />
                <span className="text-lg font-semibold tabular-nums leading-none">{globalStats?.verified ?? "—"}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">Verified</span>
              </button>
              <button
                onClick={() => handleFilterChange("unverified")}
                className={cn(
                  "flex flex-col items-center justify-center px-3 py-2.5 rounded-lg transition-all min-w-[72px]",
                  verificationFilter === "unverified" ? "bg-accent/10 ring-1 ring-accent" : "hover:bg-muted/50"
                )}
              >
                <XCircle className="h-3.5 w-3.5 text-muted-foreground mb-1" />
                <span className="text-lg font-semibold tabular-nums leading-none">{globalStats?.unverified ?? "—"}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">Unverified</span>
              </button>
            </div>

            <div className="w-px bg-border my-2" />

            {/* Concierge Stats */}
            <div className="flex items-center gap-0.5 p-3">
              <div className="flex flex-col items-center justify-center px-3 py-2.5 min-w-[72px]">
                <Shield className="h-3.5 w-3.5 text-primary mb-1" />
                <span className="text-lg font-semibold tabular-nums leading-none">{globalStats?.concierge ?? "—"}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">Concierge</span>
              </div>
            </div>

            {/* Activity Stats */}
            <div className="hidden lg:flex items-center gap-4 px-4 ml-auto border-l">
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5 text-destructive" />
                  <span className="text-sm font-medium tabular-nums">{globalStats?.favorites || 0}</span>
                </div>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Saves</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-info" />
                  <span className="text-sm font-medium tabular-nums">{globalStats?.inquiries || 0}</span>
                </div>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Inquiries</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-warning" />
                  <span className="text-sm font-medium tabular-nums">{globalStats?.reviews || 0}</span>
                </div>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Reviews</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, city, or state..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={verificationFilter} onValueChange={(v) => handleFilterChange(v as typeof verificationFilter)}>
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
                  const counts = userActivityCounts?.[user.user_id] || { favorites: 0, inquiries: 0, reviews: 0 };
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
                          {counts.inquiries > 0 && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <MessageSquare className="h-3 w-3" />
                              {counts.inquiries}
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
                          {counts.inquiries === 0 && counts.reviews === 0 && counts.favorites === 0 && !user.has_concierge && (
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages} ({totalCount || 0} users)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

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
