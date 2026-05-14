# SAMHSA facility import

End-to-end pipeline for importing SAMHSA listings into the RehabLookup
directory. The pieces below are wired up and deployed; you bring the data.

## Architecture

```
                 ┌────────────────────────────────────────────┐
                 │  Your importer (CLI / scheduled cron / one- │
                 │  shot script): scrape SAMHSA, normalize,    │
                 │  POST batches of ≤500 facilities.           │
                 └─────────────────┬───────────────────────────┘
                                   │ POST /functions/v1/samhsa-import-batch
                                   │ Authorization: Bearer <SERVICE_ROLE_KEY>
                                   ▼
   ┌──────────────────────────────────────────────────────────┐
   │  samhsa-import-batch (edge function, deployed)           │
   │   • Validates each row (required fields, length caps)    │
   │   • Idempotent upsert: looks up existing row by          │
   │     (data_source='samhsa_import', samhsa_facility_id)    │
   │   • Re-runs are safe — same SAMHSA ID never duplicates   │
   │   • Fans out to side tables: facility_services,          │
   │     facility_insurance, facility_age_groups,             │
   │     facility_accreditations                              │
   │   • Generates URL slug via generate_facility_slug() RPC  │
   │     with collision suffix (-2, -3, …)                    │
   │   • Returns per-row inserted/updated/error result        │
   └──────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                ┌──────────────────────────────────┐
                │  Vercel build (next deploy)      │
                │   • generate-seo-html.mjs        │
                │   • generate-county-pages.mjs    │
                │   • generate-facility-profiles…  │
                │  All read live facility data via │
                │  scripts/_facility-data.mjs and  │
                │  inject lists into static HTML.  │
                └──────────────────────────────────┘
```

## Request body

```jsonc
{
  "batch_id": "samhsa-2026-05-14-001",   // optional — included in logs
  "facilities": [
    {
      // REQUIRED
      "samhsa_facility_id": "1-1234567890-1",  // SAMHSA's own ID, used as the upsert key
      "name": "Sunrise Recovery Center",
      "facility_type": "Substance Abuse Treatment",
      "address": "123 Main St",
      "city": "Los Angeles",
      "state": "California",                    // full state name, not abbreviation
      "zip_code": "90001",

      // OPTIONAL
      "phone": "+13105551234",
      "email": "intake@example.com",            // rare in SAMHSA data
      "website": "https://example.com",
      "description": "…short description…",     // ≤4000 chars
      "year_established": 1998,                 // integer
      "gender_served": "All",                   // "All" | "Male" | "Female" | any phrasing — normalized server-side

      // OPTIONAL — fan out to side tables
      "services":       ["Outpatient", "Detox", "Methadone Maintenance"],
      "insurance":      ["Medicare", "Medicaid", "Private"],
      "age_groups":     ["Adult", "Adolescent"],
      "accreditations": ["SAMHSA", "CARF"]
    }
    // …up to 500 per request
  ]
}
```

## Response body

```jsonc
{
  "batch_id": "samhsa-2026-05-14-001",
  "processed": 500,
  "summary": { "inserted": 487, "updated": 12, "errors": 1 },
  "results": [
    { "samhsa_facility_id": "1-…", "status": "inserted", "facility_id": "uuid-…" },
    { "samhsa_facility_id": "2-…", "status": "updated",  "facility_id": "uuid-…" },
    { "samhsa_facility_id": "3-…", "status": "error",    "error": "required field \"city\" is empty" }
  ]
}
```

## Auth

Service-role JWT only:

```
Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
```

The function rejects everything else with **401**. It is intentionally not
callable from a browser, the React app, or anonymous edge contexts —
this is a back-office mass-mutation endpoint.

## Calling it

### From a one-shot script

```bash
curl -X POST \
  "https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/samhsa-import-batch" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  --data @batch.json
```

### From Node

```js
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function importBatch(facilities) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/samhsa-import-batch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      batch_id: `samhsa-${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}`,
      facilities,
    }),
  });
  if (!res.ok) throw new Error(`import failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// Chunk a 17k-facility SAMHSA dump into batches of 500 and stream them in
