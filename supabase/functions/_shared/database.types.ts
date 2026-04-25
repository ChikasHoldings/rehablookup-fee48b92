/**
 * Re-exports the auto-generated `Database` type from the project so that
 * edge functions can construct strongly-typed Supabase clients without
 * duplicating ~6,000 lines of generated table definitions.
 *
 * Why a re-export shim?
 * ─────────────────────
 * • `src/integrations/supabase/types.ts` is the single source of truth — it
 *   is regenerated automatically whenever the schema changes.
 * • Edge functions run under Deno which can resolve relative paths outside
 *   the `supabase/functions/` directory at runtime, so we point directly at
 *   the generated file. No copy/paste, no drift.
 * • The shim lives in `_shared/` so consumers don't need to know the exact
 *   path — they just `import type { Database } from "../_shared/database.types.ts"`.
 *
 * Do NOT add hand-written table types here. If a new table is needed, run
 * the type regeneration step and it will appear automatically.
 */

// Deno resolves this relative path at function bundle time.
// The `src/` directory is part of the project tree shipped to the function
// runtime via the Supabase CLI, so this import works in both local dev and
// production deploys.
export type { Database, Json } from "../../../src/integrations/supabase/types.ts";
