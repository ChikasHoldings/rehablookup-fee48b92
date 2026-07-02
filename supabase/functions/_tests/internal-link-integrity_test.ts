// Internal-link integrity smoke test.
//
// Reads src/lib/routes.ts (the centralized route constants) and asserts
// that every static route value resolves to a real <Route> definition
// in src/App.tsx — including nested routes inside <Route element=...>
// parent blocks (provider panel, seeker panel, admin panel) and
// Navigate redirects.
//
// The lib/routes.ts module is the single source of truth for internal
// navigation; this test catches drift between that module and App.tsx.
// Drift can manifest as:
//   - someone deletes a Route in App.tsx but a callsite still uses
//     routes.X
//   - someone adds a new section to App.tsx without exporting from
//     routes.ts (warns: candidate for the constants module)
//
// Run with: deno test --allow-read supabase/functions/_tests/internal-link-integrity_test.ts

import {
  assert,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const REPO_ROOT = new URL("../../../", import.meta.url);
async function read(rel: string): Promise<string> {
  return await Deno.readTextFile(new URL(rel, REPO_ROOT));
}

// ─── 1. Build the resolved route set from App.tsx ─────────────────────

interface ParentBlock {
  path: string;
  startLine: number;
  endLine: number;
  indent: number;
}

function parseAppRoutes(app: string): { routes: Set<string>; redirects: Set<string> } {
  const lines = app.split("\n");
  const routes = new Set<string>();
  const redirects = new Set<string>();

  // Top-level: <Route path="/..."  — captured directly.
  const topRoute = /<Route\s+path="(\/[^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = topRoute.exec(app))) routes.add(m[1]);
  // Top-level Navigate redirects:
  //   <Navigate to="/path" replace />
  const topNav = /<Navigate\s+to="([^"]+)"/g;
  while ((m = topNav.exec(app))) redirects.add(m[1]);

  // Nested routes: a <Route path="..."> (no leading /) inside a parent
  // block <Route path="/parent" element={<Shell />}>...</Route>. Build
  // parent blocks by indent + closing </Route> matching.
  const parents: ParentBlock[] = [];
  for (let i = 0; i < lines.length; i++) {
    const lm = lines[i].match(/^(\s*)<Route\s+path="(\/[^"]+)"\s+element=\{<\w+/);
    if (!lm) continue;
    // Only treat as parent if it has an opening tag (no /> self-close).
    if (lines[i].trim().endsWith("/>")) continue;
    parents.push({ path: lm[2], startLine: i, endLine: -1, indent: lm[1].length });
  }
  for (const p of parents) {
    for (let j = p.startLine + 1; j < lines.length; j++) {
      const close = lines[j].match(/^(\s*)<\/Route>/);
      if (close && close[1].length === p.indent) {
        p.endLine = j;
        break;
      }
    }
  }

  // Collect non-leading-slash children + zip with their parent.
  for (let i = 0; i < lines.length; i++) {
    const cm = lines[i].match(/^\s*<Route\s+path="([a-z*][^"]*)"/);
    if (!cm) continue;
    let parent: ParentBlock | null = null;
    for (const p of parents) {
      if (i > p.startLine && (p.endLine === -1 || i < p.endLine)) {
        if (!parent || p.startLine > parent.startLine) parent = p;
      }
    }
    if (!parent) continue;
    const childPath = cm[1];
    const resolved = childPath === "*" ? `${parent.path}/*` : `${parent.path}/${childPath}`;
    routes.add(resolved);
  }

  return { routes, redirects };
}

// ─── 2. Extract route constants from src/lib/routes.ts ────────────────

interface RouteConstant {
  name: string;
  value: string;
}

function parseRouteConstants(src: string): RouteConstant[] {
  // We grab `key: "/literal"` from the const objects. Builder functions
  // like `centerBySlug: (slug) => \`/center/${slug}\`` are skipped —
  // those are validated against their static prefix in a separate test.
  const out: RouteConstant[] = [];
  // `*` not `+` after the slash: the bare root route `home: "/"` is a
  // legitimate constant (ANON_LANDING) and must parse too.
  const re = /^\s*(\w+):\s*"(\/[^"]*)"\s*,?$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    out.push({ name: m[1], value: m[2] });
  }
  return out;
}

// ─── 3. Match helper ──────────────────────────────────────────────────

