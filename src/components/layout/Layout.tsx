import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { BackToTop } from "@/components/ui/back-to-top";
import { FloatingHelpButton } from "@/components/ui/floating-help-button";
import { InternationalBanner } from "@/components/InternationalBanner";
import { useUserRole } from "@/hooks/useUserRole";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { role, isLoading, isAuthenticated } = useUserRole();

  // Show nothing while loading to prevent flash of public content
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Skip redirect logic in iframe (preview functionality)
  const isInIframe = typeof window !== "undefined" && window.self !== window.top;

  // If admin is authenticated, redirect to admin panel - do NOT render public layout
  if (!isInIframe && isAuthenticated && role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  // If provider is authenticated, redirect to provider panel - do NOT render public layout
  if (!isInIframe && isAuthenticated && role === "provider") {
    return <Navigate to="/provider/dashboard" replace />;
  }

  // Seekers and unauthenticated users see the public layout
  return (
    <div className="flex min-h-screen flex-col">
      <InternationalBanner />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <BackToTop />
      <FloatingHelpButton />
    </div>
  );
}
