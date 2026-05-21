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
// NOTE: send_page_view stays at its default (true) here, unlike in
// index.html. These prerendered pages are static HTML served to crawlers
// and direct hits — they do NOT bootstrap React, so RouteChangeTracker
// never mounts and the auto page_view is the only one we get.
export const gtagSnippet = (id = GA_MEASUREMENT_ID) =>
  `  <script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>\n` +
  `  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');</script>`;

// Variant for prerendered HTMLs that ALSO bootstrap the SPA via
// `<script src="/src/main.tsx">` (the auth-page family: /login, /signup,
// /account, /search-results, /seeker/*). For these, the gtag auto
// page_view would fire on the static-HTML load, and then RouteChangeTracker
// would fire a second page_view once React mounts — double-counting every
// visit. Disable auto here so the SPA's RouteChangeTracker is the single
// source of page_view events on this page family, matching index.html.
export const gtagSnippetForSpaShell = (id = GA_MEASUREMENT_ID) =>
  `  <script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>\n` +
  `  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}',{send_page_view:false});</script>`;
