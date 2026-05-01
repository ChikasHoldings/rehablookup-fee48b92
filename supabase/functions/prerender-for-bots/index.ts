import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-prerender-request',
};

// Bot detection patterns - comprehensive list of search engine and social crawlers
const BOT_PATTERNS = [
  // Major search engines
  'googlebot', 'google-inspectiontool', 'googleother', 'google-extended',
  'storebot-google', 'bingbot', 'msnbot', 'slurp', 'duckduckbot',
  'baiduspider', 'yandexbot', 'sogou', 'exabot', 'ia_archiver',
  'applebot', 'seznambot', 'naverbot',
  // Social media crawlers
  'facebookexternalhit', 'facebot', 'twitterbot', 'linkedinbot',
  'pinterest', 'whatsapp', 'telegrambot', 'slackbot', 'discordbot',
  'redditbot', 'tumblr', 'snapchat',
  // SEO tools
  'semrushbot', 'ahrefsbot', 'mj12bot', 'dotbot', 'rogerbot',
  'screaming frog', 'seokicks', 'sistrix', 'siteauditbot',
  // AI crawlers
  'gptbot', 'chatgpt-user', 'claude-web', 'anthropic-ai',
  'cohere-ai', 'perplexitybot', 'youbot',
  // Other crawlers
  'petalbot', 'bytespider', 'dataforseobot', 'coccocbot',
  'amazonbot', 'yeti', 'archive.org_bot', 'ccbot',
];

// Routes that should be prerendered for SEO
const SEO_EXACT_ROUTES = [
  '/', '/for-providers', '/concierge', '/international', '/international/apply',
  '/about', '/contact', '/privacy-policy', '/terms-of-service', '/resources',
  '/how-it-works', '/insurance', '/locations', '/treatment-types',
  '/rehab-centers', '/cost-estimator',
];

function isBot(userAgent: string): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_PATTERNS.some(bot => ua.includes(bot));
}

function shouldPrerender(path: string): boolean {
  const normalizedPath = path.endsWith('/') && path !== '/'
    ? path.slice(0, -1)
    : path;

  if (SEO_EXACT_ROUTES.includes(normalizedPath)) return true;
  if (normalizedPath.startsWith('/rehab-centers')) return true;
  if (normalizedPath.startsWith('/treatment-types')) return true;
  if (normalizedPath.startsWith('/insurance')) return true;
  if (normalizedPath.startsWith('/locations')) return true;
  if (normalizedPath.startsWith('/resources/') && normalizedPath.split('/').length === 3) return true;
  if (normalizedPath.startsWith('/providers/resources/') && normalizedPath.split('/').length === 4) return true;
  if (normalizedPath.startsWith('/provider-guides/')) return true;
  if (normalizedPath.endsWith('-near-me') && normalizedPath.startsWith('/')) return true;
  if (normalizedPath.startsWith('/center/')) return true;
  if (normalizedPath.startsWith('/us-rehab')) return true;

  return false;
}

interface FirecrawlResponse {
  success: boolean;
  data?: {
    html?: string;
    markdown?: string;
    metadata?: {
      title?: string;
      description?: string;
      statusCode?: number;
    };
  };
  error?: string;
}

interface CacheEntry {
  html: string;
  cached_at: string;
  status_code: number;
}

// Cache TTL in seconds
const CACHE_TTL_DYNAMIC = 3600; // 1 hour
const CACHE_TTL_STATIC = 86400; // 24 hours

function getCacheTTL(path: string): number {
  const staticPaths = ['/privacy-policy', '/terms-of-service', '/about', '/contact', '/how-it-works'];
  if (staticPaths.includes(path)) return CACHE_TTL_STATIC;
  return CACHE_TTL_DYNAMIC;
}

