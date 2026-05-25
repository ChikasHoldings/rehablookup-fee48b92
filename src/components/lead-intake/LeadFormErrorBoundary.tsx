import React from "react";
import { AlertTriangle, RefreshCw, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RouteResetErrorBoundary, withRouteReset } from "@/components/RouteResetErrorBoundary";

class LeadFormErrorBoundaryInner extends RouteResetErrorBoundary {
  protected reportError(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Lead form error:", error, errorInfo);
  }

  protected renderFallback(
    _error: Error | undefined,
    _errorInfo: React.ErrorInfo | undefined,
    reset: () => void,
  ) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-6">
            We're having trouble loading the form. This could be a temporary issue with our verification service.
          </p>

          <div className="space-y-3">
            <Button onClick={reset} variant="default" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or get help now</span>
              </div>
            </div>

            <a
              href="tel:1-800-662-4357"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
            >
              <Phone className="h-4 w-4 text-primary" />
              <span>Call SAMHSA Helpline: 1-800-662-4357</span>
            </a>

            <p className="text-xs text-muted-foreground pt-2">
              Free, confidential, 24/7 treatment referral and information service
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
}

export const LeadFormErrorBoundary = withRouteReset(LeadFormErrorBoundaryInner);
