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
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React vendor chunk
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI library chunk
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-popover', '@radix-ui/react-tabs', '@radix-ui/react-tooltip'],
          // Data fetching chunk
          'vendor-query': ['@tanstack/react-query', '@supabase/supabase-js'],
          // Charts chunk (only loaded when needed)
          'vendor-charts': ['recharts'],
          // Animation chunk
          'vendor-motion': ['framer-motion'],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 500,
  },
}));
