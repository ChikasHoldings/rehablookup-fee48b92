import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Home, Send, Heart, Star, Settings, LogOut, LogIn, Search, Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface SeekerHeaderProps {
  userName?: string;
  onLogout: () => void;
  isAuthenticated?: boolean;
}

const navItems = [
  { to: "/account", icon: Home, label: "Home" },
  { to: "/account/requests", icon: Send, label: "My Requests" },
  { to: "/account/saved", icon: Heart, label: "Saved" },
  { to: "/account/reviews", icon: Star, label: "My Reviews" },
];

export function SeekerHeader({ userName, onLogout, isAuthenticated = false }: SeekerHeaderProps) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const navigate = useNavigate();

  const initials = userName
    ?.split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

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
        <div className="hidden lg:flex flex-1 max-w-md">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white border border-white/20 rounded-lg px-4"
            onClick={() => navigate("/search")}
          >
            <Search className="h-4 w-4" />
            <span className="text-sm">Search treatment centers...</span>
          </Button>
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

          {isAuthenticated && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 sm:h-10 sm:w-10 text-white hover:text-white hover:bg-white/15 transition-all duration-200 hover:scale-105 active:scale-95"
              onClick={() => navigate("/account/notifications")}
            >
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
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
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-white/30 border border-white/30 flex items-center justify-center text-xs sm:text-sm font-semibold text-white">
                    {initials}
                  </div>
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
    </header>
  );
}
