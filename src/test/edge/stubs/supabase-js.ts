/**
 * Test double for `https://esm.sh/@supabase/supabase-js`.
 *
 * Edge functions call `createClient(url, key)` at request time. Tests register
 * the client instance they want handed back via `__setCreateClient` — normally
 * the in-memory PostgREST-alike from `src/test/edge/fakeSupabase.ts`.
 *
 * This stubs the *network collaborator*, not the code under test: the edge
 * function's own routing, validation, query construction and response shaping
 * all execute for real.
 */
export type CreateClientImpl = (
  url: string,
  key: string,
  opts?: unknown,
) => unknown;

let impl: CreateClientImpl | null = null;

export function __setCreateClient(f: CreateClientImpl | null): void {
  impl = f;
}

export function createClient(url: string, key: string, opts?: unknown): unknown {
  if (!impl) {
    throw new Error(
      "[test] supabase createClient() was called but no test double is registered. " +
        "Call __setCreateClient(...) (or installFakeSupabase(...)) before invoking the handler.",
    );
  }
  return impl(url, key, opts);
}

/** Type-only re-export so `import { SupabaseClient } from "..."` type positions resolve. */
export type SupabaseClient = unknown;
