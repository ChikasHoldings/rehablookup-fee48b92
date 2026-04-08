import { ReactNode, useEffect, useMemo, memo } from "react";
import { Navigate } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { BackToTop } from "@/components/ui/back-to-top";
import { FloatingHelpButton } from "@/components/ui/floating-help-button";
import { InternationalBanner } from "@/components/InternationalBanner";
import { useUserRole } from "@/hooks/useUserRole";
import { preloadPublicPages } from "@/lib/routePrefetch";


interface LayoutProps {
  children: ReactNode;
}

// Memoize static shell elements so they never re-render during navigation
const MemoizedHeader = memo(Header);
const MemoizedFooter = Footer;

export function Layout({ children }: LayoutProps) {
  const { role, isLoading, isAuthenticated } = useUserRole();

  // Preload public pages on mount for instant navigation
  useEffect(() => {
    preloadPublicPages();
  }, []);

  // Skip redirect logic in iframe (preview functionality)
  const isInIframe = typeof window !== "undefined" && window.self !== window.top;

  // Compute redirect once per role change, not per render
  const redirect = useMemo(() => {
    if (isInIframe) return null;
    if (isAuthenticated && role === "admin") return "/admin";
    if (isAuthenticated && role === "provider") return "/provider/dashboard";
    return null;
  }, [isInIframe, isAuthenticated, role]);

  if (redirect) {
    return <Navigate to={redirect} replace />;
  }

  // Seekers and unauthenticated users see the public layout
  return (
    <div className="flex min-h-screen flex-col">
      <InternationalBanner />
      <MemoizedHeader />
      <main className="flex-1">{children}</main>
      <MemoizedFooter />
      <BackToTop />
      <FloatingHelpButton />
      <ExitIntentCapture />
    </div>
  );
}