for (let i = 0; i < allFacilities.length; i += 500) {
  const chunk = allFacilities.slice(i, i + 500);
  const result = await importBatch(chunk);
  console.log(`batch ${i / 500 + 1}: inserted=${result.summary.inserted} updated=${result.summary.updated} errors=${result.summary.errors}`);
}
```

## What happens after import

1. Trigger a Vercel rebuild (push any commit, or use Vercel's "Redeploy" button).
2. `generate-seo-html.mjs` and `generate-county-pages.mjs` pull the live
   facility set via `scripts/_facility-data.mjs` (one DB query per build,
   cached in-process) and inject HTML lists into the prerendered pages.
3. Static HTML now contains the actual facility names, locations, and
   `/center/<slug>` links for Googlebot's first-pass crawl.
4. Per-facility profile pages (`/center/<slug>`) auto-generate from
   `generate-facility-profiles-html.mjs`, which has always queried the DB.
5. Sitemaps update via `generate-sitemaps.mjs` (queries the
   `sitemap-facilities` edge function).

## Generators currently injecting facility data

| Generator | Page type | Status |
|---|---|---|
| `generate-facility-profiles-html.mjs` | `/center/<slug>` profile pages | ✅ already (since before this work) |
| `generate-seo-html.mjs` (state pages only) | `/rehab-centers/<state>` | ✅ this commit |
| `generate-county-pages.mjs` | `/rehab-centers/<state>/county/<county>` | ✅ this commit |
| `generate-seo-html.mjs` (city pages, near-me) | `/rehab-centers/<state>/<city>`, `/<treatment>-near-me/<state>`, etc. | ⏳ apply same pattern next |
| `generate-missing-html.mjs` | `/treatment-types/<type>/<state>` etc. | ⏳ apply same pattern next |
| `generate-all-missing-html.mjs` | various | ⏳ apply same pattern next |
| `generate-remaining-nearme.mjs` | `/<treatment>-near-me/<state>` extras | ⏳ apply same pattern next |
| `generate-missing-nearme-html.mjs` | similar | ⏳ apply same pattern next |
| `generate-gsc-recovery-html.mjs` | GSC-flagged URLs | already reads facility names; review post-import |
| `generate-resources-html.mjs` | blog / resource articles | not relevant — content is static |

The pattern in `_facility-data.mjs` (fetch once, group, inject) is reusable
across all of the ⏳ rows. Adding facility data to each is roughly 10–15 lines
per generator.

## Field normalization gotchas

- **State**: SAMHSA returns full state names ("California"). The `state`
  column is text; the prerendered URL slugs are lowercase-hyphenated. The
  generators apply `String(state).toLowerCase().replace(/\s+/g, "-")` to
  match URLs. Don't pre-slug — store the original.
- **County**: SAMHSA records ZIP codes; counties are derived from ZIP
  via a separate lookup (you'll need a ZIP→county map). The `facilities`
  table doesn't carry county directly — county-page rendering joins by
  `state + city ∈ county.majorCities`. So make sure city names match the
  hardcoded `majorCities` arrays in `src/data/countySeoData.ts`. If there's
  drift (e.g., SAMHSA says "Los Ángeles" with accent but the county data
  says "Los Angeles"), the city won't match. Recommend a name-normalization
  pass before POSTing.
- **Service codes**: SAMHSA uses short codes ("OUTPT", "DETOX", "MAT").
  Map them to human-readable strings before sending — the generators
  display them verbatim. Suggested mapping table to seed:
  `OUTPT → "Outpatient"`, `RES → "Residential / Inpatient"`,
  `DETOX → "Detox"`, `MAT → "Medication-Assisted Treatment"`,
  `IOP → "Intensive Outpatient"`, `PHP → "Partial Hospitalization"`.
- **Insurance**: SAMHSA payment codes mirror this — normalize before
  sending: `MD → "Medicaid"`, `MR → "Medicare"`, `PI → "Private Insurance"`,
  `SS → "Sliding Scale"`, `CASH → "Self-Pay"`, `MIL → "TRICARE / Military"`.
- **Phone**: SAMHSA returns `(310) 555-1234` formatted; the schema is
  text and accepts any format. Stripping to `+1XXXXXXXXXX` is recommended
  for `tel:` link consistency.
- **`facility_type`**: SAMHSA uses categories like
  "Substance Abuse Treatment", "Mental Health Treatment", "Treatment Center".
  The schema is open-text; pick the most specific.

## Dry-run / staging

To stage without polluting `facilities`, you can:

1. Use a test `samhsa_facility_id` prefix like `TEST-` so you can find +
   delete later: `DELETE FROM facilities WHERE samhsa_facility_id LIKE 'TEST-%'`.
2. Or import to a staging Supabase branch via `mcp__supabase__create_branch`,
   verify, then merge.

## Rollback

Every imported facility is identifiable. To undo a batch:

```sql
DELETE FROM facilities
WHERE data_source = 'samhsa_import'
  AND samhsa_facility_id = ANY(ARRAY[/* batch IDs */]);
```

Cascade FKs handle the side tables.
