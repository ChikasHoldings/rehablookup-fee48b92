import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Single source of truth for the GA4 measurement ID exposed to the SPA via
// index.html. Mirrors scripts/_ga.mjs which is used by the SEO generators.
// Set VITE_GA_MEASUREMENT_ID on Vercel (Project Settings → Environment
// Variables) to rotate; the fallback below keeps local dev / unconfigured
// CI working with the current production tag.
const GA_MEASUREMENT_ID = process.env.VITE_GA_MEASUREMENT_ID?.trim() || "G-MM5K8398LY";

// Inject the GA ID into index.html at build time by replacing the
// `%VITE_GA_MEASUREMENT_ID%` placeholder. We do this in a plugin rather
// than relying on Vite's built-in `%VITE_FOO%` HTML substitution so that
// the fallback above (rather than the literal string) is used when the
// env var is missing — that way an unset env var degrades to "still
// tracking" instead of "GA broken because the literal substitution
// leaked into the URL".
const injectGaId: PluginOption = {
  name: "inject-ga-measurement-id",
  transformIndexHtml(html: string) {
    return html.replace(/%VITE_GA_MEASUREMENT_ID%/g, GA_MEASUREMENT_ID);
  },
};

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), injectGaId],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  build: {
    // Target modern browsers for smaller bundles
    target: "es2020",
    // Enable minification
    minify: "esbuild",
    rollupOptions: {
      output: {
        // IMPORTANT: Do NOT use manualChunks with React + Radix UI.
        //
        // Root cause of the blank-page bug:
        //   Radix UI components (e.g. @radix-ui/react-dialog) import React
        //   directly. When React is placed in a separate 'vendor-react' chunk
        //   and Radix UI in 'vendor-ui', Rollup creates a circular module
        //   dependency: vendor-react imports vendor-ui (for router/react-dom
        //   peer deps), and vendor-ui imports vendor-react (for React itself).
        //   At runtime the browser resolves one chunk before the other, leaving
        //   React as `undefined` when createContext() is called — which throws
        //   a TypeError that prevents React from ever mounting, resulting in a
        //   completely blank page.
        //
        // Fix: let Rollup's automatic chunk-splitting algorithm decide how to
        //   group modules. It correctly tracks the dependency graph and never
        //   produces circular chunk imports.
      },
    },
    // chunkSizeWarningLimit is set above the largest legitimate chunk
    // (locationSeoData / countySeoData / homepage shell). These are
    // already split out by Vite's automatic chunking and only load on
    // pages that need them. Bumping to 1000 silences the noise.
    chunkSizeWarningLimit: 1000,
    // Disable source maps in production for smaller bundles & faster load
    sourcemap: false,
    // CSS code splitting for smaller initial CSS
    cssCodeSplit: true,
    // Enable CSS minification
    cssMinify: true,
  },
  // Optimize deps for faster cold starts
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
    ],
  },
}));
