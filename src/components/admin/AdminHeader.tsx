import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, Settings, Shield, Search, Bell, Building2, Users, AlertCircle, CheckCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
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

interface AdminHeaderProps {
  userEmail?: string;
  onLogout: () => void;
}

// Mock notifications for demo - in production, fetch from database
const mockNotifications = [
  {
    id: "1",
    title: "New provider signup",
    message: "Recovery Center of Texas has registered",
    time: "5 minutes ago",
    read: false,
    type: "provider",
  },
  {
    id: "2",
    title: "Lead awaiting assignment",
    message: "3 unassigned leads need attention",
    time: "1 hour ago",
    read: false,
    type: "lead",
  },
  {
    id: "3",
    title: "Provider approved",
    message: "Sunrise Recovery has been approved",
    time: "2 hours ago",
    read: true,
    type: "success",
  },
];

function AdminHeaderComponent({ userEmail, onLogout }: AdminHeaderProps) {
  const initials = userEmail?.slice(0, 2).toUpperCase() || "AD";
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications] = useState(mockNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "provider":
        return <Building2 className="h-4 w-4 text-blue-500" />;
      case "lead":
        return <Users className="h-4 w-4 text-amber-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

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
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 bg-background" align="end">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
              <ScrollArea className="h-[300px]">
                {notifications.length > 0 ? (
                  <div className="py-2">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-muted cursor-pointer transition-colors ${
                          !notification.read ? "bg-muted/50" : ""
                        }`}
                      >
                        <div className="mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!notification.read ? "font-medium" : ""}`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {notification.time}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notifications</p>
                  </div>
                )}
              </ScrollArea>
              <div className="border-t p-2">
                <Button variant="ghost" className="w-full text-sm" asChild>
                  <Link to="/admin/settings">View all notifications</Link>
                </Button>
              </div>
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
            <CommandItem onSelect={() => { navigate("/admin/providers"); setSearchOpen(false); }}>
              <Building2 className="h-4 w-4 mr-2" />
              View All Providers
            </CommandItem>
            <CommandItem onSelect={() => { navigate("/admin/leads?unassigned=true"); setSearchOpen(false); }}>
              <Users className="h-4 w-4 mr-2" />
              View Unassigned Leads
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
