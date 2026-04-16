import { useLocation, useNavigate } from "react-router-dom";
import { useCallback, useState, useTransition } from "react";
import { 
  Home, 
  Search, 
  Heart,
  Star,
  MoreHorizontal,
  HeartHandshake,
  FileText,
  Settings,
  LogIn,
  User,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { prefetchRoute } from "@/lib/routePrefetch";

interface SeekerMobileNavProps extends React.HTMLAttributes<HTMLElement> {
  isAuthenticated?: boolean;
}

const navItems = [
  { href: "/account", label: "Home", icon: Home },
  { href: "/account/search", label: "Search", icon: Search },
  { href: "/account/concierge", label: "Placement", icon: HeartHandshake },
  { href: "/account/requests", label: "Inbox", icon: FileText },
];

export function SeekerMobileNav({ isAuthenticated = false, ...props }: SeekerMobileNavProps) {
  const location = useLocation();
  const navNavigate = useNavigate();
  const [, startTransition] = useTransition();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handlePrefetch = useCallback((path: string) => {
    prefetchRoute(path);
  }, []);

  const isMoreActive = ["/account/settings", "/account/saved", "/account/reviews", "/account/notifications", "/account/notification-preferences", "/account/help", "/account/international", "/login"].some(
    path => location.pathname.startsWith(path)
  );

  const moreItems = isAuthenticated ? [
    { href: "/account/saved", label: "Saved Facilities", icon: Heart },
    { href: "/account/reviews", label: "My Reviews", icon: Star },
    { href: "/account/notifications", label: "Notifications", icon: Home },
    { href: "/account/settings", label: "Settings", icon: Settings },
    { href: "/account/help", label: "Help & Support", icon: HelpCircle },
  ] : [
    { href: "/login", label: "Sign In", icon: LogIn },
    { href: "/signup", label: "Create Account", icon: User },
    { href: "/account/help", label: "Help & Support", icon: HelpCircle },
  ];

  return (
    <nav {...props} className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card backdrop-blur-lg border-t border-border safe-area-bottom shadow-2xl">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = item.href === "/account" 
            ? location.pathname === "/account"
            : location.pathname.startsWith(item.href);
          const Icon = item.icon;
          
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); startTransition(() => { navNavigate(item.href); }); }}
              onMouseEnter={() => handlePrefetch(item.href)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl min-w-[60px] transition-all duration-200 active:scale-95",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "flex items-center justify-center h-7 w-7 rounded-lg transition-all",
                isActive && "bg-primary/20"
              )}>
                <Icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
              </div>
              <span className={cn(
                "text-xs font-medium transition-colors",
                isActive ? "text-primary font-semibold" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </a>
          );
        })}
        
        {/* More button with drawer */}
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl min-w-[60px] transition-all duration-200 active:scale-95",
                isMoreActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "flex items-center justify-center h-7 w-7 rounded-lg transition-all",
                isMoreActive && "bg-primary/20"
              )}>
                <MoreHorizontal className={cn("h-5 w-5 transition-transform", isMoreActive && "scale-110")} />
              </div>
              <span className={cn(
                "text-xs font-medium transition-colors",
                isMoreActive ? "text-primary font-semibold" : "text-muted-foreground"
              )}>
                More
              </span>
            </button>
          </DrawerTrigger>
          <DrawerContent className="bg-background border-border">
            <DrawerHeader className="border-b border-border pb-4">
              <DrawerTitle className="text-foreground text-lg">
                {isAuthenticated ? "Account & Settings" : "Get Started"}
              </DrawerTitle>
            </DrawerHeader>
            <div className="p-4 space-y-1">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); setDrawerOpen(false); startTransition(() => { navNavigate(item.href); }); }}
                    onMouseEnter={() => handlePrefetch(item.href)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 active:scale-[0.98]",
                      isActive 
                        ? "bg-primary/10 text-foreground" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center h-10 w-10 rounded-lg",
                      isActive ? "bg-primary/20" : "bg-muted"
                    )}>
                      <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </a>
                );
              })}
            </div>
            {isAuthenticated && (
              <div className="p-4 pt-0 border-t border-border mt-2">
                <p className="text-xs text-muted-foreground text-center py-3">
                  Account
                </p>
              </div>
            )}
          </DrawerContent>
        </Drawer>
      </div>
    </nav>
  );
}
