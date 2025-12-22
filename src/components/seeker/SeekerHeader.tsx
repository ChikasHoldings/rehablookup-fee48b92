import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { 
  Home, Send, Heart, Star, Settings, LogOut, LogIn, 
  Search, Bell, BellOff, X, MapPin, Building2, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useSeekerNotifications } from "@/hooks/useSeekerNotifications";
import { supabase } from "@/integrations/supabase/client";

export interface SeekerHeaderProps {
  userName?: string;
  avatarUrl?: string | null;
  onLogout: () => void;
  isAuthenticated?: boolean;
}

interface SearchResult {
  id: string;
  name: string;
  city: string;
  state: string;
  slug: string | null;
}

const navItems = [
  { to: "/account", icon: Home, label: "Home" },
  { to: "/account/requests", icon: Send, label: "My Requests" },
  { to: "/account/saved", icon: Heart, label: "Saved" },
  { to: "/account/reviews", icon: Star, label: "My Reviews" },
];

const notificationTypeIcons: Record<string, React.ReactNode> = {
  system: <Bell className="h-4 w-4 text-primary" />,
  facility_update: <Building2 className="h-4 w-4 text-blue-500" />,
  review_response: <Star className="h-4 w-4 text-amber-500" />,
  saved_facility: <Heart className="h-4 w-4 text-pink-500" />,
  request_update: <Send className="h-4 w-4 text-green-500" />,
};

export function SeekerHeader({ userName, avatarUrl, onLogout, isAuthenticated = false }: SeekerHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  
  const { notifications, unreadCount, markAsRead, isLoading: notificationsLoading } = useSeekerNotifications();
  const recentNotifications = notifications.slice(0, 5);

  const initials = userName
    ?.split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('facilities')
          .select('id, name, city, state, slug')
          .eq('status', 'approved')
          .or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,state.ilike.%${searchQuery}%`)
          .limit(6);

        if (!error && data) {
          setSearchResults(data);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchOpen(false);
      navigate(`/search-results?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setSearchOpen(false);
    setSearchQuery("");
    navigate(result.slug ? `/center/${result.slug}` : `/rehab-centers/${result.id}`);
  };

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-primary border-b border-white/10 shadow-md">
      <div className="h-16 md:h-[72px] max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left - Logo */}
        <div className="flex items-center shrink-0">
          <Link to="/">
            <img 
              src="/logo.png" 
              alt="RehabLookup" 
              className="h-6 sm:h-7 md:h-8 w-auto brightness-0 invert"
            />
          </Link>
        </div>

        {/* Center - Search (Desktop) */}
        <div className="hidden lg:flex flex-1 max-w-md relative">
          <form onSubmit={handleSearchSubmit} className="w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search treatment centers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                className="w-full pl-10 h-10 bg-white/10 hover:bg-white/15 focus:bg-white/20 text-white placeholder:text-white/50 border-white/20 rounded-lg"
              />
              {searchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
          
          {/* Search Results Dropdown */}
          {searchOpen && (searchQuery.length >= 2 || searchResults.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-lg shadow-xl border border-border overflow-hidden z-50">
              {isSearching ? (
                <div className="p-4 text-center text-muted-foreground">
                  <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : searchResults.length > 0 ? (
                <>
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{result.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {result.city}, {result.state}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                  <button
                    onClick={handleSearchSubmit}
                    className="w-full p-3 text-sm text-primary hover:bg-primary/5 transition-colors border-t border-border"
                  >
                    See all results for "{searchQuery}"
                  </button>
                </>
              ) : searchQuery.length >= 2 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No results found
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/account"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right - Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Mobile Search Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-9 w-9 sm:h-10 sm:w-10 text-white hover:text-white hover:bg-white/15 transition-all duration-200 hover:scale-105 active:scale-95"
            onClick={() => navigate("/search")}
          >
            <Search className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>

          {/* Notifications */}
          {isAuthenticated && (
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
                <div className="flex items-center justify-between py-3 px-3">
                  <span className="font-semibold text-sm">Notifications</span>
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="text-xs h-5 px-2">
                      {unreadCount} new
                    </Badge>
                  )}
                </div>
                <DropdownMenuSeparator />
                {notificationsLoading ? (
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
                          {notificationTypeIcons[notification.type] || notificationTypeIcons.system}
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
                    to="/account/notifications" 
                    className="justify-center text-primary text-sm cursor-pointer py-2.5 w-full"
                  >
                    View all notifications
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="hidden sm:block h-6 sm:h-7 w-px bg-white/30 mx-1 sm:mx-2" />

          {/* User Menu or Sign In */}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="gap-1.5 sm:gap-2 text-white hover:text-white hover:bg-white/15 h-9 sm:h-10 pl-1.5 sm:pl-2 pr-2 sm:pr-3 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border border-white/30">
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt={userName || "User"} />
                    ) : null}
                    <AvatarFallback className="bg-white/30 text-white text-xs sm:text-sm font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium text-white/90 max-w-[100px] truncate">
                    {userName || "User"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card" sideOffset={8}>
                <DropdownMenuItem asChild>
                  <Link to="/account/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              asChild 
              className="h-9 sm:h-10 px-3 sm:px-4 bg-white text-primary hover:bg-white/90 font-medium text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Link to="/auth" className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Sign In</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Click outside to close search */}
      {searchOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setSearchOpen(false)}
        />
      )}
    </header>
  );
}
