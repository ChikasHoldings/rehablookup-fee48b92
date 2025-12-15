import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { 
  ChevronDown, 
  LogOut, 
  Settings, 
  CreditCard, 
  Building2, 
  ExternalLink,
  Bell,
  Search,
  X,
  UserPlus,
  MessageSquare,
  Shield,
  AlertTriangle,
  BellOff,
  HelpCircle,
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/logo.png";
import { useProviderNotifications } from "@/hooks/useProviderNotifications";
import { ProviderSearchCommand } from "./ProviderSearchCommand";
import { FacilityLocationDropdown } from "./FacilityLocationDropdown";

interface ProviderHeaderProps {
  facilityName?: string;
  facilityId?: string;
  facilitySlug?: string | null;
  facilityLogo?: string | null;
  facilityStatus?: string;
  userName?: string;
  onLogout: () => void;
}

const notificationIcons: Record<string, React.ReactNode> = {
  lead_received: <UserPlus className="h-4 w-4 text-primary" />,
  lead_status_changed: <MessageSquare className="h-4 w-4 text-blue-500" />,
  listing_approved: <Shield className="h-4 w-4 text-green-500" />,
  subscription_updated: <CreditCard className="h-4 w-4 text-purple-500" />,
  lead_limit_warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  system: <Settings className="h-4 w-4 text-muted-foreground" />,
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case "approved":
      return { 
        label: "Live", 
        dotClass: "bg-green-500",
        textClass: "text-green-400"
      };
    case "pending":
      return { 
        label: "Pending", 
        dotClass: "bg-amber-500",
        textClass: "text-amber-400"
      };
    default:
      return { 
        label: "Inactive", 
        dotClass: "bg-white/50",
        textClass: "text-white/70"
      };
  }
};

export function ProviderHeader({ facilityName, facilityId, facilitySlug, facilityLogo, facilityStatus, userName, onLogout }: ProviderHeaderProps) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const navigate = useNavigate();
  const statusConfig = getStatusConfig(facilityStatus || "inactive");
  
  const { notifications, unreadCount, markAsRead, isLoading } = useProviderNotifications();
  const recentNotifications = notifications.slice(0, 5);
  
  const initials = userName
    ?.split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2) || "P";

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    if (notification.type === "lead_received" || notification.type === "lead_status_changed") {
      navigate("/provider/leads");
    } else if (notification.type === "subscription_updated" || notification.type === "lead_limit_warning") {
      navigate("/provider/billing");
    } else if (notification.type === "listing_approved") {
      navigate("/provider/listing");
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-primary border-b border-white/10 shadow-md">
      <div className="h-[72px] max-w-[1800px] mx-auto px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Left - Logo & Facility Selector */}
        <div className="flex items-center min-w-0">
          <Link 
            to="/" 
            className="flex items-center shrink-0 group"
            title="Back to RehabLookup"
          >
            <img 
              src={logo} 
              alt="RehabLookup" 
              className="h-9 w-auto brightness-0 invert group-hover:opacity-80 transition-opacity"
            />
          </Link>
          
          <div className="hidden md:block h-8 w-px bg-white/30 mx-6" />
          
          {/* Enhanced Location Dropdown */}
          <div className="ml-4 md:ml-0">
            <FacilityLocationDropdown />
          </div>
        </div>

        {/* Center - Search (Desktop) */}
        <div className="hidden lg:flex flex-1 max-w-md">
          <ProviderSearchCommand facilityId={facilityId} />
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-1">
          {/* Status Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 mr-2">
            <span className={`h-2 w-2 rounded-full ${statusConfig.dotClass} animate-pulse`} />
            <span className="text-xs text-white/70">Status:</span>
            <span className={`text-xs font-medium ${statusConfig.textClass}`}>
              {statusConfig.label}
            </span>
          </div>

          {/* Mobile Search Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-9 w-9 text-white hover:text-white hover:bg-white/15"
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          >
            {mobileSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </Button>

          {/* View Listing */}
          {facilityId && (
            <a
              href={facilitySlug ? `/center/${facilitySlug}` : `/rehab-centers/${facilityId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>View Listing</span>
            </a>
          )}

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="relative h-9 w-9 text-white hover:text-white hover:bg-white/15"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white ring-2 ring-primary">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-card" sideOffset={8}>
              <DropdownMenuLabel className="flex items-center justify-between py-3">
                <span className="font-semibold">Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs h-5 px-2">
                    {unreadCount} new
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isLoading ? (
                <div className="py-8 text-center">
                  <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : recentNotifications.length === 0 ? (
                <div className="py-8 text-center">
                  <BellOff className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No notifications</p>
                </div>
              ) : (
                <div className="max-h-[320px] overflow-y-auto">
                  {recentNotifications.map((notification) => (
                    <DropdownMenuItem 
                      key={notification.id} 
                      className="flex items-start gap-3 p-3 cursor-pointer"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="mt-0.5 shrink-0">
                        {notificationIcons[notification.type] || notificationIcons.system}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between w-full gap-2">
                          <span className={`text-sm font-medium line-clamp-1 ${notification.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {notification.title}
                          </span>
                          {!notification.read && (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {notification.message}
                        </span>
                        <span className="text-[11px] text-muted-foreground/60 mt-1 block">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link 
                  to="/provider/notifications" 
                  className="justify-center text-primary text-sm cursor-pointer py-2.5 w-full"
                >
                  View all notifications
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="hidden sm:block h-6 w-px bg-white/25 mx-1" />

          {/* Account */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="gap-2 text-white hover:text-white hover:bg-white/15 h-9 pl-1.5 pr-2.5 rounded-lg"
              >
                <div className="h-7 w-7 rounded-full bg-white/25 flex items-center justify-center text-xs font-semibold text-white overflow-hidden">
                  {facilityLogo ? (
                    <img src={facilityLogo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-white/70 hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card" sideOffset={8}>
              <DropdownMenuLabel className="font-normal py-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary overflow-hidden">
                    {facilityLogo ? (
                      <img src={facilityLogo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-sm font-semibold truncate">{userName || "Provider"}</p>
                    <p className="text-xs text-muted-foreground">Manage account</p>
                  </div>
                </div>
              </DropdownMenuLabel>
            <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/provider/listing" className="flex items-center gap-2.5 cursor-pointer py-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  My Listing
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/provider/settings" className="flex items-center gap-2.5 cursor-pointer py-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Account Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/provider/billing" className="flex items-center gap-2.5 cursor-pointer py-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  Billing & Plans
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/provider/help" className="flex items-center gap-2.5 cursor-pointer py-2">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  Help & Support
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onLogout}
                className="flex items-center gap-2.5 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 py-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Search Expanded */}
      {mobileSearchOpen && (
        <div className="lg:hidden px-4 pb-3 bg-primary border-t border-white/10 animate-fade-in">
          <ProviderSearchCommand 
            facilityId={facilityId} 
            onClose={() => setMobileSearchOpen(false)} 
            variant="header"
          />
        </div>
      )}
    </header>
  );
}
