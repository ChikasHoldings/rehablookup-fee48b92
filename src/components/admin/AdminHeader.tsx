import { memo, useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { LogOut, Settings, Shield, Search, Bell, Building2, Users, AlertCircle, CheckCircle, CreditCard, User, CheckCheck, ShieldAlert } from "lucide-react";
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
  onLogout: () => void;
}

type Notification = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "provider" | "lead" | "success" | "warning" | "security";
  link?: string;
};

function AdminHeaderComponent({ userEmail, userId, onLogout }: AdminHeaderProps) {
  const initials = userEmail?.slice(0, 2).toUpperCase() || "AD";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [bellAnimating, setBellAnimating] = useState(false);
  const lastPendingCountRef = useRef<number | null>(null);
  const lastLeadsCountRef = useRef<number | null>(null);

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
    queryClient.invalidateQueries({ queryKey: ["admin-notifications-unassigned-leads"] });
    queryClient.invalidateQueries({ queryKey: ["admin-notifications-approvals"] });
  }, [queryClient]);

  // Bell animation trigger
  const triggerBellAnimation = useCallback(() => {
    setBellAnimating(true);
    setTimeout(() => setBellAnimating(false), 1000);
  }, []);

  // Set up realtime subscriptions for notifications with toast alerts
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

    const leadsChannel = supabase
      .channel("admin-leads-notifications-live")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "leads",
        },
        (payload) => {
          invalidateNotifications();
          triggerBellAnimation();
          const lead = payload.new as { name?: string; facility_id?: string | null };
          if (!lead.facility_id) {
            toast.info("New Unassigned Lead", {
              description: `${lead.name || "A new lead"} needs assignment`,
              action: {
                label: "View",
                onClick: () => navigate("/admin/leads?unassigned=true"),
              },
            });
          } else {
            toast.success("New Lead Assigned", {
              description: `${lead.name || "A lead"} was automatically assigned`,
            });
          }
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

    return () => {
      supabase.removeChannel(facilitiesChannel);
      supabase.removeChannel(leadsChannel);
    };
  }, [invalidateNotifications, navigate, triggerBellAnimation]);

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

  // Fetch unassigned leads
  const { data: unassignedLeads } = useQuery({
    queryKey: ["admin-notifications-unassigned-leads"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("id, name, created_at")
        .is("facility_id", null)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    refetchInterval: 30000,
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

  // Build notifications from real data
  const notifications: Notification[] = [];

  // Add pending providers as notifications
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

  // Add unassigned leads count as notification
  if (unassignedLeads && unassignedLeads.length > 0) {
    notifications.push({
      id: "unassigned-leads",
      title: "Leads awaiting assignment",
      message: `${unassignedLeads.length} unassigned lead${unassignedLeads.length > 1 ? "s" : ""} need attention`,
      time: formatDistanceToNow(new Date(unassignedLeads[0].created_at), { addSuffix: true }),
      type: "lead",
      link: "/admin/leads?unassigned=true",
    });
  }

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
  userNotifications?.slice(0, 5).forEach((notif) => {
    let notifType: Notification["type"] = "provider";
    if (notif.type === "payment_failed") notifType = "warning";
    else if (notif.type === "lead_assigned" || notif.type === "new_lead") notifType = "lead";
    else if (notif.type === "provider_signup") notifType = "provider";
    else if (notif.type === "brute_force" || notif.type === "login_alert" || notif.type === "security_event") notifType = "security";
    else if (notif.type === "facility_approved") notifType = "success";

    notifications.push({
      id: `user-${notif.id}`,
      title: notif.title,
      message: notif.message,
      time: formatDistanceToNow(new Date(notif.created_at), { addSuffix: true }),
      type: notifType,
      link: notif.link || "/admin/notifications",
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

  const unreadCount = (pendingProviders?.length || 0) + (unassignedLeads && unassignedLeads.length > 0 ? 1 : 0) + userUnreadCount;

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
      <header className="sticky top-0 z-50 h-16 border-b border-slate-700 bg-slate-900 text-white flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="RehabLookup" 
              className="h-7 sm:h-8 w-auto brightness-0 invert"
            />
            <span className="text-xs bg-amber-400 text-slate-900 px-2 py-0.5 rounded font-semibold uppercase">
              Admin
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          {/* Search Bar */}
          <div className="hidden md:block">
            <Button
              variant="ghost"
              className="relative h-9 w-64 justify-start text-sm text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-600 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4 mr-2 text-slate-300" />
              <span>Search...</span>
              <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border border-slate-600 bg-slate-800 px-1.5 font-mono text-[10px] font-medium text-slate-300 sm:flex">
                ⌘K
              </kbd>
            </Button>
          </div>

          {/* Mobile Search Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white hover:bg-slate-800 hover:text-white transition-all duration-200 hover:scale-105 active:scale-95"
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
                className="relative text-white hover:bg-slate-700 hover:text-white transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <Bell className={`h-5 w-5 transition-transform ${bellAnimating ? "animate-wiggle" : ""}`} />
                {unreadCount > 0 && (
                  <Badge className={`absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs border-2 border-slate-900 ${bellAnimating ? "animate-pulse" : ""}`}>
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
                    {sortedNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-muted cursor-pointer transition-colors ${
                          notification.type === "provider" || notification.type === "lead"
                            ? "bg-muted/50"
                            : ""
                        }`}
                      >
                        <div className="mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${
                            notification.type === "provider" || notification.type === "lead"
                              ? "font-medium"
                              : ""
                          }`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {notification.time}
                          </p>
                        </div>
                        {(notification.type === "provider" || notification.type === "lead") && (
                          <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                        )}
                      </div>
                    ))}
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

          {/* Account Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-slate-700 p-0 transition-all duration-200 hover:scale-105 active:scale-95">
                <Avatar className="h-9 w-9 ring-2 ring-white/20 hover:ring-white/40 transition-all">
                  <AvatarImage 
                    src={adminProfile?.avatar_url || undefined} 
                    alt={adminProfile?.display_name || userEmail || "Admin"} 
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-amber-400 text-slate-900 font-semibold text-sm">
                    {avatarInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 bg-background" align="end" sideOffset={8}>
              {/* Profile Header Section */}
              <div className="flex items-center gap-3 px-3 py-3 border-b">
                <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                  <AvatarImage 
                    src={adminProfile?.avatar_url || undefined} 
                    alt={adminProfile?.display_name || userEmail || "Admin"}
                    className="object-cover" 
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    {avatarInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {fullName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                  <Badge variant="secondary" className="w-fit mt-1 text-[10px] h-5 px-1.5">
                    Administrator
                  </Badge>
                </div>
              </div>
              
              {/* Menu Items */}
              <div className="py-1">
                <DropdownMenuItem asChild>
                  <Link to="/admin/profile" className="flex items-center gap-2 cursor-pointer px-3 py-2">
                    <User className="h-4 w-4" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/notifications" className="flex items-center gap-2 cursor-pointer px-3 py-2">
                    <Bell className="h-4 w-4" />
                    Notifications
                    {userUnreadCount > 0 && (
                      <Badge variant="destructive" className="ml-auto h-5 px-1.5 text-[10px]">
                        {userUnreadCount}
                      </Badge>
                    )}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/settings" className="flex items-center gap-2 cursor-pointer px-3 py-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
              </div>
              
              <DropdownMenuSeparator />
              
              <div className="py-1">
                <DropdownMenuItem 
                  onClick={onLogout} 
                  className="text-destructive cursor-pointer px-3 py-2 focus:text-destructive"
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
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search providers, leads, or actions..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => { navigate("/admin/providers?status=pending"); setSearchOpen(false); }}>
              <Building2 className="h-4 w-4 mr-2" />
              Review Pending Providers ({pendingProviders?.length || 0})
            </CommandItem>
            <CommandItem onSelect={() => { navigate("/admin/leads?unassigned=true"); setSearchOpen(false); }}>
              <Users className="h-4 w-4 mr-2" />
              View Unassigned Leads ({unassignedLeads?.length || 0})
            </CommandItem>
            <CommandItem onSelect={() => { navigate("/admin/featured"); setSearchOpen(false); }}>
              <AlertCircle className="h-4 w-4 mr-2" />
              Manage Featured Placement
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => { navigate("/admin"); setSearchOpen(false); }}>
              Dashboard
            </CommandItem>
            <CommandItem onSelect={() => { navigate("/admin/profile"); setSearchOpen(false); }}>
              <User className="h-4 w-4 mr-2" />
              My Profile
            </CommandItem>
            <CommandItem onSelect={() => { navigate("/admin/providers"); setSearchOpen(false); }}>
              Providers
            </CommandItem>
            <CommandItem onSelect={() => { navigate("/admin/leads"); setSearchOpen(false); }}>
              Leads
            </CommandItem>
            <CommandItem onSelect={() => { navigate("/admin/subscriptions"); setSearchOpen(false); }}>
              Subscriptions
            </CommandItem>
            <CommandItem onSelect={() => { navigate("/admin/notifications"); setSearchOpen(false); }}>
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </CommandItem>
            <CommandItem onSelect={() => { navigate("/admin/security-logs"); setSearchOpen(false); }}>
              Security Logs
            </CommandItem>
            <CommandItem onSelect={() => { navigate("/admin/audit-log"); setSearchOpen(false); }}>
              Audit Log
            </CommandItem>
            <CommandItem onSelect={() => { navigate("/admin/settings"); setSearchOpen(false); }}>
              Settings
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

export const AdminHeader = memo(AdminHeaderComponent);
