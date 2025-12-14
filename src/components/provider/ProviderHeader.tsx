import { Link } from "react-router-dom";
import { ChevronDown, LogOut, Settings, CreditCard, Building2, ExternalLink } from "lucide-react";
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

interface ProviderHeaderProps {
  facilityName?: string;
  userName?: string;
  onLogout: () => void;
}

export function ProviderHeader({ facilityName, userName, onLogout }: ProviderHeaderProps) {
  const initials = userName
    ?.split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2) || "P";

  return (
    <header className="h-14 bg-primary shadow-md">
      <div className="h-full px-4 md:px-6 flex items-center justify-between">
        {/* Left - Logo & Label */}
        <div className="flex items-center gap-3">
          <Link 
            to="/" 
            className="flex items-center gap-2 group"
          >
            <img 
              src={logo} 
              alt="RehabLookup" 
              className="h-7 w-auto brightness-0 invert transition-transform group-hover:scale-105"
            />
          </Link>
          
          <div className="hidden md:flex items-center gap-3">
            <div className="h-5 w-px bg-primary-foreground/20" />
            <Badge 
              variant="secondary" 
              className="bg-primary-foreground/15 text-primary-foreground border-0 font-medium text-xs"
            >
              Provider Panel
            </Badge>
          </div>
        </div>

        {/* Right - Clinic & Account */}
        <div className="flex items-center gap-3">
          {facilityName && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-foreground/10">
              <Building2 className="h-3.5 w-3.5 text-primary-foreground/70" />
              <span className="text-sm text-primary-foreground/90 max-w-[180px] truncate font-medium">
                {facilityName}
              </span>
            </div>
          )}

          <Link
            to="/"
            className="hidden md:flex items-center gap-1.5 text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
          >
            <span>View Site</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="gap-2 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground h-9 pl-1.5 pr-2"
              >
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary-foreground/30 to-primary-foreground/10 flex items-center justify-center text-xs font-semibold ring-2 ring-primary-foreground/20">
                  {initials}
                </div>
                <span className="hidden sm:inline text-sm font-medium">{userName || "Account"}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userName || "Provider"}</p>
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
    </header>
  );
}
