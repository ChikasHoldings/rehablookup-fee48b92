/**
 * Derives per-CITY facts for the city-scoped SEO families.
 *
 * WHY THIS EXISTS
 *
 * The 63 `<treatment>-in-<city>` families publish 14,087 pages, and
 * before this layer 10,317 of them were duplicates of each other. The
 * reason was structural, not stylistic: every block on those pages —
 * the fact box, the signature line, the insurance directory, the
 * licensing box — is keyed on STATE. Two cities in the same state
 * therefore rendered the same body, and the only thing that ever
 * differed was the facility list, which is empty for roughly a fifth of
 * the corpus. A page that differs only by the city name in its <h1> is
 * a doorway page.
 *
 * So this module answers a narrow question: what do we actually KNOW
 * about a city, from data already in the repo, that differs from its
 * neighbours in the same state?
 *
 * WHAT IS DERIVED, AND FROM WHERE
 *
 *   population        locationSeoData.ts (US Census / ACS, already shipped)
 *   rankInState       computed over the cities this directory lists
 *   populationBand    computed from population
 *   county/seat       countySeoData.ts `majorCities` + `seat`
 *   countyPeers       other listed cities in the same county
 *   sizePeers         the listed cities immediately above and below by population
 *   metroRole         stateAddictionStats primary/secondary metro
 *   relatedMarkets    the curated city association the caller supplies
 *
 * TRUTHFULNESS RULES BAKED IN HERE
 *
 * 1. Rank is always relative to WHAT THIS DIRECTORY LISTS, never to the
 *    state as a whole — we do not have a complete city census, and
 *    "the 4th largest city in Ohio" would be a claim we cannot support.
 *    Callers get `listedInState` so the copy can say so out loud.
 *
 * 2. `sizePeers` are neighbours by POPULATION, not by distance. Phase 2
 *    established that this codebase holds no coordinates, so nothing
 *    here may imply proximity. The field is named for what it is.
 *
 * 3. Missing data stays missing. A city with no county match gets
 *    `county: null` rather than a guess, and a city with no shipped
 *    population gets `population: null` — no rank, no band, no share —
 *    rather than an estimate. Attaching the wrong county or an invented
 *    population to a city is worse than omitting the section. Callers
 *    that publish pages for cities `locationSeoData` does not carry can
 *    pass them as `extraCities` and get whatever IS knowable about them
 *    (county, curated associations) with the rest left null.
 */

/** Population thresholds. Bands drive guidance, so the cut points are
 *  about what a market realistically supports, not round numbers. */
const BANDS = [
  { id: "major", min: 500_000, label: "major metro" },
  { id: "large", min: 250_000, label: "large city" },
  { id: "midsize", min: 100_000, label: "mid-size city" },
  { id: "small", min: 0, label: "smaller city" },
];

export function populationBand(population) {
  if (!Number.isFinite(population) || population <= 0) return null;
  return BANDS.find((b) => population >= b.min) ?? null;
}

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");

/**
 * Build the lookup once from the three shipped datasets.
 *
 * Takes the data as arguments rather than importing it, for the same
 * reason the other composers do: this file is `.mjs` so the Node-20
 * sitemap job can load it, and the `.ts` datasets can only be imported
 * under `--experimental-strip-types` or through Vite. The callers know
 * which of those they are.
 *
 * @param {{statesData: any[], stateCountyData?: any[],
 *          stateStats?: Record<string, any>,
 *          extraCities?: {name: string, slug: string, stateSlug: string,
 *                         stateAbbr?: string, relatedMarkets?: string[]}[],
 *          relatedMarkets?: Record<string, string[]>}} sources
 */
