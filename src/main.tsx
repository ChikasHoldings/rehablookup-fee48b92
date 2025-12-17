import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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

createRoot(document.getElementById("root")!).render(<App />);
