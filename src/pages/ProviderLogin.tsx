import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, Mail, ArrowRight } from "lucide-react";
import { Header } from "@/components/layout/Header";

const providerNavLinks = [
  { href: "/for-providers", label: "Why List With Us" },
  { href: "/provider-resources", label: "Resources" },
  { href: "/contact", label: "Support" },
  { href: "/", label: "Main Site" },
];

export default function ProviderLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      toast({
        title: "Coming Soon",
        description: "Provider login functionality will be available soon. Please contact us for assistance.",
      });
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header 
        navLinks={providerNavLinks} 
        ctaLink="/for-providers" 
        ctaLabel="List Your Facility"
        variant="provider"
      />
      
      <main className="flex flex-1 items-center justify-center px-4 py-12 md:py-16">
        <div className="w-full max-w-sm space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-foreground">
              Provider Sign In
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Access your facility dashboard
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@facility.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <a href="#" className="text-xs text-primary hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
              {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>

          {/* Footer */}
          <div className="space-y-4 pt-4 border-t border-border">
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/for-providers" className="text-primary hover:underline font-medium">
                List your facility
              </Link>
            </p>
            <p className="text-center text-xs text-muted-foreground">
              Need help?{" "}
              <Link to="/contact" className="text-primary hover:underline">
                Contact support
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
