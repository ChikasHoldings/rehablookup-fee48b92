/**
 * Route-prefix grouping for 404 events.
 *
 * The admin 404 monitor (and the alert digest edge function) groups raw
 * `not_found_events.path` rows into a small set of stable, human-readable
 * pattern buckets — e.g. all
 *   /rehab-marketing/california/county/<slug>
 *   /rehab-marketing/texas/county/<slug>/insurance/<insurer>
 * become a single bucket: "/rehab-marketing/:state/county/...".
 *
 * Why hand-curate vs. derive from SmartCatchAll? The catch-all matches many
 * partially-overlapping prefixes; for ops triage we want a flatter, fixed
 * taxonomy that maps cleanly onto the redirect-fixing workflow.
 *
 * Order matters: the first matching rule wins. Put more specific prefixes
 * before broader ones.
 */

export interface PatternRule {
  /** Stable bucket id (used for dedup keys in alerts). */
  id: string;
  /** Human-readable label shown in the UI. */
  label: string;
  /** Returns true if this rule matches the given path. */
  match: (path: string) => boolean;
}

/**
 * Hand-curated rule list. Add/remove as new SEO clusters appear.
 * Each `match` should be cheap (string ops, no regex backtracking).
 */
const RULES: PatternRule[] = [
  {
    id: "rehab-marketing-county-insurance",
    label: "/rehab-marketing/:state/county/:slug/insurance/:insurer",
    match: (p) =>
      p.startsWith("/rehab-marketing/") &&
      p.includes("/county/") &&
      p.includes("/insurance/"),
  },
  {
    id: "rehab-marketing-county-treatment",
    label: "/rehab-marketing/:state/county/:slug/:treatment",
    match: (p) => {
      if (!p.startsWith("/rehab-marketing/") || !p.includes("/county/")) return false;
      const parts = p.split("/").filter(Boolean);
      // /rehab-marketing/<state>/county/<slug>/<treatment>
      return parts.length >= 5 && parts[2] === "county";
    },
  },
  {
    id: "rehab-marketing-county",
    label: "/rehab-marketing/:state/county/:slug",
    match: (p) => p.startsWith("/rehab-marketing/") && p.includes("/county/"),
  },
  {
    id: "rehab-marketing-other",
    label: "/rehab-marketing/...",
    match: (p) => p.startsWith("/rehab-marketing/"),
  },
  {
    id: "best-rehab-centers",
    label: "/best-rehab-centers/...",
    match: (p) => p.startsWith("/best-rehab-centers/"),
  },
  {
    id: "rehab-centers-state-city-treatment",
    label: "/rehab-centers/:state/:city/:treatment",
    match: (p) => p.startsWith("/rehab-centers/") && p.split("/").filter(Boolean).length >= 4,
  },
  {
    id: "rehab-centers-state-city",
    label: "/rehab-centers/:state/:city",
    match: (p) => p.startsWith("/rehab-centers/") && p.split("/").filter(Boolean).length === 3,
  },
  {
    id: "rehab-centers-state",
    label: "/rehab-centers/:state",
    match: (p) => p.startsWith("/rehab-centers/"),
  },
  {
    id: "center-profile",
    label: "/center/:slug",
    match: (p) => p.startsWith("/center/"),
  },
  {
    id: "near-me",
    label: "/:something/near-me/...",
    match: (p) => p.includes("/near-me"),
  },
  {
    id: "insurance-cluster",
    label: "/insurance/...",
    match: (p) => p.startsWith("/insurance/"),
  },
  {
    id: "treatment-types-cluster",
    label: "/treatment-types/...",
    match: (p) => p.startsWith("/treatment-types/"),
  },
  {
    id: "resources-blog",
    label: "/resources/:slug",
    match: (p) => p.startsWith("/resources/"),
  },
  {
    id: "providers-resources",
    label: "/providers/resources/:slug",
    match: (p) => p.startsWith("/providers/resources/"),
  },
];

const FALLBACK: PatternRule = {
  id: "other",
  label: "Other",
  match: () => true,
};

/**
 * Resolve a path to its pattern bucket. Always returns a rule (the
 * "Other" fallback catches anything not in the curated list).
 */
export function resolvePattern(path: string): PatternRule {
  for (const rule of RULES) {
    if (rule.match(path)) return rule;
  }
  return FALLBACK;
}

export function getAllPatternRules(): readonly PatternRule[] {
  return RULES;
}
