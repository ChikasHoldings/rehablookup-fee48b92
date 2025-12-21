import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPerformanceOptimizations } from "./lib/performanceUtils";
import { initSecurity } from "./lib/httpsRedirect";

// Suppress benign React Router ref warnings
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === "string" &&
    args[0].includes("Function components cannot be given refs")
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

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

// Mark root as loaded to trigger CSS transition
const root = document.getElementById("root");
if (root) {
  root.classList.remove("js-loading");
  root.classList.add("js-loaded");
}

createRoot(document.getElementById("root")!).render(<App />);
