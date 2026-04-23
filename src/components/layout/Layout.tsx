import { ReactNode, useEffect, memo } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { BackToTop } from "@/components/ui/back-to-top";
import { FloatingHelpButton } from "@/components/ui/floating-help-button";
import { StickyConversionBar } from "@/components/seo/StickyConversionBar";
import { InternationalBanner } from "@/components/InternationalBanner";
import { preloadPublicPages } from "@/lib/routePrefetch";

interface LayoutProps {
  children: ReactNode;
}

// Memoize static shell elements so they never re-render during navigation
const MemoizedHeader = memo(Header);
const MemoizedFooter = Footer;

export function Layout({ children }: LayoutProps) {
  // Preload public pages on mount for instant navigation
  useEffect(() => {
    preloadPublicPages();
  }, []);

  // Public layout — no role checks, no redirects.
  // Admin and Provider portals have their own shells (AdminShell, ProviderShell).
  return (
    <div className="flex min-h-screen flex-col w-full max-w-[100vw] overflow-x-hidden">
      <InternationalBanner />
      <MemoizedHeader />
      <main className="flex-1 w-full min-w-0">{children}</main>
      <MemoizedFooter />
      <BackToTop />
      <FloatingHelpButton />
      <StickyConversionBar />
    </div>
  );
}
