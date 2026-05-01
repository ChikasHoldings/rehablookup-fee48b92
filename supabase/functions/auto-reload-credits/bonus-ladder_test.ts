// Unit tests for the auto-reload bonus ladder.
//
// The bonus mapping in `index.ts` (TIER_BONUSES) determines how many free
// "bonus" credits a provider receives on top of their reload amount. This
// must stay in lock-step with `purchase-credits` (one-shot purchase flow),
// because both paths credit the same wallet. Drift here either:
//   - shortchanges providers (bonus < advertised), or
//   - over-credits providers (bonus > paid amount), causing revenue leakage.
//
// We re-derive the mapping by parsing `index.ts` so tests fail if the source
// constants change without an explicit test update — there is no separate
// module to import because the function ships as a single file.

import {
  assertEquals,
  assert,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const SOURCE = await Deno.readTextFile(
  new URL("./index.ts", import.meta.url),
);

// ---------------------------------------------------------------------------
// Extract VALID_RELOAD_AMOUNTS and TIER_BONUSES from the source.
// ---------------------------------------------------------------------------

function extractValidAmounts(src: string): number[] {
  const m = src.match(/VALID_RELOAD_AMOUNTS\s*=\s*new Set\(\[([^\]]+)\]\)/);
  assert(m, "VALID_RELOAD_AMOUNTS literal not found in index.ts");
  return m![1]
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
}

function extractTierBonuses(src: string): Record<number, number> {
  const block = src.match(
    /TIER_BONUSES:\s*Record<number,\s*number>\s*=\s*\{([\s\S]*?)\};/,
  );
  assert(block, "TIER_BONUSES literal not found in index.ts");
  const out: Record<number, number> = {};
  const entryRe = /(\d+)\s*:\s*(\d+)/g;
  for (const m of block![1].matchAll(entryRe)) {
    out[Number(m[1])] = Number(m[2]);
  }
  return out;
}

const VALID_RELOAD_AMOUNTS = extractValidAmounts(SOURCE);
const TIER_BONUSES = extractTierBonuses(SOURCE);

// Pure helpers mirroring the calculation in index.ts:
//   const bonusCents = TIER_BONUSES[amountCents] ?? 0;
//   const totalCreditsCents = amountCents + bonusCents;
function bonusFor(amountCents: number): number {
  return TIER_BONUSES[amountCents] ?? 0;
}
function totalFor(amountCents: number): number {
  return amountCents + bonusFor(amountCents);
}

// ---------------------------------------------------------------------------
// Canonical expected ladder. If product changes the tiers, update BOTH this
// constant AND TIER_BONUSES in index.ts (and purchase-credits) together.
// ---------------------------------------------------------------------------
const EXPECTED_LADDER: Array<{
  amountCents: number;
  bonusCents: number;
  totalCents: number;
  label: string;
}> = [
  { amountCents: 20000,  bonusCents: 0,     totalCents: 20000,  label: "$200 tier — no bonus" },
  { amountCents: 50000,  bonusCents: 5000,  totalCents: 55000,  label: "$500 tier — $50 bonus (10%)" },
  { amountCents: 100000, bonusCents: 20000, totalCents: 120000, label: "$1000 tier — $200 bonus (20%)" },
];

// ---------------------------------------------------------------------------
// Tier-by-tier assertions
// ---------------------------------------------------------------------------

for (const tier of EXPECTED_LADDER) {
  Deno.test(`bonus ladder: ${tier.label}`, () => {
    assertEquals(
      bonusFor(tier.amountCents),
      tier.bonusCents,
      `bonusCreditsCents mismatch for ${tier.amountCents}`,
    );
    assertEquals(
      totalFor(tier.amountCents),
      tier.totalCents,
      `totalCreditsCents mismatch for ${tier.amountCents}`,
    );
    // Total must always equal amount + bonus exactly (no rounding drift).
    assertEquals(
      totalFor(tier.amountCents),
      tier.amountCents + tier.bonusCents,
      "total must equal amount + bonus",
    );
  });
}

// ---------------------------------------------------------------------------
// Set-level invariants
// ---------------------------------------------------------------------------

