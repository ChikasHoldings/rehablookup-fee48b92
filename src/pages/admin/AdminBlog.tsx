import { useState, useMemo, useEffect, useCallback } from "react";
import type { Json } from "@/integrations/supabase/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { logAdminAction, AdminAuditActions } from "@/hooks/useAdminAuditLog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { toast } from "sonner";
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
  StarOff,
  RefreshCw,
  Link2,
  X,
  Download,
  Loader2,
} from "lucide-react";
import { ArticleEditor } from "@/components/admin/blog/ArticleEditor";
import {
  BulkBlogArticleActionDialog,
  type BulkBlogAction,
} from "@/components/admin/blog/BulkBlogArticleActionDialog";
import { useDebounce } from "@/hooks/useDebounce";
import { PaginationFooter } from "@/components/common/PaginationFooter";
import { usePagination } from "@/hooks/usePagination";
import { cn } from "@/lib/utils";

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

const VALID_STATUSES = new Set(["all", "draft", "published", "archived"]);
const VALID_CATEGORIES = new Set(categories.map((c) => c.id));
const VALID_FEATURED = new Set(["all", "featured", "not_featured"]);

export default function AdminBlog() {
  const queryClient = useQueryClient();
  const { adminRole, isSuperAdmin } = useAdminAuth();
  const canModerate = isSuperAdmin || adminRole === "super_admin" || adminRole === "manager";

  const [searchParams, setSearchParams] = useSearchParams();

  // URL-state hydration
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const debouncedSearch = useDebounce(search, 350);
  const [categoryFilter, setCategoryFilter] = useState<string>(() => {
    const v = searchParams.get("category") ?? "all";
    return VALID_CATEGORIES.has(v) ? v : "all";
  });
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    const v = searchParams.get("status") ?? "all";
    return VALID_STATUSES.has(v) ? v : "all";
  });
  const [featuredFilter, setFeaturedFilter] = useState<string>(() => {
    const v = searchParams.get("featured") ?? "all";
    return VALID_FEATURED.has(v) ? v : "all";
  });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<BlogArticle | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<BlogArticle | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkBlogAction | null>(null);

  // Sync URL ← state (loop-guarded, defaults not written)
  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedSearch) next.set("q", debouncedSearch);
    if (categoryFilter !== "all") next.set("category", categoryFilter);
    if (statusFilter !== "all") next.set("status", statusFilter);
    if (featuredFilter !== "all") next.set("featured", featuredFilter);
    const a = next.toString();
    const b = searchParams.toString();
    if (a !== b) setSearchParams(next, { replace: true });
  }, [debouncedSearch, categoryFilter, statusFilter, featuredFilter, searchParams, setSearchParams]);

  const { data: articles, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-blog-articles", categoryFilter, statusFilter, featuredFilter],
    queryFn: async () => {
      let query = supabase
        .from("blog_articles")
        .select("id, title, slug, excerpt, author, category, category_label, status, featured, image_url, read_time, published_at, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(200);

      if (categoryFilter !== "all") query = query.eq("category", categoryFilter);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (featuredFilter === "featured") query = query.eq("featured", true);
      if (featuredFilter === "not_featured") query = query.eq("featured", false);

      const { data, error } = await query;
      if (error) throw error;
      return data as BlogArticle[];
    },
    staleTime: 30 * 1000,
  });

  // Global counts — KPI strip reflects the entire table, not the filtered view
  const { data: globalCounts } = useQuery({
    queryKey: ["admin-blog-counts"],
    queryFn: async () => {
      const results = await Promise.all([
        supabase.from("blog_articles").select("id", { count: "exact", head: true }),
        supabase.from("blog_articles").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("blog_articles").select("id", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("blog_articles").select("id", { count: "exact", head: true }).eq("status", "archived"),
        supabase.from("blog_articles").select("id", { count: "exact", head: true }).eq("featured", true),
      ]);
      for (const r of results) {
        if (r.error) throw r.error;
      }
      const [total, published, draft, archived, featured] = results;
      return {
        total: total.count ?? 0,
        published: published.count ?? 0,
        draft: draft.count ?? 0,
        archived: archived.count ?? 0,
        featured: featured.count ?? 0,
      };
    },
    staleTime: 30 * 1000,
  });

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-blog-articles"] });
    queryClient.invalidateQueries({ queryKey: ["admin-blog-counts"] });
  }, [queryClient]);

  // Realtime — blog_articles in supabase_realtime publication via
  // migration 20260624000000. 30s polling fallback.
  useEffect(() => {
    const interval = setInterval(invalidateAll, 30000);
    return () => clearInterval(interval);
  }, [invalidateAll]);

  useEffect(() => {
    const channel = supabase
      .channel(`admin-blog-live-${Math.random().toString(36).slice(2,8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "blog_articles" }, () => invalidateAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [invalidateAll]);

  const filteredArticles = useMemo(() => {
    if (!articles) return [];
    if (!debouncedSearch) return articles;
    const q = debouncedSearch.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.slug.toLowerCase().includes(q) ||
        a.author?.toLowerCase().includes(q) ||
        a.excerpt?.toLowerCase().includes(q),
    );
  }, [articles, debouncedSearch]);

  const articlesPagination = usePagination({
    tableId: "admin-blog",
    defaultPageSize: 25,
    totalItems: filteredArticles.length,
  });
  const visibleArticles = articlesPagination.paginate(filteredArticles);

  useEffect(() => {
    articlesPagination.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, categoryFilter, statusFilter, featuredFilter]);

  // Selection-drift cleanup — drop selected IDs that left the filtered view
  useEffect(() => {
    if (selectedIds.size === 0) return;
    const visible = new Set(filteredArticles.map((a) => a.id));
    let changed = false;
    const next = new Set<string>();
    for (const id of selectedIds) {
      if (visible.has(id)) next.add(id); else changed = true;
    }
    if (changed) setSelectedIds(next);
  }, [filteredArticles, selectedIds]);

  const hasActiveFilters =
    search !== "" || categoryFilter !== "all" || statusFilter !== "all" || featuredFilter !== "all";

  const clearAllFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setFeaturedFilter("all");
    setSelectedIds(new Set());
  };

  const copyFilterLink = useCallback(async () => {
    try {
      const url = window.location.href;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success("Filter link copied to clipboard");
      } else {
        const tmp = document.createElement("input");
        tmp.value = url;
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand("copy");
        document.body.removeChild(tmp);
        toast.success("Filter link copied to clipboard");
      }
    } catch {
      toast.error("Could not copy link");
    }
  }, []);

  const handleExportCSV = useCallback(() => {
    if (filteredArticles.length === 0) {
      toast.info("No articles to export");
      return;
    }
    const headers = [
      "ID", "Title", "Slug", "Category", "Status", "Featured", "Author",
      "Published At", "Created At", "Updated At",
    ];
    const rows = filteredArticles.map((a) => [
      a.id, a.title, a.slug, a.category_label || a.category,
      a.status, a.featured ? "yes" : "no", a.author || "",
      a.published_at || "", a.created_at, a.updated_at,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `blog-articles-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredArticles.length} articles`);
  }, [filteredArticles]);

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
      invalidateAll();
      toast.success("Article deleted");
      setDeleteDialogOpen(false);
      setArticleToDelete(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete article: ${error.message}`);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const article = articles?.find((a) => a.id === id);
      const previousStatus = article?.status;
      const updateData: Record<string, unknown> = { status };
      if (status === "published" && !article?.published_at) {
        updateData.published_at = new Date().toISOString();
      }
      const { error } = await supabase.from("blog_articles").update(updateData as never).eq("id", id);
      if (error) throw error;
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
      invalidateAll();
      toast.success("Article status updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const updateFeaturedMutation = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const article = articles?.find((a) => a.id === id);
      const { error } = await supabase
        .from("blog_articles")
        .update({ featured } as never)
        .eq("id", id);
      if (error) throw error;
      await logAdminAction({
        actionType: AdminAuditActions.BLOG_ARTICLE_STATUS_CHANGED,
        targetType: "blog_article",
        targetId: id,
        details: {
          title: article?.title,
          slug: article?.slug,
          field: "featured",
          new_value: featured,
        },
      });
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Featured status updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update featured: ${error.message}`);
    },
  });

  const handleCreateNew = () => {
    setEditingArticle(null);
    setEditorOpen(true);
  };

  const handleEdit = async (article: BlogArticle) => {
    // Fetch full article data including content for the editor.
    // .maybeSingle() — never throw on 0-row results (handles the race
    // where the article was deleted between list and edit).
    const { data, error } = await supabase
      .from("blog_articles")
      .select("id, title, slug, excerpt, author, author_date, category, category_label, content, status, featured, image_url, read_time, published_at, created_at, updated_at, meta_title, meta_description, seo_keywords")
      .eq("id", article.id)
      .maybeSingle();

    if (error) {
      toast.error(`Failed to load article: ${error.message}`);
      return;
    }
    if (!data) {
      toast.error("Article no longer exists — it may have been deleted");
      invalidateAll();
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

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAllVisible = useCallback(() => {
    if (visibleArticles.length === 0) return;
    const allIds = visibleArticles.map((a) => a.id);
    const allSelected = allIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) allIds.forEach((id) => next.delete(id));
      else allIds.forEach((id) => next.add(id));
      return next;
    });
  }, [visibleArticles, selectedIds]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Blog Management</h1>
          <p className="text-muted-foreground text-sm">Create and manage resource articles</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canModerate && selectedIds.size > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setBulkAction("publish")}
                aria-label={`Publish ${selectedIds.size} selected article${selectedIds.size === 1 ? "" : "s"}`}
              >
                <Globe className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Publish</span>
                <span>({selectedIds.size})</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setBulkAction("unpublish")}
                aria-label={`Unpublish ${selectedIds.size} selected article${selectedIds.size === 1 ? "" : "s"}`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Unpublish</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setBulkAction("archive")}
                aria-label={`Archive ${selectedIds.size} selected article${selectedIds.size === 1 ? "" : "s"}`}
              >
                <Archive className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Archive</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setBulkAction("feature")}
                aria-label={`Feature ${selectedIds.size} selected article${selectedIds.size === 1 ? "" : "s"}`}
              >
                <Star className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Feature</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setBulkAction("unfeature")}
                aria-label={`Unfeature ${selectedIds.size} selected article${selectedIds.size === 1 ? "" : "s"}`}
              >
                <StarOff className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Unfeature</span>
              </Button>
              {isSuperAdmin && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setBulkAction("delete")}
                  aria-label={`Delete ${selectedIds.size} selected article${selectedIds.size === 1 ? "" : "s"}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              )}
            </>
          )}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={copyFilterLink}
              aria-label="Copy shareable link to this filtered view"
              title="Copy shareable link to this filtered view"
            >
              <Link2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Copy link</span>
            </Button>
          )}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={clearAllFilters}
              aria-label="Clear filters"
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleExportCSV}
            disabled={filteredArticles.length === 0}
            aria-label="Export filtered articles to CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => refetch()}
            aria-label="Refresh"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button onClick={handleCreateNew} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Article</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>

      {/* Stats Row — GLOBAL counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: globalCounts?.total ?? null, icon: FileText },
          { label: "Published", value: globalCounts?.published ?? null, icon: Globe },
          { label: "Drafts", value: globalCounts?.draft ?? null, icon: Edit },
          { label: "Featured", value: globalCounts?.featured ?? null, icon: Star },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <s.icon className="h-4 w-4" />
              {s.label}
            </div>
            <p className="text-2xl font-bold tabular-nums mt-1">
              {s.value === null ? "—" : s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl border bg-card">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles by title, slug, author, or excerpt..."
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
        <Select value={featuredFilter} onValueChange={setFeaturedFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Featured" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="featured">Featured</SelectItem>
            <SelectItem value="not_featured">Not featured</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Refreshing indicator */}
      {!isLoading && isFetching && (
        <div className="flex items-center gap-1.5 -my-2 text-[11px] text-muted-foreground" aria-live="polite">
          <Loader2 className="h-3 w-3 animate-spin" />
          Refreshing…
        </div>
      )}

      {/* Articles Table */}
      <div className="border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {canModerate && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      visibleArticles.length > 0 &&
                      visibleArticles.every((a) => selectedIds.has(a.id))
                    }
                    onCheckedChange={toggleSelectAllVisible}
                    aria-label={
                      visibleArticles.length > 0 && visibleArticles.every((a) => selectedIds.has(a.id))
                        ? "Deselect all visible articles"
                        : "Select all visible articles"
                    }
                  />
                </TableHead>
              )}
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
                  {canModerate && <TableCell><Skeleton className="h-4 w-4" /></TableCell>}
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
                <TableCell colSpan={canModerate ? 6 : 5} className="text-center py-16 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No articles found</p>
                  <p className="text-sm mt-1">
                    {hasActiveFilters ? "Try adjusting your search or filters" : "Create your first article to get started"}
                  </p>
                  {!hasActiveFilters && (
                    <Button variant="outline" onClick={handleCreateNew} className="mt-4" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Article
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              visibleArticles.map((article) => {
                const isChecked = selectedIds.has(article.id);
                return (
                  <TableRow
                    key={article.id}
                    className={cn("group", isChecked && "bg-primary/5")}
                  >
                    {canModerate && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleSelect(article.id)}
                          aria-label={`Select ${article.title}`}
                        />
                      </TableCell>
                    )}
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
                            {article.featured && (
                              <Star className="h-3.5 w-3.5 text-warning fill-warning flex-shrink-0" aria-label="Featured" />
                            )}
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Actions for ${article.title}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(article)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => window.open(`/resources/${article.slug}`, "_blank", "noopener,noreferrer")}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          {canModerate && (
                            <>
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
                              <DropdownMenuItem
                                onClick={() =>
                                  updateFeaturedMutation.mutate({ id: article.id, featured: !article.featured })
                                }
                                disabled={updateFeaturedMutation.isPending}
                              >
                                {article.featured ? (
                                  <>
                                    <StarOff className="h-4 w-4 mr-2" />
                                    Unfeature
                                  </>
                                ) : (
                                  <>
                                    <Star className="h-4 w-4 mr-2" />
                                    Feature
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(article)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {/* Pagination */}
        <div className="px-4 pb-2">
          <PaginationFooter
            page={articlesPagination.page}
            pageSize={articlesPagination.pageSize}
            totalPages={articlesPagination.totalPages}
            totalItems={filteredArticles.length}
            onPageChange={articlesPagination.setPage}
            onPageSizeChange={articlesPagination.setPageSize}
            itemLabel="article"
          />
        </div>
      </div>

      {/* Article Editor Dialog */}
      <ArticleEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        article={editingArticle}
        onSuccess={() => {
          invalidateAll();
          setEditorOpen(false);
          setEditingArticle(null);
        }}
      />

      {/* Bulk action dialog */}
      {bulkAction && (
        <BulkBlogArticleActionDialog
          open={!!bulkAction}
          onOpenChange={(open) => !open && setBulkAction(null)}
          action={bulkAction}
          selectedIds={selectedIds}
          onSuccess={() => {
            setSelectedIds(new Set());
            invalidateAll();
          }}
        />
      )}

      {/* Single-article delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Article</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{articleToDelete?.title}"? This action cannot be undone.
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
