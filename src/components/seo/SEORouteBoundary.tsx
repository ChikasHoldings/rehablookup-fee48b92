import React from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, Search } from "lucide-react";
import { ensureHistoryPatched, LOCATION_CHANGE_EVENT } from "@/lib/locationChangeEvent";

interface Props {
  children: React.ReactNode;
  /**
   * Current pathname, passed in by the SEORouteBoundary wrapper below.
   * Drives the deterministic reset in `componentDidUpdate`.
   */
  pathname?: string;
}

interface State {
  hasError: boolean;
}

/**
 * Route-level error boundary for public SEO pages.
 *
 * Goal: Googlebot must NEVER receive an empty body or a 5xx-style error UI
 * on indexable pages. When a child render throws, we render a valid
 * 200-status HTML page that:
 *   - Emits `noindex, follow` so Google does not index the broken state.
 *   - Provides real internal links so the crawl is not wasted.
 *   - Avoids the "Page with redirect" / "Soft 404" buckets in GSC.
 *
 * Wraps each lazy public route so a single broken page cannot blank
 * the SPA.
 *
 * RESET CHAIN (defense in depth — three independent triggers so the
 * boundary can never get stuck in `hasError: true`):
 *
 *   1. `componentDidUpdate` watching `props.pathname` — the most
 *      reliable signal. React commits the prop change after the route
 *      transition, so this fires deterministically on every nav. The
 *      SEORouteBoundary export wraps the class with a useLocation
 *      hook so pathname is always supplied below `<BrowserRouter>`.
 *
 *   2. `popstate` listener — covers back/forward navigation triggered
 *      by the browser (not via React Router's pushState).
 *
 *   3. Custom `rl:locationchange` listener — fires after every
 *      history.pushState/replaceState via lib/locationChangeEvent's
 *      monkey-patch, in case (1) hasn't observed the new pathname
 *      yet on the same tick.
 *
 * Why this matters: an earlier version relied on (2) + (3) only. If
 * either fired before React committed the new route (a real race we
 * have observed), the boundary stayed stuck on `hasError: true` and
 * every subsequent click rendered "temporarily unavailable" until a
 * hard reload. Non-technical / mobile users do not know to hard-reload,
 * so a single throwing route silently turned into a platform-wide
 * blank for them. (1) closes the race.
 */
class SEORouteBoundaryClass extends React.Component<Props, State> {
  private locationHandler?: () => void;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidMount() {
    ensureHistoryPatched();
    this.locationHandler = () => {
      if (this.state.hasError) {
        this.setState({ hasError: false });
      }
    };
    window.addEventListener("popstate", this.locationHandler);
    window.addEventListener(LOCATION_CHANGE_EVENT, this.locationHandler);
  }

  componentDidUpdate(prevProps: Props) {
    // Reset the error state whenever the wrapped route's pathname
    // changes. This is the deterministic, race-free reset path —
    // React guarantees componentDidUpdate runs after the new pathname
    // prop has been committed, so we can't fire before the new route
    // is ready to render.
    if (
      this.state.hasError &&
      prevProps.pathname !== undefined &&
      prevProps.pathname !== this.props.pathname
    ) {
      this.setState({ hasError: false });
    }
  }

  componentWillUnmount() {
    if (this.locationHandler) {
      window.removeEventListener("popstate", this.locationHandler);
      window.removeEventListener(LOCATION_CHANGE_EVENT, this.locationHandler);
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[SEORouteBoundary]", error, errorInfo);
    import("@sentry/react")
      .then((Sentry) => {
        Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
      })
      .catch(() => {});
  }

  /**
   * Hard-reset escape hatch. Force a full reload so React state, any
   * stuck router internals, and the chunk loader all start fresh.
   * Used by the "Go to Homepage" button in the fallback UI — if the
   * boundary is stuck (e.g., the new route also throws), a hard nav
   * is the only guaranteed way out.
   */
  private handleHardHome = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  private handleHardSearch = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/search-results";
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <Layout>
        <Helmet>
          <meta name="robots" content="noindex, follow" />
          <title>Content Temporarily Unavailable | RehabLookup</title>
        </Helmet>
        <section className="container py-16 md:py-24">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="flex justify-center">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                <AlertTriangle className="h-7 w-7 text-muted-foreground" />
              </div>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              This page is temporarily unavailable
            </h1>
            <p className="text-muted-foreground">
              We're working to restore this page. In the meantime, you can browse our full
              directory of verified treatment centers or explore by state.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button onClick={this.handleHardSearch}>
                <Search className="h-4 w-4 mr-1.5" />
                Browse Treatment Centers
              </Button>
              <Button variant="outline" onClick={this.handleHardHome}>
                <Home className="h-4 w-4 mr-1.5" />
                Go to Homepage
              </Button>
            </div>
          </div>
        </section>
      </Layout>
    );
  }
}

/**
 * Public wrapper that injects `pathname` from React Router so the class
 * component below has the prop it needs to drive the deterministic
 * reset. Must live under `<BrowserRouter>` (which is where App.tsx
 * mounts it).
 */
export function SEORouteBoundary({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <SEORouteBoundaryClass pathname={location.pathname}>
      {children}
    </SEORouteBoundaryClass>
  );
}
