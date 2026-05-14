import { ReactNode, useEffect, memo } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { BackToTop } from "@/components/ui/back-to-top";
import { FloatingHelpButton } from "@/components/ui/floating-help-button";
import { StickyConversionBar } from "@/components/seo/StickyConversionBar";
import { InternationalBanner } from "@/components/InternationalBanner";
import { CompareTray } from "@/components/comparison/CompareTray";
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
    // overflow-x: clip (not hidden) on the outer flex container.
    // `overflow-x: hidden` would establish a scroll context that breaks
    // `position: sticky` on the descendant <Header> (the header scrolled
    // away with the page). `overflow-x: clip` has the same horizontal-
    // overflow-clipping effect WITHOUT creating a scroll container, so
    // sticky inside it works correctly. Modern-browser-only — supported
    // in Chrome 90+, Firefox 81+, Safari 16+ (2.5+ years).
    <div className="flex min-h-screen flex-col w-full max-w-[100vw] [overflow-x:clip]">
      <InternationalBanner />
      <MemoizedHeader />
      <main id="main" className="flex-1 w-full min-w-0">{children}</main>
      <MemoizedFooter />
      <BackToTop />
      <FloatingHelpButton />
      <StickyConversionBar />
      <CompareTray />
    </div>
  );
}
