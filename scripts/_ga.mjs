// Single source of truth for the GA4 measurement ID used by the SEO
// generator scripts. Reads VITE_GA_MEASUREMENT_ID from the environment
// (set on Vercel as a project env var so the next rotation is one line)
// with a fallback to the current production tag.
//
// NOTE: The frontend (index.html + analytics modules) also uses the
// VITE_GA_MEASUREMENT_ID env var. Keeping the variable name identical
// across both contexts means one Vercel env var update covers everything.

export const GA_MEASUREMENT_ID =
  process.env.VITE_GA_MEASUREMENT_ID?.trim() || "G-MM5K8398LY";

// Inline snippet used in <head> of every prerendered SEO page. Standard
// GA4 boilerplate.
export const gtagSnippet = (id = GA_MEASUREMENT_ID) =>
  `  <script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>\n` +
  `  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');</script>`;
