import React from "react";
import { AlertTriangle, RefreshCw, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { logAdminError, getRecentErrors } from "@/lib/adminErrorLogger";
import {
  RouteResetErrorBoundary,
  withRouteReset,
  type RouteResetBoundaryProps,
} from "@/components/RouteResetErrorBoundary";

interface AdminBoundaryProps extends RouteResetBoundaryProps {
  componentName?: string;
}

class AdminErrorBoundaryInner extends RouteResetErrorBoundary<AdminBoundaryProps> {
  protected reportError(error: Error, errorInfo: React.ErrorInfo) {
    const componentName = this.props.componentName || "UnknownAdminComponent";
    logAdminError(componentName, "component_crash", error, {
      componentStack: errorInfo?.componentStack,
      reactErrorInfo: errorInfo,
    });
  }

  protected renderFallback(
    error: Error | undefined,
    errorInfo: React.ErrorInfo | undefined,
    reset: () => void,
  ) {
    const errorMessage = error?.message || "Unknown error";
    const errorStack = error?.stack;
    const componentStack = errorInfo?.componentStack;
    const recentErrors = getRecentErrors().slice(0, 5);

    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4">
              We encountered an error loading this page. Please try again.
            </p>

            {/* Development debugging info */}
            {process.env.NODE_ENV === "development" && (
              <div className="text-left mb-4 space-y-3">
                <div className="p-3 bg-destructive/10 rounded-md text-xs overflow-auto max-h-32">
                  <p className="font-semibold text-destructive mb-1">Error Message:</p>
                  <p className="text-destructive/80">{errorMessage}</p>
                </div>

                {componentStack && (
                  <details className="p-3 bg-muted rounded-md text-xs">
                    <summary className="font-semibold cursor-pointer flex items-center gap-2">
                      <Bug className="h-3 w-3" />
                      Component Stack
                    </summary>
                    <pre className="mt-2 text-muted-foreground whitespace-pre-wrap overflow-auto max-h-40">
                      {componentStack}
                    </pre>
                  </details>
                )}

                {errorStack && (
                  <details className="p-3 bg-muted rounded-md text-xs">
                    <summary className="font-semibold cursor-pointer">Error Stack</summary>
                    <pre className="mt-2 text-muted-foreground whitespace-pre-wrap overflow-auto max-h-40">
                      {errorStack}
                    </pre>
                  </details>
                )}

                {recentErrors.length > 0 && (
                  <details className="p-3 bg-muted rounded-md text-xs">
                    <summary className="font-semibold cursor-pointer">
                      Recent Errors ({recentErrors.length})
                    </summary>
                    <div className="mt-2 space-y-2">
                      {recentErrors.map((log, i) => (
                        <div key={i} className="p-2 bg-background rounded border text-xs">
                          <p className="font-medium">{log.component} - {log.action}</p>
                          <p className="text-muted-foreground">{log.timestamp}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}

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

export const AdminErrorBoundary = withRouteReset(AdminErrorBoundaryInner);
