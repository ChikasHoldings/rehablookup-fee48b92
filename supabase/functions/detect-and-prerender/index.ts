const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Comprehensive bot detection patterns - 50+ crawler User-Agents
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

// SEO routes that should receive prerendered content
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

// Route patterns (checked via startsWith or regex)
const SEO_PATTERN_ROUTES = [
  '/rehab-centers',
  '/treatment-types/',
  '/insurance/',
  '/locations/',
  '/resources/',
  '/center/',
  '/us-rehab',
  '/providers/resources/',
  '/provider-guides/',
  '/best-rehab-centers-in-',
  '/first-responders-rehab/',
  '/mountain-rehab-programs/',
  '/ptsd-and-addiction-treatment/',
  '/bipolar-and-addiction-treatment/',
  '/opioid-addiction-treatment/',
  '/alcohol-addiction-treatment/',
  '/prescription-drug-rehab/',
  '/benzodiazepine-addiction-treatment/',
  '/kratom-addiction-treatment/',
];

// Near-me landing pages
const NEAR_ME_SUFFIXES = [
  '-near-me',
];

function isBot(userAgent: string): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_PATTERNS.some(bot => ua.includes(bot));
}

function shouldPrerender(path: string): boolean {
  // Normalize path (remove trailing slash)
  const normalizedPath = path.endsWith('/') && path !== '/' 
    ? path.slice(0, -1) 
    : path;
  
  // Check exact matches
  if (SEO_EXACT_ROUTES.includes(normalizedPath)) {
    return true;
  }
  
  // Check pattern matches
  for (const pattern of SEO_PATTERN_ROUTES) {
    if (normalizedPath.startsWith(pattern)) {
      return true;
    }
  }
  
  // Check near-me pages
  for (const suffix of NEAR_ME_SUFFIXES) {
    if (normalizedPath.endsWith(suffix) && normalizedPath.startsWith('/')) {
      return true;
    }
  }
  
  return false;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get('path') || '/';
    const userAgent = req.headers.get('user-agent') || '';
    const forcePrerender = url.searchParams.get('force') === 'true';
    
    console.log('[DetectPrerender] Request for path:', path);
    console.log('[DetectPrerender] User-Agent:', userAgent.substring(0, 100));

    // Check if this is a bot request
    const isBotRequest = isBot(userAgent);
    console.log('[DetectPrerender] Is bot:', isBotRequest);
    
    // Only prerender for bots (unless forced)
    if (!isBotRequest && !forcePrerender) {
      return new Response(
        JSON.stringify({ 
          prerendered: false, 
          reason: 'Not a bot request',
          instruction: 'Serve SPA normally' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if this route should be prerendered
    if (!shouldPrerender(path)) {
      console.log('[DetectPrerender] Route not in SEO routes:', path);
      return new Response(
        JSON.stringify({ 
          prerendered: false, 
          reason: 'Route not configured for prerendering',
          path,
          instruction: 'Serve SPA normally'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get Supabase URL for calling prerender function
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) {
      console.error('[DetectPrerender] SUPABASE_URL not configured');
      return new Response(
        JSON.stringify({ error: 'Service not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Call the prerender-for-bots function
    const prerenderUrl = `${supabaseUrl}/functions/v1/prerender-for-bots?path=${encodeURIComponent(path)}`;
    
    console.log('[DetectPrerender] Calling prerender function:', prerenderUrl);
    
    const prerenderResponse = await fetch(prerenderUrl, {
      method: 'GET',
      headers: {
        'user-agent': userAgent,
        'X-Prerender-Request': 'true', // Signal that this is a middleware call
      },
    });

    // Check if prerender succeeded
    if (!prerenderResponse.ok) {
      const errorText = await prerenderResponse.text();
      console.error('[DetectPrerender] Prerender failed:', prerenderResponse.status, errorText);
      
      return new Response(
        JSON.stringify({ 
          prerendered: false, 
          error: 'Prerender service returned error',
          status: prerenderResponse.status,
          instruction: 'Serve SPA as fallback'
        }),
        { 
          status: 200, // Return 200 so caller can fallback to SPA
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check content type of response
    const contentType = prerenderResponse.headers.get('content-type') || '';
    
    // If HTML was returned, pass it through
    if (contentType.includes('text/html')) {
      const html = await prerenderResponse.text();
      
      console.log('[DetectPrerender] Prerender succeeded, returning HTML (' + html.length + ' bytes)');
      
      return new Response(html, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'X-Prerendered': 'true',
          'X-Prerender-Source': 'detect-and-prerender',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400', // 1hr browser, 24hr CDN
        },
      });
    }

    // If JSON was returned (non-prerendered response), pass it through
    const jsonResponse = await prerenderResponse.json();
    
    return new Response(
      JSON.stringify({
        ...jsonResponse,
        middleware: 'detect-and-prerender',
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[DetectPrerender] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Middleware error', 
        message: error instanceof Error ? error.message : 'Unknown error',
        instruction: 'Serve SPA as fallback'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
