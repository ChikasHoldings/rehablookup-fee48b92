import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { captureError } from "@/lib/sentry";
import { RouteResetErrorBoundary, withRouteReset } from "@/components/RouteResetErrorBoundary";

/**
 * Error boundary for the seeker (client) panel. A render error inside one
 * route does NOT white-screen the whole panel — and navigating away (via the
 * panel nav or browser back) auto-recovers, so the user can never get stuck.
 */
class SeekerErrorBoundaryInner extends RouteResetErrorBoundary {
  protected reportError(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Seeker panel error:", error);
    console.error("Component stack:", errorInfo?.componentStack);
    captureError(error, {
      panel: "seeker",
      extra: { componentStack: errorInfo?.componentStack },
    });
  }

  protected renderFallback(
    _error: Error | undefined,
    _errorInfo: React.ErrorInfo | undefined,
    reset: () => void,
  ) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4">
              We hit an unexpected error loading this page. You can try again
              or head back to your dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={reset} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={() => { window.location.href = "/account"; }}>
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}

export const SeekerErrorBoundary = withRouteReset(SeekerErrorBoundaryInner);
