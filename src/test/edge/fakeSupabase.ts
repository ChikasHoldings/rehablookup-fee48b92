/**
 * A small in-memory stand-in for the supabase-js client, faithful enough to
 * exercise the PostgREST query construction that edge functions actually
 * perform: embedded `!inner` joins, dotted filters on embedded resources,
 * `.or(...)` expressions (including `referencedTable`), ordering and limits.
 *
 * Why not just assert on the query string? Because the contracts we are
 * protecting are *semantic*: "a Featured-only subscription must survive the
 * eligibility filter". Evaluating the real filter expression against fixture
 * rows keeps the test meaningful even after Stage 5 edits that expression —
 * which a string assertion could not do.
 *
 * Deliberately modelled behaviours:
 *   - Filtering on a column that does not exist on the row raises, mirroring
 *     PostgREST's 400 `column ... does not exist`. This is what makes the
 *     "drop the column before editing the filter" hazard observable in tests.
 *   - `!inner` drops the parent row when the embedded row is missing or is
 *     rejected by an embedded filter.
 */

export interface RelationSpec {
  /** Table the embedded resource reads from. */
  table: string;
  /** Column on the parent row used to match. */
  fromColumn: string;
  /** Column on the embedded row used to match. */
  toColumn: string;
}

export interface FakeSupabaseOptions {
  /** table name → rows */
  tables: Record<string, Record<string, unknown>[]>;
  /** "parentTable.embeddedName" → relation spec */
  relations?: Record<string, RelationSpec>;
  /** rpc name → implementation */
  rpc?: Record<string, (args: Record<string, unknown>) => unknown>;
  /** Force an RPC to return an error, for fail-safe branch coverage. */
  rpcErrors?: Record<string, { message: string }>;
  /** Result for `auth.getUser(token)`. */
  authUser?: { id: string; email: string } | null;
  /**
   * Force an insert against these tables to fail, so tests can prove the code
   * under test surfaces persistence failures instead of reporting success.
   */
  insertErrors?: Record<string, { message: string; code?: string }>;
}

export class MissingColumnError extends Error {
  constructor(column: string, table: string) {
    super(`column "${column}" does not exist on "${table}" (PostgREST 42703)`);
    this.name = "MissingColumnError";
  }
}

type Row = Record<string, unknown>;

function parseLiteral(raw: string): unknown {
  const v = raw.trim();
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null") return null;
  if (v !== "" && !Number.isNaN(Number(v))) return Number(v);
  // PostgREST allows quoted strings in filter values.
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
}

function compare(op: string, actual: unknown, expected: unknown): boolean {
  switch (op) {
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "is":
      return actual === expected;
    case "gt":
      return (actual as number) > (expected as number);
    case "gte":
      return (actual as number) >= (expected as number);
    case "lt":
      return (actual as number) < (expected as number);
    case "lte":
      return (actual as number) <= (expected as number);
    case "in":
      return normalizeInValue(expected).includes(actual);
    default:
      throw new Error(`[fakeSupabase] unsupported filter operator: ${op}`);
  }
}

/** Split on commas that are not nested inside parentheses. */
function splitTopLevel(expr: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of expr) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim() !== "") out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

/**
 * Evaluate a PostgREST boolean expression (the argument to `.or()`) against a
 * row. Supports `col.op.value` terms plus nested `and(...)` / `or(...)`.
 */
export function evaluateFilterExpression(
  expr: string,
  row: Row,
  tableLabel: string,
  combinator: "or" | "and" = "or",
): boolean {
  const terms = splitTopLevel(expr);
  const results = terms.map((term) => {
    if (term.startsWith("and(") && term.endsWith(")")) {
      return evaluateFilterExpression(term.slice(4, -1), row, tableLabel, "and");
    }
    if (term.startsWith("or(") && term.endsWith(")")) {
      return evaluateFilterExpression(term.slice(3, -1), row, tableLabel, "or");
    }
    const firstDot = term.indexOf(".");
    const secondDot = term.indexOf(".", firstDot + 1);
    if (firstDot === -1 || secondDot === -1) {
      throw new Error(`[fakeSupabase] malformed filter term: "${term}"`);
    }
    const column = term.slice(0, firstDot);
    const op = term.slice(firstDot + 1, secondDot);
    const value = parseLiteral(term.slice(secondDot + 1));
    if (!(column in row)) throw new MissingColumnError(column, tableLabel);
    return compare(op, row[column], value);
  });
  return combinator === "or" ? results.some(Boolean) : results.every(Boolean);
}

