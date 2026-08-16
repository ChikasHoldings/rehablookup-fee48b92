/**
 * Deterministic in-process harness for Supabase Edge Functions.
 *
 * Why this exists
 * ---------------
 * `supabase/functions/**` are Deno modules: they import from `https://esm.sh/…`
 * and call `Deno.serve` / `Deno.env`. That makes them unreachable from the
 * project's vitest suite, so the routing behaviour they implement has
 * historically only been coverable by source-grep contract tests — which
 * cannot prove *ordering* (e.g. "entitlement is resolved before any PII
 * lookup") or *absence of side effects* (e.g. "no advisor was queried").
 *
 * This harness loads the real, unmodified function source, strips only its
 * remote import statements (injecting stubs for `createClient` and `Resend`
 * in their place), transpiles it with the esbuild instance Vite already
 * depends on, and evaluates it with a stubbed `Deno` global that captures
 * the handler instead of starting a server. Requests are then dispatched
 * straight to that handler.
 *
 * Nothing here touches the network, the filesystem beyond reading the source,
 * or any Supabase project. Every dependency is a recording stub, so tests can
 * assert exactly which tables were read, which rows were written, which RPCs
 * ran, and in what order.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../../..");

export type EdgeHandler = (req: Request) => Response | Promise<Response>;

/** A single recorded interaction with the Supabase client stub. */
export interface RecordedCall {
  kind: "select" | "insert" | "update" | "rpc" | "invoke";
  target: string;
  payload?: unknown;
  filters?: Array<{ method: string; args: unknown[] }>;
}

export interface SupabaseStubOptions {
  /**
   * Resolver for read chains. Receives the table and the filter methods that
   * were applied, and returns `{ data, error, count }`.
   */
  onSelect?: (
    table: string,
    filters: Array<{ method: string; args: unknown[] }>,
  ) => { data?: unknown; error?: unknown; count?: number };
  /** Resolver for `.insert(...)`. */
  onInsert?: (table: string, payload: unknown) => { data?: unknown; error?: unknown };
  /** Resolver for `.rpc(name, args)`. */
  onRpc?: (name: string, args: unknown) => { data?: unknown; error?: unknown };
  /** Resolver for `supabase.functions.invoke(name, opts)`. */
  onInvoke?: (name: string, opts: unknown) => { data?: unknown; error?: unknown };
}

export interface SupabaseStub {
  client: unknown;
  calls: RecordedCall[];
  /** Tables that had a row inserted into them. */
  insertedTables: () => string[];
  /** Tables that were read from. */
  selectedTables: () => string[];
  /** Names of every RPC invoked, in order. */
  rpcNames: () => string[];
  /** Names of every edge function invoked via functions.invoke. */
  invokedFunctions: () => string[];
}

/**
 * Builds a chainable, recording stand-in for `@supabase/supabase-js`.
 *
 * The chain supports the PostgREST builder surface these functions actually
 * use (`select/insert/update/eq/neq/gte/lte/in/is/not/order/limit/single/
 * maybeSingle`) and is thenable, so both `await chain` (count queries) and
 * `await chain.maybeSingle()` resolve.
 */
export function createSupabaseStub(options: SupabaseStubOptions = {}): SupabaseStub {
  const calls: RecordedCall[] = [];

  const makeChain = (table: string) => {
    const filters: Array<{ method: string; args: unknown[] }> = [];
    let mode: "select" | "insert" | "update" = "select";
    let payload: unknown;

    const settle = () => {
      if (mode === "insert") {
        const res = options.onInsert?.(table, payload) ?? {};
        return { data: res.data ?? null, error: res.error ?? null };
      }
      if (mode === "update") {
        return { data: null, error: null };
      }
      const res = options.onSelect?.(table, filters) ?? {};
      return {
        data: res.data ?? null,
        error: res.error ?? null,
        count: res.count ?? 0,
      };
    };

    const chain: Record<string, unknown> = {};

    const passthrough = [
      "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not",
      "order", "limit", "range", "match", "filter", "or", "contains",
    ];
    for (const method of passthrough) {
      chain[method] = (...args: unknown[]) => {
        filters.push({ method, args });
        return chain;
      };
    }

    chain.select = (...args: unknown[]) => {
      if (mode === "select") {
        filters.push({ method: "select", args });
        calls.push({ kind: "select", target: table, filters });
      }
      return chain;
    };

    chain.insert = (rows: unknown) => {
      mode = "insert";
      payload = rows;
      calls.push({ kind: "insert", target: table, payload: rows });
      return chain;
    };

    chain.update = (patch: unknown) => {
      mode = "update";
      payload = patch;
      calls.push({ kind: "update", target: table, payload: patch });
      return chain;
    };

    chain.upsert = (rows: unknown) => {
      mode = "insert";
      payload = rows;
      calls.push({ kind: "insert", target: table, payload: rows });
      return chain;
    };

    chain.single = async () => settle();
    chain.maybeSingle = async () => settle();
    chain.then = (
      onFulfilled: (v: unknown) => unknown,
      onRejected?: (e: unknown) => unknown,
    ) => Promise.resolve(settle()).then(onFulfilled, onRejected);

    return chain;
  };

  const client = {
    from: (table: string) => makeChain(table),
    rpc: async (name: string, args: unknown) => {
      calls.push({ kind: "rpc", target: name, payload: args });
      const res = options.onRpc?.(name, args) ?? {};
      return { data: res.data ?? null, error: res.error ?? null };
    },
    functions: {
      invoke: async (name: string, opts: unknown) => {
        calls.push({ kind: "invoke", target: name, payload: opts });
        const res = options.onInvoke?.(name, opts) ?? {};
        return { data: res.data ?? null, error: res.error ?? null };
      },
    },
  };

  return {
    client,
    calls,
    insertedTables: () => calls.filter((c) => c.kind === "insert").map((c) => c.target),
    selectedTables: () => calls.filter((c) => c.kind === "select").map((c) => c.target),
    rpcNames: () => calls.filter((c) => c.kind === "rpc").map((c) => c.target),
    invokedFunctions: () => calls.filter((c) => c.kind === "invoke").map((c) => c.target),
  };
}

