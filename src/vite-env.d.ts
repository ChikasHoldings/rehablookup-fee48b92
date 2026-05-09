/// <reference types="vite/client" />

// GA4 gtag global — injected by the <script> tag in index.html
interface Window {
  gtag: (
    command: "config" | "event" | "js" | "set",
    targetId: string | Date,
    params?: Record<string, unknown>
  ) => void;
  dataLayer: unknown[];
}
