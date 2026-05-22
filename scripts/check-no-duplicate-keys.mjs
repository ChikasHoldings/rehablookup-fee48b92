#!/usr/bin/env node
/**
 * check-no-duplicate-keys.mjs
 *
 * Build-time guard: fails the build if any source file contains a
 * duplicate object literal key. Wired into `validate:blocking` so
 * future PRs cannot merge with duplicate keys.
 *
 * Why this exists: on 2026-05-22 a `useQuery` options object in
 * `src/pages/admin/AdminLeads.tsx` shipped with `staleTime` declared
 * twice. The last assignment silently wins in JavaScript object
 * literals, so the bug only surfaced as a `[plugin:vite:esbuild]
 * Duplicate key "staleTime"` warning during `vite build`. The build
 * still exited 0, so the regression made it into main. This script
 * promotes that warning to a hard failure.
 *
 * How it detects duplicates:
 *   1. Runs `npx tsc --noEmit -p tsconfig.app.json --strict` and
 *      captures the output. TypeScript reports duplicate object
 *      literal keys as TS1117 (parser-level, regardless of strict)
 *      and TS2300 / TS2783 (duplicate identifier / overwritten
 *      property). Any of those codes flips the script to fail. We
 *      use `tsconfig.app.json` instead of the root `tsconfig.json`
 *      because the root config is project-references-only
 *      (`"files": []`) and `tsc -p tsconfig.json` won't actually
 *      scan `src/`. We do NOT fail on other strict-mode errors —
 *      only on duplicate-key codes — because the repo's tsconfig
 *      is intentionally non-strict elsewhere.
 *   2. Greps the source tree (`src/`, `supabase/functions/`) for the
 *      literal text "Duplicate key" as a safety net so a developer
 *      can't suppress the bundler warning by pasting it into a
 *      comment.
 *
 * Invoked from package.json:
 *   "validate:blocking": "... && node scripts/check-no-duplicate-keys.mjs"
 */

import { spawnSync } from 'node:child_process'
import { readFile, readdir, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'

const DUPLICATE_KEY_TS_CODES = ['TS1117', 'TS2300', 'TS2783']
const LITERAL_WARNING = 'Duplicate key'
const SOURCE_ROOTS = ['src', 'supabase/functions']
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'])

function runStrictTypecheck() {
  const result = spawnSync(
    'npx',
    ['tsc', '--noEmit', '-p', 'tsconfig.app.json', '--strict'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  )
  return (result.stdout || '') + (result.stderr || '')
}

function findDuplicateKeyErrors(tscOutput) {
  const hits = []
  for (const line of tscOutput.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    for (const code of DUPLICATE_KEY_TS_CODES) {
      if (trimmed.includes(`error ${code}:`) || trimmed.includes(`error ${code} `)) {
        hits.push(trimmed)
        break
      }
    }
  }
  return hits
}

async function* walkSource(path) {
  const s = await stat(path).catch(() => null)
  if (!s) return
  if (s.isFile()) {
    if (SOURCE_EXTENSIONS.has(extname(path).toLowerCase())) yield path
    return
  }
  if (s.isDirectory()) {
    const entries = await readdir(path)
    for (const entry of entries) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue
      yield* walkSource(join(path, entry))
    }
  }
}

async function grepSourceForLiteral(literal) {
  const hits = []
  for (const root of SOURCE_ROOTS) {
    try {
      for await (const file of walkSource(root)) {
        const content = await readFile(file, 'utf8')
        if (!content.includes(literal)) continue
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(literal)) {
            hits.push({ file, line: i + 1, text: lines[i].trim() })
          }
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
    }
  }
  return hits
}

async function main() {
  let failed = false

  // 1. Strict TS typecheck — surfaces TS1117 / TS2300 / TS2783
  process.stdout.write('check-no-duplicate-keys: running tsc --strict --noEmit ... ')
  const tscOutput = runStrictTypecheck()
  const tscHits = findDuplicateKeyErrors(tscOutput)
  process.stdout.write(tscHits.length === 0 ? 'ok\n' : 'FAIL\n')

  if (tscHits.length > 0) {
    failed = true
    console.error('')
    console.error('  Duplicate object literal keys reported by tsc --strict:')
    for (const hit of tscHits) {
      console.error(`    ${hit}`)
    }
  }

  // 2. Literal grep of the source tree as a safety net
  process.stdout.write(`check-no-duplicate-keys: grepping source tree for "${LITERAL_WARNING}" ... `)
  const grepHits = await grepSourceForLiteral(LITERAL_WARNING)
  process.stdout.write(grepHits.length === 0 ? 'ok\n' : 'FAIL\n')

  if (grepHits.length > 0) {
    failed = true
    console.error('')
    console.error(`  Literal "${LITERAL_WARNING}" found in source tree:`)
    for (const hit of grepHits) {
      console.error(`    ${hit.file}:${hit.line}: ${hit.text}`)
    }
  }

  if (failed) {
    console.error('')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('  BUILD FAILED: duplicate object literal key(s) detected')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('')
    console.error('  In JS object literals the last assignment silently wins,')
    console.error('  so duplicate keys are almost always a copy-paste bug.')
    console.error('  Remove the redundant key (keep the intended value) and')
    console.error('  re-run `npm run validate:blocking`.')
    console.error('')
    process.exit(1)
  }

  console.log('✓ check-no-duplicate-keys: no duplicate object literal keys detected')
}

main().catch((err) => {
  console.error('check-no-duplicate-keys: unexpected error', err)
  process.exit(2)
})
