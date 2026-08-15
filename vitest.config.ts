import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

/**
 * Resolve the Deno-style remote specifiers used by `supabase/functions/**`
 * so those edge functions can be imported (and therefore functionally
 * exercised) from Vitest.
 *
 * Deno edge functions import their dependencies by URL
 * (`https://esm.sh/stripe@18.5.0?target=denonext`). Node/Vite cannot fetch
 * those, so without this plugin the only way to "test" an edge function is to
 * grep its source — which proves nothing about behaviour.
 *
 * Mapping policy:
 *   - `zod`                → the REAL zod package, so request validation is
 *                            genuinely executed rather than faked.
 *   - `@supabase/supabase-js`, `stripe`, `resend` → local test doubles. These
 *                            are network clients; stubbing them is the standard
 *                            "mock the collaborator, not the unit under test"
 *                            boundary. The edge-function code itself is real.
 *   - `jsr:` / `deno.land/std` type-only or assertion imports → inert stub.
 *
 * NOTE: this plugin only rewrites module resolution for tests. It has no
 * effect on the deployed Deno runtime, which continues to fetch the real URLs.
 */
function denoEdgeSpecifiers() {
  const stub = (f: string) => path.resolve(__dirname, "./src/test/edge/stubs", f);
  return {
    name: "deno-edge-specifiers",
    enforce: "pre" as const,
    resolveId(source: string) {
      if (source.startsWith("jsr:")) return stub("empty.ts");
      if (source.startsWith("https://deno.land/")) return stub("empty.ts");
      if (!source.startsWith("https://esm.sh/")) return null;
      if (source.includes("@supabase/supabase-js")) return stub("supabase-js.ts");
      if (source.includes("/stripe@")) return stub("stripe.ts");
      if (source.includes("/resend@")) return stub("resend.ts");
      if (source.includes("/zod@")) return "zod";
      return stub("empty.ts");
    },
  };
}

export default defineConfig({
  plugins: [denoEdgeSpecifiers(), react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Playwright specs live in tests/visual/ and run via `npx playwright test`
    exclude: ["node_modules", "dist", "tests/visual/**"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