async function getCachedHtml(supabase: ReturnType<typeof createClient>, path: string): Promise<CacheEntry | null> {
  try {
    const { data, error } = await supabase
      .from('prerender_cache')
      .select('html, cached_at, status_code')
      .eq('path', path)
      .single();

    if (error || !data) return null;

    const cacheData = data as { html: string; cached_at: string; status_code: number };
    const cachedAt = new Date(cacheData.cached_at);
    const now = new Date();
    const ageSeconds = (now.getTime() - cachedAt.getTime()) / 1000;
    const ttl = getCacheTTL(path);

    if (ageSeconds > ttl) {
      console.log('[Prerender] Cache expired for', path, '(age:', Math.round(ageSeconds), 's)');
      return null;
    }

    console.log('[Prerender] Cache hit for', path);
    return { html: cacheData.html, cached_at: cacheData.cached_at, status_code: cacheData.status_code };
  } catch (err) {
    console.error('[Prerender] Cache read error:', err);
    return null;
  }
}

async function setCachedHtml(supabase: ReturnType<typeof createClient>, path: string, html: string, statusCode: number): Promise<void> {
  try {
    await supabase.from('prerender_cache').upsert(
      { path, html, status_code: statusCode, cached_at: new Date().toISOString() },
      { onConflict: 'path' }
    );
  } catch (err) {
    console.error('[Prerender] Cache write error:', err);
  }
}

async function renderPage(url: string, apiKey: string): Promise<{ html: string; statusCode: number }> {
  console.log('[Prerender] Rendering URL:', url);

  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, formats: ['html'], waitFor: 3000, onlyMainContent: false }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Prerender] Firecrawl API error:', response.status, errorText);
    throw new Error('Firecrawl API returned ' + response.status);
  }

  const data: FirecrawlResponse = await response.json();

  if (!data.success || !data.data?.html) {
    throw new Error(data.error || 'No HTML returned');
  }

  return { html: data.data.html, statusCode: data.data.metadata?.statusCode || 200 };
}

// Escape HTML to prevent XSS in meta tags
function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface BlogArticleRow {
  title: string;
  excerpt: string;
  meta_title: string | null;
  meta_description: string | null;
  image_url: string | null;
  author: string | null;
  published_at: string | null;
  category_label: string | null;
  seo_keywords: string[] | null;
}

// Fetch blog article metadata from DB
async function fetchBlogArticle(supabase: ReturnType<typeof createClient>, slug: string): Promise<BlogArticleRow | null> {
  const { data } = await supabase
    .from('blog_articles')
    .select('title, excerpt, meta_title, meta_description, image_url, author, published_at, category_label, seo_keywords')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();
  return (data as BlogArticleRow | null) ?? null;
}

interface OgMeta {
  title: string;
  description: string;
  image: string;
  url: string;
  type: string;
  publishedTime?: string;
  author?: string;
  section?: string;
  jsonLd?: string;
  robots?: string;
}

