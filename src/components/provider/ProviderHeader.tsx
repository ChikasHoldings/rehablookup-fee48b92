import { useState } from "react";
import { Link } from "react-router-dom";
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
  Plus,
  Check
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
import { Input } from "@/components/ui/input";
import logo from "@/assets/logo.png";

interface ProviderHeaderProps {
  facilityName?: string;
  facilityId?: string;
  userName?: string;
  onLogout: () => void;
}

// Mock notifications - would come from database
const notifications = [
  { id: 1, title: "New lead received", message: "A family is interested in your facility", time: "2 min ago", unread: true },
  { id: 2, title: "Listing approved", message: "Your facility listing is now live", time: "1 hour ago", unread: true },
  { id: 3, title: "Welcome to RehabLookup", message: "Complete your profile to get started", time: "1 day ago", unread: false },
];

export function ProviderHeader({ facilityName, facilityId, userName, onLogout }: ProviderHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const initials = userName
    ?.split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2) || "P";

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header className="sticky top-0 z-50 h-16 bg-primary border-b border-primary-foreground/10 shadow-sm">
      <div className="h-full max-w-[1800px] mx-auto px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Left - Logo & Facility Selector */}
        <div className="flex items-center gap-6 min-w-0">
          <Link 
            to="/" 
            className="flex items-center shrink-0 group"
            title="Back to RehabLookup"
          >
            <img 
              src={logo} 
              alt="RehabLookup" 
              className="h-9 w-auto brightness-0 invert opacity-90 group-hover:opacity-100 transition-opacity"
            />
          </Link>
          
          {/* Divider */}
          <div className="hidden md:block h-8 w-px bg-primary-foreground/20" />
          
          {/* Facility Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="gap-2 text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 h-9 px-2.5 rounded-lg min-w-0"
              >
                <div className="flex items-center justify-center h-6 w-6 rounded-md bg-primary-foreground/15 shrink-0">
                  <Building2 className="h-3.5 w-3.5" />
                </div>
                <span className="font-medium text-sm truncate max-w-[140px] md:max-w-[200px]">
                  {facilityName || "Select Facility"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 bg-card" sideOffset={8}>
              <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide">
                Your Facilities
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {facilityName && (
                <DropdownMenuItem className="flex items-center justify-between cursor-pointer py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <span className="truncate font-medium">{facilityName}</span>
                  </div>
                  <Check className="h-4 w-4 text-primary shrink-0" />
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link 
                  to="/provider-signup" 
                  className="flex items-center gap-2.5 cursor-pointer text-primary py-2.5"
                >
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Plus className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Add New Facility</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Center - Search (Desktop) */}
        <div className="hidden lg:flex flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-foreground/40" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-sm placeholder:text-primary-foreground/40 focus:bg-primary-foreground/10 focus:border-primary-foreground/20 rounded-lg"
            />
          </div>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-1">
          {/* Mobile Search */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-9 w-9 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            {searchOpen ? <X className="h-4.5 w-4.5" /> : <Search className="h-4.5 w-4.5" />}
          </Button>

          {/* View Listing */}
          {facilityId && (
            <a
              href={`/rehab-centers/${facilityId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 rounded-lg transition-colors"
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
                className="relative h-9 w-9 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground ring-2 ring-primary">
                    {unreadCount}
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
              {notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No notifications</p>
                </div>
              ) : (
                <div className="max-h-[280px] overflow-y-auto">
                  {notifications.map((notification) => (
                    <DropdownMenuItem 
                      key={notification.id} 
                      className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                    >
                      <div className="flex items-start justify-between w-full gap-2">
                        <span className={`text-sm font-medium ${notification.unread ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notification.title}
                        </span>
                        {notification.unread && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {notification.message}
                      </span>
                      <span className="text-[11px] text-muted-foreground/60">
                        {notification.time}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="justify-center text-primary text-sm cursor-pointer py-2.5">
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Divider */}
          <div className="hidden sm:block h-6 w-px bg-primary-foreground/15 mx-1" />

          {/* Account */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="gap-2 text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 h-9 pl-1.5 pr-2.5 rounded-lg"
              >
                <div className="h-7 w-7 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xs font-semibold">
                  {initials}
                </div>
                <ChevronDown className="h-3.5 w-3.5 opacity-50 hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card" sideOffset={8}>
              <DropdownMenuLabel className="font-normal py-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                    {initials}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-sm font-semibold truncate">{userName || "Provider"}</p>
                    <p className="text-xs text-muted-foreground">Manage account</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
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
      {searchOpen && (
        <div className="lg:hidden px-4 pb-3 bg-primary border-t border-primary-foreground/10 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-foreground/40" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-sm placeholder:text-primary-foreground/40 rounded-lg"
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  );
}