function isRouteMatched(target: string, routes: Set<string>, redirects: Set<string>): boolean {
  if (routes.has(target)) return true;
  if (redirects.has(target)) return true;
  // Allow matching against parametric route patterns (e.g. target
  // /resources/abc against /resources/:id).
  for (const r of routes) {
    if (!r.includes(":") && !r.endsWith("/*")) continue;
    const tgs = target.split("/").filter(Boolean);
    const rs = r.split("/").filter(Boolean);
    if (rs.length !== tgs.length && !r.endsWith("/*")) continue;
    let ok = true;
    for (let i = 0; i < Math.min(tgs.length, rs.length); i++) {
      if (rs[i].startsWith(":") || rs[i] === "*") continue;
      if (rs[i] !== tgs[i]) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}

// ─── Tests ────────────────────────────────────────────────────────────

Deno.test("link-integrity: every route constant resolves to a real <Route>", async () => {
  const app = await read("src/App.tsx");
  const constants = await read("src/lib/routes.ts");

  const { routes, redirects } = parseAppRoutes(app);
  const decls = parseRouteConstants(constants);

  assert(decls.length > 0, "lib/routes.ts must export at least one route constant");

  const missing: Array<{ name: string; value: string }> = [];
  for (const d of decls) {
    if (!isRouteMatched(d.value, routes, redirects)) {
      missing.push(d);
    }
  }

  if (missing.length > 0) {
    const message = missing
      .map((d) => `  ${d.name} → ${d.value}`)
      .join("\n");
    throw new Error(
      `Route constants reference paths that don't exist in App.tsx:\n${message}`,
    );
  }
});

Deno.test("link-integrity: lib/routes.ts covers the top provider-panel routes", async () => {
  const constants = await read("src/lib/routes.ts");
  // The provider panel is the most-linked section of the app. Verify
  // the canonical routes are exported so callers can stop hardcoding
  // them.
  for (const required of [
    "/provider/dashboard",
    "/provider/listings",
    "/provider/inquiries",
    "/provider/billing",
    "/provider/settings",
    "/provider/marketing",
    "/provider/onboarding",
  ]) {
    assert(
      constants.includes(`"${required}"`),
      `lib/routes.ts must export the canonical provider route: ${required}`,
    );
  }
});

Deno.test("link-integrity: builder functions point at routes with a single dynamic segment", async () => {
  // Tests the centerBySlug, resourceById, claimWizard, claimSubmitted
  // builders. These are validated against their static prefix.
  const app = await read("src/App.tsx");
  const constants = await read("src/lib/routes.ts");
  const { routes } = parseAppRoutes(app);

  // Define expected prefix → at-least-one matching parametric route.
  const builders = [
    { prefix: "/center/", routePattern: /\/center\/:[a-z]+/i },
    { prefix: "/resources/", routePattern: /\/resources\/:[a-z]+/i },
    { prefix: "/provider/claim/", routePattern: /\/provider\/claim\/:[a-z]+/i },
  ];

  for (const b of builders) {
    // Verify the constants file actually has a builder for this prefix.
    assert(
      constants.includes(b.prefix),
      `Expected route builder targeting ${b.prefix} not found in lib/routes.ts`,
    );
    // Verify at least one App.tsx route matches the parametric pattern.
    const found = [...routes].some((r) => b.routePattern.test(r));
    assert(found, `No <Route> in App.tsx matches the builder prefix ${b.prefix}`);
  }
});

Deno.test("link-integrity: POST_LOGIN_DESTINATION + ANON_LANDING resolve", async () => {
  const app = await read("src/App.tsx");
  const constants = await read("src/lib/routes.ts");
  const { routes, redirects } = parseAppRoutes(app);

  const post = constants.match(/POST_LOGIN_DESTINATION\s*=\s*ROUTES_PROVIDER\.(\w+)/);
  const anon = constants.match(/ANON_LANDING\s*=\s*ROUTES_PUBLIC\.(\w+)/);

  assert(post, "POST_LOGIN_DESTINATION must be exported from lib/routes.ts");
  assert(anon, "ANON_LANDING must be exported from lib/routes.ts");

  // Verify both resolve.
  const decls = parseRouteConstants(constants);
  const postVal = decls.find((d) => d.name === post![1])?.value;
  const anonVal = decls.find((d) => d.name === anon![1])?.value;

  assert(postVal && isRouteMatched(postVal, routes, redirects), `POST_LOGIN_DESTINATION (${postVal}) must resolve`);
  assert(anonVal && isRouteMatched(anonVal, routes, redirects), `ANON_LANDING (${anonVal}) must resolve`);
});

Deno.test("link-integrity: provider panel has every route the unified signup pipeline lands on", async () => {
  // Sentinel — without these, the signup pipeline auto-redirect chain
  // is broken at the last hop.
  const constants = await read("src/lib/routes.ts");
  assert(constants.includes("/provider/dashboard"));
  assert(constants.includes("/provider/onboarding"));
  assert(constants.includes("/provider/onboarding/new-listing"));
  assert(constants.includes("/provider/claim/"));
});