export function buildCityIndex({ statesData, stateCountyData = [], stateStats = {}, extraCities = [], relatedMarkets = {} }) {
  if (!Array.isArray(statesData)) throw new TypeError("buildCityIndex: statesData must be an array");

  // city (normalized, per state) → county record
  const countyByCity = new Map();
  // county key → listed city names, so a city can name its county peers
  const citiesByCounty = new Map();
  for (const st of stateCountyData) {
    for (const co of st.counties ?? []) {
      const rec = { name: co.name, slug: co.slug, seat: co.seat, population: co.population };
      const names = new Set([...(co.majorCities ?? []), co.seat].filter(Boolean));
      for (const cityName of names) {
        countyByCity.set(`${st.stateSlug}|${norm(cityName)}`, rec);
      }
      citiesByCounty.set(`${st.stateSlug}|${co.slug}`, [...names]);
    }
  }

  const bySlug = new Map();

  /** Registered under the slug AND under a normalized name key, because
   *  the page families disagree about slugs: `seoPageConfig` publishes
   *  /alcohol-rehab-in-glendale-az while `locationSeoData` calls the same
   *  place `glendale`. Resolving by name as a fallback stops a slug
   *  spelling from costing a city its entire profile. */
  const register = (profile) => {
    bySlug.set(profile.slug, profile);
    const nameKey = `${profile.stateSlug}|${norm(profile.city)}`;
    if (!bySlug.has(nameKey)) bySlug.set(nameKey, profile);
  };

  const countyFor = (stateSlug, cityName) => {
    const county = countyByCity.get(`${stateSlug}|${norm(cityName)}`) ?? null;
    if (!county) return { county: null, countyPeers: [] };
    const peers = (citiesByCounty.get(`${stateSlug}|${county.slug}`) ?? [])
      .filter((n) => norm(n) !== norm(cityName));
    return { county: { ...county, isSeat: norm(county.seat) === norm(cityName) }, countyPeers: peers };
  };

  for (const st of statesData) {
    const cities = (st.cities ?? []).filter((c) => Number.isFinite(c.population) && c.population > 0);
    // Rank and size-neighbours are both defined over this ordering.
    const ordered = [...cities].sort((a, b) => b.population - a.population);
    const stats = stateStats[st.slug];

    ordered.forEach((c, i) => {
      const { county, countyPeers } = countyFor(st.slug, c.name);

      // Immediate neighbours by population within the state. NOT a
      // distance relationship — see the header note.
      const sizePeers = [ordered[i - 1], ordered[i + 1]].filter(Boolean).map((p) => p.name);

      let metroRole = null;
      if (stats) {
        if (norm(stats.primaryMetro) === norm(c.name)) metroRole = "primary";
        else if ((stats.secondaryMetros ?? []).some((m) => norm(m) === norm(c.name))) metroRole = "secondary";
      }

      const statePopulation = stats?.populationMillions ? stats.populationMillions * 1_000_000 : null;

      register({
        slug: c.slug,
        city: c.name,
        state: st.name,
        stateSlug: st.slug,
        stateAbbr: st.abbreviation,
        population: c.population,
        rankInState: i + 1,
        listedInState: ordered.length,
        band: populationBand(c.population),
        statePopulation,
        stateSharePct: statePopulation ? Math.round((c.population / statePopulation) * 1000) / 10 : null,
        county,
        countyPeers,
        sizePeers,
        relatedMarkets: relatedMarkets[c.slug] ?? [],
        metroRole,
        largestListedInState: ordered[0]?.name ?? null,
      });
    });
  }

  // Cities this site publishes pages for that `locationSeoData` does not
  // carry. They get a reduced profile — county and curated associations
  // if those are known, nulls everywhere else. A reduced profile still
  // names a county and a set of peer cities, which is enough for the page
  // to say something true that no other city's page says.
  const stateBySlug = new Map(statesData.map((st) => [st.slug, st]));
  for (const extra of extraCities) {
    if (!extra?.slug || !extra?.stateSlug || !extra?.name) continue;
    if (bySlug.has(extra.slug)) continue;
    if (bySlug.has(`${extra.stateSlug}|${norm(extra.name)}`)) continue;

    const st = stateBySlug.get(extra.stateSlug);
    const stats = stateStats[extra.stateSlug];
    const { county, countyPeers } = countyFor(extra.stateSlug, extra.name);
    const ordered = [...(st?.cities ?? [])]
      .filter((c) => Number.isFinite(c.population) && c.population > 0)
      .sort((a, b) => b.population - a.population);

    register({
      slug: extra.slug,
      city: extra.name,
      state: st?.name ?? extra.stateSlug,
      stateSlug: extra.stateSlug,
      stateAbbr: extra.stateAbbr ?? st?.abbreviation ?? "",
      population: null,
      rankInState: null,
      listedInState: ordered.length,
      band: null,
      statePopulation: stats?.populationMillions ? stats.populationMillions * 1_000_000 : null,
      stateSharePct: null,
      county,
      countyPeers,
      sizePeers: [],
      relatedMarkets: extra.relatedMarkets ?? relatedMarkets[extra.slug] ?? [],
      metroRole: null,
      largestListedInState: ordered[0]?.name ?? null,
    });
  }

  return bySlug;
}
