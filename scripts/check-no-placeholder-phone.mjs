#!/usr/bin/env node
/**
 * check-no-placeholder-phone.mjs
 *
 * Build-time guard: fails the build if the placeholder phone number
 * `1-800-555-1234` (or its E.164 form `+18005551234`, or the bare
 * `8005551234`) appears in index.html or any prerendered HTML in dist/.
 *
 * Also fails if the `__PHONE_E164__` / `__PHONE_DISPLAY__` substitution
 * tokens are still present (meaning a build slipped through without
 * substitution).
 *
 * Why: the YMYL / E-E-A-T / LegitScript posture demands that any
 * phone number shown to users be a real, owned number. A placeholder
 * leaking to production is a trust + compliance failure.
 *
 * Invoked from package.json:
 *   "build:vercel": "... && node scripts/check-no-placeholder-phone.mjs && ..."
 */

import { readFile, readdir, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'

const FORBIDDEN_PATTERNS = [
  // The fictional placeholder number in all its forms
  /1[-\s]?800[-\s]?555[-\s]?1234/,
  /\+1?8005551234\b/,
  /tel:\+?1?8005551234/i,
  /\b8005551234\b/,
  // Unsubstituted build tokens
  /__PHONE_E164__/,
  /__PHONE_DISPLAY__/,
]

const FILES_TO_CHECK = [
  // The SPA shell
  'index.html',
  // The dist directory after vite build (if present)
  'dist',
]

/**
 * Recursively walk a directory and yield .html files.
 */
async function* walkHtml(path) {
  const s = await stat(path).catch(() => null)
  if (!s) return
  if (s.isFile()) {
    if (extname(path).toLowerCase() === '.html') yield path
    return
  }
  if (s.isDirectory()) {
    const entries = await readdir(path)
    for (const entry of entries) {
      // Skip node_modules and .git just in case
      if (entry === 'node_modules' || entry.startsWith('.')) continue
      yield* walkHtml(join(path, entry))
    }
  }
}

async function checkFile(filepath) {
  const content = await readFile(filepath, 'utf8')
  const hits = []
  for (const pattern of FORBIDDEN_PATTERNS) {
    const match = content.match(pattern)
    if (match) {
      // Find line number for friendlier error
      const idx = content.indexOf(match[0])
      const lineNumber = content.slice(0, idx).split('\n').length
      hits.push({ pattern: pattern.source, match: match[0], line: lineNumber })
    }
  }
  return hits
}

async function main() {
  let totalHits = 0
  const allViolations = []

  for (const target of FILES_TO_CHECK) {
    try {
      for await (const file of walkHtml(target)) {
        const hits = await checkFile(file)
        if (hits.length > 0) {
          totalHits += hits.length
          allViolations.push({ file, hits })
        }
      }
    } catch (err) {
      // Target doesn't exist (e.g. dist before build) — skip silently
      if (err.code !== 'ENOENT') throw err
    }
  }

  if (totalHits > 0) {
    console.error('')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('  BUILD FAILED: placeholder / fake phone number detected')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    for (const { file, hits } of allViolations) {
      console.error(`\n  ${file}`)
      for (const h of hits) {
        console.error(`    line ${h.line}: matched "${h.match}" (pattern: ${h.pattern})`)
      }
    }
    console.error('')
    console.error('  RehabLookup is a YMYL / addiction-recovery site.')
    console.error('  Real, owned phone numbers are mandatory.')
    console.error('  Substitute __PHONE_E164__ and __PHONE_DISPLAY__ with the')
    console.error('  real values before deploying.')
    console.error('')
    process.exit(1)
  }

  console.log('✓ check-no-placeholder-phone: no fake / placeholder phone numbers detected')
}

main().catch((err) => {
  console.error('check-no-placeholder-phone: unexpected error', err)
  process.exit(2)
})
