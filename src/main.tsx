import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPerformanceOptimizations } from "./lib/performanceUtils";
import { initSecurity } from "./lib/httpsRedirect";
import { warmQueryCache } from "./lib/queryClient";

// Initialize security (HTTPS enforcement)
initSecurity();

// Initialize Sentry for error tracking (before React renders)
Sentry.init({
  dsn: "https://abdc24cee3c128456792112215a29cf6@o4510548371046400.ingest.us.sentry.io/4510548375961600",
  integrations: [],
  // Performance Monitoring
  tracesSampleRate: 0.1,
  // Environment
  environment: import.meta.env.MODE,
  // Only enable in production
  enabled: import.meta.env.PROD,
});

// Initialize performance optimizations
initPerformanceOptimizations();

// Root is ready - no opacity transition needed

// Render app
createRoot(document.getElementById("root")!).render(<App />);

// Warm up query cache after initial render for faster navigations
if (document.readyState === "complete") {
  warmQueryCache();
} else {
  window.addEventListener("load", warmQueryCache, { once: true });
}
