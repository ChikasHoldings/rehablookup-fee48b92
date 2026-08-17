import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPerformanceOptimizations } from "./lib/performanceUtils";
import { initSecurity } from "./lib/httpsRedirect";
import { warmQueryCache } from "./lib/queryClient";
import { RetiredSeekerRouteGate } from "./components/RetiredSeekerRouteGate";

// Initialize security (HTTPS enforcement)
initSecurity();

// Lazy-load Sentry to avoid blocking initial render (231KB).
// DSN comes from VITE_SENTRY_DSN (set on Vercel + locally).
// Release tag is the git SHA, injected by the syncSentryRelease plugin
// in vite.config.ts from VERCEL_GIT_COMMIT_SHA at build time. Falls back
// to "unknown-dev" for local dev so Sentry doesn't reject the event.
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  requestIdleCallback(() => {
    import("@sentry/react").then((Sentry) => {
      Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        release: import.meta.env.VITE_SENTRY_RELEASE || "unknown-dev",
        integrations: [],
        tracesSampleRate: 0.1,
        environment: import.meta.env.MODE,
        enabled: true,
      });
    });
  }, { timeout: 3000 });
}

// Initialize performance optimizations
initPerformanceOptimizations();

// Render app
// Remove SSR skeleton before React paints
const skeleton = document.getElementById("ssr-skeleton");
if (skeleton) skeleton.remove();

createRoot(document.getElementById("root")!).render(
  <RetiredSeekerRouteGate>
    <App />
  </RetiredSeekerRouteGate>,
);

// Warm up query cache after initial render for faster navigations
if (document.readyState === "complete") {
  warmQueryCache();
} else {
  window.addEventListener("load", warmQueryCache, { once: true });
}
