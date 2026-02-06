-- Blog Articles Table for database-driven content management
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
  author_date TEXT,
  content JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  featured BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  meta_title TEXT,
  meta_description TEXT,
  seo_keywords TEXT[]
);

-- Add constraint for status values using trigger (more flexible than CHECK)
CREATE OR REPLACE FUNCTION public.validate_blog_article_status()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('draft', 'published', 'archived') THEN
    RAISE EXCEPTION 'Invalid status: must be draft, published, or archived';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_blog_article_status_trigger
  BEFORE INSERT OR UPDATE ON blog_articles
  FOR EACH ROW EXECUTE FUNCTION validate_blog_article_status();

-- Indexes for performance
CREATE INDEX idx_blog_articles_slug ON blog_articles(slug);
CREATE INDEX idx_blog_articles_status ON blog_articles(status);
CREATE INDEX idx_blog_articles_category ON blog_articles(category);
CREATE INDEX idx_blog_articles_published_at ON blog_articles(published_at DESC);
CREATE INDEX idx_blog_articles_featured ON blog_articles(featured) WHERE featured = true;

-- Updated at trigger
CREATE TRIGGER update_blog_articles_updated_at
  BEFORE UPDATE ON blog_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE blog_articles ENABLE ROW LEVEL SECURITY;

-- Public can read published articles
CREATE POLICY "Public can read published articles"
  ON blog_articles FOR SELECT
  USING (status = 'published');

-- Admins can manage all articles
CREATE POLICY "Admins can manage all articles"
  ON blog_articles FOR ALL
  USING (public.user_is_admin(auth.uid()));

-- Article publication trigger for IndexNow auto-submission
CREATE OR REPLACE FUNCTION public.handle_article_published()
RETURNS TRIGGER LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Only trigger on publish
  IF NEW.status = 'published' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'published') THEN
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
      RAISE LOG 'IndexNow: Submitted article URL for %', NEW.slug;
    END IF;
    
    -- Set published_at if not already set
    IF NEW.published_at IS NULL THEN
      NEW.published_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_article_published
  BEFORE INSERT OR UPDATE ON blog_articles
  FOR EACH ROW EXECUTE FUNCTION handle_article_published();