Deno.test("ladder: VALID_RELOAD_AMOUNTS matches the documented tiers", () => {
  assertEquals(
    [...VALID_RELOAD_AMOUNTS].sort((a, b) => a - b),
    EXPECTED_LADDER.map((t) => t.amountCents).sort((a, b) => a - b),
    "VALID_RELOAD_AMOUNTS drifted from EXPECTED_LADDER",
  );
});

Deno.test("ladder: TIER_BONUSES has an entry for every valid reload amount", () => {
  for (const amount of VALID_RELOAD_AMOUNTS) {
    assert(
      Object.prototype.hasOwnProperty.call(TIER_BONUSES, amount),
      `TIER_BONUSES missing entry for ${amount}`,
    );
  }
});

Deno.test("ladder: TIER_BONUSES has no extra entries beyond valid tiers", () => {
  const validSet = new Set(VALID_RELOAD_AMOUNTS);
  for (const k of Object.keys(TIER_BONUSES)) {
    const n = Number(k);
    assert(
      validSet.has(n),
      `TIER_BONUSES has unexpected tier ${n} not in VALID_RELOAD_AMOUNTS`,
    );
  }
});

// ---------------------------------------------------------------------------
// Safety / monotonicity invariants
// ---------------------------------------------------------------------------

Deno.test("ladder: bonus is non-negative for every tier", () => {
  for (const t of EXPECTED_LADDER) {
    assert(
      bonusFor(t.amountCents) >= 0,
      `negative bonus for ${t.amountCents}`,
    );
  }
});

Deno.test("ladder: bonus never exceeds the paid amount (no >100% bonus)", () => {
  // Guards against an attacker- or typo-induced bonus that would let providers
  // generate more credits than they paid for.
  for (const t of EXPECTED_LADDER) {
    const bonus = bonusFor(t.amountCents);
    assert(
      bonus <= t.amountCents,
      `bonus ${bonus} exceeds amount ${t.amountCents} for tier ${t.label}`,
    );
  }
});

Deno.test("ladder: bonus is monotonically non-decreasing as amount increases", () => {
  // Higher tiers should never reward less than lower tiers — that would create
  // a perverse incentive to split purchases.
  const sorted = [...EXPECTED_LADDER].sort(
    (a, b) => a.amountCents - b.amountCents,
  );
  for (let i = 1; i < sorted.length; i++) {
    assert(
      sorted[i].bonusCents >= sorted[i - 1].bonusCents,
      `bonus decreased from ${sorted[i - 1].label} to ${sorted[i].label}`,
    );
  }
});

Deno.test("ladder: bonus percentage is monotonically non-decreasing", () => {
  // The whole point of the ladder is "buy more, get a better %". Verify it.
  const sorted = [...EXPECTED_LADDER].sort(
    (a, b) => a.amountCents - b.amountCents,
  );
  let prevPct = -Infinity;
  for (const t of sorted) {
    const pct = t.bonusCents / t.amountCents;
    assert(
      pct >= prevPct,
      `bonus % regressed at ${t.label}: ${pct} < ${prevPct}`,
    );
    prevPct = pct;
  }
});

// ---------------------------------------------------------------------------
// Negative paths: invalid / unknown amounts
// ---------------------------------------------------------------------------

Deno.test("ladder: unknown amount returns 0 bonus and total == amount", () => {
  // The function uses `TIER_BONUSES[amountCents] ?? 0`. We also independently
  // gate via VALID_RELOAD_AMOUNTS so this path should never execute in prod,
  // but the math must still be safe if it does.
  const weird = [0, 1, 999, 19999, 30000, 75000, 100001, 1_000_000];
  for (const amount of weird) {
    assertEquals(bonusFor(amount), 0, `non-tier amount ${amount} got a bonus`);
    assertEquals(
      totalFor(amount),
      amount,
      `non-tier amount ${amount} total drifted`,
    );
  }
});

Deno.test("ladder: every non-valid amount is rejected by VALID_RELOAD_AMOUNTS", () => {
  const validSet = new Set(VALID_RELOAD_AMOUNTS);
  for (const amount of [0, 1, 19999, 30000, 75000, 100001]) {
    assert(
      !validSet.has(amount),
      `unexpected: ${amount} is in VALID_RELOAD_AMOUNTS`,
    );
  }
});