export interface ResendStubOptions {
  /**
   * Outcome resolver for a single `resend.emails.send(...)` call. Return
   * `{ error: { message } }` to model a Resend rejection, or throw to model a
   * transport-level failure. Omit (or return nothing) for the default accept.
   * Every attempt is still recorded in `sent`, so retry counts stay visible.
   */
  onSend?: (
    payload: Record<string, unknown>,
    attempt: number,
  ) => { data?: unknown; error?: unknown } | void;
}

/** Recording stub for the Resend SDK. */
export function createResendStub(options: ResendStubOptions = {}) {
  const sent: Array<Record<string, unknown>> = [];
  class ResendStub {
    emails = {
      send: async (payload: Record<string, unknown>) => {
        sent.push(payload);
        const outcome = options.onSend?.(payload, sent.length);
        if (outcome) return { data: outcome.data ?? null, error: outcome.error ?? null };
        return { data: { id: `email_${sent.length}` }, error: null };
      },
    };
  }
  return { ResendStub, sent };
}

/** Strips the Deno-only remote import statements; their bindings are injected. */
function stripRemoteImports(source: string): string {
  return source.replace(
    /^import\s+[\s\S]*?from\s+["']https:\/\/[^"']+["'];?[ \t]*$/gm,
    "",
  );
}

export interface LoadEdgeHandlerResult {
  handler: EdgeHandler;
  supabase: SupabaseStub;
  emails: Array<Record<string, unknown>>;
  /** Everything the function wrote to console during the run. */
  logs: string[];
}

/**
 * Loads an edge function's real handler with stubbed dependencies.
 *
 * @param relPath repo-relative path, e.g. "supabase/functions/x/index.ts"
 */
export async function loadEdgeHandler(
  relPath: string,
  supabaseOptions: SupabaseStubOptions = {},
  resendOptions: ResendStubOptions = {},
): Promise<LoadEdgeHandlerResult> {
  const raw = readFileSync(resolve(REPO_ROOT, relPath), "utf8");
  const stripped = stripRemoteImports(raw);

  const { transformWithEsbuild } = await import("vite");
  const { code } = await transformWithEsbuild(stripped, "edge-function.ts", {
    loader: "ts",
    format: "cjs",
    target: "es2022",
  });

  const supabase = createSupabaseStub(supabaseOptions);
  const { ResendStub, sent } = createResendStub(resendOptions);

  let captured: EdgeHandler | null = null;
  const denoStub = {
    env: {
      get: (key: string) =>
        ({
          SUPABASE_URL: "https://stub.supabase.local",
          SUPABASE_SERVICE_ROLE_KEY: "stub_service_role_key",
          SUPABASE_ANON_KEY: "stub_anon_key",
          RESEND_API_KEY: "stub_resend_key",
        })[key],
    },
    serve: (handler: EdgeHandler) => {
      captured = handler;
      return { finished: Promise.resolve(), shutdown: async () => {}, ref() {}, unref() {} };
    },
  };

  const logs: string[] = [];
  const record = (...args: unknown[]) => {
    logs.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
  };
  const consoleStub = { log: record, warn: record, error: record, info: record, debug: record };

  // No network: any stray fetch is a test failure, not a silent live call.
  const fetchStub = async () => {
    throw new Error("edge harness: unexpected network fetch");
  };

  const moduleObj = { exports: {} as Record<string, unknown> };
  const factory = new Function(
    "module",
    "exports",
    "require",
    "createClient",
    "Resend",
    "Deno",
    "console",
    "fetch",
    code,
  );

  factory(
    moduleObj,
    moduleObj.exports,
    () => {
      throw new Error("edge harness: unexpected require()");
    },
    () => supabase.client,
    ResendStub,
    denoStub,
    consoleStub,
    fetchStub,
  );

  if (!captured) {
    throw new Error(`edge harness: ${relPath} never called Deno.serve`);
  }

  return { handler: captured, supabase, emails: sent, logs };
}

/** Convenience: POST a JSON body to a loaded handler. */
export async function postJson(
  handler: EdgeHandler,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await handler(
    new Request("https://stub.functions.local/submit-qualified-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { _raw: text };
  }
  return { status: res.status, json };
}
