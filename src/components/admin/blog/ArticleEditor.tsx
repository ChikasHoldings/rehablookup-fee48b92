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
  content: string[];
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
    .trim();
};

export function ArticleEditor({ open, onOpenChange, article, onSuccess }: ArticleEditorProps) {
  const isEditing = !!article;

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
        content: Array.isArray(article.content) ? article.content.join("\n\n") : "",
        status: article.status,
        featured: article.featured,
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
  }, [article, open]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const categoryLabel = categories.find((c) => c.id === data.category)?.label || data.category;
      const contentArray = data.content
        .split("\n\n")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      const articleData = {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        category: data.category,
        category_label: categoryLabel,
        read_time: data.read_time,
        image_url: data.image_url || null,
        author: data.author,
        author_date: data.author_date || null,
        content: contentArray,
        status: data.status,
        featured: data.featured,
        meta_title: data.meta_title || null,
        meta_description: data.meta_description || null,
        seo_keywords: data.seo_keywords
          ? data.seo_keywords.split(",").map((k) => k.trim()).filter((k) => k)
          : null,
      };

      if (isEditing && article) {
        const { error } = await supabase
          .from("blog_articles")
          .update(articleData)
          .eq("id", article.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_articles").insert(articleData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: isEditing ? "Article updated" : "Article created" });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.slug || !formData.excerpt || !formData.content) {
      toast({
        title: "Missing required fields",
        description: "Please fill in title, slug, excerpt, and content",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleSaveAsDraft = () => {
    setFormData((prev) => ({ ...prev, status: "draft" }));
    setTimeout(() => saveMutation.mutate({ ...formData, status: "draft" }), 0);
  };

  const handlePublish = () => {
    setFormData((prev) => ({ ...prev, status: "published" }));
    setTimeout(() => saveMutation.mutate({ ...formData, status: "published" }), 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>{isEditing ? "Edit Article" : "Create New Article"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <Tabs defaultValue="content" className="flex flex-col flex-1 min-h-0">
            <TabsList className="mx-6 mt-4 w-fit">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="seo">SEO & Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="flex-1 min-h-0 mt-0">
              <ScrollArea className="h-full px-6 py-4">
                <div className="space-y-4 pb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder="Article title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slug">Slug *</Label>
                      <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                        placeholder="article-slug"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="excerpt">Excerpt *</Label>
                    <Textarea
                      id="excerpt"
                      value={formData.excerpt}
                      onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))}
                      placeholder="Brief description for article cards and SEO"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">
                      Content * <span className="text-muted-foreground text-xs">(Markdown supported, separate paragraphs with blank lines)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Use ## for headings. Use [[article-slug|link text]] for internal links.
                    </p>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                      placeholder="Write your article content here...

Use ## for headings.

Separate paragraphs with blank lines.

Link to other articles with [[article-slug|link text]] syntax."
                      rows={16}
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
                    <p className="text-xs text-muted-foreground">
                      {formData.meta_title.length}/60 characters
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
                    <p className="text-xs text-muted-foreground">
                      {formData.meta_description.length}/160 characters
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
          <div className="flex justify-between items-center px-6 py-4 border-t bg-muted/30 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
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
              <Button type="button" onClick={handlePublish} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Publish
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
