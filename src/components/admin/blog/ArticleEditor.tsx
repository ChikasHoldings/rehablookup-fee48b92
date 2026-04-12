import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Eye } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  category_label: string;
  read_time: string;
  image_url: string | null;
  author: string;
  author_date: string | null;
  content: Json;
  status: string;
  featured: boolean;
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  seo_keywords: string[] | null;
}

interface ArticleEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: BlogArticle | null;
  onSuccess: () => void;
}

const categories = [
  { id: "getting-started", label: "Getting Started" },
  { id: "recovery", label: "Recovery" },
  { id: "family", label: "Family Support" },
  { id: "treatment", label: "Treatment Options" },
  { id: "mental-health", label: "Mental Health" },
  { id: "prevention", label: "Prevention" },
];

const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

/**
 * Serialize JSON content blocks back to editable text.
 * Handles both legacy string[] and structured {type, content} blocks.
 */
function contentToText(content: Json): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === "string") return block;
        if (block && typeof block === "object" && "content" in block) {
          const b = block as { type?: string; content?: string; level?: number; items?: string[] };
          if (b.type === "heading") return `${"#".repeat(b.level || 2)} ${b.content || ""}`;
          if (b.type === "list" && Array.isArray(b.items)) return b.items.map((i) => `- ${i}`).join("\n");
          if (b.type === "quote") return `> ${b.content || ""}`;
          if (b.type === "callout") return `> **Note:** ${b.content || ""}`;
          return b.content || "";
        }
        return JSON.stringify(block);
      })
      .join("\n\n");
  }
  return JSON.stringify(content, null, 2);
}

/**
 * Parse editor text back to structured content blocks.
 */
function textToContent(text: string): Json {
  const paragraphs = text.split("\n\n").map((p) => p.trim()).filter((p) => p.length > 0);
  return paragraphs.map((p) => {
    // Heading
    const headingMatch = p.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      return { type: "heading", level: headingMatch[1].length, content: headingMatch[2] };
    }
    // List
    if (p.split("\n").every((line) => line.match(/^[-*]\s/))) {
      return { type: "list", items: p.split("\n").map((l) => l.replace(/^[-*]\s/, "").trim()) };
    }
    // Quote
    if (p.startsWith("> ")) {
      return { type: "quote", content: p.replace(/^>\s?/gm, "") };
    }
    return { type: "paragraph", content: p };
  }) as Json;
}

