import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-prerender-request',
};

// Bot detection patterns - comprehensive list of search engine and social crawlers
const BOT_PATTERNS = [
  // Major search engines
  'googlebot',
  'google-inspectiontool',
  'googleother',
  'google-extended',
  'storebot-google',
  'bingbot',
  'msnbot',
  'slurp',
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'sogou',
  'exabot',
  'ia_archiver',
  'applebot',
  'seznambot',
  'naverbot',
  // Social media crawlers
  'facebookexternalhit',
  'facebot',
  'twitterbot',
  'linkedinbot',
  'pinterest',
  'whatsapp',
  'telegrambot',
  'slackbot',
  'discordbot',
  'redditbot',
  'tumblr',
  'snapchat',
  // SEO tools
  'semrushbot',
  'ahrefsbot',
  'mj12bot',
  'dotbot',
  'rogerbot',
  'screaming frog',
  'seokicks',
  'sistrix',
  'siteauditbot',
  // AI crawlers
  'gptbot',
  'chatgpt-user',
  'claude-web',
  'anthropic-ai',
  'cohere-ai',
  'perplexitybot',
  'youbot',
  // Other crawlers
  'petalbot',
  'bytespider',
  'dataforseobot',
  'coccocbot',
  'amazonbot',
  'yeti',
  'archive.org_bot',
  'ccbot',
];

// Routes that should be prerendered for SEO
const SEO_EXACT_ROUTES = [
  '/',
  '/for-providers',
  '/concierge',
  '/about',
  '/contact',
  '/privacy-policy',
  '/terms-of-service',
  '/resources',
  '/how-it-works',
  '/insurance',
  '/locations',
  '/treatment-types',
  '/rehab-centers',
  '/cost-estimator',
];

function isBot(userAgent: string): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_PATTERNS.some(bot => ua.includes(bot));
}

