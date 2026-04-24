import { useState, useMemo } from "react";
import type { Json } from "@/integrations/supabase/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction, AdminAuditActions } from "@/hooks/useAdminAuditLog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Globe,
  FileText,
  Archive,
  Star,
} from "lucide-react";
import { ArticleEditor } from "@/components/admin/blog/ArticleEditor";
import { useDebounce } from "@/hooks/useDebounce";

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
  created_at: string;
  updated_at: string;
  meta_title: string | null;
  meta_description: string | null;
  seo_keywords: string[] | null;
}

const categories = [
  { id: "all", label: "All Categories" },
  { id: "getting-started", label: "Getting Started" },
  { id: "recovery", label: "Recovery" },
  { id: "family", label: "Family Support" },
  { id: "treatment", label: "Treatment Options" },
  { id: "mental-health", label: "Mental Health" },
  { id: "prevention", label: "Prevention" },
];

const statusOptions = [
  { id: "all", label: "All Status" },
  { id: "draft", label: "Draft" },
  { id: "published", label: "Published" },
  { id: "archived", label: "Archived" },
];

export default function AdminBlog() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<BlogArticle | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<BlogArticle | null>(null);

  const { data: articles, isLoading } = useQuery({
    queryKey: ["admin-blog-articles", categoryFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("blog_articles")
        .select("id, title, slug, excerpt, author, category, category_label, status, featured, image_url, read_time, published_at, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(500);

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BlogArticle[];
    },
  });

  const filteredArticles = useMemo(() => {
    if (!articles) return [];
    if (!debouncedSearch) return articles;
    const q = debouncedSearch.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.slug.toLowerCase().includes(q) ||
        a.author?.toLowerCase().includes(q)
    );
  }, [articles, debouncedSearch]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const article = articles?.find((a) => a.id === id);
      const { error } = await supabase.from("blog_articles").delete().eq("id", id);
      if (error) throw error;
      // Audit log destructive admin action
      await logAdminAction({
        actionType: AdminAuditActions.BLOG_ARTICLE_DELETED,
        targetType: "blog_article",
        targetId: id,
        details: {
          title: article?.title,
          slug: article?.slug,
          status_before_delete: article?.status,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-articles"] });
      toast({ title: "Article deleted successfully" });
      setDeleteDialogOpen(false);
      setArticleToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to delete article",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const article = articles?.find((a) => a.id === id);
      const previousStatus = article?.status;
      const updateData: Record<string, unknown> = { status };
      if (status === "published") {
        updateData.published_at = new Date().toISOString();
      }
      const { error } = await supabase.from("blog_articles").update(updateData).eq("id", id);
      if (error) throw error;
      // Audit content publish/unpublish/archive transitions
      if (previousStatus !== status) {
        await logAdminAction({
          actionType: AdminAuditActions.BLOG_ARTICLE_STATUS_CHANGED,
          targetType: "blog_article",
          targetId: id,
          details: {
            title: article?.title,
            slug: article?.slug,
            old_status: previousStatus,
            new_status: status,
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-articles"] });
      toast({ title: "Article status updated" });
    },
    onError: (error) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateNew = () => {
    setEditingArticle(null);
    setEditorOpen(true);
  };

  const handleEdit = async (article: BlogArticle) => {
    // Fetch full article data including content for the editor
    const { data, error } = await supabase
      .from("blog_articles")
      .select("id, title, slug, excerpt, author, author_date, category, category_label, content, status, featured, image_url, read_time, published_at, created_at, updated_at, meta_title, meta_description, seo_keywords")
      .eq("id", article.id)
      .single();

    if (error || !data) {
      toast({ title: "Failed to load article", variant: "destructive" });
      return;
    }
    setEditingArticle(data as unknown as BlogArticle);
    setEditorOpen(true);
  };

  const handleDelete = (article: BlogArticle) => {
    setArticleToDelete(article);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (articleToDelete) {
      deleteMutation.mutate(articleToDelete.id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="bg-success/10 text-success border-success/20 hover:bg-success/10">Published</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "archived":
        return <Badge variant="outline" className="text-muted-foreground">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = useMemo(() => {
    if (!articles) return { total: 0, published: 0, draft: 0, featured: 0 };
    return {
      total: articles.length,
      published: articles.filter((a) => a.status === "published").length,
      draft: articles.filter((a) => a.status === "draft").length,
      featured: articles.filter((a) => a.featured).length,
    };
  }, [articles]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Blog Management</h1>
          <p className="text-muted-foreground text-sm">Create and manage resource articles</p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Article
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, icon: FileText },
          { label: "Published", value: stats.published, icon: Globe },
          { label: "Drafts", value: stats.draft, icon: Edit },
          { label: "Featured", value: stats.featured, icon: Star },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <s.icon className="h-4 w-4" />
              {s.label}
            </div>
            <p className="text-2xl font-bold tabular-nums mt-1">{isLoading ? "–" : s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl border bg-card">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Articles Table */}
      <div className="border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[280px]">Article</TableHead>
              <TableHead className="min-w-[120px]">Category</TableHead>
              <TableHead className="min-w-[100px]">Status</TableHead>
              <TableHead className="min-w-[110px]">Updated</TableHead>
              <TableHead className="text-right min-w-[60px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-16 rounded flex-shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredArticles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No articles found</p>
                  <p className="text-sm mt-1">
                    {search ? "Try adjusting your search or filters" : "Create your first article to get started"}
                  </p>
                  {!search && (
                    <Button variant="outline" onClick={handleCreateNew} className="mt-4" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Article
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredArticles.map((article) => (
                <TableRow key={article.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {article.image_url ? (
                        <img
                          src={article.image_url}
                          alt={`Thumbnail for ${article.title}`}
                          className="w-16 h-10 object-cover rounded flex-shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-16 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium truncate text-sm">{article.title}</p>
                          {article.featured && <Star className="h-3.5 w-3.5 text-warning fill-warning flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          /resources/{article.slug}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{article.category_label}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(article.status)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm tabular-nums">
                    {format(new Date(article.updated_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(article)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => window.open(`/resources/${article.slug}`, "_blank")}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {article.status !== "published" && (
                          <DropdownMenuItem
                            onClick={() =>
                              updateStatusMutation.mutate({ id: article.id, status: "published" })
                            }
                            disabled={updateStatusMutation.isPending}
                          >
                            <Globe className="h-4 w-4 mr-2" />
                            Publish
                          </DropdownMenuItem>
                        )}
                        {article.status === "published" && (
                          <DropdownMenuItem
                            onClick={() =>
                              updateStatusMutation.mutate({ id: article.id, status: "draft" })
                            }
                            disabled={updateStatusMutation.isPending}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Unpublish
                          </DropdownMenuItem>
                        )}
                        {article.status !== "archived" && (
                          <DropdownMenuItem
                            onClick={() =>
                              updateStatusMutation.mutate({ id: article.id, status: "archived" })
                            }
                            disabled={updateStatusMutation.isPending}
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(article)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {/* Results count */}
        {!isLoading && filteredArticles.length > 0 && (
          <div className="px-4 py-3 border-t text-xs text-muted-foreground tabular-nums">
            Showing {filteredArticles.length} of {articles?.length ?? 0} articles
          </div>
        )}
      </div>

      {/* Article Editor Dialog */}
      <ArticleEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        article={editingArticle}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-blog-articles"] });
          setEditorOpen(false);
          setEditingArticle(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Article</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{articleToDelete?.title}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
