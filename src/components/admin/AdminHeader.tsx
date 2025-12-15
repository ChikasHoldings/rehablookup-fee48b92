import { memo } from "react";
import { Link } from "react-router-dom";
import { LogOut, Settings, Shield } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AdminHeaderProps {
  userEmail?: string;
  onLogout: () => void;
}

function AdminHeaderComponent({ userEmail, onLogout }: AdminHeaderProps) {
  const initials = userEmail?.slice(0, 2).toUpperCase() || "AD";

  return (
    <header className="sticky top-0 z-50 h-16 border-b bg-slate-900 text-white flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <Link to="/admin" className="flex items-center gap-2">
          <Shield className="h-7 w-7 text-amber-400" />
          <span className="text-xl font-bold">RehabLookup</span>
          <span className="text-xs bg-amber-400 text-slate-900 px-2 py-0.5 rounded font-semibold uppercase">
            Admin
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-slate-800">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-amber-400 text-slate-900 font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{userEmail}</p>
              <p className="text-xs text-muted-foreground">Administrator</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/admin/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-destructive cursor-pointer">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export const AdminHeader = memo(AdminHeaderComponent);
