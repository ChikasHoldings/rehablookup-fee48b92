import { Link } from "react-router-dom";
import { ChevronDown, LogOut, Settings, CreditCard, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ProviderHeaderProps {
  facilityName?: string;
  userName?: string;
  onLogout: () => void;
}

export function ProviderHeader({ facilityName, userName, onLogout }: ProviderHeaderProps) {
  return (
    <header className="h-14 bg-primary border-b border-primary/20">
      <div className="h-full px-4 md:px-6 flex items-center justify-between">
        {/* Left - Logo & Label */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary-foreground" />
            <span className="font-display font-bold text-lg text-primary-foreground">
              RehabLookup
            </span>
          </Link>
          <div className="hidden sm:block h-5 w-px bg-primary-foreground/30" />
          <span className="hidden sm:block text-sm font-medium text-primary-foreground/80">
            Provider Panel
          </span>
        </div>

        {/* Right - Clinic & Account */}
        <div className="flex items-center gap-4">
          {facilityName && (
            <span className="hidden md:block text-sm text-primary-foreground/80 max-w-[200px] truncate">
              {facilityName}
            </span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="gap-2 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <div className="h-7 w-7 rounded-full bg-primary-foreground/20 flex items-center justify-center text-sm font-medium">
                  {userName?.charAt(0)?.toUpperCase() || "P"}
                </div>
                <span className="hidden sm:inline text-sm">{userName || "Account"}</span>
                <ChevronDown className="h-4 w-4 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to="/provider/settings" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" />
                  Account Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/provider/billing" className="flex items-center gap-2 cursor-pointer">
                  <CreditCard className="h-4 w-4" />
                  Billing
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onLogout}
                className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
