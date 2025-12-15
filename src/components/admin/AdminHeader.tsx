import { memo, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { LogOut, Settings, Shield, Search, Bell, Building2, Users, AlertCircle, CheckCircle, CreditCard } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useAdminNotifications } from "@/hooks/useAdminNotifications";

interface AdminHeaderProps {
  userEmail?: string;
  onLogout: () => void;
}

type Notification = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "provider" | "lead" | "success" | "warning";
  link?: string;
};

function AdminHeaderComponent({ userEmail, onLogout }: AdminHeaderProps) {
  const initials = userEmail?.slice(0, 2).toUpperCase() || "AD";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);
  
  // Get persisted admin notifications
  const { notifications: persistedNotifications, unreadCount: persistedUnreadCount, markAsRead } = useAdminNotifications();

  // Invalidate queries callback for realtime updates
  const invalidateNotifications = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-notifications-pending"] });
    queryClient.invalidateQueries({ queryKey: ["admin-notifications-unassigned-leads"] });
    queryClient.invalidateQueries({ queryKey: ["admin-notifications-approvals"] });
  }, [queryClient]);

  // Set up realtime subscriptions for notifications
  useEffect(() => {
    const facilitiesChannel = supabase
      .channel("admin-facilities-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "facilities",
        },
        () => {
          invalidateNotifications();
        }
      )
      .subscribe();

    const leadsChannel = supabase
      .channel("admin-leads-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
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
  }, [invalidateNotifications]);

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

  // Add persisted notifications (payment failures, system alerts)
  persistedNotifications?.slice(0, 5).forEach((notif) => {
    notifications.push({
      id: `persisted-${notif.id}`,
      title: notif.title,
      message: notif.message,
      time: formatDistanceToNow(new Date(notif.created_at), { addSuffix: true }),
      type: notif.type === "payment_failed" ? "warning" : "provider",
      link: "/admin/notifications",
    });
  });

  // Sort by most recent first (pending providers and unassigned leads are priorities)
  const sortedNotifications = notifications.sort((a, b) => {
    // Prioritize pending providers and unassigned leads
    if (a.type === "provider" || a.type === "lead") return -1;
    if (b.type === "provider" || b.type === "lead") return 1;
    return 0;
  });

  const unreadCount = (pendingProviders?.length || 0) + (unassignedLeads && unassignedLeads.length > 0 ? 1 : 0) + persistedUnreadCount;

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
      <header className="sticky top-0 z-50 h-16 border-b bg-slate-900 text-white flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="flex items-center gap-2">
            <Shield className="h-7 w-7 text-amber-400" />
            <span className="text-xl font-bold hidden sm:inline">RehabLookup</span>
            <span className="text-xs bg-amber-400 text-slate-900 px-2 py-0.5 rounded font-semibold uppercase">
              Admin
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          {/* Search Bar */}
          <div className="hidden md:block">
            <Button
              variant="ghost"
              className="relative h-9 w-64 justify-start text-sm text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-700"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4 mr-2" />
              <span>Search...</span>
              <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border border-slate-600 bg-slate-800 px-1.5 font-mono text-[10px] font-medium text-slate-400 sm:flex">
                ⌘K
              </kbd>
            </Button>
          </div>

          {/* Mobile Search Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden hover:bg-slate-800"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Notifications Bell */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative hover:bg-slate-800">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 bg-background" align="end">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount} action{unreadCount > 1 ? "s" : ""} needed
                  </Badge>
                )}
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
              <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-slate-800">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-amber-400 text-slate-900 font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-background" align="end">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{userEmail}</p>
                <p className="text-xs text-muted-foreground">Administrator</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/admin/settings" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-destructive cursor-pointer">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
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
            <CommandItem onSelect={() => { navigate("/admin/dashboard"); setSearchOpen(false); }}>
              Dashboard
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
