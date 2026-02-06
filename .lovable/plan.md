
# Plan: Database-Driven Blog Content + IndexNow Auto-Submission

## Overview
This plan moves the 35+ hardcoded blog articles to a database-driven system with full admin CRUD capabilities, automatic sitemap inclusion, and instant search engine notification via IndexNow when content is published or facilities are approved.

---

## Part 1: Database Schema

### New Table: `blog_articles`

```sql
CREATE TABLE public.blog_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  category TEXT NOT NULL,
  category_label TEXT NOT NULL,
  read_time TEXT NOT NULL DEFAULT '5 min read',
  image_url TEXT,
  author TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  meta_title TEXT,
  meta_description TEXT,
  seo_keywords TEXT[]
);

-- Indexes for performance
CREATE INDEX idx_blog_articles_slug ON blog_articles(slug);
CREATE INDEX idx_blog_articles_status ON blog_articles(status);
CREATE INDEX idx_blog_articles_category ON blog_articles(category);
CREATE INDEX idx_blog_articles_published_at ON blog_articles(published_at DESC);

-- Updated at trigger
CREATE TRIGGER update_blog_articles_updated_at
  BEFORE UPDATE ON blog_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### RLS Policies

```sql
-- Public read access for published articles
ALTER TABLE blog_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published articles"
  ON blog_articles FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage all articles"
  ON blog_articles FOR ALL
  USING (public.user_is_admin(auth.uid()));
```

---

## Part 2: Admin Blog Management UI

### New Files

1. **`src/pages/admin/AdminBlog.tsx`** - Main admin page for article management
   - List view with search, filter by category/status
   - Create/Edit/Delete actions
   - Publish/Unpublish toggle
   - Preview functionality

2. **`src/components/admin/blog/ArticleEditor.tsx`** - Rich content editor
   - Markdown support with live preview
   - Internal link syntax helper `[[article-slug|link text]]`
   - Image upload integration
   - SEO fields (meta title, description, keywords)

3. **`src/components/admin/blog/ArticleList.tsx`** - Sortable article table
   - Status badges (Draft/Published/Archived)
   - Quick actions (Edit, Preview, Publish, Delete)
   - Bulk operations

### Admin Sidebar Update
Add "Blog" menu item to `AdminSidebar.tsx` under Content section.

---

## Part 3: Frontend Updates

### `src/pages/ArticleDetail.tsx` Changes

- Replace hardcoded `articles` array with database fetch
- Add loading skeleton during fetch
- Graceful fallback for missing articles
- Cache articles with React Query

```typescript
const { data: article, isLoading } = useQuery({
  queryKey: ['article', id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('blog_articles')
      .select('*')
      .eq('slug', id)
      .eq('status', 'published')
      .single();
    if (error) throw error;
    return data;
  }
});
```

### `src/pages/Resources.tsx` Changes

- Fetch published articles from database
- Maintain current filtering/search UI
- Support featured article highlighting

---

## Part 4: Sitemap Integration

### Update `supabase/functions/sitemap-facilities/index.ts`

Remove hardcoded resource article paths and dynamically fetch from database:

```typescript
// In generateMainSitemap() function:
async function generateArticleRoutes(): Promise<RouteEntry[]> {
  const { data: articles } = await supabase
    .from('blog_articles')
    .select('slug, updated_at')
    .eq('status', 'published');
    
  return (articles || []).map(article => ({
    path: `/resources/${article.slug}`,
    priority: 0.8,
    changefreq: "monthly"
  }));
}
```

---

## Part 5: IndexNow Auto-Submission

### 5A: Facility Approval (Update Existing Function)

**File**: `supabase/functions/send-approval-email/index.ts`

Add after email is sent (around line 191):

```typescript
// Submit to IndexNow for instant indexing
if (facility?.slug) {
  const facilityUrl = `https://rehablookup.com/center/${facility.slug}`;
  try {
    await fetch(`${supabaseUrl}/functions/v1/submit-indexnow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ urls: [facilityUrl] }),
    });
    console.log("IndexNow: Submitted facility URL:", facilityUrl);
  } catch (err) {
    console.error("IndexNow submission failed (non-blocking):", err);
  }
}
```

### 5B: Article Publication (New Trigger)

Create database trigger to call IndexNow when articles are published:

```sql
CREATE OR REPLACE FUNCTION handle_article_published()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Only trigger on publish
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    supabase_url := current_setting('app.settings.supabase_url', true);
    service_role_key := current_setting('app.settings.service_role_key', true);
    
    IF supabase_url IS NOT NULL AND service_role_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := supabase_url || '/functions/v1/submit-indexnow',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'urls', ARRAY['https://rehablookup.com/resources/' || NEW.slug]
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_article_published
  AFTER INSERT OR UPDATE ON blog_articles
  FOR EACH ROW EXECUTE FUNCTION handle_article_published();
```

---

## Part 6: Data Migration

### One-Time Migration Script

Export the 35+ articles from `ArticleDetail.tsx` to database:

1. Create migration edge function or SQL script
2. Parse existing article objects
3. Insert into `blog_articles` table with `status = 'published'`
4. Set `published_at` to migration date

---

## Implementation Sequence

| Step | Task | Files |
|------|------|-------|
| 1 | Create `blog_articles` table with RLS | Database migration |
| 2 | Add IndexNow to facility approval | `send-approval-email/index.ts` |
| 3 | Create Admin Blog management page | `AdminBlog.tsx`, editor components |
| 4 | Add Blog to admin sidebar | `AdminSidebar.tsx` |
| 5 | Update frontend to fetch from DB | `ArticleDetail.tsx`, `Resources.tsx` |
| 6 | Update sitemap to include dynamic articles | `sitemap-facilities/index.ts` |
| 7 | Migrate existing hardcoded content | One-time script |
| 8 | Add article publication trigger | Database migration |

---

## Benefits

- **SEO**: Instant indexing of new content via IndexNow
- **Content Management**: Admin UI for non-technical content updates
- **Scalability**: Add unlimited articles without code deployments
- **Freshness**: Sitemap always reflects current database state
- **Analytics**: Track article performance with database queries
