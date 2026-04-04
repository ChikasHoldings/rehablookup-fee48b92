import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type TemplateTag = Tables<"template_tags">;

export function useTemplateTags() {
  return useQuery({
    queryKey: ["template-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("template_tags")
        .select("id, key, label, source, path, example_value, fallback, is_required, created_at")
        .order("source", { ascending: true })
        .order("key", { ascending: true });

      if (error) throw error;
      return data as TemplateTag[];
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour - tags rarely change
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
  });
}

export function useTemplateTagsBySource() {
  const { data: tags, ...rest } = useTemplateTags();

  const grouped = tags?.reduce(
    (acc, tag) => {
      if (!acc[tag.source]) {
        acc[tag.source] = [];
      }
      acc[tag.source].push(tag);
      return acc;
    },
    {} as Record<string, TemplateTag[]>
  );

  return {
    tags,
    grouped,
    leadTags: grouped?.lead || [],
    providerTags: grouped?.provider || [],
    platformTags: grouped?.platform || [],
    ...rest,
  };
}