/** Names of embedded resources requested in a select string, e.g. `facilities!inner (...)`. */
function parseEmbeds(select: string): { name: string; inner: boolean }[] {
  const out: { name: string; inner: boolean }[] = [];
  const re = /([a-z0-9_]+)(!inner)?\s*\(/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(select)) !== null) {
    // Skip aggregate-ish tokens; embeds are always table names we know about.
    out.push({ name: m[1], inner: Boolean(m[2]) });
  }
  return out;
}

interface PendingFilter {
  kind: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "is" | "or" | "not";
  path?: string;
  value?: unknown;
  expr?: string;
  referencedTable?: string;
  /** Operator being negated, for `kind === "not"`. */
  notOp?: string;
}

/**
 * PostgREST accepts `in` values either as an array (supabase-js `.in()`) or as
 * a parenthesised list string (`.not("status","in",'("closed","completed")')`).
 */
function normalizeInValue(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value
      .replace(/^\(/, "")
      .replace(/\)$/, "")
      .split(",")
      .map((s) => parseLiteral(s));
  }
  return [value];
}

export interface FakeSupabase {
  from(table: string): QueryBuilder;
  rpc(name: string, args?: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
  auth: {
    getUser(token?: string): Promise<{ data: { user: unknown } | null; error: unknown }>;
  };
  functions: {
    invoke(name: string, opts?: { body?: unknown }): Promise<{ data: unknown; error: unknown }>;
  };
  /** Everything written through insert/update/upsert/delete, in order. */
  mutations: Mutation[];
  /** Every `supabase.functions.invoke(...)` the code under test made. */
  invocations: { name: string; body: unknown }[];
  tables: Record<string, Row[]>;
}

export interface Mutation {
  table: string;
  op: "insert" | "update" | "upsert" | "delete";
  values?: unknown;
  filters: PendingFilter[];
}

class QueryBuilder implements PromiseLike<{ data: unknown; error: unknown; count?: number }> {
  private selectStr = "*";
  private filters: PendingFilter[] = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private limitN: number | null = null;
  private singleMode: "single" | "maybeSingle" | null = null;
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private values: unknown = undefined;
  private countMode: string | null = null;
  private headMode = false;

  constructor(
    private readonly ctx: { store: FakeSupabaseImpl; table: string },
  ) {}

  select(sel?: string, opts?: { count?: string; head?: boolean }) {
    if (sel) this.selectStr = sel;
    if (opts?.count) this.countMode = opts.count;
    if (opts?.head) this.headMode = true;
    return this;
  }
  insert(values: unknown) { this.op = "insert"; this.values = values; return this; }
  update(values: unknown) { this.op = "update"; this.values = values; return this; }
  upsert(values: unknown) { this.op = "upsert"; this.values = values; return this; }
  delete() { this.op = "delete"; return this; }

  eq(path: string, value: unknown) { this.filters.push({ kind: "eq", path, value }); return this; }
  neq(path: string, value: unknown) { this.filters.push({ kind: "neq", path, value }); return this; }
  gt(path: string, value: unknown) { this.filters.push({ kind: "gt", path, value }); return this; }
  gte(path: string, value: unknown) { this.filters.push({ kind: "gte", path, value }); return this; }
  lt(path: string, value: unknown) { this.filters.push({ kind: "lt", path, value }); return this; }
  lte(path: string, value: unknown) { this.filters.push({ kind: "lte", path, value }); return this; }
  is(path: string, value: unknown) { this.filters.push({ kind: "is", path, value }); return this; }
  in(path: string, value: unknown[]) { this.filters.push({ kind: "in", path, value }); return this; }
  not(path: string, op: string, value: unknown) {
    this.filters.push({ kind: "not", path, value, notOp: op });
    return this;
  }
  or(expr: string, opts?: { referencedTable?: string }) {
    this.filters.push({ kind: "or", expr, referencedTable: opts?.referencedTable });
    return this;
  }
  order(column: string, opts?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: opts?.ascending !== false };
    return this;
  }
  limit(n: number) { this.limitN = n; return this; }
  single() { this.singleMode = "single"; return this; }
  maybeSingle() { this.singleMode = "maybeSingle"; return this; }

