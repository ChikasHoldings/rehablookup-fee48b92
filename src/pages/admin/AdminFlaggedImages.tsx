import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";
import { format, formatDistanceToNow } from "date-fns";
import {
  Image,
  Flag,
  AlertTriangle,
  CheckCircle,
  Search,
  Building2,
  Eye,
  Trash2,
  RefreshCw,
  X,
  Filter,
  ExternalLink,
  ImageOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FlaggedImage = {
  id: string;
  facility_id: string;
  image_url: string;
  image_type: string;
  reason: string | null;
  flagged_by: string;
  flagged_at: string;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  facility?: {
    name: string;
    city: string;
    state: string;
    logo_url: string | null;
    gallery_urls: string[] | null;
    slug: string | null;
  };
};

const REASON_LABELS: Record<string, string> = {
  inappropriate: "Inappropriate content",
  misleading: "Misleading or fake image",
  low_quality: "Low quality / unprofessional",
  copyright: "Copyright violation",
  other: "Other",
};

export default function AdminFlaggedImages() {
  const queryClient = useQueryClient();
  const { logError } = useAdminErrorHandler("AdminFlaggedImages");
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [reasonFilter, setReasonFilter] = useState<string>("all");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<FlaggedImage | null>(null);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");

  // Invalidate all flagged images queries helper
  const invalidateFlaggedQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-flagged-images"] });
    queryClient.invalidateQueries({ queryKey: ["admin-flagged-images-counts"] });
  }, [queryClient]);

  // Real-time subscriptions - always active
  useEffect(() => {
    const flaggedChannel = supabase
      .channel("admin-flagged-images-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "flagged_images" },
        () => {
          invalidateFlaggedQueries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(flaggedChannel);
    };
  }, [invalidateFlaggedQueries]);

  // Fetch flagged images with facility info
  const { data: flaggedImages, isLoading } = useQuery({
    queryKey: ["admin-flagged-images", activeTab, searchQuery, reasonFilter],
    queryFn: async () => {
      let query = supabase
        .from("flagged_images")
        .select(`
          *,
          facility:facilities(name, city, state, logo_url, gallery_urls, slug)
        `)
        .order("flagged_at", { ascending: false });

      if (activeTab === "pending") {
        query = query.eq("resolved", false);
      } else if (activeTab === "resolved") {
        query = query.eq("resolved", true);
      }

      if (reasonFilter && reasonFilter !== "all") {
        query = query.eq("reason", reasonFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by search query if provided
      let results = (data || []) as FlaggedImage[];
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        results = results.filter(
          (img) =>
            img.facility?.name?.toLowerCase().includes(query) ||
            img.facility?.city?.toLowerCase().includes(query)
        );
      }

      return results;
    },
  });

  // Get counts
  const { data: counts } = useQuery({
    queryKey: ["admin-flagged-images-counts"],
    queryFn: async () => {
      const [pendingResult, resolvedResult] = await Promise.all([
        supabase.from("flagged_images").select("id", { count: "exact", head: true }).eq("resolved", false),
        supabase.from("flagged_images").select("id", { count: "exact", head: true }).eq("resolved", true),
      ]);

      return {
        pending: pendingResult.count || 0,
        resolved: resolvedResult.count || 0,
        all: (pendingResult.count || 0) + (resolvedResult.count || 0),
      };
    },
  });

  // Resolve flagged image mutation
  const resolveImage = useMutation({
    mutationFn: async () => {
      if (!selectedImage) throw new Error("No image selected");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("flagged_images")
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          resolution_notes: resolutionNotes || null,
        })
        .eq("id", selectedImage.id);

      if (error) throw error;

      // Log admin action
      await supabase.from("admin_audit_log").insert({
        admin_user_id: user.id,
        action_type: "resolve_flagged_image",
        target_type: "flagged_image",
        target_id: selectedImage.id,
        details: { resolution_notes: resolutionNotes },
      });
    },
    onSuccess: () => {
      toast.success("Image flag resolved");
      setShowResolveDialog(false);
      setSelectedImage(null);
      setResolutionNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin-flagged-images"] });
      queryClient.invalidateQueries({ queryKey: ["admin-flagged-images-counts"] });
    },
    onError: (error) => {
      toast.error(`Failed to resolve: ${error.message}`);
    },
  });

  // Delete flagged image record
  const deleteFlag = useMutation({
    mutationFn: async (imageId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("flagged_images")
        .delete()
        .eq("id", imageId);

      if (error) throw error;

      await supabase.from("admin_audit_log").insert({
        admin_user_id: user.id,
        action_type: "delete_flag",
        target_type: "flagged_image",
        target_id: imageId,
      });
    },
    onSuccess: () => {
      toast.success("Flag removed");
      queryClient.invalidateQueries({ queryKey: ["admin-flagged-images"] });
      queryClient.invalidateQueries({ queryKey: ["admin-flagged-images-counts"] });
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  // Remove image from facility profile
  const removeImage = useMutation({
    mutationFn: async () => {
      if (!selectedImage) throw new Error("No image selected");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Determine what to update based on image type
      if (selectedImage.image_type === "logo") {
        // Remove logo
        const { error } = await supabase
          .from("facilities")
          .update({ logo_url: null })
          .eq("id", selectedImage.facility_id);

        if (error) throw error;
      } else if (selectedImage.image_type === "gallery") {
        // Remove from gallery array
        const currentGallery = selectedImage.facility?.gallery_urls || [];
        const updatedGallery = currentGallery.filter(
          (url) => url !== selectedImage.image_url
        );

        const { error } = await supabase
          .from("facilities")
          .update({ gallery_urls: updatedGallery })
          .eq("id", selectedImage.facility_id);

        if (error) throw error;
      }

      // Mark the flag as resolved with removal note
      await supabase
        .from("flagged_images")
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          resolution_notes: "Image removed from facility profile by admin",
        })
        .eq("id", selectedImage.id);

      // Log admin action
      await supabase.from("admin_audit_log").insert({
        admin_user_id: user.id,
        action_type: "remove_flagged_image",
        target_type: "facility",
        target_id: selectedImage.facility_id,
        details: {
          flagged_image_id: selectedImage.id,
          image_type: selectedImage.image_type,
          image_url: selectedImage.image_url,
          reason: selectedImage.reason,
        },
      });
    },
    onSuccess: () => {
      toast.success("Image removed from facility profile");
      setShowRemoveDialog(false);
      setSelectedImage(null);
      queryClient.invalidateQueries({ queryKey: ["admin-flagged-images"] });
      queryClient.invalidateQueries({ queryKey: ["admin-flagged-images-counts"] });
    },
    onError: (error) => {
      toast.error(`Failed to remove image: ${error.message}`);
    },
  });

  const openResolveDialog = (image: FlaggedImage) => {
    setSelectedImage(image);
    setResolutionNotes("");
    setShowResolveDialog(true);
  };

  const openRemoveDialog = (image: FlaggedImage) => {
    setSelectedImage(image);
    setShowRemoveDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Image className="h-7 w-7 text-primary" />
            Flagged Images
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and manage flagged facility images
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Review</p>
              <p className="text-2xl font-bold">{counts?.pending || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-emerald-100">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Resolved</p>
              <p className="text-2xl font-bold">{counts?.resolved || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-slate-100">
              <Flag className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Flags</p>
              <p className="text-2xl font-bold">{counts?.all || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by facility name or city..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={reasonFilter} onValueChange={setReasonFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reasons</SelectItem>
                <SelectItem value="inappropriate">Inappropriate</SelectItem>
                <SelectItem value="misleading">Misleading</SelectItem>
                <SelectItem value="low_quality">Low Quality</SelectItem>
                <SelectItem value="copyright">Copyright</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Pending
            {counts?.pending ? (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                {counts.pending}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="resolved" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Resolved
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            All
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          ) : flaggedImages && flaggedImages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {flaggedImages.map((image) => (
                <Card key={image.id} className="overflow-hidden">
                  {/* Image Preview */}
                  <div
                    className="relative aspect-video bg-muted cursor-pointer group"
                    onClick={() => setPreviewImage(image.image_url)}
                  >
                    <img
                      src={image.image_url}
                      alt="Flagged image"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <Badge
                      variant={image.image_type === "logo" ? "default" : "secondary"}
                      className="absolute top-2 left-2"
                    >
                      {image.image_type}
                    </Badge>
                    {image.resolved && (
                      <Badge className="absolute top-2 right-2 bg-emerald-500">
                        Resolved
                      </Badge>
                    )}
                  </div>

                  <CardContent className="p-4 space-y-3">
                    {/* Facility Info */}
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={image.facility?.logo_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {image.facility?.name?.slice(0, 2).toUpperCase() || "??"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{image.facility?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {image.facility?.city}, {image.facility?.state}
                        </p>
                      </div>
                    </div>

                    {/* Reason Badge */}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-destructive border-destructive/30">
                        <Flag className="h-3 w-3 mr-1" />
                        {REASON_LABELS[image.reason || "other"] || image.reason}
                      </Badge>
                    </div>

                    {/* Timestamp */}
                    <p className="text-xs text-muted-foreground">
                      Flagged {formatDistanceToNow(new Date(image.flagged_at), { addSuffix: true })}
                    </p>

                    {/* Resolution Notes */}
                    {image.resolved && image.resolution_notes && (
                      <div className="p-2 bg-muted/50 rounded text-sm">
                        <p className="text-xs text-muted-foreground mb-1">Resolution notes:</p>
                        <p>{image.resolution_notes}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-2 pt-2">
                      <div className="flex gap-2">
                        {image.facility?.slug && (
                          <Button size="sm" variant="outline" asChild className="flex-1">
                            <a href={`/center/${image.facility.slug}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View
                            </a>
                          </Button>
                        )}
                        {!image.resolved ? (
                          <>
                            <Button
                              size="sm"
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => openResolveDialog(image)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Resolve
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-destructive"
                            onClick={() => deleteFlag.mutate(image.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                      {!image.resolved && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full"
                          onClick={() => openRemoveDialog(image)}
                        >
                          <ImageOff className="h-4 w-4 mr-1" />
                          Remove from Profile
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <Image className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {activeTab === "pending"
                    ? "No pending flagged images"
                    : activeTab === "resolved"
                    ? "No resolved flagged images"
                    : "No flagged images found"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95">
          <div className="relative">
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
              onClick={() => setPreviewImage(null)}
            >
              <X className="h-5 w-5" />
            </Button>
            {previewImage && (
              <img
                src={previewImage}
                alt="Preview"
                className="w-full max-h-[80vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              Resolve Flagged Image
            </DialogTitle>
            <DialogDescription>
              Mark this image as reviewed. Add optional notes about the resolution.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedImage && (
              <div className="flex justify-center">
                <img
                  src={selectedImage.image_url}
                  alt="Flagged"
                  className="max-w-48 max-h-48 object-contain rounded-lg border"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Resolution Notes (optional)</Label>
              <Textarea
                placeholder="Add notes about how this was resolved..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
                Cancel
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => resolveImage.mutate()}
                disabled={resolveImage.isPending}
              >
                {resolveImage.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Resolving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Resolved
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Image Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ImageOff className="h-5 w-5" />
              Remove Image from Profile
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this {selectedImage?.image_type === "logo" ? "logo" : "gallery image"} from{" "}
              <span className="font-medium">{selectedImage?.facility?.name}</span>'s profile and mark this flag as resolved.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedImage && (
            <div className="flex justify-center py-4">
              <img
                src={selectedImage.image_url}
                alt="Image to remove"
                className="max-w-48 max-h-48 object-contain rounded-lg border"
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeImage.mutate()}
              disabled={removeImage.isPending}
            >
              {removeImage.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <ImageOff className="h-4 w-4 mr-2" />
                  Remove Image
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
