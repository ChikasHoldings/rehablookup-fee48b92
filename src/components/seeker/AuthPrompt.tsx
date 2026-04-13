import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Star, Lock, LogIn, UserPlus, Send } from "lucide-react";

interface AuthPromptProps {
  title?: string;
  description?: string;
  icon?: "heart" | "star" | "lock" | "send";
  returnTo?: string;
}

export function AuthPrompt({ 
  title = "Sign in to continue", 
  description = "Create a free account to access this feature.",
  icon = "lock",
  returnTo
}: AuthPromptProps) {
  const IconComponent = icon === "heart" ? Heart : icon === "star" ? Star : icon === "send" ? Send : Lock;
  const loginUrl = returnTo ? `/login?redirect=${encodeURIComponent(returnTo)}` : "/login";
  const signupUrl = returnTo ? `/seeker/signup?redirect=${encodeURIComponent(returnTo)}` : "/seeker/signup";

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md text-center shadow-lg border-border/50">
        <CardHeader className="space-y-4 pb-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <IconComponent className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display">{title}</CardTitle>
          <CardDescription className="text-base">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="gap-2">
              <Link to={loginUrl}>
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link to={signupUrl}>
                <UserPlus className="h-4 w-4" />
                Create Account
              </Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            It's free and only takes a few seconds
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
