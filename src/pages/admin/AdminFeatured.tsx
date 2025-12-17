import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";
import {
  Star,
  Eye,
  Search,
  MapPin,
  TrendingUp,
  Users,
  ExternalLink,
  Pin,
  PinOff,
  CheckCircle2,
  Info,
  RefreshCw,
  Crown,
  Zap,
  Settings,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  GripVertical,
  Save,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { FeaturedSettingsTab } from "@/components/admin/FeaturedSettingsTab";
import { FeaturedAnalyticsDashboard } from "@/components/admin/FeaturedAnalyticsDashboard";
import { FeaturedActivityFeed } from "@/components/admin/FeaturedActivityFeed";

type Facility = {
  id: string;
  name: string;
  city: string;
  state: string;
  featured: boolean;
  verified: boolean;
  logo_url: string | null;
  status: string;
  slug: string | null;
  featured_pinned: boolean | null;
  last_featured_shown_at: string | null;
  suspended: boolean | null;
  featured_display_order: number | null;
};

type FacilityStats = {
  facility_id: string;
  total_views: number;
  total_leads: number;
};

type ConfirmAction = {
  type: "pin" | "unpin" | "add_legacy" | "remove_legacy";
  facility: Facility;
} | null;

export default function AdminFeatured() {
  const queryClient = useQueryClient();
  const { logError } = useAdminErrorHandler("AdminFeatured");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  
  // Pagination state for eligible facilities
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Drag and drop state
  const [orderedFacilities, setOrderedFacilities] = useState<Facility[]>([]);
  const [hasOrderChanges, setHasOrderChanges] = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Invalidate all featured queries helper
  const invalidateFeaturedQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-all-facilities-featured"] });
    queryClient.invalidateQueries({ queryKey: ["admin-auto-featured-ids"] });
    queryClient.invalidateQueries({ queryKey: ["admin-facility-stats"] });
  }, [queryClient]);

  // Real-time subscriptions - always active
  useEffect(() => {
    const facilitiesChannel = supabase
      .channel("admin-featured-facilities")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "facilities" },
        () => {
          invalidateFeaturedQueries();
        }
      )
      .subscribe();

    const viewsChannel = supabase
      .channel("admin-featured-views")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "facility_views" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-facility-stats"] });
        }
      )
      .subscribe();

    const leadsChannel = supabase
      .channel("admin-featured-leads")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-facility-stats"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(facilitiesChannel);
      supabase.removeChannel(viewsChannel);
      supabase.removeChannel(leadsChannel);
    };
  }, [invalidateFeaturedQueries, queryClient]);

  // Fetch all approved facilities for featured eligibility display
  const { data: allFacilities, isLoading: loadingFacilities, refetch, error: facilitiesError } = useQuery({
    queryKey: ["admin-all-facilities-featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("*")
        .eq("status", "approved")
        .order("name");
      if (error) throw error;
      return data as Facility[];
    },
  });

  // Fetch auto-featured facility IDs from edge function
  const { data: featuredData, isLoading: loadingFeaturedIds, error: featuredError } = useQuery({
    queryKey: ["admin-auto-featured-ids"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-featured-facilities");
      if (error) throw error;
      return {
        featuredFacilityIds: data?.featuredFacilityIds || [],
        homepageFeaturedIds: data?.homepageFeaturedIds || [],
      };
    },
    staleTime: 1000 * 60 * 2,
  });

  const autoFeaturedIds = featuredData?.featuredFacilityIds || [];
  const homepageFeaturedIds = featuredData?.homepageFeaturedIds || [];

  // Auto-featured facilities (from Featured plan subscription)
  const autoFeaturedFacilities = allFacilities?.filter(f => autoFeaturedIds.includes(f.id)) || [];
  
  // Legacy featured (manually set, not from subscription)
  const legacyFeaturedFacilities = allFacilities?.filter(
    f => f.featured && !autoFeaturedIds.includes(f.id)
  ) || [];

  // Eligible for legacy featuring (approved, not suspended, not already featured)
  const eligibleFacilities = allFacilities?.filter(
    f => !f.featured && !autoFeaturedIds.includes(f.id) && !f.suspended
  ) || [];
  
  // Combined featured facilities for ordering (auto + legacy)
  const allFeaturedFacilities = [...(autoFeaturedFacilities || []), ...(legacyFeaturedFacilities || [])];
  
  // Calculate total leads for featured facilities - with safe access
  const safeAutoFeaturedFacilities = autoFeaturedFacilities || [];
  const totalFeaturedLeads = safeAutoFeaturedFacilities.reduce(
    (sum, f) => sum + (facilityStats?.[f?.id]?.total_leads || 0), 0
  );
  
  // Sync ordered facilities when data changes
  useEffect(() => {
    if (allFeaturedFacilities.length > 0) {
      // Sort by display_order first, then by name
      const sorted = [...allFeaturedFacilities].sort((a, b) => {
        // Pinned facilities come first
        if (a.featured_pinned && !b.featured_pinned) return -1;
        if (!a.featured_pinned && b.featured_pinned) return 1;
        // Then by display order
        if (a.featured_display_order !== null && b.featured_display_order !== null) {
          return a.featured_display_order - b.featured_display_order;
        }
        if (a.featured_display_order !== null) return -1;
        if (b.featured_display_order !== null) return 1;
        // Then by name
        return a.name.localeCompare(b.name);
      });
      setOrderedFacilities(sorted);
      setHasOrderChanges(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFacilities?.length, autoFeaturedIds?.length, legacyFeaturedFacilities.length]);

  // Save display order mutation
  const saveDisplayOrder = useMutation({
    mutationFn: async (facilities: Facility[]) => {
      const updates = facilities.map((f, index) => ({
        id: f.id,
        featured_display_order: index + 1,
      }));
      
      for (const update of updates) {
        const { error } = await supabase
          .from("facilities")
          .update({ featured_display_order: update.featured_display_order })
          .eq("id", update.id);
        if (error) throw error;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("admin_audit_log").insert({
        admin_user_id: user?.id,
        action_type: "featured_order_updated",
        target_type: "facility",
        details: { updated_count: updates.length },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-facilities-featured"] });
      queryClient.invalidateQueries({ queryKey: ["featured-facility-ids"] });
      queryClient.invalidateQueries({ queryKey: ["approved-facilities"] });
      toast.success("Display order saved successfully");
      setHasOrderChanges(false);
    },
    onError: () => {
      toast.error("Failed to save display order");
    },
  });

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    
    const items = [...orderedFacilities];
    const draggedItem = items[dragItem.current];
    items.splice(dragItem.current, 1);
    items.splice(dragOverItem.current, 0, draggedItem);
    
    dragItem.current = null;
    dragOverItem.current = null;
    
    setOrderedFacilities(items);
    setHasOrderChanges(true);
  };

  const { data: facilityStats } = useQuery({
    queryKey: ["admin-facility-stats"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString().split("T")[0];

      const [viewsRes, leadsRes] = await Promise.all([
        supabase
          .from("facility_views")
          .select("facility_id, view_count")
          .gte("view_date", dateStr),
        supabase
          .from("leads")
          .select("facility_id")
          .gte("created_at", thirtyDaysAgo.toISOString()),
      ]);

      const stats: Record<string, FacilityStats> = {};
      
      viewsRes.data?.forEach((v) => {
        if (!stats[v.facility_id]) {
          stats[v.facility_id] = { facility_id: v.facility_id, total_views: 0, total_leads: 0 };
        }
        stats[v.facility_id].total_views += v.view_count;
      });

      leadsRes.data?.forEach((l) => {
        if (l.facility_id) {
          if (!stats[l.facility_id]) {
            stats[l.facility_id] = { facility_id: l.facility_id, total_views: 0, total_leads: 0 };
          }
          stats[l.facility_id].total_leads += 1;
        }
      });

      return stats;
    },
  });

  // Toggle pinned status
  const togglePinned = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await supabase
        .from("facilities")
        .update({ featured_pinned: pinned })
        .eq("id", id);
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("admin_audit_log").insert({
        admin_user_id: user?.id,
        action_type: pinned ? "pinned_featured" : "unpinned_featured",
        target_type: "facility",
        target_id: id,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-facilities-featured"] });
      queryClient.invalidateQueries({ queryKey: ["admin-auto-featured-ids"] });
      queryClient.invalidateQueries({ queryKey: ["featured-facility-ids"] });
      queryClient.invalidateQueries({ queryKey: ["approved-facilities"] });
      toast.success(variables.pinned ? "Provider pinned to featured" : "Provider unpinned");
      setConfirmAction(null);
    },
    onError: () => {
      toast.error("Failed to update pinned status");
      setConfirmAction(null);
    },
  });

  // Toggle legacy featured
  const toggleLegacyFeatured = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const { error } = await supabase
        .from("facilities")
        .update({ featured })
        .eq("id", id);
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("admin_audit_log").insert({
        admin_user_id: user?.id,
        action_type: featured ? "legacy_featured" : "legacy_unfeatured",
        target_type: "facility",
        target_id: id,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-facilities-featured"] });
      queryClient.invalidateQueries({ queryKey: ["featured-facility-ids"] });
      queryClient.invalidateQueries({ queryKey: ["approved-facilities"] });
      toast.success(variables.featured ? "Provider added to legacy featured" : "Provider removed from featured");
      setConfirmAction(null);
    },
    onError: () => {
      toast.error("Failed to update featured status");
      setConfirmAction(null);
    },
  });

  // Filter eligible facilities
  const filteredEligible = eligibleFacilities.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination for eligible facilities
  const totalPages = Math.ceil(filteredEligible.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEligible = filteredEligible.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const getStats = (facilityId: string) => {
    if (!facilityId || !facilityStats) return { total_views: 0, total_leads: 0 };
    return facilityStats[facilityId] || { total_views: 0, total_leads: 0 };
  };

  const isLoading = loadingFacilities || loadingFeaturedIds;
  const hasError = facilitiesError || featuredError;
  
  // Safe arrays for rendering
  const safeOrderedFacilities = orderedFacilities || [];
  const safeLegacyFeaturedFacilities = legacyFeaturedFacilities || [];
  const safePaginatedEligible = paginatedEligible || [];

  // Handle confirmation actions
  const handleConfirmAction = () => {
    if (!confirmAction) return;

    switch (confirmAction.type) {
      case "pin":
        togglePinned.mutate({ id: confirmAction.facility.id, pinned: true });
        break;
      case "unpin":
        togglePinned.mutate({ id: confirmAction.facility.id, pinned: false });
        break;
      case "add_legacy":
        toggleLegacyFeatured.mutate({ id: confirmAction.facility.id, featured: true });
        break;
      case "remove_legacy":
        toggleLegacyFeatured.mutate({ id: confirmAction.facility.id, featured: false });
        break;
    }
  };

  // Stats card component
  const StatsCard = ({ title, value, subtitle, icon: Icon, gradient }: {
    title: string;
    value: number | string;
    subtitle: string;
    icon: typeof Crown;
    gradient?: string;
  }) => (
    <Card className={gradient}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Icon className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Facility row component
  const FacilityRow = ({ facility, type }: { facility: Facility; type: "auto" | "legacy" | "eligible" }) => {
    const stats = getStats(facility.id);
    const isOnHomepage = homepageFeaturedIds.includes(facility.id);

    return (
      <div
        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-shadow hover:shadow-md ${
          type === "auto" && facility.featured_pinned 
            ? "border-purple-300 bg-gradient-to-r from-purple-50 to-white" 
            : type === "auto"
            ? "border-amber-200 bg-gradient-to-r from-amber-50 to-white"
            : type === "legacy"
            ? "border-slate-200 bg-muted/30"
            : "border-border bg-background hover:bg-muted/30"
        }`}
      >
        <div className="flex items-center gap-4">
          <Avatar className={`h-12 w-12 border-2 ${type === "auto" ? "border-amber-200" : "border-slate-200"}`}>
            <AvatarImage src={facility.logo_url || undefined} />
            <AvatarFallback className={`${type === "auto" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"} font-semibold`}>
              {facility.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-foreground">{facility.name}</p>
              {facility.featured_pinned && (
                <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                  <Pin className="h-3 w-3 mr-1" />
                  Pinned
                </Badge>
              )}
              {isOnHomepage && (
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                  <Eye className="h-3 w-3 mr-1" />
                  On Homepage
                </Badge>
              )}
              {facility.verified && (
                <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {facility.city}, {facility.state}
              </span>
              {type !== "eligible" && (
                <>
                  <span className="text-sm text-muted-foreground">•</span>
                  <span className="text-sm text-green-600 font-medium">
                    {stats.total_views.toLocaleString()} views
                  </span>
                  <span className="text-sm text-muted-foreground">•</span>
                  <span className="text-sm text-purple-600 font-medium">
                    {stats.total_leads} leads
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {facility.slug && (
            <Button variant="ghost" size="sm" asChild>
              <a href={`/center/${facility.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
          
          {type === "auto" && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={facility.featured_pinned ? "default" : "outline"}
                    size="sm"
                    className={facility.featured_pinned ? "bg-purple-600 hover:bg-purple-700" : ""}
                    onClick={() => setConfirmAction({ 
                      type: facility.featured_pinned ? "unpin" : "pin", 
                      facility 
                    })}
                    disabled={togglePinned.isPending}
                  >
                    {facility.featured_pinned ? (
                      <>
                        <PinOff className="h-4 w-4 mr-1" />
                        Unpin
                      </>
                    ) : (
                      <>
                        <Pin className="h-4 w-4 mr-1" />
                        Pin
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {facility.featured_pinned 
                    ? "Remove from always-shown list" 
                    : "Always show on homepage (bypass rotation)"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {type === "legacy" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmAction({ type: "remove_legacy", facility })}
              disabled={toggleLegacyFeatured.isPending}
            >
              Remove
            </Button>
          )}

          {type === "eligible" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmAction({ type: "add_legacy", facility })}
              disabled={toggleLegacyFeatured.isPending}
            >
              <Star className="h-4 w-4 mr-1" />
              Feature
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Featured Placement</h1>
          <p className="text-muted-foreground">
            Manage featured providers and homepage rotation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1.5 text-amber-700 bg-amber-50 border-amber-200">
            <Crown className="h-3.5 w-3.5 mr-1.5" />
            {autoFeaturedFacilities.length} Auto
          </Badge>
          <Badge variant="outline" className="px-3 py-1.5">
            <Star className="h-3.5 w-3.5 mr-1.5 fill-current" />
            {legacyFeaturedFacilities.length} Legacy
          </Badge>
        </div>
      </div>

      {/* Error Alert */}
      {hasError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load featured data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 max-w-2xl">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="auto-featured" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Auto-Featured
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="legacy" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Legacy
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Info Alert */}
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Auto-Featured System:</strong> Providers on the Featured plan ($1,099/mo) are automatically 
              featured and rotated daily. Homepage shows max 6 at a time. Pinned providers always appear.
            </AlertDescription>
          </Alert>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-700">Auto-Featured</p>
                    <p className="text-3xl font-bold text-amber-900">{autoFeaturedFacilities.length}</p>
                    <p className="text-xs text-amber-600 mt-1">Featured Plan subscribers</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-amber-200 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-amber-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Homepage Display</p>
                    <p className="text-3xl font-bold">{homepageFeaturedIds.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Max 6, rotates daily</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Eye className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pinned</p>
                    <p className="text-3xl font-bold">
                      {autoFeaturedFacilities.filter(f => f.featured_pinned).length}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Always shown on homepage</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Pin className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Featured Views (30d)</p>
                    <p className="text-3xl font-bold">
                      {autoFeaturedFacilities.reduce((sum, f) => sum + (getStats(f.id).total_views), 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Featured Leads (30d)</p>
                    <p className="text-3xl font-bold text-green-600">
                      {totalFeaturedLeads}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">From featured providers</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Legacy Featured</p>
                    <p className="text-3xl font-bold text-slate-600">
                      {legacyFeaturedFacilities.length}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Manual placements</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                    <Star className="h-6 w-6 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setActiveTab("auto-featured")}
                >
                  <Zap className="h-4 w-4 mr-2 text-amber-500" />
                  View Auto-Featured ({autoFeaturedFacilities.length})
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setActiveTab("legacy")}
                >
                  <Star className="h-4 w-4 mr-2 text-slate-500" />
                  Manage Legacy ({legacyFeaturedFacilities.length})
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setActiveTab("analytics")}
                >
                  <TrendingUp className="h-4 w-4 mr-2 text-emerald-500" />
                  View Analytics
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setActiveTab("settings")}
                >
                  <Settings className="h-4 w-4 mr-2 text-slate-500" />
                  Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Real-time Activity Feed */}
          <FeaturedActivityFeed />

          {/* Homepage Preview with Drag and Drop */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Eye className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <CardTitle>Homepage Display Order</CardTitle>
                    <CardDescription>
                      Drag and drop to reorder. Top 6 shown on homepage. Pinned always appear first.
                    </CardDescription>
                  </div>
                </div>
                {hasOrderChanges && (
                  <Button 
                    onClick={() => saveDisplayOrder.mutate(orderedFacilities)}
                    disabled={saveDisplayOrder.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveDisplayOrder.isPending ? "Saving..." : "Save Order"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {hasOrderChanges && (
                <Alert className="mb-4 border-amber-200 bg-amber-50">
                  <Info className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    You have unsaved order changes. Click "Save Order" to apply.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border">
                <h3 className="text-lg font-semibold text-center mb-6">Featured Treatment Centers</h3>
                {isLoading ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full rounded-xl" />
                    ))}
                  </div>
                ) : orderedFacilities.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {orderedFacilities.slice(0, 6).map((facility, index) => (
                      <div
                        key={facility.id}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragEnter={() => handleDragEnter(index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                        className={`p-5 rounded-xl border bg-white shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${
                          index < 6 ? "ring-2 ring-green-200" : "opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-5 w-5 text-muted-foreground/50" />
                            <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded">
                              #{index + 1}
                            </span>
                          </div>
                          <Avatar className="h-12 w-12 border-2 border-amber-200">
                            <AvatarImage src={facility.logo_url || undefined} />
                            <AvatarFallback className="bg-amber-100 text-amber-800 font-semibold">
                              {facility.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{facility.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {facility.city}, {facility.state}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs">
                            <Crown className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                          {facility.featured_pinned && (
                            <Badge variant="outline" className="text-purple-600 border-purple-200 text-xs">
                              <Pin className="h-3 w-3 mr-1" />
                              Pinned
                            </Badge>
                          )}
                          {facility.verified && (
                            <Badge variant="outline" className="text-blue-600 border-blue-200 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Crown className="h-10 w-10 mx-auto mb-2 text-amber-200" />
                    <p>No featured providers to display</p>
                  </div>
                )}
                
                {/* Show remaining facilities outside top 6 */}
                {orderedFacilities.length > 6 && (
                  <div className="mt-6 pt-6 border-t">
                    <p className="text-sm text-muted-foreground mb-4 text-center">
                      Additional featured providers (rotate into top 6 based on order):
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {orderedFacilities.slice(6).map((facility, index) => (
                        <div
                          key={facility.id}
                          draggable
                          onDragStart={() => handleDragStart(index + 6)}
                          onDragEnter={() => handleDragEnter(index + 6)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => e.preventDefault()}
                          className="p-3 rounded-lg border bg-white/50 opacity-70 hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                        >
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                            <span className="text-xs font-bold text-muted-foreground">#{index + 7}</span>
                            <Avatar className="h-8 w-8 border border-slate-200">
                              <AvatarImage src={facility.logo_url || undefined} />
                              <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
                                {facility.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm truncate">{facility.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Auto-Featured Tab */}
        <TabsContent value="auto-featured" className="space-y-6">
          {/* Info Alert */}
          <Alert className="border-amber-200 bg-amber-50">
            <Zap className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>How Auto-Featured Works:</strong> Providers with active Featured plan subscriptions ($1,099/mo) 
              are automatically added here. Up to 6 rotate daily on the homepage. Pinned providers always appear first.
            </AlertDescription>
          </Alert>

          {/* Auto-Featured Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-700">Total Auto-Featured</p>
                    <p className="text-3xl font-bold text-amber-900">{autoFeaturedFacilities.length}</p>
                    <p className="text-xs text-amber-600 mt-1">Active subscriptions</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-amber-200 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-amber-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pinned Providers</p>
                    <p className="text-3xl font-bold text-purple-600">
                      {autoFeaturedFacilities.filter(f => f.featured_pinned).length}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Always on homepage</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Pin className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Views (30d)</p>
                    <p className="text-3xl font-bold text-green-600">
                      {autoFeaturedFacilities.reduce((sum, f) => sum + (facilityStats?.[f.id]?.total_views || 0), 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Profile impressions</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Eye className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Leads (30d)</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {autoFeaturedFacilities.reduce((sum, f) => sum + (facilityStats?.[f.id]?.total_leads || 0), 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">From featured placement</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pinned Providers Section */}
          {autoFeaturedFacilities.filter(f => f.featured_pinned).length > 0 && (
            <Card className="border-purple-200">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Pin className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Pinned Providers
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                        {autoFeaturedFacilities.filter(f => f.featured_pinned).length}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Always displayed on homepage, bypassing the daily rotation system
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {autoFeaturedFacilities
                    .filter(f => f.featured_pinned)
                    .map((facility) => (
                      <FacilityRow key={facility.id} facility={facility} type="auto" />
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rotating Providers Section */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {autoFeaturedFacilities.filter(f => f.featured_pinned).length > 0 ? "Rotating Providers" : "Auto-Featured Providers"}
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200">Featured Plan</Badge>
                    </CardTitle>
                    <CardDescription>
                      {autoFeaturedFacilities.filter(f => f.featured_pinned).length > 0 
                        ? "Rotate daily on homepage alongside pinned providers" 
                        : "Automatically featured based on active Featured plan subscription"}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                    <Eye className="h-3 w-3 mr-1" />
                    {homepageFeaturedIds.filter(id => autoFeaturedFacilities.some(f => f.id === id)).length} on homepage today
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : autoFeaturedFacilities.filter(f => !f.featured_pinned).length > 0 ? (
                <div className="space-y-3">
                  {autoFeaturedFacilities
                    .filter(f => !f.featured_pinned)
                    .map((facility) => (
                      <FacilityRow key={facility.id} facility={facility} type="auto" />
                    ))}
                </div>
              ) : autoFeaturedFacilities.length > 0 ? (
                <div className="text-center py-8 bg-muted/30 rounded-xl border-2 border-dashed">
                  <Pin className="h-10 w-10 mx-auto mb-2 text-purple-300" />
                  <p className="font-medium text-foreground">All providers are pinned</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    No providers in the rotation pool
                  </p>
                </div>
              ) : (
                <div className="text-center py-12 bg-muted/30 rounded-xl border-2 border-dashed">
                  <Zap className="h-12 w-12 mx-auto mb-3 text-amber-300" />
                  <p className="font-medium text-foreground">No Featured Plan subscribers</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Providers on the Featured plan will appear here automatically
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <FeaturedAnalyticsDashboard />
        </TabsContent>

        {/* Legacy Tab */}
        <TabsContent value="legacy" className="space-y-6">
          {/* Info Alert */}
          <Alert className="border-slate-200 bg-slate-50">
            <Info className="h-4 w-4 text-slate-600" />
            <AlertDescription className="text-slate-700">
              <strong>Legacy Featured</strong> providers are manually featured by admins, separate from the automatic Featured plan subscription system. 
              Legacy featured providers appear in search results with a featured badge but do not participate in homepage rotation. 
              Consider encouraging providers to upgrade to the Featured plan for full benefits.
            </AlertDescription>
          </Alert>

          {/* Legacy Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <StatsCard
              title="Legacy Featured"
              value={legacyFeaturedFacilities.length}
              subtitle="Manually featured"
              icon={Star}
              gradient="bg-gradient-to-br from-slate-50 to-white"
            />
            <StatsCard
              title="Total Views (30d)"
              value={legacyFeaturedFacilities.reduce((sum, f) => sum + (facilityStats?.[f.id]?.total_views || 0), 0).toLocaleString()}
              subtitle="Legacy provider views"
              icon={Eye}
            />
            <StatsCard
              title="Total Leads (30d)"
              value={legacyFeaturedFacilities.reduce((sum, f) => sum + (facilityStats?.[f.id]?.total_leads || 0), 0)}
              subtitle="Legacy provider leads"
              icon={Users}
            />
            <StatsCard
              title="Eligible Providers"
              value={eligibleFacilities.length}
              subtitle="Can be legacy featured"
              icon={CheckCircle2}
            />
          </div>

          {/* Current Legacy Featured */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Star className="h-5 w-5 text-slate-600 fill-slate-400" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Current Legacy Featured
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                        {legacyFeaturedFacilities.length}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Manually featured providers. Consider encouraging upgrade to Featured plan for full benefits.
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : legacyFeaturedFacilities.length > 0 ? (
                <div className="space-y-3">
                  {legacyFeaturedFacilities.map((facility) => (
                    <FacilityRow key={facility.id} facility={facility} type="legacy" />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-muted/30 rounded-xl border-2 border-dashed">
                  <Star className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p className="font-medium text-foreground">No Legacy Featured Providers</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    All featured providers are on the Featured plan, or you can add legacy featured below
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Legacy Featured */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Add Legacy Featured
                      <Badge variant="outline" className="text-blue-600 border-blue-200">
                        {eligibleFacilities.length} eligible
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Manually feature approved providers who are not on Featured plan
                    </CardDescription>
                  </div>
                </div>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, city, state..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : paginatedEligible.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {paginatedEligible.map((facility) => (
                      <FacilityRow key={facility.id} facility={facility} type="eligible" />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t pt-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Show</span>
                        <Select
                          value={itemsPerPage.toString()}
                          onValueChange={(value) => {
                            setItemsPerPage(Number(value));
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="w-20 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                        <span>of {filteredEligible.length} providers</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground px-2">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : searchQuery ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="font-medium">No providers match "{searchQuery}"</p>
                  <p className="text-sm mt-1">Try a different search term</p>
                </div>
              ) : (
                <div className="text-center py-12 bg-muted/30 rounded-xl border-2 border-dashed">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-300" />
                  <p className="font-medium text-foreground">All Providers Featured</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    All approved providers are either featured or on the Featured plan
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <FeaturedSettingsTab />
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "pin" && "Pin Provider to Homepage?"}
              {confirmAction?.type === "unpin" && "Unpin Provider from Homepage?"}
              {confirmAction?.type === "add_legacy" && "Add to Legacy Featured?"}
              {confirmAction?.type === "remove_legacy" && "Remove from Featured?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "pin" && (
                <>
                  <strong>{confirmAction.facility.name}</strong> will always appear on the homepage, bypassing the daily rotation.
                </>
              )}
              {confirmAction?.type === "unpin" && (
                <>
                  <strong>{confirmAction.facility.name}</strong> will return to the normal daily rotation and may not always appear on homepage.
                </>
              )}
              {confirmAction?.type === "add_legacy" && (
                <>
                  <strong>{confirmAction.facility.name}</strong> will be manually featured. Note: Legacy featuring does not include homepage rotation benefits.
                </>
              )}
              {confirmAction?.type === "remove_legacy" && (
                <>
                  <strong>{confirmAction.facility.name}</strong> will no longer be featured and will lose any featured placement benefits.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={
                confirmAction?.type === "remove_legacy" 
                  ? "bg-destructive hover:bg-destructive/90" 
                  : confirmAction?.type === "pin"
                  ? "bg-purple-600 hover:bg-purple-700"
                  : ""
              }
            >
              {confirmAction?.type === "pin" && "Pin Provider"}
              {confirmAction?.type === "unpin" && "Unpin Provider"}
              {confirmAction?.type === "add_legacy" && "Add to Featured"}
              {confirmAction?.type === "remove_legacy" && "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}