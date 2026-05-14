import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
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
