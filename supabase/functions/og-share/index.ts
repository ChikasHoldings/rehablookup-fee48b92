import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_URL = 'https://rehablookup.com';
const DEFAULT_OG_IMAGE = 'https://rehablookup.com/og-image.jpg';

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
}

function buildShareHtml(meta: OgMeta): string {
  const t = escHtml(meta.title);
  const d = escHtml(meta.description).slice(0, 200);
  const img = escHtml(meta.image);
  const url = escHtml(meta.url);

  // This page is seen by crawlers for OG tags.
  // Human visitors are instantly redirected via meta refresh + JS.
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=${url}">
  <title>${t}</title>
  <meta name="description" content="${d}">
  <link rel="canonical" href="${url}">

  <meta property="og:type" content="${escHtml(meta.type)}">
  <meta property="og:site_name" content="RehabLookup">
  <meta property="og:title" content="${t}">
  <meta property="og:description" content="${d}">
  <meta property="og:image" content="${img}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${t}">
  <meta property="og:url" content="${url}">
  <meta property="og:locale" content="en_US">${meta.publishedTime ? `
  <meta property="article:published_time" content="${escHtml(meta.publishedTime)}">` : ''}${meta.author ? `
  <meta property="article:author" content="${escHtml(meta.author)}">` : ''}${meta.section ? `
  <meta property="article:section" content="${escHtml(meta.section)}">` : ''}

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@rehablookup">
  <meta name="twitter:title" content="${t}">
  <meta name="twitter:description" content="${d}">
  <meta name="twitter:image" content="${img}">
  <meta name="twitter:image:alt" content="${t}">

  <script>window.location.replace("${url.replace(/"/g, '\\"')}");</script>
</head>
<body>
  <p>Redirecting to <a href="${url}">${t}</a>…</p>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get('path');

  if (!path || !path.startsWith('/')) {
    return new Response('Missing or invalid path parameter', { status: 400, headers: corsHeaders });
  }

  const canonicalUrl = `${BASE_URL}${path}`;

  // Initialize Supabase client for DB lookups
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let meta: OgMeta = {
    title: 'RehabLookup - Find Trusted Addiction Treatment Centers',
    description: 'Search and compare verified addiction treatment centers near you.',
    image: DEFAULT_OG_IMAGE,
    url: canonicalUrl,
    type: 'website',
  };

  try {
    // Blog article: /resources/{slug}
    const blogMatch = path.match(/^\/resources\/([a-z0-9-]+)$/);
    if (blogMatch) {
      const { data } = await supabase
        .from('blog_articles')
        .select('title, excerpt, meta_title, meta_description, image_url, author, published_at, category_label')
        .eq('slug', blogMatch[1])
        .eq('status', 'published')
        .single();

      if (data) {
        const ogImage = data.image_url && data.image_url.startsWith('http') ? data.image_url : DEFAULT_OG_IMAGE;
        meta = {
          title: data.meta_title || `${data.title} | RehabLookup`,
          description: data.meta_description || data.excerpt,
          image: ogImage,
          url: canonicalUrl,
          type: 'article',
          publishedTime: data.published_at || undefined,
          author: data.author || 'RehabLookup Editorial Team',
          section: data.category_label || 'Health',
        };
      }
    }

    // Facility page: /center/{slug}
    if (path.startsWith('/center/')) {
      const slug = path.replace('/center/', '');
      const { data } = await supabase
        .from('facilities')
        .select('name, description, city, state, logo_url')
        .eq('slug', slug)
        .eq('status', 'active')
        .single();

      if (data) {
        meta = {
          title: `${data.name} - ${data.city}, ${data.state} | RehabLookup`,
          description: data.description?.slice(0, 160) || `${data.name} treatment center in ${data.city}, ${data.state}.`,
          image: data.logo_url || DEFAULT_OG_IMAGE,
          url: canonicalUrl,
          type: 'website',
        };
      }
    }

    // Provider resource: /providers/resources/{slug}
    if (path.startsWith('/providers/resources/')) {
      const slug = path.replace('/providers/resources/', '');
      const titleFromSlug = slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      meta = {
        title: `${titleFromSlug} | RehabLookup Provider Resources`,
        description: `Expert guide on ${titleFromSlug.toLowerCase()} for treatment center operators.`,
        image: DEFAULT_OG_IMAGE,
        url: canonicalUrl,
        type: 'article',
      };
    }
  } catch (err) {
    console.error('[og-share] DB lookup error:', err);
    // Fall through to default meta
  }

  const html = buildShareHtml(meta);

  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
});
