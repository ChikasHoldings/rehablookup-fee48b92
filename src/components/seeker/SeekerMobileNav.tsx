import { NavLink, Link } from "react-router-dom";
import { Home, Inbox, Heart, Star, Settings, LogIn } from "lucide-react";

interface SeekerMobileNavProps {
  isAuthenticated?: boolean;
}

const navItems = [
  { to: "/account", icon: Home, label: "Home" },
  { to: "/account/inbox", icon: Inbox, label: "Inbox" },
  { to: "/account/saved", icon: Heart, label: "Saved" },
  { to: "/account/reviews", icon: Star, label: "Reviews" },
  { to: "/account/settings", icon: Settings, label: "Settings" },
];

export function SeekerMobileNav({ isAuthenticated = false }: SeekerMobileNavProps) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.slice(0, 4).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/account"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
        {/* Show login or settings based on auth */}
        {isAuthenticated ? (
          <NavLink
            to="/account/settings"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            <Settings className="h-5 w-5" />
            <span className="text-xs font-medium">Settings</span>
          </NavLink>
        ) : (
          <Link
            to="/auth"
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors text-primary"
          >
            <LogIn className="h-5 w-5" />
            <span className="text-xs font-medium">Sign In</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