function shouldPrerender(path: string): boolean {
  // Normalize path
  const normalizedPath = path.endsWith('/') && path !== '/' 
    ? path.slice(0, -1) 
    : path;
  
  // Check exact matches
  if (SEO_EXACT_ROUTES.includes(normalizedPath)) return true;
  
  // Check pattern matches
  if (normalizedPath.startsWith('/rehab-centers')) return true;
  if (normalizedPath.startsWith('/treatment-types')) return true;
  if (normalizedPath.startsWith('/insurance')) return true;
  if (normalizedPath.startsWith('/locations')) return true;
  if (normalizedPath.startsWith('/resources/') && normalizedPath.split('/').length === 3) return true;
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

// Cache TTL in seconds (1 hour for dynamic content, 24 hours for static pages)
const CACHE_TTL_DYNAMIC = 3600; // 1 hour
const CACHE_TTL_STATIC = 86400; // 24 hours

function getCacheTTL(path: string): number {
  // Static pages get longer cache
  const staticPaths = ['/privacy-policy', '/terms-of-service', '/about', '/contact', '/how-it-works'];
  if (staticPaths.includes(path)) {
    return CACHE_TTL_STATIC;
  }
  return CACHE_TTL_DYNAMIC;
}

async function getCachedHtml(supabase: ReturnType<typeof createClient>, path: string): Promise<CacheEntry | null> {
  try {
    const { data, error } = await supabase
      .from('prerender_cache')
      .select('html, cached_at, status_code')
      .eq('path', path)
      .single();

    if (error || !data) {
      return null;
    }

    // Type assertion for the data
    const cacheData = data as { html: string; cached_at: string; status_code: number };

    // Check if cache is still valid
    const cachedAt = new Date(cacheData.cached_at);
    const now = new Date();
    const ageSeconds = (now.getTime() - cachedAt.getTime()) / 1000;
    const ttl = getCacheTTL(path);

    if (ageSeconds > ttl) {
      console.log('[Prerender] Cache expired for', path, '(age:', Math.round(ageSeconds), 's, ttl:', ttl, 's)');
      return null;
    }

    console.log('[Prerender] Cache hit for', path, '(age:', Math.round(ageSeconds), 's)');
    return {
      html: cacheData.html,
      cached_at: cacheData.cached_at,
      status_code: cacheData.status_code,
    };
  } catch (err) {
    console.error('[Prerender] Cache read error:', err);
    return null;
  }
}

async function setCachedHtml(supabase: ReturnType<typeof createClient>, path: string, html: string, statusCode: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('prerender_cache')
      .upsert({
        path,
        html,
        status_code: statusCode,
        cached_at: new Date().toISOString(),
      }, {
        onConflict: 'path',
      });

    if (error) {
      console.error('[Prerender] Cache write error:', error);
    } else {
      console.log('[Prerender] Cached HTML for', path);
    }
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
    body: JSON.stringify({
      url,
      formats: ['html'],
      waitFor: 3000,
      onlyMainContent: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Prerender] Firecrawl API error:', response.status, errorText);
    throw new Error('Firecrawl API returned ' + response.status);
  }

  const data: FirecrawlResponse = await response.json();
  
  if (!data.success || !data.data?.html) {
    console.error('[Prerender] Firecrawl returned no HTML:', data.error);
    throw new Error(data.error || 'No HTML returned');
  }

  return {
    html: data.data.html,
    statusCode: data.data.metadata?.statusCode || 200,
  };
}

// Generate fallback HTML for a route when prerendering fails
function generateFallbackHtml(path: string): string {
  const baseTitle = 'RehabLookup - Find Addiction Treatment Centers';
  let title = baseTitle;
  let description = 'Search and compare verified addiction treatment centers near you.';
  let h1 = 'Find Trusted Addiction Treatment Centers';
  let content = '<p>Search 15,000+ verified drug and alcohol rehab centers across all 50 states.</p>';

  // Customize fallback based on route
  if (path === '/for-providers') {
    title = 'List Your Treatment Center | RehabLookup';
    h1 = 'List Your Treatment Center on RehabLookup';
    description = 'Join 2,000+ addiction treatment providers. Get qualified leads and grow your facility.';
    content = '<p>Reach families actively seeking addiction treatment. Create your free provider account today.</p>';
  } else if (path === '/privacy-policy') {
    title = 'Privacy Policy | RehabLookup';
    h1 = 'Privacy Policy';
    description = 'RehabLookup privacy policy - how we collect, use, and protect your information.';
    content = '<p>Last updated: February 2, 2026. RehabLookup is committed to protecting your privacy.</p>';
  } else if (path === '/terms-of-service') {
    title = 'Terms of Service | RehabLookup';
    h1 = 'Terms of Service';
    description = 'RehabLookup terms of service - rules and guidelines for using our platform.';
    content = '<p>By using RehabLookup, you agree to these terms. Please read carefully.</p>';
  } else if (path === '/concierge') {
    title = 'Concierge Placement Service | RehabLookup';
    h1 = 'Personalized Treatment Placement Service';
    description = 'Get personalized help finding the right treatment center. Free insurance verification included.';
    content = '<p>Let our placement specialists find the perfect treatment center for your unique situation.</p>';
  } else if (path === '/about') {
    title = 'About Us | RehabLookup';
    h1 = 'About RehabLookup';
    description = 'Learn about our mission to make quality addiction treatment accessible to everyone.';
    content = '<p>RehabLookup connects individuals and families with verified treatment centers nationwide.</p>';
  } else if (path === '/contact') {
    title = 'Contact Us | RehabLookup';
    h1 = 'Contact RehabLookup';
    description = 'Get in touch with our team for help finding treatment or provider inquiries.';
    content = '<p>We\'re here to help 24/7. Reach out for confidential support.</p>';
  } else if (path.endsWith('-near-me')) {
    const type = path.replace('/', '').replace(/-near-me$/, '').replace(/-/g, ' ');
    title = `${type.charAt(0).toUpperCase() + type.slice(1)} Near Me | RehabLookup`;
    h1 = `Find ${type.charAt(0).toUpperCase() + type.slice(1)} Near You`;
    description = `Search for ${type} in your area. Compare facilities, verify insurance, and get help today.`;
    content = `<p>Find trusted ${type} options in your area. Use our search to compare local facilities.</p>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://rehablookup.com${path}">
  <style>
    body { font-family: 'Inter', -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #1B365D; }
    h1 { font-size: 2rem; margin-bottom: 16px; }
    p { line-height: 1.7; color: #333; }
    a { color: #2563eb; }
  </style>
</head>
<body>
  <header>
    <a href="/">RehabLookup</a>
  </header>
  <main>
    <h1>${h1}</h1>
    ${content}
    <p><a href="/">Return to homepage</a> | <a href="/rehab-centers">Browse all treatment centers</a></p>
  </main>
  <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.875rem; color: #666;">
    <p>© 2026 RehabLookup. All rights reserved.</p>
  </footer>
</body>
</html>`;
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
    console.log('[Prerender] Is middleware call:', isMiddlewareCall);

    // Skip bot check if called from middleware (already validated)
    const isBotRequest = isMiddlewareCall || isBot(userAgent);
    console.log('[Prerender] Is bot:', isBotRequest);

    if (!isBotRequest) {
      return new Response(
        JSON.stringify({ 
          prerendered: false, 
          reason: 'Not a bot request',
          message: 'Use standard SPA rendering' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!shouldPrerender(path)) {
      console.log('[Prerender] Route not in SEO routes:', path);
      return new Response(
        JSON.stringify({ 
          prerendered: false, 
          reason: 'Route not configured for prerendering' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client for caching
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    let supabase: ReturnType<typeof createClient> | null = null;
    if (supabaseUrl && supabaseKey) {
      supabase = createClient(supabaseUrl, supabaseKey);
      
      // Try to get cached HTML first
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
      console.error('[Prerender] FIRECRAWL_API_KEY not configured, returning fallback');
      
      // Return fallback HTML instead of error
      const fallbackHtml = generateFallbackHtml(path);
      return new Response(fallbackHtml, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'X-Prerendered': 'fallback',
          'X-Prerender-Reason': 'firecrawl-not-configured',
        },
      });
    }

    const baseUrl = 'https://rehablookup.com';
    const fullUrl = baseUrl + path;
    
    try {
      const { html, statusCode } = await renderPage(fullUrl, firecrawlApiKey);
      
      console.log('[Prerender] Successfully rendered', path, '(' + html.length + ' bytes, status: ' + statusCode + ')');

      // Cache the result
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
          'X-Prerender-Status': statusCode.toString(),
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      });
    } catch (renderError) {
      console.error('[Prerender] Render error:', renderError);
      
      // Return fallback HTML on render error
      const fallbackHtml = generateFallbackHtml(path);
      return new Response(fallbackHtml, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'X-Prerendered': 'fallback',
          'X-Prerender-Reason': 'render-error',
        },
      });
    }

  } catch (error) {
    console.error('[Prerender] Error:', error);
    
    // Return fallback HTML on any error
    const path = new URL(req.url).searchParams.get('path') || '/';
    const fallbackHtml = generateFallbackHtml(path);
    
    return new Response(fallbackHtml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'X-Prerendered': 'fallback',
        'X-Prerender-Reason': 'error',
      },
    });
  }
});
