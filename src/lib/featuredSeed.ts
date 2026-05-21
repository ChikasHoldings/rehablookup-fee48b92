// Visitor rotation seed used by the Featured rendering.
//
// Cap: 100 variants. Each visitor gets a deterministic integer in
// [0, 99] stored in a 24h cookie. That seed drives a deterministic
// rotation of the eligible Featured pool — same visitor sees the
// same cards in the same order on refresh; across all 100 seeds,
// every facility appears at every rail position with equal frequency.
//
// 100 variants is a deliberate cache trade-off: the CDN can cache up
// to 100 rendered HTML variants per URL (Vary: Cookie with the
// `rl_rot_seed` key). Beyond ~100, cache miss rate climbs fast.

const COOKIE_NAME = "rl_rot_seed";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24; // 24h
const SEED_SPACE = 100;

/** Reserved for bot prerender: deterministically the SAME seed every
 *  time so Googlebot/Bingbot see a stable set of Featured cards
 *  across crawls. Don't accidentally serve random Featured cards to
 *  bots — that confuses indexing. */
export const BOT_PRERENDER_SEED = 0;

/**
 * Read the visitor's rotation seed from the cookie. If absent, mints
 * a new random seed in [0, SEED_SPACE-1] and sets the cookie.
 *
 * Client-only — uses `document.cookie`. The SSR/edge equivalent
 * (setting the cookie from middleware) lives in the edge function
 * that renders SSR'd pages. For pages that pull Featured client-side
 * via `useFeaturedRotation`, this hook seeds the cookie on first call.
 */
export function getOrCreateRotationSeed(): number {
  if (typeof document === "undefined") return BOT_PRERENDER_SEED;
  const existing = readSeedCookie();
  if (existing !== null) return existing;
  const seed = Math.floor(Math.random() * SEED_SPACE);
  writeSeedCookie(seed);
  return seed;
}

function readSeedCookie(): number | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const raw = match.split("=")[1];
  const n = parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0 || n >= SEED_SPACE) return null;
  return n;
}

function writeSeedCookie(seed: number): void {
  if (typeof document === "undefined") return;
  // SameSite=Lax + no httpOnly so client-side reads work. The cookie
  // carries no PII — it's an opaque integer purely for cache keying
  // and rotation determinism.
  document.cookie =
    `${COOKIE_NAME}=${seed}; ` +
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}; ` +
    `Path=/; ` +
    `SameSite=Lax`;
}
