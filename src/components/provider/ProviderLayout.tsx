import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProviderHeader } from "./ProviderHeader";
import { ProviderSidebar } from "./ProviderSidebar";
import { useToast } from "@/hooks/use-toast";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface Profile {
  first_name: string;
  last_name: string;
  email: string;
}

interface Facility {
  id: string;
  name: string;
}

interface ProviderLayoutProps {
  children: ReactNode;
}

export function ProviderLayout({ children }: ProviderLayoutProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [facility, setFacility] = useState<Facility | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/provider-login");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      const { data: facilityData } = await supabase
        .from("facilities")
        .select("id, name")
        .eq("user_id", session.user.id)
        .limit(1)
        .maybeSingle();

      if (facilityData) {
        setFacility(facilityData);
      }

      setIsLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          navigate("/provider-login");
        }
      }
    );

    checkAuth();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You've been successfully logged out.",
    });
    navigate("/provider-login");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center animate-fade-in">
          <div className="relative">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Fixed Header - z-50 to stay on top */}
      <div className="flex-shrink-0 z-50">
        <ProviderHeader
          facilityName={facility?.name}
          userName={profile ? `${profile.first_name} ${profile.last_name}` : undefined}
          onLogout={handleLogout}
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Fixed Desktop Sidebar - z-40 below header */}
        <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 border-r border-border bg-card/50 backdrop-blur-sm overflow-y-auto z-40">
          <div className="flex-1 overflow-y-auto">
            <ProviderSidebar />
          </div>
          
          {/* Sidebar Footer */}
          <div className="flex-shrink-0 p-4 border-t border-border">
            <div className="rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 p-4">
              <p className="text-xs font-medium text-foreground">Need Help?</p>
              <p className="text-xs text-muted-foreground mt-1">
                Contact our support team for assistance.
              </p>
              <Button variant="link" className="h-auto p-0 mt-2 text-xs" asChild>
                <a href="/provider-support">Get Support →</a>
              </Button>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Sheet */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="default" 
              size="icon" 
              className="lg:hidden fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 border-r-0">
            <div className="flex flex-col h-full bg-card">
              <div className="p-4 border-b border-border">
                <p className="font-display font-semibold text-foreground">Navigation</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ProviderSidebar onNavigate={() => setSidebarOpen(false)} />
              </div>
              <div className="flex-shrink-0 p-4 border-t border-border">
                <div className="rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 p-4">
                  <p className="text-xs font-medium text-foreground">Need Help?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Contact support for assistance.
                  </p>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Scrollable Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-muted/30">
          <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