function buildOgHtml(meta: OgMeta, bodyContent: string): string {
  const safeTitle = escHtml(meta.title);
  const safeDesc = escHtml(meta.description).slice(0, 200);
  const safeImage = escHtml(meta.image);
  const safeUrl = escHtml(meta.url);
  const robotsContent = escHtml(meta.robots || 'index, follow, max-image-preview:large, max-snippet:-1');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}">
  <meta name="robots" content="${robotsContent}">
  <link rel="canonical" href="${safeUrl}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="${escHtml(meta.type)}">
  <meta property="og:site_name" content="RehabLookup">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${safeTitle}">
  <meta property="og:url" content="${safeUrl}">
  <meta property="og:locale" content="en_US">${meta.publishedTime ? `
  <meta property="article:published_time" content="${escHtml(meta.publishedTime)}">` : ''}${meta.author ? `
  <meta property="article:author" content="${escHtml(meta.author)}">` : ''}${meta.section ? `
  <meta property="article:section" content="${escHtml(meta.section)}">` : ''}

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@rehablookup">
  <meta name="twitter:creator" content="@rehablookup">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${safeImage}">
  <meta name="twitter:image:alt" content="${safeTitle}">${meta.jsonLd ? `

  <script type="application/ld+json">${meta.jsonLd}</script>` : ''}

  <style>
    body { font-family: 'Inter', -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #1B365D; }
    h1 { font-size: 2rem; margin-bottom: 16px; }
    h2 { font-size: 1.25rem; margin-top: 32px; margin-bottom: 8px; }
    p { line-height: 1.7; color: #333; }
    a { color: #2563eb; }
    ul { line-height: 1.7; color: #333; }
  </style>
</head>
<body>
  <header><a href="/">RehabLookup</a></header>
  <main>
    ${bodyContent}
  </main>
  <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.875rem; color: #666;">
    <p>&copy; ${new Date().getFullYear()} RehabLookup. All rights reserved.</p>
  </footer>
</body>
</html>`;
}

interface FacilityRow {
  id: string;
  name: string;
  description: string | null;
  city: string;
  state: string;
  address: string | null;
  zip_code: string | null;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
  gallery_urls: string[] | null;
  facility_type: string | null;
  gender_served: string | null;
  bed_count: string | null;
  year_established: number | null;
  verified: boolean | null;
  accepts_international_patients: boolean | null;
}

// Build a fully-crawlable HTML response for a treatment center profile.
// Includes canonical, OG/Twitter, and MedicalBusiness JSON-LD plus a rich
// body containing services, insurance, address, and phone — everything
// Googlebot needs to index the page without executing JS.
function buildFacilityHtml(
  path: string,
  f: FacilityRow,
  treatments: string[],
  insurances: string[],
  isPro: boolean = false,
): string {
  const url = `${BASE_URL}${path}`;
  const title = `${f.name} - ${f.city}, ${f.state} | RehabLookup`;
  const baseDesc = f.description?.trim()
    ? f.description.trim()
    : `${f.name} is a ${f.facility_type || 'addiction treatment'} center in ${f.city}, ${f.state}. View services, insurance accepted, contact info, and more.`;
  const description = baseDesc.slice(0, 200);
  const image = f.logo_url || (f.gallery_urls && f.gallery_urls[0]) || DEFAULT_OG_IMAGE;

  // JSON-LD: MedicalBusiness is the most accurate type for a treatment center.
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'MedicalBusiness',
    name: f.name,
    description: baseDesc,
    url,
    // Phone is a Pro-only contact channel — omit from JSON-LD for non-Pro
    // listings so structured data matches the on-page UX (no leakage to bots).
    telephone: isPro && f.phone ? f.phone : undefined,
    image: image,
    address: {
      '@type': 'PostalAddress',
      streetAddress: f.address || undefined,
      addressLocality: f.city,
      addressRegion: f.state,
      postalCode: f.zip_code || undefined,
      addressCountry: 'US',
    },
    medicalSpecialty: 'Addiction Medicine',
    availableService: treatments.map((t) => ({
      '@type': 'MedicalProcedure',
      name: t,
    })),
  });

  const treatmentsList = treatments.length
    ? `<h2>Treatment Programs</h2><ul>${treatments.map((t) => `<li>${escHtml(t)}</li>`).join('')}</ul>`
    : '';
  const insuranceList = insurances.length
    ? `<h2>Insurance Accepted</h2><ul>${insurances.map((i) => `<li>${escHtml(i)}</li>`).join('')}</ul>`
    : '';
  const facts: string[] = [];
  if (f.facility_type) facts.push(`<li><strong>Facility Type:</strong> ${escHtml(f.facility_type)}</li>`);
  if (f.gender_served) facts.push(`<li><strong>Gender Served:</strong> ${escHtml(f.gender_served)}</li>`);
  if (f.bed_count) facts.push(`<li><strong>Bed Count:</strong> ${escHtml(f.bed_count)}</li>`);
  if (f.year_established) facts.push(`<li><strong>Established:</strong> ${f.year_established}</li>`);
  if (f.verified) facts.push(`<li><strong>Verified Provider</strong></li>`);
  const factsList = facts.length ? `<h2>About This Center</h2><ul>${facts.join('')}</ul>` : '';

  const fullAddress = [f.address, f.city, f.state, f.zip_code].filter(Boolean).join(', ');
  const contactBlock = `<h2>Contact</h2>
    <address style="font-style: normal;">
      <strong>${escHtml(f.name)}</strong><br>
      ${fullAddress ? `${escHtml(fullAddress)}<br>` : ''}
      ${isPro && f.phone ? `Phone: <a href="tel:${escHtml(f.phone)}">${escHtml(f.phone)}</a><br>` : ''}
      ${f.website ? `Website: <a href="${escHtml(f.website)}" rel="nofollow noopener">${escHtml(f.website)}</a>` : ''}
    </address>`;

  const body = `<h1>${escHtml(f.name)}</h1>
    <p><strong>${escHtml(f.city)}, ${escHtml(f.state)}</strong></p>
    <p>${escHtml(baseDesc)}</p>
    ${factsList}
    ${treatmentsList}
    ${insuranceList}
    ${contactBlock}
    <p style="margin-top: 32px;"><a href="/rehab-centers">Browse all treatment centers</a></p>`;

  return buildOgHtml(
    {
      title,
      description,
      image,
      url,
      type: 'website',
      jsonLd,
    },
    body,
  );
}

// Emits a noindex page for unknown center slugs so Google doesn't bank
// thin/duplicate URLs while the SPA still renders the friendly 404 UI.
function buildNotFoundCenterHtml(path: string): string {
  return buildOgHtml(
    {
      title: 'Treatment Center Not Found | RehabLookup',
      description: 'This treatment center listing is no longer available. Browse our directory of verified addiction treatment centers nationwide.',
      image: DEFAULT_OG_IMAGE,
      url: `${BASE_URL}${path}`,
      type: 'website',
      robots: 'noindex, follow',
    },
    `<h1>Treatment Center Not Found</h1>
    <p>This listing is no longer available or may have moved.</p>
    <p><a href="/rehab-centers">Browse all treatment centers</a> or <a href="/">return to homepage</a>.</p>`,
  );
}

const DEFAULT_OG_IMAGE = 'https://rehablookup.com/og-image.jpg';
const BASE_URL = 'https://rehablookup.com';

// Generate fallback HTML with proper OG tags, optionally enhanced with DB data
async function generateFallbackHtml(path: string, supabase: ReturnType<typeof createClient> | null): Promise<string> {
  // ---- Blog article: /resources/{slug} ----
  const blogMatch = path.match(/^\/resources\/([a-z0-9-]+)$/);
  if (blogMatch && supabase) {
    const slug = blogMatch[1];
    try {
      const article = await fetchBlogArticle(supabase, slug);
      if (article) {
        const ogImage = article.image_url || DEFAULT_OG_IMAGE;
        return buildOgHtml(
          {
            title: article.meta_title || `${article.title} | RehabLookup`,
            description: article.meta_description || article.excerpt,
            image: ogImage.startsWith('http') ? ogImage : `${BASE_URL}${ogImage}`,
            url: `${BASE_URL}/resources/${slug}`,
            type: 'article',
            publishedTime: article.published_at || undefined,
            author: article.author || 'RehabLookup Editorial Team',
            section: article.category_label || 'Health',
          },
          `<h1>${escHtml(article.title)}</h1>
    <p>${escHtml(article.excerpt)}</p>
    <p><a href="/resources">Browse all resources</a></p>`
        );
      }
    } catch (err) {
      console.error('[Prerender] Blog article fetch error:', err);
    }
  }

  // ---- Provider resource article: /providers/resources/{slug} ----
  // These are static data, but we still provide proper OG structure
  if (path.startsWith('/providers/resources/')) {
    const slug = path.replace('/providers/resources/', '');
    const titleFromSlug = slug
      .split('-')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    return buildOgHtml(
      {
        title: `${titleFromSlug} | RehabLookup Provider Resources`,
        description: `Expert guide on ${titleFromSlug.toLowerCase()} for treatment center operators. Strategies to grow admissions and improve outcomes.`,
        image: DEFAULT_OG_IMAGE,
        url: `${BASE_URL}${path}`,
        type: 'article',
      },
      `<h1>${escHtml(titleFromSlug)}</h1>
    <p>Expert resource for treatment center operators.</p>
    <p><a href="/providers/resources">Browse all provider resources</a></p>`
    );
  }

  // ---- Provider guides: /provider-guides/{slug} ----
  if (path.startsWith('/provider-guides/')) {
    const slug = path.replace('/provider-guides/', '');
    const titleFromSlug = slug
      .split('-')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    return buildOgHtml(
      {
        title: `${titleFromSlug} | RehabLookup`,
        description: `Complete guide to ${titleFromSlug.toLowerCase()} for addiction treatment providers.`,
        image: DEFAULT_OG_IMAGE,
        url: `${BASE_URL}${path}`,
        type: 'article',
      },
      `<h1>${escHtml(titleFromSlug)}</h1>
    <p>Marketing and growth guide for treatment providers.</p>`
    );
  }

  // ---- Facility page: /center/{slug} ----
  if (path.startsWith('/center/') && supabase) {
    const slug = path.replace('/center/', '').replace(/\/$/, '');
    try {
      const { data: facility } = await supabase
        .from('facilities')
        .select(
          'id, name, description, city, state, address, zip_code, phone, website, logo_url, gallery_urls, facility_type, gender_served, bed_count, year_established, verified, accepts_international_patients'
        )
        .eq('slug', slug)
        .eq('status', 'active')
        .maybeSingle();

      if (!facility) {
        // Slug doesn't resolve → emit a noindex page so Google doesn't bank
        // the URL as thin/duplicate content. Still 200 so SPA fallback works.
        return buildNotFoundCenterHtml(path);
      }

      const facilityRow = facility as FacilityRow;

      // Pull related metadata in parallel for richer crawlable body.
      const [servicesRes, insuranceRes] = await Promise.all([
        supabase
          .from('facility_services')
          .select('service_name')
          .eq('facility_id', facilityRow.id)
          .limit(25),
        supabase
          .from('facility_insurance')
          .select('insurance_name')
          .eq('facility_id', facilityRow.id)
          .limit(25),
      ]);

      const treatments = ((servicesRes.data as Array<{ service_name: string }> | null) ?? [])
        .map((t) => t.service_name)
        .filter(Boolean);
      const insurances = ((insuranceRes.data as Array<{ insurance_name: string }> | null) ?? [])
        .map((i) => i.insurance_name)
        .filter(Boolean);

      // Pro plan check — controls whether phone is exposed in prerendered HTML / JSON-LD.
      const { data: proSub } = await supabase
        .from('pro_subscriptions')
        .select('id')
        .eq('facility_id', facilityRow.id)
        .eq('status', 'active')
        .gt('current_period_end', new Date().toISOString())
        .maybeSingle();
      const isPro = !!proSub;

      return buildFacilityHtml(path, facilityRow, treatments, insurances, isPro);
    } catch (err) {
      console.error('[Prerender] Facility fetch error:', err);
    }
  }

  // ---- Generic static pages ----
  const staticPages: Record<string, { title: string; desc: string; h1: string; body: string }> = {
    '/for-providers': {
      title: 'List Your Treatment Center | RehabLookup',
      desc: 'Join 2,000+ addiction treatment providers. Get qualified leads and grow your facility.',
      h1: 'List Your Treatment Center on RehabLookup',
      body: '<p>Reach families actively seeking addiction treatment. Create your free provider account today.</p>',
    },
    '/concierge': {
      title: 'Concierge Placement Service | RehabLookup',
      desc: 'Get personalized help finding the right treatment center. Free insurance verification included.',
      h1: 'Personalized Treatment Placement Service',
      body: '<p>Let our placement specialists find the perfect treatment center for your unique situation.</p>',
    },
    '/about': {
      title: 'About Us | RehabLookup',
      desc: 'Learn about our mission to make quality addiction treatment accessible to everyone.',
      h1: 'About RehabLookup',
      body: '<p>RehabLookup connects individuals and families with verified treatment centers nationwide.</p>',
    },
    '/contact': {
      title: 'Contact Us | RehabLookup',
      desc: 'Get in touch with our team for help finding treatment or provider inquiries.',
      h1: 'Contact RehabLookup',
      body: '<p>We\'re here to help 24/7. Reach out for confidential support.</p>',
    },
    '/privacy-policy': {
      title: 'Privacy Policy | RehabLookup',
      desc: 'RehabLookup privacy policy - how we collect, use, and protect your information.',
      h1: 'Privacy Policy',
      body: '<p>RehabLookup is committed to protecting your privacy.</p>',
    },
    '/terms-of-service': {
      title: 'Terms of Service | RehabLookup',
      desc: 'RehabLookup terms of service - rules and guidelines for using our platform.',
      h1: 'Terms of Service',
      body: '<p>By using RehabLookup, you agree to these terms.</p>',
    },
  };

  const staticPage = staticPages[path];
  if (staticPage) {
    return buildOgHtml(
      {
        title: staticPage.title,
        description: staticPage.desc,
        image: DEFAULT_OG_IMAGE,
        url: `${BASE_URL}${path}`,
        type: 'website',
      },
      `<h1>${escHtml(staticPage.h1)}</h1>${staticPage.body}`
    );
  }

  // Near-me pages
  if (path.endsWith('-near-me')) {
    const type = path.replace('/', '').replace(/-near-me$/, '').replace(/-/g, ' ');
    const capType = type.charAt(0).toUpperCase() + type.slice(1);
    return buildOgHtml(
      {
        title: `${capType} Near Me | RehabLookup`,
        description: `Search for ${type} in your area. Compare facilities, verify insurance, and get help today.`,
        image: DEFAULT_OG_IMAGE,
        url: `${BASE_URL}${path}`,
        type: 'website',
      },
      `<h1>Find ${escHtml(capType)} Near You</h1>
    <p>Find trusted ${escHtml(type)} options in your area.</p>`
    );
  }

  // Default fallback
  return buildOgHtml(
    {
      title: 'RehabLookup - Find Trusted Addiction Treatment Centers',
      description: 'Search and compare verified addiction treatment centers near you. 24/7 confidential help.',
      image: DEFAULT_OG_IMAGE,
      url: `${BASE_URL}${path}`,
      type: 'website',
    },
    `<h1>Find Trusted Addiction Treatment Centers</h1>
    <p>Search 15,000+ verified drug and alcohol rehab centers across all 50 states.</p>
    <p><a href="/">Return to homepage</a> | <a href="/rehab-centers">Browse all treatment centers</a></p>`
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get('path') || '/';
    const userAgent = req.headers.get('user-agent') || '';
    const isMiddlewareCall = req.headers.get('x-prerender-request') === 'true';

    console.log('[Prerender] Request for path:', path);
    console.log('[Prerender] User-Agent:', userAgent.substring(0, 100));

    const isBotRequest = isMiddlewareCall || isBot(userAgent);

    if (!isBotRequest) {
      return new Response(
        JSON.stringify({ prerendered: false, reason: 'Not a bot request', message: 'Use standard SPA rendering' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!shouldPrerender(path)) {
      return new Response(
        JSON.stringify({ prerendered: false, reason: 'Route not configured for prerendering' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    let supabase: ReturnType<typeof createClient> | null = null;
    if (supabaseUrl && supabaseKey) {
      supabase = createClient(supabaseUrl, supabaseKey);

      // Try cache first
      const cached = await getCachedHtml(supabase, path);
      if (cached) {
        return new Response(cached.html, {
          status: cached.status_code,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html; charset=utf-8',
            'X-Prerendered': 'true',
            'X-Prerender-Cache': 'hit',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          },
        });
      }
    }

    // Check for Firecrawl API key
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.log('[Prerender] No FIRECRAWL_API_KEY, generating DB-backed fallback for', path);
      const fallbackHtml = await generateFallbackHtml(path, supabase);

      // Cache the fallback so subsequent crawler hits are fast
      if (supabase) {
        await setCachedHtml(supabase, path, fallbackHtml, 200);
      }

      return new Response(fallbackHtml, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'X-Prerendered': 'fallback-db',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      });
    }

    const fullUrl = BASE_URL + path;

    try {
      const { html, statusCode } = await renderPage(fullUrl, firecrawlApiKey);
      console.log('[Prerender] Rendered', path, '(' + html.length + ' bytes)');

      if (supabase) {
        await setCachedHtml(supabase, path, html, statusCode);
      }

      return new Response(html, {
        status: statusCode,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'X-Prerendered': 'true',
          'X-Prerender-Cache': 'miss',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      });
    } catch (renderError) {
      console.error('[Prerender] Render error, using DB fallback:', renderError);
      const fallbackHtml = await generateFallbackHtml(path, supabase);
      return new Response(fallbackHtml, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'X-Prerendered': 'fallback-db',
        },
      });
    }

  } catch (error) {
    console.error('[Prerender] Error:', error);
    const path = new URL(req.url).searchParams.get('path') || '/';
    const fallbackHtml = await generateFallbackHtml(path, null);
    return new Response(fallbackHtml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'X-Prerendered': 'fallback-error',
      },
    });
  }
});