  private run(): { data: unknown; error: unknown; count?: number } {
    const store = this.ctx.store;
    const table = this.ctx.table;

    if (this.op !== "select") {
      store.mutations.push({
        table,
        op: this.op,
        values: this.values,
        filters: [...this.filters],
      });
      if (this.op === "insert" || this.op === "upsert") {
        const forced = store.insertErrors[table];
        if (forced) return { data: null, error: forced };
        const rows = Array.isArray(this.values) ? this.values : [this.values];
        const target = (store.tables[table] ??= []);
        // Emulate `id uuid DEFAULT gen_random_uuid()` + `created_at DEFAULT now()`
        // so callers doing `.insert(...).select("id").single()` get a real id back.
        const inserted = rows.map((r) => ({
          id: (r as Row).id ?? store.nextId(),
          created_at: (r as Row).created_at ?? new Date().toISOString(),
          ...(r as Row),
        }));
        for (const r of inserted) target.push({ ...r });
        if (this.singleMode) return { data: inserted[0] ?? null, error: null };
        return { data: inserted, error: null };
      }
      if (this.op === "update") {
        const target = store.tables[table] ?? [];
        const matched = target.filter((row) => this.rowMatchesBaseFilters(row, table));
        for (const row of matched) Object.assign(row, this.values as Row);
        if (this.singleMode) return { data: matched[0] ?? null, error: null };
        return { data: matched, error: null };
      }
      // delete
      const target = store.tables[table] ?? [];
      const kept = target.filter((row) => !this.rowMatchesBaseFilters(row, table));
      const removed = target.filter((row) => this.rowMatchesBaseFilters(row, table));
      store.tables[table] = kept;
      return { data: removed, error: null };
    }

    const base = store.tables[table] ?? [];
    const embeds = parseEmbeds(this.selectStr).filter(
      (e) => store.relations[`${table}.${e.name}`] !== undefined,
    );

    let rows: Row[] = base.map((row) => {
      const out: Row = { ...row };
      for (const embed of embeds) {
        const rel = store.relations[`${table}.${embed.name}`];
        const match = (store.tables[rel.table] ?? []).find(
          (candidate) => candidate[rel.toColumn] === row[rel.fromColumn],
        );
        out[embed.name] = match ? { ...match } : null;
      }
      return out;
    });

    // Apply filters (base columns and dotted/referenced embedded columns).
    for (const f of this.filters) {
      rows = rows.filter((row) => {
        if (f.kind === "or") {
          const target = f.referencedTable ? (row[f.referencedTable] as Row | null) : row;
          if (!target) return false;
          return evaluateFilterExpression(
            f.expr as string,
            target,
            f.referencedTable ?? table,
          );
        }
        const path = f.path as string;
        const applies = (actual: unknown) =>
          f.kind === "not"
            ? !compare(f.notOp as string, actual, f.value)
            : compare(f.kind, actual, f.value);
        const dot = path.indexOf(".");
        if (dot !== -1) {
          const embedName = path.slice(0, dot);
          const column = path.slice(dot + 1);
          if (embeds.some((e) => e.name === embedName)) {
            const target = row[embedName] as Row | null;
            if (!target) return false;
            if (!(column in target)) throw new MissingColumnError(column, embedName);
            return applies(target[column]);
          }
        }
        if (!(path in row)) throw new MissingColumnError(path, table);
        return applies(row[path]);
      });
    }

    // `!inner` semantics: parent rows without the embedded row drop out.
    for (const embed of embeds) {
      if (!embed.inner) continue;
      rows = rows.filter((row) => row[embed.name] !== null && row[embed.name] !== undefined);
    }

    if (this.orderBy) {
      const { column, ascending } = this.orderBy;
      rows = [...rows].sort((a, b) => {
        const av = a[column] as string | number;
        const bv = b[column] as string | number;
        if (av === bv) return 0;
        const cmp = av < bv ? -1 : 1;
        return ascending ? cmp : -cmp;
      });
    }
    if (this.limitN !== null) rows = rows.slice(0, this.limitN);

    if (this.countMode) {
      return { data: this.headMode ? null : rows, error: null, count: rows.length };
    }
    if (this.singleMode === "single") {
      if (rows.length !== 1) {
        return { data: null, error: { message: "JSON object requested, multiple (or no) rows returned" } };
      }
      return { data: rows[0], error: null };
    }
    if (this.singleMode === "maybeSingle") {
      return { data: rows[0] ?? null, error: null };
    }
    return { data: rows, error: null };
  }

