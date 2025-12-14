import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProviderHeader } from "./ProviderHeader";
import { ProviderSidebar } from "./ProviderSidebar";
import { useToast } from "@/hooks/use-toast";
import { Menu } from "lucide-react";
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

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch first facility for display
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
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <ProviderHeader
        facilityName={facility?.name}
        userName={profile ? `${profile.first_name} ${profile.last_name}` : undefined}
        onLogout={handleLogout}
      />

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 min-h-[calc(100vh-56px)] border-r border-border bg-card">
          <ProviderSidebar />
        </aside>

        {/* Mobile Sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="pt-4">
              <ProviderSidebar onNavigate={() => setSidebarOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
