import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { captureError } from "@/lib/sentry";
import { RouteResetErrorBoundary, withRouteReset } from "@/components/RouteResetErrorBoundary";

class ProviderErrorBoundaryInner extends RouteResetErrorBoundary {
  protected reportError(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Provider panel error:", error);
    console.error("Component stack:", errorInfo?.componentStack);
    captureError(error, {
      panel: "provider",
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
              We encountered an error loading this page. Please try again, or use the
              menu to go elsewhere — navigating away clears this automatically.
            </p>
            <Button onClick={reset} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
}

export const ProviderErrorBoundary = withRouteReset(ProviderErrorBoundaryInner);