  private rowMatchesBaseFilters(row: Row, table: string): boolean {
    return this.filters.every((f) => {
      if (f.kind === "or") {
        return evaluateFilterExpression(f.expr as string, row, table);
      }
      const path = f.path as string;
      if (!(path in row)) throw new MissingColumnError(path, table);
      return f.kind === "not"
        ? !compare(f.notOp as string, row[path], f.value)
        : compare(f.kind, row[path], f.value);
    });
  }

  then<TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: unknown; error: unknown; count?: number }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    let result: { data: unknown; error: unknown; count?: number };
    try {
      result = this.run();
    } catch (err) {
      if (err instanceof MissingColumnError) {
        // PostgREST surfaces this as an error payload, not a thrown exception.
        result = { data: null, error: { message: err.message, code: "42703" } };
      } else {
        return Promise.reject(err).then(onfulfilled as never, onrejected);
      }
    }
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }
}

class FakeSupabaseImpl implements FakeSupabase {
  tables: Record<string, Row[]>;
  relations: Record<string, RelationSpec>;
  mutations: Mutation[] = [];
  insertErrors: Record<string, { message: string; code?: string }>;
  private rpcImpls: Record<string, (args: Record<string, unknown>) => unknown>;
  private authUser: { id: string; email: string } | null;

  constructor(opts: FakeSupabaseOptions) {
    this.tables = JSON.parse(JSON.stringify(opts.tables)) as Record<string, Row[]>;
    this.relations = opts.relations ?? {};
    this.rpcImpls = opts.rpc ?? {};
    this.authUser = opts.authUser ?? null;
    this.insertErrors = opts.insertErrors ?? {};
    this.rpcErrors = opts.rpcErrors ?? {};
  }

  rpcErrors: Record<string, { message: string }>;

  private idCounter = 0;

  /** Deterministic stand-in for gen_random_uuid(). */
  nextId(): string {
    this.idCounter += 1;
    return `00000000-0000-4000-8000-${String(this.idCounter).padStart(12, "0")}`;
  }

  from(table: string) {
    return new QueryBuilder({ store: this, table });
  }

  async rpc(name: string, args: Record<string, unknown> = {}) {
    const forced = this.rpcErrors[name];
    if (forced) return { data: null, error: forced };
    const impl = this.rpcImpls[name];
    if (!impl) {
      return { data: null, error: { message: `[fakeSupabase] no rpc registered for "${name}"` } };
    }
    return { data: impl(args), error: null };
  }

  auth = {
    getUser: async (_token?: string) => {
      if (!this.authUser) return { data: { user: null }, error: { message: "invalid token" } };
      return { data: { user: this.authUser }, error: null };
    },
  };

  invocations: { name: string; body: unknown }[] = [];

  functions = {
    invoke: async (name: string, opts?: { body?: unknown }) => {
      this.invocations.push({ name, body: opts?.body });
      return { data: { ok: true }, error: null };
    },
  };
}

export function createFakeSupabase(opts: FakeSupabaseOptions): FakeSupabase {
  return new FakeSupabaseImpl(opts);
}
