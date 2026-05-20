import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { ensureHistoryPatched, LOCATION_CHANGE_EVENT } from "@/lib/locationChangeEvent";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

const CHUNK_LOAD_RELOAD_KEY = "rl_chunk_load_reload_v1";

/**
 * Whether an error looks like a dynamic-import / chunk-load failure.
 * Triggered when a hashed JS asset 404s — typically because the deploy
 * rotated assets while the user was on the old HTML shell.
 */
function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const e = error as { name?: string; message?: string };
  if (e.name === "ChunkLoadError") return true;
  const msg = e.message || "";
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Loading chunk \d+ failed/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg)
  );
}

/**
 * Auto-reload ONCE per session on chunk-load errors. Guards against
 * an infinite reload loop if the chunk truly cannot be served (network
 * down, asset really missing) by setting a sessionStorage flag.
 */
function attemptChunkLoadReload(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (sessionStorage.getItem(CHUNK_LOAD_RELOAD_KEY)) return false;
    sessionStorage.setItem(CHUNK_LOAD_RELOAD_KEY, "1");
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

/**
 * Top-level error boundary. Two behaviors that make the difference between
 * "one broken page stalls the whole platform" and "the user can navigate
 * away from a broken page":
 *
 *   1. Resets hasError on route change. React's <ErrorBoundary> stays in
 *      its error state forever once it catches — without resetting, a
 *      single throwing route turns into a permanent blank screen even
 *      after the user clicks a different link. Mobile users / non-tech
 *      users rarely know to hard-reload.
 *
 *   2. Detects chunk-load (dynamic import) failures and triggers a
 *      one-time auto-reload. This is the deploy-rotation race: hashed JS
 *      assets change name after each build, and a user holding the old
 *      HTML in a tab will 404 on the next lazy chunk. Reloading picks up
 *      the fresh HTML pointing at the new asset names. sessionStorage
 *      flag prevents an infinite reload loop if the asset is truly gone.
 */
export class GlobalErrorBoundary extends React.Component<Props, State> {
  private locationHandler?: () => void;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidMount() {
    ensureHistoryPatched();
    this.locationHandler = () => {
      if (this.state.hasError) {
        this.setState({ hasError: false, error: undefined });
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
    console.error("GlobalErrorBoundary caught an error:", error, errorInfo);

    if (isChunkLoadError(error) && attemptChunkLoadReload()) {
      // Reload in flight — don't bother with Sentry, the new session will
      // see the working bundle and the error report would be noise.
      return;
    }

    // Dynamically import Sentry to avoid bundling 231KB in critical path
    import("@sentry/react")
      .then((Sentry) => {
        Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
      })
      .catch(() => {
        /* Sentry not available */
      });
  }

  handleRefresh = () => {
    // Clear the chunk-reload guard so a manual refresh actually retries.
    try {
      sessionStorage.removeItem(CHUNK_LOAD_RELOAD_KEY);
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  handleGoHome = () => {
    try {
      sessionStorage.removeItem(CHUNK_LOAD_RELOAD_KEY);
    } catch {
      /* ignore */
    }
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Something went wrong
              </h1>
              <p className="text-muted-foreground">
                We're sorry, but something unexpected happened. Please try refreshing the page or go back to the homepage.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleRefresh} variant="default" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh Page
              </Button>
              <Button onClick={this.handleGoHome} variant="outline" className="gap-2">
                <Home className="h-4 w-4" />
                Go to Homepage
              </Button>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left bg-muted rounded-lg p-4">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                  Error Details (Dev Only)
                </summary>
                <pre className="mt-2 text-xs text-destructive overflow-auto max-h-40">
                  {this.state.error.message}
                  {"\n\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
