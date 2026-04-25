/**
 * Utilities for safely narrowing nullable columns returned from Postgres
 * views.
 *
 * Why this exists
 * ───────────────
 * Postgres views are exposed in the generated `Database` type with **all
 * columns nullable** because views don't carry the underlying NOT NULL
 * constraints. In practice, columns like `id` on `public_facilities` are
 * never null at runtime, but TypeScript correctly forces us to prove that
 * before passing those values to APIs that require `string`.
 *
 * Without these helpers we end up sprinkling the same patterns everywhere:
 *
 *   const ids = (rows || []).map(r => r.id).filter(Boolean) as string[];
 *
 *   const safe = (rows || [])
 *     .filter((r): r is typeof r & { id: string } => typeof r.id === "string")
 *     .map(...);
 *
 * The `as string[]` cast and the inline type predicate are easy to get
 * wrong (and easy to forget when adding new required fields). This module
 * gives us a single, well-tested source of truth.
 *
 * Mirror in `src/lib/nullableRows.ts` for client-side code.
 */

export type WithRequired<T, K extends keyof T> = Omit<T, K> & {
  [P in K]-?: NonNullable<T[P]>;
};

/**
 * Returns true when every listed key on `row` is a non-null/undefined value.
 * Acts as a TypeScript type predicate so callers get a narrowed row type.
 */
export const hasRequiredKeys = <T extends object, K extends keyof T>(
  row: T | null | undefined,
  keys: readonly K[],
): row is T & WithRequired<T, K> => {
  if (!row) return false;
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined) return false;
  }
  return true;
};

/**
 * Filters out rows missing any of the required keys and narrows the type
 * so the returned array no longer marks those keys as nullable.
 *
 * Use when you need to keep the full row but guarantee specific columns
 * (e.g. primary keys that views mark as nullable).
 */
export const filterRowsWithKeys = <T extends object, K extends keyof T>(
  rows: readonly (T | null | undefined)[] | null | undefined,
  keys: readonly K[],
): (T & WithRequired<T, K>)[] => {
  if (!rows?.length) return [];
  const out: (T & WithRequired<T, K>)[] = [];
  for (const row of rows) {
    if (hasRequiredKeys(row, keys)) out.push(row);
  }
  return out;
};

/**
 * Extracts a single required column from a list of rows, dropping any
 * row where the column is null/undefined. The result type is the
 * non-nullable version of the column — no `as string[]` casts needed.
 *
 * Common use: collecting facility IDs from `public_facilities` to feed
 * into an `.in("facility_id", ids)` lookup.
 */
export const pluckNonNull = <T extends object, K extends keyof T>(
  rows: readonly (T | null | undefined)[] | null | undefined,
  key: K,
): NonNullable<T[K]>[] => {
  if (!rows?.length) return [];
  const out: NonNullable<T[K]>[] = [];
  for (const row of rows) {
    if (!row) continue;
    const value = row[key];
    if (value === null || value === undefined) continue;
    out.push(value as NonNullable<T[K]>);
  }
  return out;
};

/**
 * Returns the value if non-null, otherwise the provided fallback. Mostly
 * useful inline to keep mapping expressions terse and readable.
 */
export const coalesce = <T, F>(value: T | null | undefined, fallback: F): NonNullable<T> | F => {
  return value === null || value === undefined ? fallback : (value as NonNullable<T>);
};
