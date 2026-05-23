#!/usr/bin/env node
/**
 * Inline live facility / state counts into index.html so the homepage
 * trust badges render the real number on first paint — no "0+" flash,
 * no CLS when the RPC lands milliseconds later.
 *
 * Why this exists
 * ---------------
 * The hero trust bar used to read 0 → 3800 via a count-up animation
 * seeded with `useState(0)`. Before the IntersectionObserver fired the
 * badge read "0+ Verified Facilities" / "0 States Covered" — a
 * trust-defeating bug on a YMYL page. The fix consolidates the count
 * onto a single Supabase RPC (public.get_directory_stats); this script
 * inlines that RPC's current value into index.html so even the very
 * first paint shows a real number.
 *
 * Behavior
 * --------
 * 1. Call `public.get_directory_stats` via PostgREST RPC with the
 *    public anon key (the function is GRANT EXECUTE to anon).
 * 2. Apply the same sanity floor as the client hook: if facility count
 *    looks broken (< 100), substitute the safe pair (3800 / 50) instead
 *    of inlining nonsense.
 * 3. Rewrite the existing `<meta name="rl:stats" content="...">` tag
 *    in index.html with the live value.
 *
 * If env vars are missing (e.g. a local build without secrets) or the
 * RPC fails, the script leaves the existing tag's floor defaults in
 * place — the client hook will reconcile from the live RPC on mount.
 *
 * Wired into package.json `build:vercel` after `generate:prerender-manifest`.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const INDEX_HTML = resolve(ROOT, 'index.html')

const FACILITY_FLOOR = 3800
// 51 jurisdictions = 50 states + Washington, D.C. The directory carries
// facilities in D.C., so the state count exposed to users via
// `<meta name="rl:stats">` should reflect that. UI prose elsewhere
// renders "50 states and Washington, D.C." against this value.
const STATE_FLOOR = 51
const SANITY_MIN_FACILITIES = 100

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY

function logAndExitOk(reason) {
  console.log(`inline-directory-stats: ${reason}; keeping existing meta tag (floor defaults)`)
  // Soft-fail: do not break the build. The client hook will pick up live
  // counts at runtime regardless.
  process.exit(0)
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  logAndExitOk('SUPABASE_URL or anon key env vars missing')
}

async function fetchStats() {
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/get_directory_stats`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: '{}',
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`RPC failed: ${res.status} ${res.statusText} — ${body.slice(0, 200)}`)
  }
  const data = await res.json()
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('RPC returned no rows')
  const facilities = Number(row.facility_count ?? 0)
  const states = Number(row.state_count ?? 0)
  if (facilities < SANITY_MIN_FACILITIES) {
    console.log(
      `inline-directory-stats: live count ${facilities} below sanity floor ${SANITY_MIN_FACILITIES}; substituting (${FACILITY_FLOOR}, ${STATE_FLOOR})`,
    )
    return { facilities: FACILITY_FLOOR, states: STATE_FLOOR }
  }
  return { facilities, states: Math.max(STATE_FLOOR, states) }
}

let stats
try {
  stats = await fetchStats()
} catch (err) {
  logAndExitOk(`fetch failed: ${err.message}`)
}

const html = readFileSync(INDEX_HTML, 'utf8')
// content=(['"])(.*?)\1 — captures the outer quote and then lazily matches up to
// the next instance of the SAME quote. Using ['"] in the character class
// (the old pattern) would reject any opposite-quote inside the value, which
// breaks when the content is single-quoted JSON like `'{"facilities":3800}'`.
const metaRe = /<meta\s+name=["']rl:stats["']\s+content=(['"]).*?\1\s*\/?\s*>/

if (!metaRe.test(html)) {
  console.error(
    'inline-directory-stats: <meta name="rl:stats"> placeholder not found in index.html. Add it (with safe floor defaults) so this script has something to rewrite.',
  )
  process.exit(1)
}

const newTag = `<meta name="rl:stats" content='${JSON.stringify(stats)}' />`
const patched = html.replace(metaRe, newTag)
writeFileSync(INDEX_HTML, patched)

console.log(
  `✓ inline-directory-stats: inlined facilities=${stats.facilities}, states=${stats.states}`,
)
