import { ShieldOff } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface AccessDeniedProps {
  requiredRole: "provider" | "admin";
  title?: string;
  message?: string;
}

export function AccessDenied({ requiredRole, title, message }: AccessDeniedProps) {
  const label = requiredRole === "admin" ? "admin account" : "provider account";
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldOff className="h-7 w-7 text-destructive" aria-hidden />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">{title ?? "Access denied"}</h1>
        <p className="text-muted-foreground">
          {message ?? `This area requires a ${label}. Sign in with the correct account to continue.`}
        </p>
        <div className="flex justify-center gap-3">
          <Button asChild>
            <Link to="/login">Sign in with a different account</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Go to homepage</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