export function ArticleEditor({ open, onOpenChange, article, onSuccess }: ArticleEditorProps) {
  const isEditing = !!article;
  const [activeTab, setActiveTab] = useState("content");

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    category: "getting-started",
    read_time: "5 min read",
    image_url: "",
    author: "RehabLookup Editorial Team",
    author_date: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    content: "",
    status: "draft",
    featured: false,
    meta_title: "",
    meta_description: "",
    seo_keywords: "",
  });

  useEffect(() => {
    if (!open) return;
    if (article) {
      setFormData({
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        category: article.category,
        read_time: article.read_time,
        image_url: article.image_url || "",
        author: article.author,
        author_date: article.author_date || "",
        content: contentToText(article.content),
        status: article.status,
        featured: article.featured ?? false,
        meta_title: article.meta_title || "",
        meta_description: article.meta_description || "",
        seo_keywords: article.seo_keywords?.join(", ") || "",
      });
    } else {
      setFormData({
        title: "",
        slug: "",
        excerpt: "",
        category: "getting-started",
        read_time: "5 min read",
        image_url: "",
        author: "RehabLookup Editorial Team",
        author_date: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        content: "",
        status: "draft",
        featured: false,
        meta_title: "",
        meta_description: "",
        seo_keywords: "",
      });
    }
    setActiveTab("content");
  }, [article, open]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const categoryLabel = categories.find((c) => c.id === data.category)?.label || data.category;

      const articleData: Record<string, unknown> = {
        title: data.title.trim(),
        slug: data.slug.trim(),
        excerpt: data.excerpt.trim(),
        category: data.category,
        category_label: categoryLabel,
        read_time: data.read_time || "5 min read",
        image_url: data.image_url?.trim() || null,
        author: data.author.trim() || "RehabLookup Editorial Team",
        author_date: data.author_date?.trim() || null,
        content: textToContent(data.content),
        status: data.status,
        featured: data.featured,
        meta_title: data.meta_title?.trim() || null,
        meta_description: data.meta_description?.trim() || null,
        seo_keywords: data.seo_keywords
          ? data.seo_keywords.split(",").map((k) => k.trim()).filter(Boolean)
          : null,
      };

      if (data.status === "published") {
        articleData.published_at = new Date().toISOString();
      }

      if (isEditing && article) {
        const { error } = await supabase
          .from("blog_articles")
          .update(articleData as any)
          .eq("id", article.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_articles").insert(articleData as any);
        if (error) throw error;
      }

      // Audit log for blog changes
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (adminUser) {
        await supabase.from("admin_audit_log").insert({
          admin_user_id: adminUser.id,
          action_type: isEditing ? "blog_article_updated" : "blog_article_created",
          target_type: "blog_article",
          target_id: article?.id || null,
          details: { title: data.title, slug: data.slug, status: data.status },
        });
      }
    },
    onSuccess: () => {
      toast({ title: isEditing ? "Article updated successfully" : "Article created successfully" });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Failed to save article",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: !isEditing && !prev.slug ? generateSlug(title) : prev.slug,
    }));
  };

  const validate = (): boolean => {
    if (!formData.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return false;
    }
    if (!formData.slug.trim()) {
      toast({ title: "Slug is required", variant: "destructive" });
      return false;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formData.slug.trim())) {
      toast({ title: "Slug must be lowercase letters, numbers, and hyphens only", variant: "destructive" });
      return false;
    }
    if (!formData.excerpt.trim()) {
      toast({ title: "Excerpt is required", variant: "destructive" });
      return false;
    }
    if (!formData.content.trim()) {
      toast({ title: "Content is required", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    saveMutation.mutate(formData);
  };

  const handleSaveAsDraft = () => {
    if (!validate()) return;
    saveMutation.mutate({ ...formData, status: "draft" });
  };

  const handlePublish = () => {
    if (!validate()) return;
    saveMutation.mutate({ ...formData, status: "published" });
  };

  const metaTitleLen = formData.meta_title.length;
  const metaDescLen = formData.meta_description.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>{isEditing ? "Edit Article" : "Create New Article"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
            <TabsList className="mx-6 mt-4 w-fit">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="seo">SEO & Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="flex-1 min-h-0 mt-0">
              <ScrollArea className="h-full px-6 py-4">
                <div className="space-y-4 pb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder="Article title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slug">Slug <span className="text-destructive">*</span></Label>
                      <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))
                        }
                        placeholder="article-slug"
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="excerpt">Excerpt <span className="text-destructive">*</span></Label>
                    <Textarea
                      id="excerpt"
                      value={formData.excerpt}
                      onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))}
                      placeholder="Brief description for article cards and SEO"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, category: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="author">Author</Label>
                      <Input
                        id="author"
                        value={formData.author}
                        onChange={(e) => setFormData((prev) => ({ ...prev, author: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="read_time">Read Time</Label>
                      <Input
                        id="read_time"
                        value={formData.read_time}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, read_time: e.target.value }))
                        }
                        placeholder="5 min read"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="image_url">Featured Image URL</Label>
                    <Input
                      id="image_url"
                      value={formData.image_url}
                      onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
                      placeholder="https://..."
                    />
                    {formData.image_url && (
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="h-24 w-auto rounded border object-cover mt-2"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">
                      Content <span className="text-destructive">*</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Use ## for headings, - for lists, {">"} for quotes. Separate blocks with blank lines.
                    </p>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                      placeholder="Write your article content here..."
                      rows={18}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="seo" className="flex-1 min-h-0 mt-0">
              <ScrollArea className="h-full px-6 py-4">
                <div className="space-y-4 pb-4">
                  <div className="space-y-2">
                    <Label htmlFor="meta_title">Meta Title</Label>
                    <Input
                      id="meta_title"
                      value={formData.meta_title}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, meta_title: e.target.value }))
                      }
                      placeholder="SEO title (defaults to article title)"
                    />
                    <p className={`text-xs tabular-nums ${metaTitleLen > 60 ? "text-destructive" : "text-muted-foreground"}`}>
                      {metaTitleLen}/60 characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="meta_description">Meta Description</Label>
                    <Textarea
                      id="meta_description"
                      value={formData.meta_description}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, meta_description: e.target.value }))
                      }
                      placeholder="SEO description (defaults to excerpt)"
                      rows={3}
                    />
                    <p className={`text-xs tabular-nums ${metaDescLen > 160 ? "text-destructive" : "text-muted-foreground"}`}>
                      {metaDescLen}/160 characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seo_keywords">SEO Keywords</Label>
                    <Input
                      id="seo_keywords"
                      value={formData.seo_keywords}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, seo_keywords: e.target.value }))
                      }
                      placeholder="keyword1, keyword2, keyword3"
                    />
                    <p className="text-xs text-muted-foreground">Comma-separated keywords</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="author_date">Author Date</Label>
                    <Input
                      id="author_date"
                      value={formData.author_date}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, author_date: e.target.value }))
                      }
                      placeholder="April 2026"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label>Featured Article</Label>
                      <p className="text-sm text-muted-foreground">
                        Display prominently on the resources page
                      </p>
                    </div>
                    <Switch
                      checked={formData.featured}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, featured: checked }))
                      }
                    />
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-6 py-4 border-t bg-muted/30 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open(`/resources/${formData.slug}`, "_blank")}
              disabled={!formData.slug}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveAsDraft}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Draft
              </Button>
              <Button type="button" size="sm" onClick={handlePublish} disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Publish
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
