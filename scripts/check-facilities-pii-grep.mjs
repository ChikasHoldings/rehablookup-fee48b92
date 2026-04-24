#!/usr/bin/env node
/**
 * CI grep guard for H4: Block direct frontend reads of PII columns
 * (email, reply_email, phone) from public.facilities.
 *
 * The DB enforces this via column-level GRANT/REVOKE (anon + authenticated
 * cannot read these columns). This script gives a friendlier compile-time
 * error than a runtime "permission denied for column reply_email".
 *
 * Allowed paths for these columns:
 *   - Edge functions (service-role) under supabase/functions/**
 *   - Admin SECURITY DEFINER RPCs
 *
 * Forbidden: any file under src/** that does
 *   supabase.from("facilities").select("...email...")
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");

/** @type {string[]} */
const offenders = [];

const FORBIDDEN = /\bfrom\(["']facilities["']\)[\s\S]{0,400}?\.select\(["'][^"']*\b(email|reply_email|phone)\b/g;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) {
      walk(full);
    } else if (/\.(ts|tsx|js|jsx)$/.test(name)) {
      const text = readFileSync(full, "utf8");
      let m;
      while ((m = FORBIDDEN.exec(text)) !== null) {
        const before = text.slice(0, m.index);
        const line = before.split("\n").length;
        offenders.push(`${relative(ROOT, full)}:${line} reads facilities.${m[1]} directly`);
      }
    }
  }
}

walk(SRC);

if (offenders.length > 0) {
  console.error("\n❌ H4 PII grep guard failed — direct facilities PII reads detected:\n");
  for (const o of offenders) console.error("  • " + o);
  console.error(
    "\nFacility email/reply_email/phone are PII. Read them via an edge function\n" +
      "(service-role) or the public_facilities view, never via the anon/auth client.\n"
  );
  process.exit(1);
}

console.log("✓ No direct facilities PII reads found in src/");
