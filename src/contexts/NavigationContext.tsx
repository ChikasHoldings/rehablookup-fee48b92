import { createContext, useContext, useTransition, useCallback, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface NavigationContextType {
  isPending: boolean;
  navigateWithTransition: (to: string) => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isPending, startTransition] = useTransition();
  const navigate = useNavigate();

  const navigateWithTransition = useCallback((to: string) => {
    startTransition(() => {
      navigate(to);
    });
  }, [navigate, startTransition]);

  // Global click interceptor: wraps ALL internal link clicks in startTransition
  // This keeps the old page visible while lazy chunks load — no blank flashes.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      // Only left-clicks without modifiers
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      if (e.defaultPrevented) return;

      // Walk up from target to find an <a> element
      let anchor = e.target as HTMLElement | null;
      while (anchor && anchor.tagName !== "A") {
        anchor = anchor.parentElement;
      }
      if (!anchor) return;

      const a = anchor as HTMLAnchorElement;
      const href = a.getAttribute("href");
      if (!href) return;

      // Skip external, hash-only, mailto, tel links
      if (href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) return;
      // Skip links that open in new tab
      if (a.target === "_blank") return;
      // Skip download links
      if (a.hasAttribute("download")) return;

      // This is an internal SPA link — intercept it
      e.preventDefault();
      startTransition(() => {
        navigate(href);
      });
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [navigate, startTransition]);

  return (
    <NavigationContext.Provider value={{ isPending, navigateWithTransition }}>
      {isPending && (
        <div
          className="fixed top-0 left-0 right-0 z-[9999] h-[2px] bg-primary animate-pulse"
          style={{ animationDuration: "800ms" }}
          aria-hidden="true"
        />
      )}
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within NavigationProvider");
  }
  return context;
}
