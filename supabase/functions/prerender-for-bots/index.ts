const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Bot detection patterns - comprehensive list of search engine and social crawlers
const BOT_PATTERNS = [
  // Major search engines
  'googlebot',
  'google-inspectiontool',
  'googleother',
  'bingbot',
  'slurp',
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'sogou',
  'exabot',
  'ia_archiver',
  'applebot',
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
  // SEO tools
  'semrushbot',
  'ahrefsbot',
  'mj12bot',
  'dotbot',
  'rogerbot',
  'screaming frog',
  // Other crawlers
  'petalbot',
  'bytespider',
  'gptbot',
  'claude-web',
  'anthropic-ai',
  'chatgpt-user',
];

// Routes that should be prerendered for SEO
const SEO_ROUTES = [
  '/',
  '/for-providers',
  '/concierge',
  '/about',
  '/contact',
  '/privacy-policy',
  '/terms-of-service',
  '/resources',
];

function isBot(userAgent: string): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_PATTERNS.some(bot => ua.includes(bot));
}

function shouldPrerender(path: string): boolean {
  // Check exact matches
  if (SEO_ROUTES.includes(path)) return true;
  
  // Check pattern matches using string tests
  if (path.startsWith('/rehab-centers')) return true;
  if (path.startsWith('/treatment-types')) return true;
  if (path.startsWith('/insurance')) return true;
  if (path.startsWith('/locations')) return true;
  if (path.startsWith('/resources/') && path.split('/').length === 3) return true;
  if (path.endsWith('-near-me') && path.startsWith('/')) return true;
  if (path.startsWith('/center/')) return true;
  
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get('path') || '/';
    const userAgent = req.headers.get('user-agent') || '';
    
    console.log('[Prerender] Request for path:', path);
    console.log('[Prerender] User-Agent:', userAgent.substring(0, 100));

    const isBotRequest = isBot(userAgent);
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

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('[Prerender] FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Prerender service not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const baseUrl = 'https://rehablookup.com';
    const fullUrl = baseUrl + path;
    
    const { html, statusCode } = await renderPage(fullUrl, firecrawlApiKey);
    
    console.log('[Prerender] Successfully rendered', path, '(' + html.length + ' bytes, status: ' + statusCode + ')');

    return new Response(html, {
      status: statusCode,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'X-Prerendered': 'true',
        'X-Prerender-Status': statusCode.toString(),
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });

  } catch (error) {
    console.error('[Prerender] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Prerender failed', 
        message: error instanceof Error ? error.message : 'Unknown error',
        fallback: 'Use standard SPA rendering'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
