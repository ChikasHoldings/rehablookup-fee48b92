import React from "react";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AlertTriangle, Home, Search } from "lucide-react";
import { ensureHistoryPatched, LOCATION_CHANGE_EVENT } from "@/lib/locationChangeEvent";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Route-level error boundary for public SEO pages.
 *
 * Goal: Googlebot must NEVER receive an empty body or a 5xx-style error UI on
 * indexable pages. When a child render throws, we render a valid 200-status
 * HTML page that:
 *   - Emits `noindex, follow` so Google does not index the broken state.
 *   - Provides real internal links so the crawl is not wasted.
 *   - Avoids the "Page with redirect" / "Soft 404" buckets in GSC.
 *
 * Wraps each lazy public route so a single broken page cannot blank the SPA.
 *
 * IMPORTANT: this boundary resets its `hasError` state whenever the URL
 * changes. Without that reset a single throwing route would leave the
 * fallback UI stuck across the entire app — every subsequent click would
 * still render "This page is temporarily unavailable" until a hard reload.
 * Non-technical / mobile users rarely know to hard-reload, so the platform
 * effectively goes blank for them once any route throws.
 */
export class SEORouteBoundary extends React.Component<Props, State> {
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
              <Button asChild>
                <Link to="/search-results">
                  <Search className="h-4 w-4 mr-1.5" />
                  Browse Treatment Centers
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/">
                  <Home className="h-4 w-4 mr-1.5" />
                  Go to Homepage
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </Layout>
    );
  }
}
