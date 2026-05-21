import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";
import { useUserManagement } from "@/hooks/admin/useUserManagement";
import { UserProfileModal } from "@/components/admin/users/UserProfileModal";
import { BulkBanSeekersDialog } from "@/components/admin/users/BulkBanSeekersDialog";
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
  X,
  Download,
  Trash2,
  Ban,
  Loader2,
  Link2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PaginationFooter } from "@/components/common/PaginationFooter";
import { usePagination } from "@/hooks/usePagination";

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



function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function AdminSeekers() {
  const { logError } = useAdminErrorHandler("AdminUsers");
  const queryClient = useQueryClient();
  // URL-state — search + verification filter round-trip through the
  // URL so any filtered view is bookmarkable / shareable / reload-
  // stable. Same pattern as /admin/leads, /admin/insurance-verifications,
  // and /admin/providers.
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(() => searchParams.get("q") ?? "");
  const [verificationFilter, setVerificationFilter] = useState<"all" | "verified" | "unverified">(
    () => (searchParams.get("verified") as "all" | "verified" | "unverified") || "all",
  );
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkBanOpen, setBulkBanOpen] = useState(false);

  const searchQuery = useDebounce(searchInput, 350);

  // Sync state → URL on every change. `replace: true` keeps history
  // short; defaults skipped to keep URLs tidy; loop-guarded compare
  // before write to avoid the useSearchParams render loop.
  useEffect(() => {
    const next = new URLSearchParams();
    if (searchQuery) next.set("q", searchQuery);
    if (verificationFilter !== "all") next.set("verified", verificationFilter);
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [searchQuery, verificationFilter, searchParams, setSearchParams]);

  // Realtime invalidation — Supabase channel keeps the list in sync
  // with INSERT/UPDATE/DELETE on seeker_profiles without waiting for
  // the next refetch. RLS gates which events the admin's JWT sees.
  // Same pattern as /admin/leads + /admin/insurance-verifications.
  useEffect(() => {
    const channel = supabase
      .channel(`admin-seekers-live-${Math.random().toString(36).slice(2,8)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "seeker_profiles" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-users"] });
          queryClient.invalidateQueries({ queryKey: ["admin-users-count"] });
          queryClient.invalidateQueries({ queryKey: ["admin-users-global-stats"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "seeker_profiles" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "seeker_profiles" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-users"] });
          queryClient.invalidateQueries({ queryKey: ["admin-users-count"] });
          queryClient.invalidateQueries({ queryKey: ["admin-users-global-stats"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const hasActiveFilters = verificationFilter !== "all" || searchInput !== "";

  // Copy-link helper for shareable filtered URLs — same fallback
  // pattern as the prior admin surfaces (Clipboard API → execCommand).
  const copyFilterLink = useCallback(async () => {
    try {
      const url = window.location.href;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const tmp = document.createElement("input");
        tmp.value = url;
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand("copy");
        document.body.removeChild(tmp);
      }
      toast.success("Filter link copied to clipboard");
    } catch {
      toast.error("Could not copy link");
    }
  }, []);

  const toggleSelect = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!safeUsers.length) return;
    const allOnPage = safeUsers.map((u) => u.user_id);
    const allSelected = allOnPage.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allOnPage.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allOnPage.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const clearAllFilters = () => {
    setVerificationFilter("all");
    setSearchInput("");
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Per-row error tracking — previously this loop only counted
      // successes and silently swallowed failures, so an admin who hit
      // a role-gate or FK constraint mid-batch saw "Deleted N accounts"
      // when N was actually fewer than expected. We now surface a
      // mixed-outcome toast so the admin knows exactly what landed.
      let successCount = 0;
      const failures: { userId: string; reason: string }[] = [];
      for (const userId of selectedIds) {
        const { data, error } = await supabase.functions.invoke("admin-delete-seeker", {
          body: { targetUserId: userId, action: "delete" },
        });
        const serverErr = (data as { error?: string } | null)?.error;
        if (error || serverErr) {
          failures.push({
            userId,
            reason: serverErr ?? (error instanceof Error ? error.message : "Unknown error"),
          });
        } else {
          successCount++;
        }
      }

      if (failures.length === 0) {
        toast.success(`Deleted ${successCount} client account(s)`);
      } else if (successCount === 0) {
        toast.error(
          `Bulk delete failed — 0 of ${selectedIds.size} deleted. First reason: ${failures[0].reason}`,
        );
      } else {
        toast.warning(
          `Partial delete: ${successCount} succeeded, ${failures.length} failed. First failure: ${failures[0].reason}`,
        );
      }

      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users-global-stats"] });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Bulk delete failed: ${reason}`);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleExportCSV = () => {
    const rows = safeUsers.map((u) => {
      const counts = userActivityCounts?.[u.user_id] ?? { favorites: 0, inquiries: 0, reviews: 0 };
      return {
        Name: getDisplayName(u),
        Email: u.email || "",
        Phone: u.aggregated_phone || u.phone || "",
        City: u.aggregated_city || u.city || "",
        State: u.aggregated_state || u.state || "",
        Zip: u.aggregated_zipcode || u.zipcode || "",
        "Phone Verified": u.phone_verified ? "Yes" : "No",
        // Cross-reference linked-record counts — closes the audit's
        // "no linked-records summary" gap. Lets ops do cohort analysis
        // ("seekers with ≥1 inquiry but 0 reviews", etc.) in a
        // spreadsheet without bouncing back to the dashboard.
        Inquiries: String(counts.inquiries),
        "Saved Facilities": String(counts.favorites),
        Reviews: String(counts.reviews),
        "Has Concierge": u.has_concierge ? "Yes" : "No",
        Joined: u.created_at ? new Date(u.created_at).toLocaleDateString() : "",
      };
    });
    if (!rows.length) { toast.info("No data to export"); return; }
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => {
        const v = String((r as any)[h] ?? "");
        return v.includes(",") || v.includes('"') || v.includes("\n") ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seekers-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Clients exported to CSV");
  };

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

      if (searchQuery && searchQuery.length >= 2) {
        const q = searchQuery.trim();
        query = query.or(`display_name.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,city.ilike.%${q}%,state.ilike.%${q}%`);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  });

  const { page: currentPage, pageSize, totalPages, setPage: setCurrentPage, setPageSize } = usePagination({
    tableId: "admin-seekers",
    defaultPageSize: 25,
    totalItems: totalCount ?? 0,
  });

  const { data: users, isLoading, isFetching } = useQuery({
    queryKey: ["admin-users", currentPage, verificationFilter, searchQuery],
    queryFn: async () => {
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

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

      if (searchQuery && searchQuery.length >= 2) {
        const q = searchQuery.trim();
        profileQuery = profileQuery.or(`display_name.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,city.ilike.%${q}%,state.ilike.%${q}%`);
      }

      const { data: profiles, error } = await profileQuery;
      if (error) {
        logError(error.message, "Failed to fetch users");
        throw error;
      }

      // Fetch emails and phones in parallel
      const [emailsRes, phonesRes, conciergeRes] = await Promise.all([
        supabase.rpc("get_seeker_emails_for_admin"),
        supabase.rpc("get_seeker_phones_for_admin"),
        supabase
          .from("concierge_inquiries")
          .select("user_id, user_email, user_phone, preferred_city, preferred_state")
          .not("user_id", "is", null)
          .limit(5000),
      ]);

      const emailMap = new Map<string, string>();
      const phoneMap = new Map<string, string>();
      const hasConciergeSet = new Set<string>();
      const conciergeMap = new Map<string, { city?: string; state?: string }>();

      emailsRes.data?.forEach((item: any) => {
        if (item.user_id && item.email) emailMap.set(item.user_id, item.email);
      });

      phonesRes.data?.forEach((item: any) => {
        if (item.user_id && item.phone && !phoneMap.has(item.user_id)) {
          phoneMap.set(item.user_id, item.phone);
        }
      });

      conciergeRes.data?.forEach((item: any) => {
        if (item.user_id) {
          hasConciergeSet.add(item.user_id);
          if (!conciergeMap.has(item.user_id)) {
            conciergeMap.set(item.user_id, {
              city: item.preferred_city,
              state: item.preferred_state,
            });
          }
        }
      });

      return profiles?.map((profile: any) => {
        const concierge = conciergeMap.get(profile.user_id);
        return {
          ...profile,
          email: emailMap.get(profile.user_id),
          aggregated_phone: phoneMap.get(profile.user_id) || profile.phone,
          aggregated_city: profile.city || concierge?.city,
          aggregated_state: profile.state || concierge?.state,
          aggregated_zipcode: profile.zipcode,
          has_concierge: hasConciergeSet.has(profile.user_id),
        };
      }) as UserProfile[];
    },
  });

  // Global KPI stats (independent of pagination)
  const { data: globalStats } = useQuery({
    queryKey: ["admin-users-global-stats"],
    queryFn: async () => {
      const [allRes, verifiedRes, conciergeRes, favRes, reviewRes] = await Promise.all([
        supabase.from("seeker_profiles").select("id", { count: "exact", head: true }),
        supabase.from("seeker_profiles").select("id", { count: "exact", head: true }).eq("phone_verified", true),
        supabase.from("concierge_inquiries").select("id", { count: "exact", head: true }).not("user_id", "is", null),
        supabase.from("user_favorites").select("id", { count: "exact", head: true }),
        supabase.from("facility_reviews").select("id", { count: "exact", head: true }),
      ]);

      const total = allRes.count || 0;
      const verified = verifiedRes.count || 0;

      return {
        total,
        verified,
        unverified: total - verified,
        concierge: conciergeRes.count || 0,
        favorites: favRes.count || 0,
        reviews: reviewRes.count || 0,
      };
    },
    staleTime: 1000 * 60 * 2,
  });

  // Activity counts per user
  const { data: userActivityCounts } = useQuery({
    queryKey: ["admin-user-activity-counts"],
    queryFn: async () => {
      const [favRes, inqRes, revRes] = await Promise.all([
        supabase.from("user_favorites").select("user_id").limit(5000),
        supabase.from("concierge_inquiries").select("user_id").not("user_id", "is", null).limit(5000),
        supabase.from("facility_reviews").select("user_id").limit(5000),
      ]);

      const counts: Record<string, { favorites: number; inquiries: number; reviews: number }> = {};

      favRes.data?.forEach((item: any) => {
        if (!counts[item.user_id]) counts[item.user_id] = { favorites: 0, inquiries: 0, reviews: 0 };
        counts[item.user_id].favorites++;
      });
      inqRes.data?.forEach((item: any) => {
        if (!counts[item.user_id]) counts[item.user_id] = { favorites: 0, inquiries: 0, reviews: 0 };
        counts[item.user_id].inquiries++;
      });
      revRes.data?.forEach((item: any) => {
        if (!counts[item.user_id]) counts[item.user_id] = { favorites: 0, inquiries: 0, reviews: 0 };
        counts[item.user_id].reviews++;
      });

      return counts;
    },
    staleTime: 1000 * 60 * 3,
  });

  const safeUsers = users || [];
  

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
    if (user.first_name && user.last_name) return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
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
    queryClient.invalidateQueries({ queryKey: ["admin-users-count"] });
    queryClient.invalidateQueries({ queryKey: ["admin-users-global-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-user-activity-counts"] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Clients</h1>
        <p className="text-sm text-muted-foreground">View and manage client accounts</p>
      </div>

      {/* KPI Summary Bar */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-border">
            <button
              onClick={() => handleFilterChange("all")}
              className={cn(
                "flex flex-col items-center justify-center p-4 transition-colors hover:bg-muted/50",
                verificationFilter === "all" && "bg-accent/10 ring-1 ring-inset ring-accent"
              )}
            >
              <UsersIcon className="h-4 w-4 text-primary mb-1" />
              <span className="text-xl font-bold tabular-nums">{globalStats?.total ?? "—"}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</span>
            </button>

            <button
              onClick={() => handleFilterChange("verified")}
              className={cn(
                "flex flex-col items-center justify-center p-4 transition-colors hover:bg-muted/50",
                verificationFilter === "verified" && "bg-accent/10 ring-1 ring-inset ring-accent"
              )}
            >
              <CheckCircle className="h-4 w-4 text-success mb-1" />
              <span className="text-xl font-bold tabular-nums">{globalStats?.verified ?? "—"}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Verified</span>
            </button>

            <button
              onClick={() => handleFilterChange("unverified")}
              className={cn(
                "flex flex-col items-center justify-center p-4 transition-colors hover:bg-muted/50",
                verificationFilter === "unverified" && "bg-accent/10 ring-1 ring-inset ring-accent"
              )}
            >
              <XCircle className="h-4 w-4 text-muted-foreground mb-1" />
              <span className="text-xl font-bold tabular-nums">{globalStats?.unverified ?? "—"}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Unverified</span>
            </button>

            <div className="flex flex-col items-center justify-center p-4 bg-muted/20">
              <Shield className="h-4 w-4 text-chart-3 mb-1" />
              <span className="text-xl font-bold tabular-nums">{globalStats?.concierge ?? "—"}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Concierge</span>
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-muted/20">
              <Heart className="h-4 w-4 text-destructive mb-1" />
              <span className="text-xl font-bold tabular-nums">{globalStats?.favorites ?? "—"}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Saves</span>
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-muted/20">
              <Star className="h-4 w-4 text-warning mb-1" />
              <span className="text-xl font-bold tabular-nums">{globalStats?.reviews ?? "—"}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Reviews</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, city, or state..."
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); setCurrentPage(1); }}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={verificationFilter} onValueChange={(v) => handleFilterChange(v as typeof verificationFilter)}>
                <SelectTrigger className="w-full sm:w-[170px]">
                  <SelectValue placeholder="Verification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="verified">Phone Verified</SelectItem>
                  <SelectItem value="unverified">Not Verified</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 h-10">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              {selectedIds.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkBanOpen(true)}
                    className="gap-1.5 h-10"
                    aria-label={`Bulk ban or unban ${selectedIds.size} selected seeker${selectedIds.size === 1 ? "" : "s"}`}
                  >
                    <Ban className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Ban</span>
                    <span>({selectedIds.size})</span>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setBulkDeleteOpen(true)}
                    className="gap-1.5 h-10"
                    aria-label={`Delete ${selectedIds.size} selected seeker${selectedIds.size === 1 ? "" : "s"}`}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Delete</span>
                    <span>({selectedIds.size})</span>
                  </Button>
                </>
              )}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyFilterLink}
                  className="gap-1.5 text-muted-foreground hover:text-foreground h-10"
                  aria-label="Copy a shareable link to this filtered view"
                  title="Copy a shareable link to this filtered view"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Copy link</span>
                </Button>
              )}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-1.5 text-muted-foreground hover:text-foreground h-10">
                  <X className="h-3.5 w-3.5" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <UsersIcon className="h-5 w-5" />
            Clients
            <Badge variant="secondary" className="ml-1 tabular-nums">
              {totalCount ?? 0}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isFetching && !isLoading && (
            <div
              className="px-4 pt-3 -mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground"
              aria-live="polite"
            >
              <Loader2 className="h-3 w-3 animate-spin" />
              Refreshing…
            </div>
          )}
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : safeUsers.length === 0 ? (
            <div className="text-center py-16">
              <UsersIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No clients found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasActiveFilters
                  ? "Try adjusting your filters to see more results"
                  : "Clients will appear here when they create accounts"}
              </p>
              {hasActiveFilters && (
                <Button variant="link" size="sm" onClick={clearAllFilters} className="mt-3 text-primary">
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={safeUsers.length > 0 && safeUsers.every((u) => selectedIds.has(u.user_id))}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="min-w-[200px]">User</TableHead>
                    <TableHead className="min-w-[180px]">Email</TableHead>
                    <TableHead className="min-w-[120px]">Location</TableHead>
                    <TableHead className="min-w-[130px]">Phone</TableHead>
                    <TableHead className="min-w-[140px]">Activity</TableHead>
                    <TableHead className="min-w-[90px]">Status</TableHead>
                    <TableHead className="min-w-[100px]">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {safeUsers.map((user) => {
                    const counts = userActivityCounts?.[user.user_id] || { favorites: 0, inquiries: 0, reviews: 0 };
                    return (
                      <TableRow
                        key={user.id}
                        className={cn("group cursor-pointer hover:bg-muted/50 transition-colors", selectedIds.has(user.user_id) && "bg-accent/5")}
                        onClick={() => openDetail(user)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(user.user_id)}
                            onCheckedChange={() => toggleSelect(user.user_id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {getInitials(user)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{getDisplayName(user)}</p>
                              {user.first_name && user.last_name && user.display_name && (
                                <p className="text-xs text-muted-foreground truncate">{user.first_name} {user.last_name}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.email ? (
                            <div className="flex items-center gap-1.5 text-sm max-w-[200px]">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getLocation(user) ? (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate max-w-[120px]">{getLocation(user)}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {(user.aggregated_phone || user.phone) ? (
                            <div className="flex items-center gap-1.5 text-sm">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="whitespace-nowrap">{user.aggregated_phone || user.phone}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 flex-wrap">
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
                              <Badge variant="outline" className="bg-chart-3/10 text-chart-3 border-chart-3/30 gap-1 text-xs">
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
                              ? "bg-success/10 text-success border-success/30"
                              : "bg-muted text-muted-foreground border-border"
                          )}>
                            {user.phone_verified ? (
                              <><CheckCircle className="h-3 w-3 mr-1" /> Verified</>
                            ) : (
                              <><XCircle className="h-3 w-3 mr-1" /> No</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          <div className="px-4 pb-2">
            <PaginationFooter
              page={currentPage}
              pageSize={pageSize}
              totalPages={totalPages}
              totalItems={totalCount ?? 0}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="user"
            />
          </div>
        </CardContent>
      </Card>

      {/* User Profile Modal */}
      <UserProfileModal
        user={selectedUser}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onDeleted={handleUserDeleted}
      />

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete {selectedIds.size} Client Account(s)
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All selected client accounts and their associated data
              (favorites, reviews, inquiries, activity logs) will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete {selectedIds.size} Account(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Ban / Unban — capped at 50, gated to moderator role
          inside the edge fn, per-seeker audit log. */}
      <BulkBanSeekersDialog
        open={bulkBanOpen}
        onOpenChange={setBulkBanOpen}
        selectedIds={selectedIds}
        onSuccess={() => {
          setSelectedIds(new Set());
          queryClient.invalidateQueries({ queryKey: ["admin-users"] });
          queryClient.invalidateQueries({ queryKey: ["admin-users-count"] });
          queryClient.invalidateQueries({ queryKey: ["admin-users-global-stats"] });
        }}
      />
    </div>
  );
}
