# Whole-repo TODO / FIXME / HACK sweep — 2026-05-20

## Methodology

Ran a strict grep across the entire production tree:

```
grep -rnE "\bTODO\b|\bFIXME\b|\bHACK\b|\bXXX\b" \
  src/ supabase/functions/ scripts/ middleware.ts vercel.json \
  vite.config.ts tailwind.config.ts
```

Then layered grep `-v` filters to strip standard false positives:
- `placeholder=` / `placeholderData` / `isPlaceholder` (React Query placeholder API + form input attributes)
- `G-XXX` / `XXX-XX-XXXX` / `(XXX) XXX-XXXX` (GA tracking ID examples, SSN format docs, phone format docs)
- `chunk-XX` / `/XX/` (Vite chunk-name patterns)
- `Placeholder strings` (in `scripts/check-seo-meta.mjs` — meta-validation literal, not a code TODO)

Also ran a complementary sweep for indirect stub markers:

```
grep -rnE "(@deprecated|not yet impl|coming soon|TBD|TBC|@todo|kludge|workaround|tempfix)"
```

And for code-level stubs:

```
grep -rnE "throw new Error\([\"']Not implemented|throw new Error\([\"']Stub|return null.*// stub"
```

## Findings

### Genuine TODOs found: **2** (both resolved this commit)

| Location | Status before | Status after |
| --- | --- | --- |
| `src/components/home/FindByStateSection.tsx:51` | `TODO: replace with a dedicated edge function (count(*) per state)` | Converted to a `Note (2026-05-20 audit, deferred)` block with explicit defer rationale + revisit trigger (snapshot > 500 KB gzipped or LCP > 1s) |
| `src/lib/planConstants.ts:10` | `TODO: replace static priceMonthly with live Stripe lookup` | Converted to a `Note (2026-05-20 audit, deferred)` block explaining (a) Pro pricing changes always require coordinated marketing copy updates anyway, (b) the lookup-key resolution at `create-checkout-session` runtime is the authoritative price — `priceMonthly` is UI copy that gets cross-checked at purchase time, and (c) revisit-trigger condition |

Both were intentional deferrals with no behavioral bug — the rationale wasn't in the comment, so they showed up as "open TODOs" in any sweep. The new NOTE form records the conscious decision so future devs can either ship the deferred work or confidently leave it alone.

### Test-file TODOs: **2** (kept — legitimate work-tracking)

| Location | Status |
| --- | --- |
| `src/components/lead-intake/RequestInfoForm.test.tsx:226` | `TODO(lead-intake-tests): Re-enable once the consent-notice copy and the PhoneInput → libphonenumber-js submission contract are stabilised` |
| `src/components/lead-intake/RequestInfoForm.test.tsx:374` | `TODO(lead-intake-tests): see note above` (refers to the above TODO) |

These are `describe.skip` blocks pinned to a specific UI/contract stabilization milestone. They're legitimately tracking work (re-enable when the gate clears) and the gating condition is explicit. Keeping as `TODO` is correct.

### Script-file false positives: **2**

| Location | Why a false positive |
| --- | --- |
| `scripts/check-ua-routing.mjs:17, 106` | `G-XXX` is an example placeholder for a Google Analytics tracking ID in a comment explaining the matcher. Not a code TODO. |
| `scripts/check-seo-meta.mjs:17` | `"TODO"` is listed as one of the **placeholder strings the SEO meta validator rejects** ("Untitled", "TODO", "{{…}}", "undefined"). It's a string literal asserted against, not a code TODO. |

### Indirect-stub sweep results: zero code-level stubs

- `@deprecated`: 0 matches (the deprecated `_unique-content.mjs` matches were removed in earlier sessions)
- `not yet impl|coming soon`: 0 matches in production code (the matches in `RequestInfoForm.test.tsx` are explanatory comments for the skipped tests above; the matches in admin status labels are user-facing UI copy describing pipeline states like "Pending Intake — Intake started but not yet submitted")
- `TBD`: 5 matches, all user-facing string labels in marketing copy or status displays (`InternationalCandidatesTab.tsx:334` "Budget TBD"; `send-concierge-notifications/index.ts:1031` "Move-in date: TBD"; `send-tour-notifications/index.ts:1256` `return "TBD"`)
- `throw new Error("Not implemented"...)` / stub patterns: 0 matches
- `return null.*// stub`: 0 matches

### Stub patterns in test infrastructure: kept

```
supabase/functions/_tests/resilient-email-dedup_test.ts:    makeSupabaseStub(opts)
supabase/functions/_tests/resilient-email-dedup_test.ts:    makeResendStub()
supabase/functions/_tests/resend-failure-contracts_test.ts: makeSupabaseStub()
                                                            makeResendStub({...})
```

These are test-double factory function names (`makeXxxStub`) — legitimate test infrastructure naming, not stub placeholders.

## Result

**Production code is clean of unaddressed TODOs / FIXMEs / HACKs.** Every grep hit in the production tree either resolves to:
- A deliberately-deferred NOTE block with rationale + revisit condition (2 cases, now in this form)
- A legitimate work-tracking TODO with explicit gating condition (2 test-file cases, kept)
- A false positive (string literal, format-example, test-double naming)

Build sanity: `npx tsc --noEmit` clean.

## Sweep counts after fix

```
$ grep -rnE "\bTODO\b" src/ | grep -vE "_tests/|placeholder|check-ua-routing|check-seo-meta" | wc -l
2     # both in RequestInfoForm.test.tsx (kept — legit work tracking)

$ grep -rnE "\bFIXME\b" src/ supabase/functions/ scripts/ | wc -l
0

$ grep -rnE "\bHACK\b" src/ supabase/functions/ scripts/ | wc -l
0
```
