import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPerformanceOptimizations } from "./lib/performanceUtils";
import { initSecurity } from "./lib/httpsRedirect";
import { warmQueryCache } from "./lib/queryClient";

// Initialize security (HTTPS enforcement)
initSecurity();

// Lazy-load Sentry to avoid blocking initial render (231KB)
if (import.meta.env.PROD) {
  requestIdleCallback(() => {
    import("@sentry/react").then((Sentry) => {
      Sentry.init({
        dsn: "https://abdc24cee3c128456792112215a29cf6@o4510548371046400.ingest.us.sentry.io/4510548375961600",
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
createRoot(document.getElementById("root")!).render(<App />);

// Warm up query cache after initial render for faster navigations
if (document.readyState === "complete") {
  warmQueryCache();
} else {
  window.addEventListener("load", warmQueryCache, { once: true });
}
