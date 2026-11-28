/**
 * Which location hub a facility can link to.
 *
 * City hubs exist only for the cities in src/data/locationSeoData.ts (1,103
 * as of 2026-11-28). Facility profiles used to link
 * /rehab-centers/{state}/{lowercased city} for every facility, so 2,165 of
 * 3,796 profiles pointed at a city page that does not exist (a 404 for
 * crawlers and visitors alike; AI crawlers fetched thousands of them), and
 * some pointed at the wrong slug ("arlington" where the hub is
 * "arlington-tx"). Both renderers (the SPA and
 * scripts/generate-facility-profiles-html.mjs) resolve the link here.
 *
 * @param {Array<{ name: string, slug: string, cities: Array<{ name: string, slug: string }> }>} states
 */
export function createLocationHubResolver(states) {
  const slugify = (s) =>
    String(s ?? "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const byState = new Map();
  for (const st of states) {
    const cities = new Map();
    for (const c of st.cities) {
      cities.set(c.name.trim().toLowerCase(), c.slug);
      cities.set(c.slug, c.slug);
    }
    const entry = { slug: st.slug, cities };
    byState.set(st.name.trim().toLowerCase(), entry);
    byState.set(st.slug, entry);
  }
  const findState = (state) => byState.get(String(state ?? "").trim().toLowerCase()) ?? byState.get(slugify(state));

  return {
    /** `/rehab-centers/{state}` for a known state name or slug, else null. */
    statePath(state) {
      const st = findState(state);
      return st ? `/rehab-centers/${st.slug}` : null;
    },
    /** `/rehab-centers/{state}/{city}` only when that city hub exists, else null. */
    cityPath(state, city) {
      const st = findState(state);
      if (!st) return null;
      const slug = st.cities.get(String(city ?? "").trim().toLowerCase()) ?? st.cities.get(slugify(city));
      return slug ? `/rehab-centers/${st.slug}/${slug}` : null;
    },
  };
}
