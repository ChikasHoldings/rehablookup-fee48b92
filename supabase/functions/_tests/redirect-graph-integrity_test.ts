// Redirect graph integrity test.
//
// Phase AC scan caught two specific defects in App.tsx's redirect
// graph that the phase Z route-integrity test couldn't see (it only
// looked at <Link to>, not at <Route path=X element={<Navigate to=Y>}):
//
//   1. Chain: /provider/signup → /provider-signup → /provider/onboarding.
//      Two-hop redirect chains add a network round-trip and break
//      query-param preservation (each hop drops them by default).
//
//   2. <Route path="/sitemap" element={<Navigate to="/sitemap-index.xml" />}>
//      React Router's <Navigate> doesn't fetch static assets — it
//      treats /sitemap-index.xml as an SPA path and the catch-all
//      renders NotFound. Fixed by using <StaticFileRedirect> which
//      does window.location.replace().
//
// Both defects are now closed; this test prevents regression.
//
// Run with: deno test --allow-read supabase/functions/_tests/redirect-graph-integrity_test.ts

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const REPO_ROOT = new URL("../../../", import.meta.url);
async function read(rel: string): Promise<string> {
  return await Deno.readTextFile(new URL(rel, REPO_ROOT));
}

interface Parent {
  path: string;
  startLine: number;
  endLine: number;
  indent: number;
}

async function parseAppRoutes(): Promise<{ routes: Set<string>; redirects: Map<string, string> }> {
  const app = await read("src/App.tsx");
  const lines = app.split("\n");

  const routes = new Set<string>();
  const redirects = new Map<string, string>();
  let m: RegExpExecArray | null;
  const topRouteRe = /<Route\s+path="(\/[^"]+)"/g;
  while ((m = topRouteRe.exec(app))) routes.add(m[1]);
  const redirRe = /<Route\s+path="(\/[^"]+)"\s+element=\{<Navigate\s+to="([^"]+)"/g;
  while ((m = redirRe.exec(app))) redirects.set(m[1], m[2]);

  const parents: Parent[] = [];
  for (let i = 0; i < lines.length; i++) {
    const lm = lines[i].match(/^(\s*)<Route\s+path="(\/[^"]+)"\s+element=\{<\w+/);
    if (!lm || lines[i].trim().endsWith("/>")) continue;
    parents.push({ path: lm[2], startLine: i, endLine: -1, indent: lm[1].length });
  }
  for (const p of parents) {
    for (let j = p.startLine + 1; j < lines.length; j++) {
      const close = lines[j].match(/^(\s*)<\/Route>/);
      if (close && close[1].length === p.indent) { p.endLine = j; break; }
    }
  }
  for (let i = 0; i < lines.length; i++) {
    const cm = lines[i].match(/^\s*<Route\s+path="([a-z*][^"]*)"/);
    if (!cm) continue;
    let parent: Parent | null = null;
    for (const p of parents) {
      if (i > p.startLine && (p.endLine === -1 || i < p.endLine)) {
        if (!parent || p.startLine > parent.startLine) parent = p;
      }
    }
    if (!parent) continue;
    const childPath = cm[1];
    routes.add(childPath === "*" ? `${parent.path}/*` : `${parent.path}/${childPath}`);
  }
  return { routes, redirects };
}

function isRouteMatched(target: string, routes: Set<string>): boolean {
  if (routes.has(target)) return true;
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

Deno.test("redirect-graph: no <Route><Navigate> chains (A → B → C)", async () => {
  const { redirects } = await parseAppRoutes();
  const chains: string[] = [];
  for (const [from, to] of redirects) {
    if (redirects.has(to)) {
      chains.push(`${from} → ${to} → ${redirects.get(to)}`);
    }
  }
  assertEquals(
    chains.length,
    0,
    `Redirect chains add round-trips and drop query params. Collapse them to direct redirects:\n${chains.join("\n")}`,
  );
});

Deno.test("redirect-graph: every <Navigate to=...> target resolves to a real route", async () => {
  const { routes, redirects } = await parseAppRoutes();
  const dead: string[] = [];
  for (const [from, to] of redirects) {
    // Strip query/hash + template fragments.
    const target = to.split("?")[0].split("#")[0].split("${")[0];
    if (!target.startsWith("/")) continue;
    // Static XML/PDF/TXT files in /public bypass React Router — those
    // should use StaticFileRedirect, not <Navigate>.
    if (/\.(xml|pdf|txt|json)$/i.test(target)) {
      dead.push(`${from} → ${to}  (static file — must use StaticFileRedirect, not <Navigate>)`);
      continue;
    }
    if (!isRouteMatched(target, routes)) {
      dead.push(`${from} → ${to}`);
    }
  }
  assertEquals(
    dead.length,
    0,
    `<Navigate to=...> targeting routes that don't exist:\n${dead.join("\n")}`,
  );
});

Deno.test("redirect-graph: /sitemap uses StaticFileRedirect (not <Navigate>)", async () => {
  const app = await read("src/App.tsx");
  // The static-file redirect helper must be the implementation for
  // /sitemap → /sitemap-index.xml. React Router's <Navigate> doesn't
  // fetch static assets.
  assert(
    /<Route\s+path="\/sitemap"\s+element=\{<StaticFileRedirect\s+to="\/sitemap-index\.xml"/.test(app),
    "/sitemap route must use <StaticFileRedirect to='/sitemap-index.xml' />",
  );
});

Deno.test("redirect-graph: StaticFileRedirect helper exists + uses window.location.replace", async () => {
  const src = await read("src/components/seo/StaticFileRedirect.tsx");
  assert(src.includes("window.location.replace"), "StaticFileRedirect must use window.location.replace, not .href");
  assert(
    /export function StaticFileRedirect/.test(src),
    "StaticFileRedirect must be a named export",
  );
});

Deno.test("redirect-graph: /provider/signup goes directly to /provider/onboarding (no 2-hop chain)", async () => {
  const { redirects } = await parseAppRoutes();
  assertEquals(
    redirects.get("/provider/signup"),
    "/provider/onboarding",
    "/provider/signup must redirect directly to /provider/onboarding, not through /provider-signup",
  );
});
