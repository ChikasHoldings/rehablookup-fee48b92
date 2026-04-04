import { memo, useState, useEffect, useCallback, useRef, useMemo } from "react";
import logoDarkBg from "@/assets/logo-dark-bg.webp";
import { Link } from "react-router-dom";
import { LogOut, Settings, Shield, Search, Bell, Building2, Users, AlertCircle, CheckCircle, CreditCard, User, CheckCheck, ShieldAlert, Mail, Phone, MapPin, Loader2, BarChart3, UserSearch, UserPlus, MessageSquare, ClipboardList } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useAdminUserNotifications } from "@/hooks/useAdminUserNotifications";
import { logAdminAction, AdminAuditActions } from "@/hooks/useAdminAuditLog";
import { toast } from "sonner";

interface AdminHeaderProps {
  userEmail?: string;
  userId?: string;
  adminRole?: "super_admin" | "manager" | "customer_rep" | "advisor";
  onLogout: () => void;
  isSuperAdmin?: boolean;
  hasPermission?: (permission: string) => boolean;
}

type Notification = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "provider" | "lead" | "success" | "warning" | "security";
  link?: string;
  isUnread?: boolean;
};

// Role display config
const ROLE_DISPLAY: Record<string, { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "bg-amber-500/10 text-amber-600" },
  manager: { label: "Manager", color: "bg-blue-500/10 text-blue-600" },
  customer_rep: { label: "Customer Rep", color: "bg-emerald-500/10 text-emerald-600" },
  advisor: { label: "Placement Advisor", color: "bg-purple-500/10 text-purple-600" },
};

