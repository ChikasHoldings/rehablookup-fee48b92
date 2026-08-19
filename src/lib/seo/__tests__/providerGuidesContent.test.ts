/**
 * Guards for the /provider-guides prerender.
 *
 * All 254 of these pages shipped as stubs — title repeated three times,
 * then the seeker-facing directory boilerplate, on pages about how a
 * treatment center acquires patients. The content was never missing; the
 * prerender discarded it. Median body 187 words, 100% under the thin
 * floor, 87.8% duplicates, one cluster of 144 identical bodies.
 *
 * These guards assert the properties that would let that regress
 * silently: real content behind every published guide, no return of the
 * wrong-audience boilerplate, and no single body spreading across the
 * family again.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const GUIDES = path.resolve(process.cwd(), "public/provider-guides");

function visibleText(html: string) {
  return html
    .replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const files = readdirSync(GUIDES).filter((f) => f.endsWith(".html"));
const textOf = (f: string) => visibleText(readFileSync(path.join(GUIDES, f), "utf8"));

describe("provider guide prerenders", () => {
  it("publishes the whole family", () => {
    expect(files.length).toBeGreaterThan(200);
  });

  it("carries the seeker boilerplate on none of them", () => {
    // The exact sentence the stubs shipped. It was wrong twice over:
    // wrong audience, and identical on all 254.
    const offenders = files.filter((f) =>
      textOf(f).includes("Compare programs, verify insurance, and connect with treatment that fits your situation"),
    );
    expect(offenders).toEqual([]);
  });

  it("clears the thin-content floor on all but a handful", () => {
    const thin = files.filter((f) => textOf(f).split(" ").length < 300).length;
    // Was 254 of 254. A few short guides are legitimate; wholesale
    // thinness returning is not.
    expect(thin / files.length).toBeLessThan(0.15);
  });

  it("does not repeat one body across the family", () => {
    const clusters = new Map<string, number>();
    for (const f of files) {
      // Strip the page's own slug words so a shared skeleton cannot hide
      // behind a different title — the corpus audit's method.
      const own = new Set(f.replace(/\.html$/, "").split("-"));
      const body = textOf(f)
        .toLowerCase()
        .split(" ")
        .filter((w) => !own.has(w.replace(/[^a-z]/g, "")))
        .join(" ");
      clusters.set(body, (clusters.get(body) ?? 0) + 1);
    }
    expect(Math.max(...clusters.values())).toBeLessThan(5); // was 144
  });

  it("speaks to providers and still routes a seeker who lands here", () => {
    const sample = textOf("detox-center-marketing.html");
    expect(sample).toContain("List your facility");
    expect(sample).toContain("1-800-662-4357");
  });
});
