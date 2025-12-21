import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import prerender from "vite-plugin-prerender";

// Critical routes to pre-render for SEO
const routesToPrerender = [
  "/",
  "/about",
  "/contact",
  "/faq",
  "/how-it-works",
  "/insurance",
  "/locations",
  "/privacy-policy",
  "/terms-of-service",
  "/resources",
  "/rehab-centers",
  "/request-help",
  "/treatment-types",
  // Treatment type pages
  "/treatment-types/alcohol-rehabilitation",
  "/treatment-types/drug-addiction-treatment",
  "/treatment-types/detox-programs",
  "/treatment-types/residential-inpatient",
  "/treatment-types/outpatient-programs",
  "/treatment-types/dual-diagnosis-treatment",
  "/treatment-types/holistic-therapy",
  // Near-me pages
  "/drug-rehab-near-me",
  "/alcohol-rehab-near-me",
  "/detox-near-me",
  "/inpatient-rehab-near-me",
  "/outpatient-near-me",
  "/dual-diagnosis-near-me",
  // Provider pages
  "/for-providers",
  "/provider-resources",
  "/provider-faq",
];

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode === "production" &&
      prerender({
        staticDir: path.resolve(__dirname, "dist"),
        routes: routesToPrerender,
        renderer: {
          renderAfterTime: 3000, // Wait for React to render
        },
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
