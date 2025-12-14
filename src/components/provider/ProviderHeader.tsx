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
    <header className="h-16 bg-gradient-to-r from-primary to-primary/95 shadow-lg">
      <div className="h-full px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Left - Logo & Label */}
        <div className="flex items-center gap-4">
          <Link 
            to="/" 
            className="flex items-center gap-2 group shrink-0"
          >
            <img 
              src={logo} 
              alt="RehabLookup" 
              className="h-8 w-auto brightness-0 invert transition-transform group-hover:scale-105"
            />
          </Link>
          
          {/* Facility Selector Dropdown */}
          <div className="hidden md:flex items-center gap-3">
            <div className="h-6 w-px bg-primary-foreground/20" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="gap-2 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground h-9 px-3 rounded-lg"
                >
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium text-sm max-w-[180px] truncate">
                    {facilityName || "No Facility"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 bg-card" sideOffset={8}>
                <DropdownMenuLabel>Your Facilities</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {facilityName && (
                  <DropdownMenuItem className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate max-w-[180px]">{facilityName}</span>
                    </div>
                    <Check className="h-4 w-4 text-primary" />
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link 
                    to="/provider-signup" 
                    className="flex items-center gap-2 cursor-pointer text-primary"
                  >
                    <Plus className="h-4 w-4" />
                    Add New Facility
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Center - Search Bar (Desktop) */}
        <div className="hidden lg:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-foreground/50" />
            <Input
              type="text"
              placeholder="Search leads, settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 focus:bg-primary-foreground/15 focus:border-primary-foreground/30 rounded-xl"
            />
          </div>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile Search Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-10 w-10 text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </Button>

          {/* Facility Badge */}
          {facilityName && (
            <div className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-foreground/10 border border-primary-foreground/10">
              <Building2 className="h-4 w-4 text-primary-foreground/70" />
              <span className="text-sm text-primary-foreground/90 max-w-[160px] truncate font-medium">
                {facilityName}
              </span>
            </div>
          )}

          {/* View Public Profile */}
          {facilityId && (
            <a
              href={`/rehab-centers/${facilityId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 px-3 py-2 text-sm text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 rounded-lg transition-colors"
            >
              <span>View Listing</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="relative h-10 w-10 text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-card" sideOffset={8}>
              <DropdownMenuLabel className="flex items-center justify-between">
                <span className="font-semibold">Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
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
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.map((notification) => (
                    <DropdownMenuItem 
                      key={notification.id} 
                      className="flex flex-col items-start gap-1 p-3 cursor-pointer focus:bg-muted"
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
                      <span className="text-xs text-muted-foreground/70">
                        {notification.time}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="justify-center text-primary cursor-pointer">
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Account Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="gap-2 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground h-10 pl-2 pr-3 rounded-xl"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-foreground/40 to-primary-foreground/20 flex items-center justify-center text-xs font-bold ring-2 ring-primary-foreground/30">
                  {initials}
                </div>
                <span className="hidden sm:inline text-sm font-medium max-w-[100px] truncate">
                  {userName || "Account"}
                </span>
                <ChevronDown className="h-4 w-4 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card" sideOffset={8}>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none">{userName || "Provider"}</p>
                  <p className="text-xs text-muted-foreground">Manage your account</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/provider/settings" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" />
                  Account Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/provider/billing" className="flex items-center gap-2 cursor-pointer">
                  <CreditCard className="h-4 w-4" />
                  Billing & Plans
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onLogout}
                className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Search Bar */}
      {searchOpen && (
        <div className="lg:hidden px-4 pb-3 bg-primary animate-fade-in">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-foreground/50" />
            <Input
              type="text"
              placeholder="Search leads, settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 focus:bg-primary-foreground/15 rounded-xl"
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  );
}
