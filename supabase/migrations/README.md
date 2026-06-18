# Database migrations — READ THIS before running any `supabase db` command

> **TL;DR:** Migrations are applied **out-of-band** (Supabase MCP `apply_migration`
> or the dashboard SQL editor), **not** via `supabase db push`. The migration
> **ledger does not correspond to the filenames in this directory.** Do **not**
> run `supabase db push`, `supabase db reset`, or `supabase migration up`
> against production without first completing the baseline described below — it
> would try to re-apply ~490 already-applied migrations and error out.

## Why the ledger and these files don't match

The production ledger (`supabase_migrations.schema_migrations`) and this directory
diverged some time ago and have kept diverging:

| | Production ledger | This `migrations/` directory |
|---|---|---|
| Entry count | **274** | **497 distinct versions** (498 files) |
| Earliest entry | `20260512` (a **May-2026 baseline**) | `20251214` (Dec 2025) |
| Naming | semantic only | early files keep original UUID names; later files were re-authored with semantic names + **synthetic future dates** (≈117 dated after the present) |
| Overlap with the other side | — | only **7 versions** in common |

Two independent causes:

1. **The directory was re-authored / squashed.** Filenames (both the version
   prefix *and* the name) were regenerated and no longer line up with what was
   actually recorded as applied. Many files carry future dates that are purely
   cosmetic — their migrations were applied months earlier (their names appear
   in the May-2026 ledger).
2. **`apply_migration` records under apply-time versions.** When a migration is
   applied through the Supabase MCP, the ledger row's `version` is the *moment it
   ran*, not the file's version prefix. So even brand-new migrations added here
   won't match their ledger row. (Example: the `20260829*` security fixes in this
   directory are recorded in the ledger as `20260618*`.)

None of this affects the running database — the live schema is healthy and is the
de-facto source of truth. The only hazard is the CLI migration commands.

## How to apply a new migration

1. Add the `.sql` file here using the next `YYYYMMDDHHMMSS_descriptive_name.sql`
   version (keep versions **unique** — duplicates break the CLI).
2. Apply it via **Supabase MCP `apply_migration`** (preferred) or the dashboard
   SQL editor. Write it **idempotently** (`create or replace`, `create … if not
   exists`, `drop … if exists`, guarded `alter`) so a re-run is harmless.
3. Commit the file. Do **not** expect `supabase db push` to apply it.

## If you ever want to adopt CLI-managed migrations (`db push`)

This requires a deliberate baseline in a maintenance window, **not** an ad-hoc push:

1. `supabase db diff` against production and confirm there is **no** schema gap
   (i.e. every migration in this directory is already reflected in prod). Resolve
   any genuine gap first.
2. Mark every current file as already-applied so push won't re-run it:
   `supabase migration repair --status applied <version>` for each version here
   (and `--status reverted` for ledger versions that no longer have a file).
3. Only then is `supabase db push` safe; from that point apply exclusively via the
   CLI to keep the ledger authoritative.

Until that baseline is done, treat the ledger as non-authoritative and apply
out-of-band as above.
