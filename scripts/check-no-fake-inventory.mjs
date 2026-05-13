#!/usr/bin/env node
/**
 * check-no-fake-inventory.mjs
 *
 * Build-time guard: fails the build if false inventory claims appear in
 * index.html or any prerendered HTML in dist/.
 *
 * The site currently has ~3 verified facilities. Claiming "15,000+",
 * "10,000+", or any other inflated count is:
 *   1. Materially misleading to users seeking treatment (YMYL harm)
 *   2. A LegitScript / Google Healthcare ads policy violation
 *   3. Detectable by manual review and Google quality raters
 *
 * Allowed alternatives are neutral phrasings like:
 *   - "Search and connect with verified addiction treatment centers..."
 *   - "Browse addiction treatment centers across the United States"
 *
 * Once SAMHSA ingest completes (target: ~14K facilities as
 * unclaimed listings) the claim can be brought back, but ONLY if the
 * database row count actually justifies it. This validator should be
 * UPDATED at that point to assert against the live count.
 *
 * Invoked from package.json:
 *   "build:vercel": "... && node scripts/check-no-fake-inventory.mjs && ..."
 */

import { readFile, readdir, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'

const FORBIDDEN_PATTERNS = [
  // Inflated count claims that the live database doesn't justify
  /\b15,?000\s*\+?\s*(?:verified|rehab|treatment|facilities|centers|programs|locations)/i,
  /\b10,?000\s*\+?\s*(?:verified|rehab|treatment|facilities|centers|programs|locations)/i,
  /\b20,?000\s*\+?\s*(?:verified|rehab|treatment|facilities|centers|programs|locations)/i,
  /\b25,?000\s*\+?\s*(?:verified|rehab|treatment|facilities|centers|programs|locations)/i,
  /\b50,?000\s*\+?\s*(?:verified|rehab|treatment|facilities|centers|programs|locations)/i,
  // "Search X+ verified" superlative patterns
  /Search\s+\d{1,3},?\d{3}\+?\s+verified/i,
  /Compare\s+\d{1,3},?\d{3}\+?\s+verified/i,
  /Browse\s+\d{1,3},?\d{3}\+?\s+verified/i,
  // "Nation's largest" / "America's most comprehensive" — leave only if defensible
  /\b(?:nation's largest|america's largest|world's largest|biggest)\s+(?:rehab|treatment|recovery|addiction)/i,
]

const FILES_TO_CHECK = [
  'index.html',
  'dist',
]

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
      if (err.code !== 'ENOENT') throw err
    }
  }

  if (totalHits > 0) {
    console.error('')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('  BUILD FAILED: unverified inventory claim detected')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    for (const { file, hits } of allViolations) {
      console.error(`\n  ${file}`)
      for (const h of hits) {
        console.error(`    line ${h.line}: matched "${h.match}" (pattern: ${h.pattern})`)
      }
    }
    console.error('')
    console.error('  The live database has only a handful of verified facilities.')
    console.error('  Claiming thousands is materially misleading and is a')
    console.error('  LegitScript / Google Healthcare ads policy violation.')
    console.error('')
    console.error('  Use neutral phrasing instead, e.g.:')
    console.error('    "Search verified addiction treatment centers across the U.S."')
    console.error('')
    console.error('  Once SAMHSA ingest completes, update this validator to')
    console.error('  assert against the actual row count in facilities table.')
    console.error('')
    process.exit(1)
  }

  console.log('✓ check-no-fake-inventory: no unverified inventory claims detected')
}

main().catch((err) => {
  console.error('check-no-fake-inventory: unexpected error', err)
  process.exit(2)
})
