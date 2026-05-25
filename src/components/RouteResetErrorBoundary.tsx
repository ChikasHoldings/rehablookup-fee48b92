import React from "react";
import { useLocation } from "react-router-dom";
import { ensureHistoryPatched, LOCATION_CHANGE_EVENT } from "@/lib/locationChangeEvent";

export interface RouteResetBoundaryProps {
  children: React.ReactNode;
  /**
   * Current pathname, injected by the `withRouteReset` wrapper. Drives the
   * deterministic, race-free reset in componentDidUpdate.
   */
  pathname?: string;
}

interface BaseState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * Base error boundary that AUTO-RECOVERS on navigation, so a single crashing
 * page or component can never trap the user on the error screen (and a manual
 * "Try Again" that just re-renders the same crashed subtree is no longer the
 * only way out). Mirrors the proven three-trigger reset chain in
 * SEORouteBoundary:
 *
 *   1. componentDidUpdate watching `pathname` — race-free: React commits the
 *      new pathname prop only after the route transition, so the reset can
 *      never fire before the new route is ready to render.
 *   2. popstate — browser back/forward.
 *   3. rl:locationchange — pushState/replaceState via the patched history,
 *      covering same-tick in-app navigations.
 *
 * Subclasses implement reportError() (telemetry) and renderFallback() (UI).
 * Wrap the subclass with `withRouteReset(SubclassName)` so it receives the
 * pathname prop from React Router.
 */
export abstract class RouteResetErrorBoundary<
  P extends RouteResetBoundaryProps = RouteResetBoundaryProps,
> extends React.Component<P, BaseState> {
  private locationHandler?: () => void;

  constructor(props: P) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<BaseState> {
    return { hasError: true, error };
  }

  componentDidMount() {
    ensureHistoryPatched();
    this.locationHandler = () => {
      if (this.state.hasError) this.resetError();
    };
    window.addEventListener("popstate", this.locationHandler);
    window.addEventListener(LOCATION_CHANGE_EVENT, this.locationHandler);
  }

  componentDidUpdate(prevProps: P) {
    if (
      this.state.hasError &&
      prevProps.pathname !== undefined &&
      prevProps.pathname !== this.props.pathname
    ) {
      this.resetError();
    }
  }

  componentWillUnmount() {
    if (this.locationHandler) {
      window.removeEventListener("popstate", this.locationHandler);
      window.removeEventListener(LOCATION_CHANGE_EVENT, this.locationHandler);
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    this.reportError(error, errorInfo);
  }

  protected resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  /** Telemetry hook (Sentry / admin logger / console). */
  protected abstract reportError(error: Error, errorInfo: React.ErrorInfo): void;

  /** Render the error UI. `reset` clears the error in place (manual retry). */
  protected abstract renderFallback(
    error: Error | undefined,
    errorInfo: React.ErrorInfo | undefined,
    reset: () => void,
  ): React.ReactNode;

  render() {
    if (this.state.hasError) {
      return this.renderFallback(this.state.error, this.state.errorInfo, this.resetError);
    }
    return this.props.children;
  }
}

/**
 * Wraps a RouteResetErrorBoundary subclass so it receives the current
 * `pathname` from React Router (required for the race-free reset). Extra props
 * are forwarded to the boundary.
 */
export function withRouteReset<P extends RouteResetBoundaryProps>(
  Boundary: React.ComponentType<P>,
) {
  return function RouteResetWrapper(props: Omit<P, "pathname">) {
    const { pathname } = useLocation();
    // React.createElement (not <Boundary/>) because `Boundary` is a function
    // parameter — the check:no-undef-jsx static guard only recognizes
    // module-level/imported/destructured JSX bindings, not HOC params.
    return React.createElement(Boundary, { ...(props as P), pathname });
  };
}
