import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, Mail, ArrowRight, Building2, Shield, BarChart3 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { BackToTop } from "@/components/ui/back-to-top";

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

    // Placeholder - actual authentication would be implemented with backend
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
      
      <main className="flex flex-1">
        {/* Left Panel - Branding & Benefits */}
        <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-center p-12 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-accent blur-3xl" />
            <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-primary-foreground blur-3xl" />
          </div>
          
          {/* Benefits */}
          <div className="relative z-10 space-y-8 max-w-lg">
            <h2 className="font-display text-3xl font-bold text-primary-foreground">
              Provider Dashboard
            </h2>
            <p className="text-lg text-primary-foreground/80">
              Manage your facility listing, respond to inquiries, and track your performance.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/10 backdrop-blur-sm">
                  <Building2 className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-primary-foreground">Manage Your Listing</h3>
                  <p className="text-sm text-primary-foreground/70">Update facility details, photos, and treatment programs anytime.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/10 backdrop-blur-sm">
                  <BarChart3 className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-primary-foreground">Track Performance</h3>
                  <p className="text-sm text-primary-foreground/70">View inquiry analytics and optimize your visibility.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/10 backdrop-blur-sm">
                  <Shield className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-primary-foreground">Secure Access</h3>
                  <p className="text-sm text-primary-foreground/70">Enterprise-grade security protects your facility data.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Panel - Login Form */}
        <div className="flex w-full lg:w-1/2 flex-col items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-md space-y-8">
            {/* Header */}
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                Welcome back
              </h1>
              <p className="mt-2 text-muted-foreground">
                Sign in to access your provider dashboard.
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@facility.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-11 text-base"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a
                    href="#"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pl-11 text-base"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
                {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground">
                  New to RehabLookup?
                </span>
              </div>
            </div>

            {/* Register CTA */}
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Get your treatment facility listed and connect with patients seeking recovery.
              </p>
              <Button variant="outline" className="w-full h-12" asChild>
                <Link to="/for-providers">
                  List Your Facility
                </Link>
              </Button>
            </div>

            {/* Help Link */}
            <p className="text-center text-sm text-muted-foreground">
              Need help?{" "}
              <Link to="/contact" className="text-primary hover:underline">
                Contact support
              </Link>
            </p>
          </div>
        </div>
      </main>
      
      <BackToTop />
    </div>
  );
}
