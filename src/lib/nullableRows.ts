/**
 * Client-side mirror of `supabase/functions/_shared/nullable-rows.ts`.
 *
 * See the edge-function copy for full rationale. Short version: Postgres
 * views surface every column as nullable in the generated `Database` type
 * even when runtime values are never null. These helpers narrow safely
 * without `as string[]` casts or hand-written type predicates.
 *
 * Kept as a separate file (not a re-export) because the Vite client bundle
 * and the Deno edge runtime resolve modules differently — duplicating ~80
 * lines is cheaper than wrestling with a shared module path.
 */

export type WithRequired<T, K extends keyof T> = Omit<T, K> & {
  [P in K]-?: NonNullable<T[P]>;
};

export const hasRequiredKeys = <T extends Record<string, unknown>, K extends keyof T>(
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

export const filterRowsWithKeys = <T extends Record<string, unknown>, K extends keyof T>(
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

export const pluckNonNull = <T extends Record<string, unknown>, K extends keyof T>(
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

export const coalesce = <T, F>(value: T | null | undefined, fallback: F): NonNullable<T> | F => {
  return value === null || value === undefined ? fallback : (value as NonNullable<T>);
};
