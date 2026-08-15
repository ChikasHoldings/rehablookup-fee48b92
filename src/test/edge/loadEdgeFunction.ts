/**
 * Loader that makes `supabase/functions/<slug>/index.ts` executable from
 * Vitest.
 *
 * Supabase edge functions register their handler with `Deno.serve(handler)` at
 * module scope. We install a `Deno` global that records the handler instead of
 * binding a socket, import the module (remote specifiers are redirected to test
 * doubles by the `deno-edge-specifiers` Vite plugin in vitest.config.ts), and
 * hand the real handler back so tests can invoke it with a real `Request` and
 * assert on the real `Response`.
 *
 * The function body under test is genuine production code — only its network
 * collaborators (Supabase, Stripe, Resend) are substituted.
 */

interface DenoGlobalShape {
  serve: (handler: unknown) => { finished: Promise<void> };
  env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    toObject(): Record<string, string>;
  };
  readTextFile(path: string | URL): Promise<string>;
}

export type EdgeHandler = (req: Request) => Promise<Response> | Response;

const env: Record<string, string> = {};
const handlers = new Map<string, EdgeHandler>();
let currentSlug: string | null = null;

function installDenoGlobal(): void {
  const g = globalThis as unknown as { Deno?: DenoGlobalShape };
  if (g.Deno) return;
  g.Deno = {
    serve: (handler: unknown) => {
      const fn =
        typeof handler === "function"
          ? (handler as EdgeHandler)
          : ((handler as { fetch: EdgeHandler }).fetch as EdgeHandler);
      if (currentSlug) handlers.set(currentSlug, fn);
      return { finished: Promise.resolve() };
    },
    env: {
      get: (key: string) => env[key],
      set: (key: string, value: string) => {
        env[key] = value;
      },
      toObject: () => ({ ...env }),
    },
    readTextFile: async (path: string | URL) => {
      const { readFile } = await import("node:fs/promises");
      return readFile(typeof path === "string" ? path : path, "utf8");
    },
  };
}

/** Replace the environment visible to `Deno.env.get` inside edge functions. */
export function setEdgeEnv(next: Record<string, string>): void {
  for (const key of Object.keys(env)) delete env[key];
  Object.assign(env, next);
}

// Vite needs a static glob to know which modules may be imported dynamically.
const edgeModules = import.meta.glob("../../../supabase/functions/*/index.ts");

/**
 * Import an edge function and return the handler it registered with
 * `Deno.serve`. Modules are cached by the ESM loader, so the handler is
 * captured once; environment values are read per-request inside the handler,
 * so `setEdgeEnv` still takes effect between tests.
 */
export async function loadEdgeFunction(slug: string): Promise<EdgeHandler> {
  installDenoGlobal();
  const cached = handlers.get(slug);
  if (cached) return cached;

  const key = `../../../supabase/functions/${slug}/index.ts`;
  const importer = edgeModules[key];
  if (!importer) {
    throw new Error(
      `[test] no edge function module found for slug "${slug}". Known slugs: ` +
        Object.keys(edgeModules).length,
    );
  }
  currentSlug = slug;
  try {
    await importer();
  } finally {
    currentSlug = null;
  }
  const handler = handlers.get(slug);
  if (!handler) {
    throw new Error(`[test] "${slug}" did not register a handler via Deno.serve`);
  }
  return handler;
}

/** Convenience: build a POST Request the way the supabase-js client would. */
export function edgeRequest(
  body: unknown,
  opts: { headers?: Record<string, string>; method?: string; url?: string } = {},
): Request {
  return new Request(opts.url ?? "https://edge.test/fn", {
    method: opts.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers ?? {}),
    },
    body: opts.method === "GET" ? undefined : JSON.stringify(body),
  });
}
