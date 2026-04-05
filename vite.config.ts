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
        manualChunks: {
          // Core React vendor chunk - loaded immediately
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI library chunk - loaded on first interaction
          'vendor-ui': [
            '@radix-ui/react-dialog', 
            '@radix-ui/react-dropdown-menu', 
            '@radix-ui/react-popover', 
            '@radix-ui/react-tabs', 
            '@radix-ui/react-tooltip',
            '@radix-ui/react-select',
            '@radix-ui/react-accordion',
          ],
          // Data fetching chunk
          'vendor-query': ['@tanstack/react-query', '@supabase/supabase-js'],
          // Form handling (loaded on form pages)
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Stripe (only loaded when payment modal opens)
          'vendor-stripe': ['@stripe/stripe-js', '@stripe/react-stripe-js'],
          // NOTE: recharts, framer-motion are NOT in manual chunks
          // so they naturally code-split and only load with the lazy routes that use them
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 500,
    // Enable source maps for production debugging
    sourcemap: true,
    // CSS code splitting for smaller initial CSS
    cssCodeSplit: true,
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
