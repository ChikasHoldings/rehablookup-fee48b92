import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize Sentry for error tracking
Sentry.init({
  dsn: "https://abdc24cee3c128456792112215a29cf6@o4510548371046400.ingest.us.sentry.io/4510548375961600",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: 0.1, // Capture 10% of transactions for performance monitoring
  // Session Replay
  replaysSessionSampleRate: 0.1, // Sample 10% of sessions
  replaysOnErrorSampleRate: 1.0, // Sample 100% of sessions with errors
  // Environment
  environment: import.meta.env.MODE,
});

createRoot(document.getElementById("root")!).render(<App />);
