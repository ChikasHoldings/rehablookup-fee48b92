import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Lightweight error boundary for individual dashboard widgets/cards.
 * Catches crashes in a single widget without taking down the entire page.
 */
export class AdminWidgetBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm font-medium mb-1">
              {this.props.name ? `${this.props.name} failed to load` : "Widget failed to load"}
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <Button size="sm" variant="outline" onClick={this.handleRetry}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
