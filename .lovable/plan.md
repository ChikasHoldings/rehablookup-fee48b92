
# Fix Page Blanking During Navigation

## Problem Summary
Pages blank out briefly when navigating because:
1. Suspense renders `null` while loading lazy chunks
2. AnimatedCard components start at opacity-0 and fade in
3. React's concurrent features aren't being used to keep old content visible

## Solution Overview
Implement a **navigation transition system** that keeps the current page visible while loading the next, then swaps instantly with optional subtle fade.

---

## Implementation Plan

### 1. Create Navigation Transition Context

**New file: `src/contexts/NavigationContext.tsx`**

```typescript
import { createContext, useContext, useTransition, useCallback, ReactNode } from "react";
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
  }, [navigate]);

  return (
    <NavigationContext.Provider value={{ isPending, navigateWithTransition }}>
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
```

### 2. Update App.tsx to Wrap Routes with NavigationProvider

**File: `src/App.tsx`**

- Move `NavigationProvider` inside `BrowserRouter` (it needs router context)
- Keep `Suspense fallback={null}` - the transition will handle visibility

```typescript
<BrowserRouter>
  <NavigationProvider>
    <ScrollToTop />
    <TrailingSlashRedirect />
    <CookieConsentBanner />
    <Suspense fallback={null}>
      <Routes>
        {/* routes */}
      </Routes>
    </Suspense>
  </NavigationProvider>
</BrowserRouter>
```

### 3. Update PrefetchLink to Use Transition Navigation

**File: `src/components/ui/prefetch-link.tsx`**

Make `PrefetchLink` use `startTransition` when navigating:

```typescript
import { forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTransition } from "react";
import { prefetchRoute } from "@/lib/routePrefetch";

export const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  ({ prefetch = true, to, onClick, children, ...props }, ref) => {
    const navigate = useNavigate();
    const [isPending, startTransition] = useTransition();
    const path = typeof to === "string" ? to : to.pathname || "";

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      onClick?.(e);
      
      // Navigate with transition - keeps old page visible
      startTransition(() => {
        navigate(path);
      });
    };

    const handleMouseEnter = () => {
      if (prefetch && path) {
        prefetchRoute(path);
      }
    };

    return (
      <a
        ref={ref}
        href={path}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        {...props}
      >
        {children}
      </a>
    );
  }
);
```

### 4. Make AnimatedCard Animation Optional

**File: `src/components/ui/animated-card.tsx`**

Add `instant` prop to skip animation (for returning visitors or fast navigation):

```typescript
interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  instant?: boolean; // Skip animation
}

export function AnimatedCard({ children, className, delay = 0, instant = false }: AnimatedCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(instant); // Start visible if instant

  useEffect(() => {
    if (instant) return;
    // ... existing intersection observer logic
  }, [instant]);

  return (
    <div
      ref={ref}
      className={cn(
        instant ? "" : "transition-all duration-500 ease-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        className
      )}
      style={{ transitionDelay: instant ? "0ms" : isVisible ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
```

### 5. Track Session Navigation for Instant Subsequent Loads

**File: `src/lib/routePrefetch.ts`**

Add session tracking to know if user has visited before:

```typescript
// Track visited routes in session for instant animations on return
const visitedRoutes = new Set<string>();

export function markRouteVisited(path: string): void {
  visitedRoutes.add(path);
}

export function hasVisitedRoute(path: string): boolean {
  return visitedRoutes.has(path);
}
```

### 6. Create Instant Animation Hook

**New file: `src/hooks/useInstantAnimation.ts`**

```typescript
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { hasVisitedRoute, markRouteVisited } from "@/lib/routePrefetch";

/**
 * Returns true if animations should be instant (page visited before in session)
 */
export function useInstantAnimation(): boolean {
  const { pathname } = useLocation();
  const [instant, setInstant] = useState(() => hasVisitedRoute(pathname));

  useEffect(() => {
    // Mark as visited after first render
    markRouteVisited(pathname);
  }, [pathname]);

  return instant;
}
```

### 7. Update High-Traffic Pages to Use Instant Animation

**Example: `src/pages/ProviderResources.tsx`**

```typescript
import { useInstantAnimation } from "@/hooks/useInstantAnimation";

export default function ProviderResources() {
  const instant = useInstantAnimation();
  
  return (
    // ...
    {resources.map((resource, index) => (
      <AnimatedCard key={resource.title} delay={index * 75} instant={instant}>
        {/* content */}
      </AnimatedCard>
    ))}
  );
}
```

---

## Files to Create
1. `src/contexts/NavigationContext.tsx` - Transition navigation provider
2. `src/hooks/useInstantAnimation.ts` - Track visited pages for instant animations

## Files to Modify
1. `src/App.tsx` - Add NavigationProvider
2. `src/components/ui/prefetch-link.tsx` - Use startTransition for navigation
3. `src/components/ui/animated-card.tsx` - Add instant prop, add forwardRef support
4. `src/lib/routePrefetch.ts` - Add visited route tracking
5. Pages using AnimatedCard (ProviderResources, ForProviders, etc.) - Use instant animation hook

---

## How This Fixes the Problem

```text
BEFORE (Current):
Click Link → Suspense renders null (BLANK) → Chunk loads → Page renders with opacity-0 → Fades in

AFTER (With Fix):
Click Link → Old page stays visible (startTransition) → Chunk loads → New page swaps in instantly
           ↓
     If visited before: No animations, instant content
     If first visit: Subtle fade-in animations
```

---

## Technical Details

### Why startTransition Works
React 18's `startTransition` marks the navigation as a "non-urgent" update. React keeps rendering the current UI while preparing the new one in the background. Once ready, it swaps instantly with no blank flash.

### AnimatedCard forwardRef Fix
The console error "Function components cannot be given refs" is because AnimatedCard doesn't use forwardRef. Adding it will:
1. Fix the console warning
2. Enable ref forwarding for parent components

### Performance Impact
- No additional network requests
- Uses React's built-in concurrent features
- Session memory is lightweight (Set of strings)
- Animations only on first page visit per session
