# Database migrations — READ THIS before running any `supabase db` command

> **Status:** The production ledger was **reconciled to this directory on
> 2026-06-18** — every migration file here now has a matching row in
> `supabase_migrations.schema_migrations`, so `supabase db push` is a no-op
> against production. See "Reconciliation" below. **To keep it that way, follow
> the go-forward rule** — applying a new migration through the MCP/dashboard
> without also recording its file version will re-introduce drift.

## Go-forward rule (do this for every new migration)

Pick **one** of:

- **Preferred — `supabase db push`** (needs the CLI + DB credentials): records the
  row under the file's own version, so the ledger stays authoritative
  automatically. Run `supabase db diff` first to confirm no unexpected gap.
- **MCP / dashboard** (current common path): after applying, **also insert the
  ledger row under the file version**, or the file will look "unapplied" to a
  future `db push`:
  ```sql
  insert into supabase_migrations.schema_migrations (version, name)
  values ('<14-digit file version>', '<file name w/o version or .sql>')
  on conflict (version) do nothing;
  ```
  (MCP `apply_migration` records under the *apply-time* timestamp, not the file
  version — that mismatch is exactly what caused the original drift.)

Always write migrations **idempotently** (`create or replace`, `… if [not]
exists`, guarded `do $$` blocks) so a re-run can never destroy data. One historic
migration (`20260715…drop_pay_per_admission_residue`) contained an unconditional
`DELETE FROM concierge_inquiries` — reconciling the ledger is what now prevents
`db push` from ever replaying it. Keep versions **unique** (duplicates break the CLI).

## Reconciliation (2026-06-18) — what was done & how to roll back

The directory had diverged badly from the ledger: 499 file versions vs 274 ledger
rows, overlapping on only 7. The directory is a re-authored history (early files
keep original UUID names; later files were given semantic names + synthetic future
dates), and MCP-applied migrations had been recorded under apply-time versions.

Before reconciling, every migration dated after the present (the only plausibly
unapplied set) was verified applied in prod — 112 by ledger-name match, the
remaining 4 by checking their actual schema/data effects. Then:

1. The full ledger was backed up to
   **`supabase_migrations.schema_migrations_backup_20260618`** (274 rows).
2. The 2 duplicate-version collisions were de-duplicated (see git history:
   `placement_hardening_fixes` → `…170001`, `sms_tcpa_opt_out_columns` → `…000001`).
3. A row `(version, name)` was inserted for every file version not already present
   (`where not exists`, non-destructive — existing rows and their `statements` were
   untouched). Ledger went 274 → 766.

The 267 original May-2026 baseline rows (semantic names under apply-time versions,
no matching file) were intentionally **left in place** as a truthful record of what
was applied under the original names. They are harmless to `db push` (it ignores
remote-only entries). To make the ledger *exactly* mirror the directory, delete
those orphans — optional cleanup, not required.

**Rollback:** the reconcile is reversible from the backup:
```sql
begin;
delete from supabase_migrations.schema_migrations;
insert into supabase_migrations.schema_migrations
  select * from supabase_migrations.schema_migrations_backup_20260618;
commit;
```
(Drop the backup table once you're confident: `drop table
supabase_migrations.schema_migrations_backup_20260618;`)