function AdminHeaderComponent({ userEmail, userId, adminRole, onLogout, isSuperAdmin = false, hasPermission = () => false }: AdminHeaderProps) {
  const initials = userEmail?.slice(0, 2).toUpperCase() || "AD";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [bellAnimating, setBellAnimating] = useState(false);
  const lastPendingCountRef = useRef<number | null>(null);
  const lastLeadsCountRef = useRef<number | null>(null);

  // Advisors (Placement Advisors) should NOT see lead notifications - they only handle placements
  const isAdvisor = adminRole === "advisor";

  // Permission helpers for search filtering
  const canViewProviders = isSuperAdmin || hasPermission("providers");
  const canViewLeads = isSuperAdmin || hasPermission("leads");
  const canViewAnalytics = isSuperAdmin || hasPermission("analytics");
  const canViewSeekers = isSuperAdmin || hasPermission("seekers");
  const canViewPlacements = isSuperAdmin || hasPermission("placements");
  const canViewSubscriptions = isSuperAdmin || hasPermission("subscriptions");
  const canViewReviews = isSuperAdmin || hasPermission("reviews");
  const canViewFeatured = isSuperAdmin || hasPermission("featured");
  const canViewUsers = isSuperAdmin || hasPermission("users");
  const canViewAuditLog = isSuperAdmin || hasPermission("audit_log");
  const canViewSecurityLogs = isSuperAdmin || hasPermission("security_logs");

  // Fetch admin profile for avatar
  const { data: adminProfile, refetch: refetchAdminProfile } = useQuery({
    queryKey: ["admin-header-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("admin_user_profiles")
        .select("avatar_url, display_name, first_name, last_name")
        .eq("user_id", userId)
        .maybeSingle();
      return data as { avatar_url: string | null; display_name: string | null; first_name?: string | null; last_name?: string | null } | null;
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds for faster updates
  });

  // Compute display name from first/last name or fallback to display_name
  const fullName = adminProfile?.first_name && adminProfile?.last_name 
    ? `${adminProfile.first_name} ${adminProfile.last_name}`
    : adminProfile?.first_name || adminProfile?.display_name || "Admin User";
  
  const avatarInitials = adminProfile?.first_name && adminProfile?.last_name
    ? `${adminProfile.first_name[0]}${adminProfile.last_name[0]}`.toUpperCase()
    : adminProfile?.display_name?.slice(0, 2).toUpperCase() || initials;

  // Real-time subscription for admin profile updates (avatar changes)
  useEffect(() => {
    if (!userId) return;
    
    const profileChannel = supabase
      .channel("admin-header-profile-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "admin_user_profiles",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-header-profile", userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [userId, queryClient]);
  
  // Get user-specific admin notifications
  const { 
    notifications: userNotifications, 
    unreadCount: userUnreadCount, 
    markAsRead, 
    markAllAsRead 
  } = useAdminUserNotifications();

  // Invalidate queries callback for realtime updates
  const invalidateNotifications = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-notifications-pending"] });
    queryClient.invalidateQueries({ queryKey: ["admin-notifications-approvals"] });
  }, [queryClient]);

  // Bell animation trigger
  const triggerBellAnimation = useCallback(() => {
    setBellAnimating(true);
    setTimeout(() => setBellAnimating(false), 1000);
  }, []);

  // Set up realtime subscriptions for notifications with toast alerts
  // Advisors only see provider notifications, not lead notifications
  useEffect(() => {
    const facilitiesChannel = supabase
      .channel("admin-facilities-notifications-live")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "facilities",
        },
        (payload) => {
          invalidateNotifications();
          triggerBellAnimation();
          const facility = payload.new as { name?: string; city?: string; state?: string; status?: string };
          if (facility.status === "pending") {
            toast.info("New Provider Signup", {
              description: `${facility.name || "A new provider"} (${facility.city || ""}, ${facility.state || ""}) is pending review`,
              action: {
                label: "Review",
                onClick: () => navigate("/admin/providers?status=pending"),
              },
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "facilities",
        },
        () => {
          invalidateNotifications();
        }
      )
      .subscribe();

    // Only subscribe to leads channel if NOT an advisor
    // Advisors handle placements, not leads
    let leadsChannel: ReturnType<typeof supabase.channel> | null = null;
    if (!isAdvisor) {
      leadsChannel = supabase
        .channel("admin-leads-notifications-live")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "leads",
          },
          () => {
            invalidateNotifications();
            triggerBellAnimation();
            toast.success("New Lead Received", {
              description: "A new lead has been submitted",
            });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "leads",
          },
          () => {
            invalidateNotifications();
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(facilitiesChannel);
      if (leadsChannel) {
        supabase.removeChannel(leadsChannel);
      }
    };
  }, [invalidateNotifications, navigate, triggerBellAnimation, isAdvisor]);

  // Fetch pending providers
  const { data: pendingProviders } = useQuery({
    queryKey: ["admin-notifications-pending"],
    queryFn: async () => {
      const { data } = await supabase
        .from("facilities")
        .select("id, name, city, state, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch recent approvals (last 24 hours)
  const { data: recentApprovals } = useQuery({
    queryKey: ["admin-notifications-approvals"],
    queryFn: async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { data } = await supabase
        .from("facilities")
        .select("id, name, updated_at")
        .eq("status", "approved")
        .gte("updated_at", yesterday.toISOString())
        .order("updated_at", { ascending: false })
        .limit(3);
      return data || [];
    },
    refetchInterval: 60000,
  });

  // Search providers when query changes - only if user has permission
  const { data: searchedProviders, isLoading: searchingProviders } = useQuery({
    queryKey: ["admin-search-providers", searchQuery, canViewProviders],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2 || !canViewProviders) return [];
      const { data } = await supabase
        .from("facilities")
        .select("id, name, city, state, status, slug")
        .or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,state.ilike.%${searchQuery}%`)
        .order("name")
        .limit(5);
      return data || [];
    },
    enabled: searchQuery.length >= 2 && canViewProviders,
    staleTime: 10000,
  });

  // Search leads when query changes - only if user has permission
  const { data: searchedLeads, isLoading: searchingLeads } = useQuery({
    queryKey: ["admin-search-leads", searchQuery, canViewLeads],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2 || !canViewLeads) return [];
      const normalizedQuery = searchQuery.replace(/\D/g, "");
      const isPhoneSearch = normalizedQuery.length >= 3;
      
      let query = supabase
        .from("leads")
        .select("id, name, email, phone, status, location_city_state, facility_id")
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (isPhoneSearch && normalizedQuery.length >= 3) {
        query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${normalizedQuery}%`);
      } else {
        query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }
      
      const { data } = await query;
      return data || [];
    },
    enabled: searchQuery.length >= 2 && canViewLeads,
    staleTime: 10000,
  });

  const isSearching = searchingProviders || searchingLeads;
  const hasSearchResults = (searchedProviders?.length || 0) > 0 || (searchedLeads?.length || 0) > 0;

  // Build notifications from real data
  const notifications: Notification[] = [];

  // Add pending providers as notifications (all admin roles can see this)
  pendingProviders?.forEach((provider) => {
    notifications.push({
      id: `pending-${provider.id}`,
      title: "New provider signup",
      message: `${provider.name} (${provider.city}, ${provider.state}) is pending review`,
      time: formatDistanceToNow(new Date(provider.created_at), { addSuffix: true }),
      type: "provider",
      link: "/admin/providers?status=pending",
    });
  });

  // Add recent approvals
  recentApprovals?.forEach((facility) => {
    notifications.push({
      id: `approved-${facility.id}`,
      title: "Provider approved",
      message: `${facility.name} has been approved`,
      time: formatDistanceToNow(new Date(facility.updated_at), { addSuffix: true }),
      type: "success",
      link: "/admin/providers",
    });
  });

  // Add user-specific notifications (tasks assigned to this admin, etc.)
  // Filter out lead notifications for advisors
  userNotifications?.slice(0, 5).forEach((notif) => {
    let notifType: Notification["type"] = "provider";
    if (["payment_failed", "payment_delinquent", "placement_payment_failed"].includes(notif.type)) notifType = "warning";
    else if (["lead_assigned", "new_lead"].includes(notif.type)) notifType = "lead";
    else if (notif.type === "provider_signup") notifType = "provider";
    else if (["brute_force", "brute_force_alert", "login_alert", "security_event", "security_block", "security_unblock"].includes(notif.type)) notifType = "security";
    else if (["facility_approved", "new_subscription"].includes(notif.type)) notifType = "success";

    // Skip lead notifications for advisors
    if (isAdvisor && notifType === "lead") {
      return;
    }

    notifications.push({
      id: `user-${notif.id}`,
      title: notif.title,
      message: notif.message,
      time: formatDistanceToNow(new Date(notif.created_at), { addSuffix: true }),
      type: notifType,
      link: notif.link || "/admin/notifications",
      isUnread: !notif.read,
    });
  });

  // Sort by most recent first (security, pending providers, and unassigned leads are priorities)
  const sortedNotifications = notifications.sort((a, b) => {
    // Prioritize security, then pending providers and unassigned leads
    if (a.type === "security") return -1;
    if (b.type === "security") return 1;
    if (a.type === "provider" || a.type === "lead") return -1;
    if (b.type === "provider" || b.type === "lead") return 1;
    return 0;
  });

  // Only count user notifications that can actually be marked as read
  // Pending providers and unassigned leads are action items, not clearable notifications
  const unreadCount = userUnreadCount;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "provider":
        return <Building2 className="h-4 w-4 text-blue-500" />;
      case "lead":
        return <Users className="h-4 w-4 text-amber-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <CreditCard className="h-4 w-4 text-red-500" />;
      case "security":
        return <ShieldAlert className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark user-specific notifications as read when clicked
    if (notification.id.startsWith("user-")) {
      const actualId = notification.id.replace("user-", "");
      markAsRead(actualId);
    }
    
    if (notification.link) {
      navigate(notification.link);
    }
  };

  // Keyboard shortcut for search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 h-16 border-b border-slate-700 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center px-4 lg:px-6">
        {/* Left Section - Logo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <img 
              src={logoDarkBg} 
              alt="RehabLookup" 
              className="h-7 sm:h-8 w-auto"
            />
            <span className="text-xs bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 px-2.5 py-1 rounded-md font-semibold uppercase tracking-wide shadow-sm">
              Admin
            </span>
          </div>
        </div>

        {/* Center Section - Search Bar */}
        <div className="flex-1 flex justify-center px-4">
          <div className="hidden md:block w-full max-w-md">
            <Button
              variant="ghost"
              className="relative h-10 w-full justify-start text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white bg-slate-800/50 border border-white/40 rounded-xl transition-all duration-200 hover:border-white/60 hover:shadow-lg hover:shadow-slate-900/20"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4 mr-3 text-slate-300" />
              <span className="text-slate-300">Search providers, leads, pages...</span>
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden h-6 select-none items-center gap-1 rounded-md border border-white/30 bg-slate-700 px-2 font-mono text-[11px] font-medium text-slate-300 sm:flex">
                ⌘K
              </kbd>
            </Button>
          </div>
        </div>

        {/* Right Section - Actions & Profile */}
        <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
          {/* Mobile Search Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all duration-200 rounded-xl"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Notifications Bell */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all duration-200 rounded-xl"
              >
                <Bell className={`h-5 w-5 transition-transform ${bellAnimating ? "animate-wiggle" : ""}`} />
                {unreadCount > 0 && (
                  <Badge className={`absolute -top-1 -right-1 h-5 min-w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs border-2 border-slate-800 rounded-full ${bellAnimating ? "animate-pulse" : ""}`}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 bg-background" align="end">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="font-semibold">Notifications</h3>
                <div className="flex items-center gap-2">
                  {userUnreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        markAllAsRead();
                        logAdminAction({
                          actionType: AdminAuditActions.NOTIFICATIONS_MARKED_READ,
                          targetType: "admin_notifications",
                          details: { count: userUnreadCount },
                        });
                      }}
                    >
                      <CheckCheck className="h-3 w-3 mr-1" />
                      Mark read
                    </Button>
                  )}
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
              <ScrollArea className="h-[300px]">
                {sortedNotifications.length > 0 ? (
                  <div className="py-2">
                    {sortedNotifications.map((notification) => {
                      // For user notifications, use isUnread state
                      // For system notifications (pending/leads), always show as active since they're action items
                      const isUserNotification = notification.id.startsWith("user-");
                      const showAsActive = isUserNotification 
                        ? notification.isUnread 
                        : (notification.type === "provider" || notification.type === "lead");
                      
                      return (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`flex items-start gap-3 px-4 py-3 hover:bg-muted cursor-pointer transition-colors ${
                            showAsActive ? "bg-muted/50" : ""
                          }`}
                        >
                          <div className="mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${showAsActive ? "font-medium" : ""}`}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {notification.time}
                            </p>
                          </div>
                          {showAsActive && (
                            <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500/50" />
                    <p className="text-sm font-medium">All caught up!</p>
                    <p className="text-xs">No pending actions</p>
                  </div>
                )}
              </ScrollArea>
              {sortedNotifications.length > 0 && (
                <div className="border-t p-2 flex gap-2">
                  <Button 
                    variant="ghost" 
                    className="flex-1 text-sm" 
                    onClick={() => navigate("/admin/providers?status=pending")}
                  >
                    View Pending
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="flex-1 text-sm" 
                    onClick={() => navigate("/admin/notifications")}
                  >
                    All Notifications
                  </Button>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Divider */}
          <div className="hidden lg:block h-8 w-px bg-slate-600/50" />

          {/* Account Dropdown with Name visible */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="relative flex items-center gap-3 h-10 px-2 lg:px-3 rounded-xl hover:bg-slate-700/50 transition-all duration-200"
              >
                <Avatar className="h-8 w-8 ring-2 ring-amber-400/30 hover:ring-amber-400/50 transition-all">
                  <AvatarImage 
                    src={adminProfile?.avatar_url || undefined} 
                    alt={adminProfile?.display_name || userEmail || "Admin"} 
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-amber-400 to-amber-500 text-slate-900 font-semibold text-sm">
                    {avatarInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:flex flex-col items-start text-left">
                  <span className="text-sm font-medium text-white leading-tight">
                    {fullName}
                  </span>
                  <span className="text-[11px] text-slate-400 leading-tight">
                    {ROLE_DISPLAY[adminRole || "customer_rep"]?.label || "Administrator"}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 bg-background" align="end" sideOffset={8}>
              {/* Profile Header Section */}
              <div className="flex items-center gap-3 px-3 py-3 border-b bg-muted/30">
                <Avatar className="h-11 w-11 ring-2 ring-primary/20">
                  <AvatarImage 
                    src={adminProfile?.avatar_url || undefined} 
                    alt={adminProfile?.display_name || userEmail || "Admin"}
                    className="object-cover" 
                  />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold">
                    {avatarInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {fullName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                  <Badge variant="secondary" className="w-fit mt-1.5 text-[10px] h-5 px-2 bg-amber-500/10 text-amber-600 border-0">
                    Administrator
                  </Badge>
                </div>
              </div>
              
              {/* Menu Items */}
              <div className="py-1">
                <DropdownMenuItem asChild>
                  <Link to="/admin/profile" className="flex items-center gap-2 cursor-pointer px-3 py-2.5">
                    <User className="h-4 w-4 text-muted-foreground" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/notifications" className="flex items-center gap-2 cursor-pointer px-3 py-2.5">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    Notifications
                    {userUnreadCount > 0 && (
                      <Badge variant="destructive" className="ml-auto h-5 px-1.5 text-[10px]">
                        {userUnreadCount}
                      </Badge>
                    )}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/settings" className="flex items-center gap-2 cursor-pointer px-3 py-2.5">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    Settings
                  </Link>
                </DropdownMenuItem>
              </div>
              
              <DropdownMenuSeparator />
              
              <div className="py-1">
                <DropdownMenuItem 
                  onClick={onLogout} 
                  className="text-destructive cursor-pointer px-3 py-2.5 focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Command Search Dialog */}
      <CommandDialog open={searchOpen} onOpenChange={(open) => { setSearchOpen(open); if (!open) setSearchQuery(""); }}>
        <CommandInput 
          placeholder="Search providers, leads, or pages..." 
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          {isSearching && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          
          {!isSearching && searchQuery.length >= 2 && !hasSearchResults && (
            <CommandEmpty>No results found for "{searchQuery}"</CommandEmpty>
          )}
          
          {!isSearching && searchQuery.length < 2 && (
            <CommandEmpty>Type at least 2 characters to search...</CommandEmpty>
          )}

          {/* Provider Search Results - only if user has permission */}
          {canViewProviders && searchedProviders && searchedProviders.length > 0 && (
            <CommandGroup heading={`Providers (${searchedProviders.length})`}>
              {searchedProviders.map((provider) => (
                <CommandItem 
                  key={provider.id} 
                  onSelect={() => { navigate(`/admin/providers?search=${encodeURIComponent(provider.name)}`); setSearchOpen(false); setSearchQuery(""); }}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                    <Building2 className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{provider.name}</p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {provider.city}, {provider.state}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    provider.status === "approved" ? "bg-green-500/10 text-green-600" :
                    provider.status === "pending" ? "bg-amber-500/10 text-amber-600" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {provider.status}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Lead Search Results - only if user has permission */}
          {canViewLeads && searchedLeads && searchedLeads.length > 0 && (
            <CommandGroup heading={`Leads (${searchedLeads.length})`}>
              {searchedLeads.map((lead) => (
                <CommandItem 
                  key={lead.id} 
                  onSelect={() => { navigate(`/admin/leads?highlight=${lead.id}`); setSearchOpen(false); setSearchQuery(""); }}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                    <User className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{lead.name}</p>
                    <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
                      {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>}
                      {lead.location_city_state && <span>• {lead.location_city_state}</span>}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    lead.status === "new" ? "bg-green-500/10 text-green-600" :
                    lead.status === "contacted" ? "bg-blue-500/10 text-blue-600" :
                    lead.status === "converted" ? "bg-purple-500/10 text-purple-600" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {lead.status}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Quick Actions - show when not searching or no results, filtered by permissions */}
          {(!searchQuery || searchQuery.length < 2) && (
            <>
              <CommandGroup heading="Quick Actions">
                {canViewProviders && (
                  <CommandItem onSelect={() => { navigate("/admin/providers?status=pending"); setSearchOpen(false); }}>
                    <Building2 className="h-4 w-4 mr-2" />
                    Review Pending Providers ({pendingProviders?.length || 0})
                </CommandItem>
                )}
                {canViewFeatured && (
                  <CommandItem onSelect={() => { navigate("/admin/featured"); setSearchOpen(false); }}>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Manage Featured Placement
                  </CommandItem>
                )}
              </CommandGroup>
              <CommandGroup heading="Navigation">
                <CommandItem onSelect={() => { navigate("/admin"); setSearchOpen(false); }}>
                  Dashboard
                </CommandItem>
                {canViewAnalytics && (
                  <CommandItem onSelect={() => { navigate("/admin/analytics"); setSearchOpen(false); }}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analytics
                  </CommandItem>
                )}
                {canViewProviders && (
                  <CommandItem onSelect={() => { navigate("/admin/providers"); setSearchOpen(false); }}>
                    <Building2 className="h-4 w-4 mr-2" />
                    Providers
                  </CommandItem>
                )}
                {canViewLeads && (
                  <CommandItem onSelect={() => { navigate("/admin/leads"); setSearchOpen(false); }}>
                    <Users className="h-4 w-4 mr-2" />
                    Leads
                  </CommandItem>
                )}
                {canViewSeekers && (
                  <CommandItem onSelect={() => { navigate("/admin/seekers"); setSearchOpen(false); }}>
                    <UserSearch className="h-4 w-4 mr-2" />
                    Users (Seekers)
                  </CommandItem>
                )}
                {canViewPlacements && (
                  <CommandItem onSelect={() => { navigate("/admin/concierge"); setSearchOpen(false); }}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Concierge
                  </CommandItem>
                )}
                {canViewSubscriptions && (
                  <CommandItem onSelect={() => { navigate("/admin/subscriptions"); setSearchOpen(false); }}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Subscriptions
                  </CommandItem>
                )}
                {canViewReviews && (
                  <CommandItem onSelect={() => { navigate("/admin/reviews"); setSearchOpen(false); }}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Review Moderation
                  </CommandItem>
                )}
                <CommandItem onSelect={() => { navigate("/admin/notifications"); setSearchOpen(false); }}>
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </CommandItem>
                <CommandItem onSelect={() => { navigate("/admin/profile"); setSearchOpen(false); }}>
                  <User className="h-4 w-4 mr-2" />
                  My Profile
                </CommandItem>
              </CommandGroup>
              <CommandGroup heading="Settings & Administration">
                <CommandItem onSelect={() => { navigate("/admin/settings"); setSearchOpen(false); }}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </CommandItem>
                {canViewUsers && (
                  <CommandItem onSelect={() => { navigate("/admin/users"); setSearchOpen(false); }}>
                    <Shield className="h-4 w-4 mr-2" />
                    Admin Staff Management
                  </CommandItem>
                )}
                {canViewSecurityLogs && (
                  <CommandItem onSelect={() => { navigate("/admin/security-logs"); setSearchOpen(false); }}>
                    <ShieldAlert className="h-4 w-4 mr-2" />
                    Security Logs
                  </CommandItem>
                )}
                {canViewAuditLog && (
                  <CommandItem onSelect={() => { navigate("/admin/audit-log"); setSearchOpen(false); }}>
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Audit Log
                  </CommandItem>
                )}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}

export const AdminHeader = memo(AdminHeaderComponent);
