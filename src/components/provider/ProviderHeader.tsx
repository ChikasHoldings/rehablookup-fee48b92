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
  Crown,
  Star,
  Sparkles,
} from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
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
import { useProviderNotifications } from "@/hooks/useProviderNotifications";
import { ProviderSearchCommand } from "./ProviderSearchCommand";
import { FacilityLocationDropdown } from "./FacilityLocationDropdown";

interface ProviderHeaderProps {
  facilityName?: string;
  facilityId?: string;
  facilitySlug?: string | null;
  facilityLogo?: string | null;
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

export function ProviderHeader({ facilityName, facilityId, facilitySlug, facilityLogo, userName, onLogout }: ProviderHeaderProps) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const navigate = useNavigate();
  
  const { notifications, unreadCount, markAsRead, isLoading } = useProviderNotifications();
  const { data: subscription } = useSubscription();
  const recentNotifications = notifications.slice(0, 5);

  const getPlanBadgeConfig = (plan: string) => {
    switch (plan) {
      case "featured":
        return {
          label: "Featured",
          icon: Crown,
          bgClass: "bg-gradient-to-r from-amber-500 to-yellow-400",
          textClass: "text-white",
        };
      case "professional":
        return {
          label: "Pro",
          icon: Star,
          bgClass: "bg-gradient-to-r from-emerald-500 to-teal-400",
          textClass: "text-white",
        };
      default:
        return {
          label: "Basic",
          icon: Sparkles,
          bgClass: "bg-white/20",
          textClass: "text-white/80",
        };
    }
  };

  const planConfig = getPlanBadgeConfig(subscription?.plan || "basic");
  
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
    
    // Check for explicit link in metadata
    const metadata = notification.metadata as Record<string, any> | null;
    if (metadata?.link) {
      navigate(metadata.link);
      return;
    }
    
    // Type-based routing
    if (notification.type === "lead_received" || notification.type === "lead_status_changed") {
      navigate("/provider/leads");
    } else if (notification.type === "subscription_updated" || notification.type === "lead_limit_warning") {
      navigate("/provider/billing");
    } else if (notification.type === "listing_approved") {
      navigate("/provider/listing");
    } else if (notification.type === "system") {
      navigate("/provider/notifications");
    } else {
      // Default to notifications page
      navigate("/provider/notifications");
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-primary border-b border-white/10 shadow-md">
      <div className="h-16 md:h-[72px] max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left - Logo & Facility Selector */}
        <div className="flex items-center min-w-0 gap-1.5 sm:gap-2">
          <div className="flex items-center shrink-0">
            <img 
              src="/logo-dark.svg" 
              alt="Rehab-Lookup" 
              className="h-9 sm:h-10 md:h-11 w-auto"
            />
          </div>
          
          {/* Enhanced Location Dropdown */}
          <FacilityLocationDropdown />
        </div>

        {/* Center - Search (Desktop) */}
        <div className="hidden lg:flex flex-1 max-w-md">
          <ProviderSearchCommand facilityId={facilityId} />
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5">

          {/* Mobile Search Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-9 w-9 sm:h-10 sm:w-10 text-white hover:text-white hover:bg-white/15 transition-all duration-200 hover:scale-105 active:scale-95"
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          >
            {mobileSearchOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Search className="h-4 w-4 sm:h-5 sm:w-5" />}
          </Button>

          {/* View Listing */}
          {facilityId && (
            <a
              href={facilitySlug ? `/center/${facilitySlug}` : `/rehab-centers/${facilityId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:inline-flex items-center gap-1.5 h-10 px-3.5 text-sm font-medium text-white hover:bg-white/15 rounded-lg transition-all duration-200 border border-white/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <ExternalLink className="h-4 w-4" />
              <span>View Listing</span>
            </a>
          )}

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="relative h-9 w-9 sm:h-10 sm:w-10 text-white hover:text-white hover:bg-white/15 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-destructive text-[9px] sm:text-[10px] font-bold text-white ring-2 ring-primary">
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

          <div className="hidden sm:block h-6 sm:h-7 w-px bg-white/30 mx-1 sm:mx-2" />

          {/* Account */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="gap-1.5 sm:gap-2.5 text-white hover:text-white hover:bg-white/15 h-9 sm:h-10 pl-1.5 sm:pl-2 pr-2 sm:pr-3 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-white/30 border border-white/30 flex items-center justify-center text-xs sm:text-sm font-semibold text-white overflow-hidden">
                  {facilityLogo ? (
                    <img src={facilityLogo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-card" sideOffset={8}>
              <DropdownMenuLabel className="font-normal py-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary overflow-hidden">
                    {facilityLogo ? (
                      <img src={facilityLogo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{userName || "Provider"}</p>
                    <p className="text-xs text-muted-foreground">Manage account</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              
              {/* Plan Badge Section */}
              <div className="px-2 pb-2">
                <Link 
                  to="/provider/billing"
                  className={`flex items-center justify-between w-full p-2.5 rounded-lg ${
                    subscription?.plan === 'featured' 
                      ? 'bg-gradient-to-r from-amber-500/10 to-yellow-400/10 border border-amber-500/20' 
                      : subscription?.plan === 'professional'
                        ? 'bg-gradient-to-r from-emerald-500/10 to-teal-400/10 border border-emerald-500/20'
                        : 'bg-muted/50 border border-border'
                  } hover:opacity-90 transition-all group`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      subscription?.plan === 'featured'
                        ? 'bg-gradient-to-br from-amber-500 to-yellow-400'
                        : subscription?.plan === 'professional'
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-400'
                          : 'bg-muted-foreground/20'
                    }`}>
                      <planConfig.icon className={`h-4 w-4 ${
                        subscription?.plan === 'featured' || subscription?.plan === 'professional'
                          ? 'text-white'
                          : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-sm font-semibold ${
                        subscription?.plan === 'featured'
                          ? 'text-amber-600 dark:text-amber-400'
                          : subscription?.plan === 'professional'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-muted-foreground'
                      }`}>
                        {planConfig.label} Plan
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {subscription?.plan === 'basic' ? 'Upgrade for more leads' : '100 leads/month'}
                      </span>
                    </div>
                  </div>
                  {subscription?.plan === 'basic' && (
                    <span className="text-xs font-medium text-primary group-hover:underline">
                      Upgrade
                    </span>
                  )}
                </Link>
              </div>
              
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
