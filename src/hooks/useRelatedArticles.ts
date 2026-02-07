import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getRelatedArticleSlugs, categoryRelationships, pillarArticles } from "@/components/seo/ArticleInterlinks";

interface RelatedArticle {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  category_label: string;
  read_time: string;
  image_url: string | null;
}

/**
 * Fetch related articles based on keywords, category, and topic matching
 * Implements smart internal linking for SEO crawlability
 */
export function useRelatedArticles(
  currentSlug: string,
  currentCategory: string,
  keywords: string[] = [],
  limit: number = 6
) {
  return useQuery({
    queryKey: ["related-articles-smart", currentSlug, currentCategory, keywords.join(",")],
    queryFn: async () => {
      // Step 1: Get keyword-based related slugs
      const keywordSlugs = getRelatedArticleSlugs(currentSlug, keywords, limit * 2);
      
      // Step 2: Get category-related articles
      const relatedCategories = categoryRelationships[currentCategory] || [];
      
      // Step 3: Fetch articles by slug priority
      const results: RelatedArticle[] = [];
      
      // First, try to get keyword-matched articles
      if (keywordSlugs.length > 0) {
        const { data: keywordArticles } = await supabase
          .from("blog_articles")
          .select("slug, title, excerpt, category, category_label, read_time, image_url")
          .eq("status", "published")
          .in("slug", keywordSlugs)
          .neq("slug", currentSlug)
          .limit(limit);
        
        if (keywordArticles) {
          results.push(...keywordArticles);
        }
      }
      
      // If we need more, get from same category
      if (results.length < limit) {
        const { data: categoryArticles } = await supabase
          .from("blog_articles")
          .select("slug, title, excerpt, category, category_label, read_time, image_url")
          .eq("status", "published")
          .eq("category", currentCategory)
          .neq("slug", currentSlug)
          .limit(limit - results.length);
        
        if (categoryArticles) {
          const existingSlugs = new Set(results.map(r => r.slug));
          categoryArticles.forEach(article => {
            if (!existingSlugs.has(article.slug)) {
              results.push(article);
            }
          });
        }
      }
      
      // If still need more, get from related categories
      if (results.length < limit && relatedCategories.length > 0) {
        const { data: relatedCategoryArticles } = await supabase
          .from("blog_articles")
          .select("slug, title, excerpt, category, category_label, read_time, image_url")
          .eq("status", "published")
          .in("category", relatedCategories)
          .neq("slug", currentSlug)
          .limit(limit - results.length);
        
        if (relatedCategoryArticles) {
          const existingSlugs = new Set(results.map(r => r.slug));
          relatedCategoryArticles.forEach(article => {
            if (!existingSlugs.has(article.slug)) {
              results.push(article);
            }
          });
        }
      }
      
      // Finally, fill with pillar articles if needed
      if (results.length < limit) {
        const pillarSlugs = pillarArticles
          .filter(p => p.slug !== currentSlug)
          .map(p => p.slug);
        
        const existingSlugs = new Set(results.map(r => r.slug));
        const neededPillars = pillarSlugs.filter(s => !existingSlugs.has(s));
        
        if (neededPillars.length > 0) {
          const { data: pillarResults } = await supabase
            .from("blog_articles")
            .select("slug, title, excerpt, category, category_label, read_time, image_url")
            .eq("status", "published")
            .in("slug", neededPillars.slice(0, limit - results.length));
          
          if (pillarResults) {
            results.push(...pillarResults);
          }
        }
      }
      
      return results.slice(0, limit);
    },
    enabled: !!currentSlug,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
}

/**
 * Fetch articles by specific topic for topic hub sections
 */
export function useTopicArticles(topic: string, currentSlug: string, limit: number = 5) {
  return useQuery({
    queryKey: ["topic-articles", topic, currentSlug],
    queryFn: async () => {
      // Search for articles with this topic in their keywords
      const { data } = await supabase
        .from("blog_articles")
        .select("slug, title, excerpt, category_label, read_time")
        .eq("status", "published")
        .neq("slug", currentSlug)
        .or(`seo_keywords.cs.{${topic}},title.ilike.%${topic}%,excerpt.ilike.%${topic}%`)
        .limit(limit);
      
      return data || [];
    },
    enabled: !!topic && topic.length > 2,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Fetch pillar content articles
 */
export function usePillarArticles(currentSlug: string) {
  return useQuery({
    queryKey: ["pillar-articles", currentSlug],
    queryFn: async () => {
      const pillarSlugs = pillarArticles
        .filter(p => p.slug !== currentSlug)
        .map(p => p.slug);
      
      const { data } = await supabase
        .from("blog_articles")
        .select("slug, title, category_label")
        .eq("status", "published")
        .in("slug", pillarSlugs);
      
      return data || [];
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });
}

/**
 * Get cross-category articles for diverse internal linking
 */
export function useCrossCategoryArticles(
  currentCategory: string,
  currentSlug: string,
  limit: number = 6
) {
  return useQuery({
    queryKey: ["cross-category-articles", currentCategory, currentSlug],
    queryFn: async () => {
      const relatedCategories = categoryRelationships[currentCategory] || ["treatment", "recovery"];
      
      const { data } = await supabase
        .from("blog_articles")
        .select("slug, title, category, category_label")
        .eq("status", "published")
        .in("category", relatedCategories)
        .neq("slug", currentSlug)
        .order("published_at", { ascending: false })
        .limit(limit);
      
      return data || [];
    },
    enabled: !!currentCategory,
    staleTime: 1000 * 60 * 10,
  });
}
