import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Download, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
import { toast } from "sonner";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";
import { ProviderStatsCharts } from "@/components/admin/ProviderStatsCharts";
import {
  ProviderListItem,
  ProviderListEmpty,
  ProviderDetailModal,
  ImagePreviewDialog,
  FlagImageDialog,
  ConfirmActionDialog,
  type Facility,
  type ProSubscription,
} from "@/components/admin/providers";

const ITEMS_PER_PAGE = 15;

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function AdminProviders() {
  const queryClient = useQueryClient();
  const { logError } = useAdminErrorHandler("AdminProviders");
  const [searchInput, setSearchInput] = useState("");
  const searchQuery = useDebounce(searchInput, 350);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedProvider, setSelectedProvider] = useState<Facility | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Image flagging state
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [flagImageUrl, setFlagImageUrl] = useState("");
  const [flagImageType, setFlagImageType] = useState<"logo" | "gallery">("gallery");
  const [flagReason, setFlagReason] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Confirmation dialog state
  const [confirmAction, setConfirmAction] = useState<{
    action: "suspend" | "reactivate" | "delete";
    provider: Facility;
  } | null>(null);
  const [deleteWithUser, setDeleteWithUser] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      let successCount = 0;
      for (const facilityId of selectedIds) {
        const { error } = await supabase.functions.invoke("admin-delete-provider", {
          body: { facilityId, deleteUser: false },
        });
        if (!error) successCount++;
      }
      toast.success(`Deleted ${successCount} provider(s)`);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      invalidateProviderQueries();
    } catch (err: any) {
      toast.error("Bulk delete failed: " + (err.message || "Unknown error"));
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleExportCSV = () => {
    const rows = (providers || []).map((p) => ({
      Name: p.name,
      City: p.city,
      State: p.state,
      "Facility Type": p.facility_type,
      Status: p.suspended ? "Suspended" : p.status,
      Email: p.email || "",
      Phone: p.phone,
      Verified: p.verified ? "Yes" : "No",
      Featured: p.featured ? "Yes" : "No",
      "Placement Network": p.concierge_network_opted_in ? "Yes" : "No",
      Leads: String(leadCounts?.[p.id] || 0),
      Created: p.created_at ? new Date(p.created_at).toLocaleDateString() : "",
    }));
    if (!rows.length) { toast.info("No providers to export"); return; }
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => {
        const v = String((r as any)[h] ?? "");
        return v.includes(",") || v.includes('"') || v.includes("\n") ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `providers-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Providers exported to CSV");
  };

  // Invalidate all provider queries for real-time updates
  const invalidateProviderQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
    queryClient.invalidateQueries({ queryKey: ["admin-providers-status-counts"] });
    queryClient.invalidateQueries({ queryKey: ["admin-providers-count"] });
    queryClient.invalidateQueries({ queryKey: ["admin-provider-lead-counts"] });
    queryClient.invalidateQueries({ queryKey: ["admin-pro-subscriptions"] });
    queryClient.invalidateQueries({ queryKey: ["admin-sidebar-counts"] });
  }, [queryClient]);

  // Real-time subscriptions
  useEffect(() => {
    const facilitiesChannel = supabase
      .channel("admin-providers-facilities")
      .on("postgres_changes", { event: "*", schema: "public", table: "facilities" }, () => invalidateProviderQueries())
      .subscribe();

    const proChannel = supabase
      .channel("admin-pro-subscriptions")
      .on("postgres_changes", { event: "*", schema: "public", table: "pro_subscriptions" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-pro-subscriptions"] });
      })
      .subscribe();

    const leadsChannel = supabase
      .channel("admin-providers-leads")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-provider-lead-counts"] });
        queryClient.invalidateQueries({ queryKey: ["admin-provider-leads"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(facilitiesChannel);
      supabase.removeChannel(proChannel);
      supabase.removeChannel(leadsChannel);
    };
  }, [invalidateProviderQueries, queryClient]);

  // Fetch all status counts
  const { data: statusCounts } = useQuery({
    queryKey: ["admin-providers-status-counts"],
    queryFn: async () => {
      try {
        const [allResult, approvedResult, pendingResult, suspendedResult, proResult, placementResult] = await Promise.all([
          supabase.from("facilities").select("id", { count: "exact", head: true }),
          supabase.from("facilities").select("id", { count: "exact", head: true }).eq("status", "approved").neq("suspended", true),
          supabase.from("facilities").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("facilities").select("id", { count: "exact", head: true }).eq("suspended", true),
          supabase.from("pro_subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("facilities").select("id", { count: "exact", head: true }).eq("concierge_network_opted_in", true),
        ]);

        return {
          all: allResult.count || 0,
          approved: approvedResult.count || 0,
          pending: pendingResult.count || 0,
          suspended: suspendedResult.count || 0,
          pro: proResult.count || 0,
          placement: placementResult.count || 0,
        };
      } catch (error) {
        logError("fetch_status_counts", error);
        throw error;
      }
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch Pro subscriptions for badge display
  const { data: proSubscriptions } = useQuery({
    queryKey: ["admin-pro-subscriptions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pro_subscriptions")
        .select("id, facility_id, status, unlock_discount_percent, current_period_end, price_cents, created_at")
        .eq("status", "active");
      
      const map: Record<string, ProSubscription> = {};
      data?.forEach(sub => {
        map[sub.facility_id] = sub;
      });
      return map;
    },
  });

  // Fetch providers with pagination and filtering
  const { data: providers, isLoading } = useQuery({
    queryKey: ["admin-providers", activeTab, searchQuery, currentPage],
    queryFn: async () => {
      try {
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        let query = supabase
          .from("facilities")
          .select("id, name, slug, city, state, zip_code, phone, email, website, facility_type, status, featured, verified, suspended, concierge_network_opted_in, logo_url, created_at, updated_at, user_id")
          .order("created_at", { ascending: false })
          .range(from, to);

        if (activeTab === "approved") {
          query = query.eq("status", "approved").neq("suspended", true);
        } else if (activeTab === "pending") {
          query = query.eq("status", "pending");
        } else if (activeTab === "suspended") {
          query = query.eq("suspended", true);
        } else if (activeTab === "pro") {
          const { data: proFacilities } = await supabase
            .from("pro_subscriptions")
            .select("facility_id")
            .eq("status", "active");
          const proIds = proFacilities?.map(p => p.facility_id) || [];
          if (proIds.length === 0) return [];
          query = supabase
            .from("facilities")
            .select("id, name, slug, city, state, zip_code, phone, email, website, facility_type, status, featured, verified, suspended, concierge_network_opted_in, logo_url, created_at, updated_at, user_id")
            .in("id", proIds)
            .order("created_at", { ascending: false })
            .range(from, to);
        } else if (activeTab === "placement") {
          query = query.eq("concierge_network_opted_in", true);
        }

        if (searchQuery) {
          query = query.or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as Facility[];
      } catch (error) {
        logError("fetch_providers", error, { activeTab, searchQuery, currentPage });
        throw error;
      }
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch total count for current filter
  const { data: totalCount } = useQuery({
    queryKey: ["admin-providers-count", activeTab, searchQuery],
    queryFn: async () => {
      let query = supabase.from("facilities").select("id", { count: "exact", head: true });

      if (activeTab === "approved") {
        query = query.eq("status", "approved").neq("suspended", true);
      } else if (activeTab === "pending") {
        query = query.eq("status", "pending");
      } else if (activeTab === "suspended") {
        query = query.eq("suspended", true);
      } else if (activeTab === "pro") {
        const { data: proFacilities } = await supabase
          .from("pro_subscriptions")
          .select("facility_id")
          .eq("status", "active");
        const proIds = proFacilities?.map(p => p.facility_id) || [];
        if (proIds.length === 0) return 0;
        let proQuery = supabase.from("facilities").select("id", { count: "exact", head: true }).in("id", proIds);
        if (searchQuery) {
          proQuery = proQuery.or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
        }
        const { count: proCount } = await proQuery;
        return proCount || 0;
      } else if (activeTab === "placement") {
        query = query.eq("concierge_network_opted_in", true);
      }

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  });

  const totalPages = Math.ceil((totalCount || 0) / ITEMS_PER_PAGE);

  // Fetch lead counts for providers
  const { data: leadCounts } = useQuery({
    queryKey: ["admin-provider-lead-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("facility_id").limit(5000);
      const counts: Record<string, number> = {};
      data?.forEach((lead) => {
        if (lead.facility_id) {
          counts[lead.facility_id] = (counts[lead.facility_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  // Update provider mutation
  const updateProvider = useMutation({
    mutationFn: async ({
      id,
      updates,
      actionType,
    }: {
      id: string;
      updates: Partial<Facility>;
      actionType: string;
    }) => {
      const { data: facility } = await supabase
        .from("facilities")
        .select("name, user_id, status")
        .eq("id", id)
        .single();

      const { error } = await supabase.from("facilities").update(updates).eq("id", id);
      if (error) throw error;

      if (updates.status === "approved" && facility && facility.status !== "approved") {
        try {
          await supabase.functions.invoke("send-approval-email", {
            body: {
              facilityId: id,
              facilityName: facility.name,
              userId: facility.user_id,
            },
          });
        } catch (emailError) {
          console.error("Failed to send approval email:", emailError);
        }
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          await supabase.from("admin_audit_log").insert({
            admin_user_id: user.id,
            action_type: actionType,
            target_type: "facility",
            target_id: id,
            details: updates,
          });
        }
      } catch (auditError) {
        console.error("Failed to log admin action:", auditError);
      }
    },
    onSuccess: () => {
      invalidateProviderQueries();
      toast.success("Provider updated successfully");
    },
    onError: (error) => {
      console.error("Provider update failed:", error);
      toast.error("Failed to update provider");
    },
  });

  // Flag image mutation
  const flagImage = useMutation({
    mutationFn: async () => {
      if (!selectedProvider || !flagImageUrl) {
        throw new Error("Missing required fields");
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("flagged_images").insert({
        facility_id: selectedProvider.id,
        image_url: flagImageUrl,
        image_type: flagImageType,
        reason: flagReason || null,
        flagged_by: user.id,
      });
      
      if (error) throw error;

      await supabase.from("admin_audit_log").insert({
        admin_user_id: user.id,
        action_type: "flag_image",
        target_type: "facility",
        target_id: selectedProvider.id,
        details: { image_url: flagImageUrl, image_type: flagImageType, reason: flagReason },
      });

      // Notify provider
      await supabase.functions.invoke("notify-flagged-image", {
        body: {
          facilityId: selectedProvider.id,
          facilityName: selectedProvider.name,
          imageType: flagImageType,
          reason: flagReason,
        },
      });
    },
    onSuccess: () => {
      toast.success("Image flagged and provider notified");
      setShowFlagDialog(false);
      setFlagImageUrl("");
      setFlagReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-flagged-images", selectedProvider?.id] });
    },
    onError: (error) => {
      toast.error(`Failed to flag image: ${error.message}`);
    },
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1);
  };

  // Reset page when debounced search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleStatusChange = (id: string, newStatus: string) => {
    updateProvider.mutate({
      id,
      updates: { status: newStatus, suspended: false },
      actionType: `status_changed_to_${newStatus}`,
    });
  };

  const handleToggleVerified = (id: string, currentValue: boolean | null) => {
    updateProvider.mutate({
      id,
      updates: { verified: !currentValue },
      actionType: currentValue ? "unverified" : "verified",
    });
  };

  const handleToggleFeatured = (id: string, currentValue: boolean) => {
    updateProvider.mutate({
      id,
      updates: { featured: !currentValue },
      actionType: currentValue ? "unfeatured" : "featured",
    });
  };

  const handleSuspend = (provider: Facility) => {
    setConfirmAction({ action: "suspend", provider });
  };

  const handleReactivate = (provider: Facility) => {
    setConfirmAction({ action: "reactivate", provider });
  };

  const handleDelete = (provider: Facility) => {
    setDeleteWithUser(false);
    setConfirmAction({ action: "delete", provider });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    
    if (confirmAction.action === "suspend") {
      updateProvider.mutate({
        id: confirmAction.provider.id,
        updates: { suspended: true },
        actionType: "suspended",
      });
      setConfirmAction(null);
      setShowDetailDialog(false);
    } else if (confirmAction.action === "reactivate") {
      updateProvider.mutate({
        id: confirmAction.provider.id,
        updates: { suspended: false, status: "approved" },
        actionType: "reactivated",
      });
      setConfirmAction(null);
      setShowDetailDialog(false);
    } else if (confirmAction.action === "delete") {
      setIsDeleting(true);
      try {
        const { error } = await supabase.functions.invoke("admin-delete-provider", {
          body: {
            facilityId: confirmAction.provider.id,
            deleteUser: deleteWithUser,
          },
        });

        if (error) throw error;

        toast.success(`Provider "${confirmAction.provider.name}" deleted successfully`);
        invalidateProviderQueries();
        setConfirmAction(null);
        setShowDetailDialog(false);
      } catch (error) {
        console.error("Delete provider failed:", error);
        toast.error("Failed to delete provider");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleSaveNotes = (notes: string) => {
    if (!selectedProvider) return;
    updateProvider.mutate({
      id: selectedProvider.id,
      updates: { admin_notes: notes },
      actionType: "notes_updated",
    });
  };

  const openProviderDetail = (provider: Facility) => {
    setSelectedProvider(provider);
    setShowDetailDialog(true);
  };

  const openFlagDialog = (imageUrl: string, type: "logo" | "gallery") => {
    setFlagImageUrl(imageUrl);
    setFlagImageType(type);
    setFlagReason("");
    setShowFlagDialog(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Provider Management</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Manage facilities, subscriptions, and placement network</p>
      </div>

      {/* Interactive Stats Charts */}
      <ProviderStatsCharts 
        statusCounts={statusCounts}
        onTabChange={handleTabChange}
        activeTab={activeTab}
      />

      {/* Search + Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 sm:h-4 w-3.5 sm:w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, city, or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8 sm:pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 h-9">
            <Download className="h-4 w-4" />
            Export
          </Button>
          {selectedIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)} className="gap-1.5 h-9">
              <Trash2 className="h-4 w-4" />
              Delete ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* Provider List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : providers && providers.length > 0 ? (
            <div className="divide-y">
              {providers.map((provider) => (
                <div key={provider.id} className="flex items-center">
                  <div className="pl-4 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(provider.id)}
                      onCheckedChange={() => toggleSelect(provider.id)}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <ProviderListItem
                      provider={provider}
                      isPro={!!proSubscriptions?.[provider.id]}
                      leadCount={leadCounts?.[provider.id] || 0}
                      onOpenDetail={openProviderDetail}
                      onStatusChange={handleStatusChange}
                      onToggleVerified={handleToggleVerified}
                      onToggleFeatured={handleToggleFeatured}
                      onSuspend={handleSuspend}
                      onReactivate={handleReactivate}
                      onDelete={handleDelete}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ProviderListEmpty />
          )}
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
            <p className="text-sm text-muted-foreground">
              <span className="tabular-nums">Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount || 0)} of {totalCount} providers</span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Provider Detail Modal */}
      <ProviderDetailModal
        provider={selectedProvider}
        proSubscriptions={proSubscriptions}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        onStatusChange={handleStatusChange}
        onToggleVerified={handleToggleVerified}
        onToggleFeatured={handleToggleFeatured}
        onSuspend={handleSuspend}
        onReactivate={handleReactivate}
        onSaveNotes={handleSaveNotes}
        onFlagImage={openFlagDialog}
        onPreviewImage={setPreviewImage}
      />

      {/* Image Preview Dialog */}
      <ImagePreviewDialog
        imageUrl={previewImage}
        onClose={() => setPreviewImage(null)}
      />

      {/* Flag Image Dialog */}
      <FlagImageDialog
        open={showFlagDialog}
        onOpenChange={setShowFlagDialog}
        imageUrl={flagImageUrl}
        reason={flagReason}
        onReasonChange={setFlagReason}
        onSubmit={() => flagImage.mutate()}
        isPending={flagImage.isPending}
      />

      {/* Confirmation Dialog for Destructive Actions */}
      <ConfirmActionDialog
        action={confirmAction?.action || null}
        provider={confirmAction?.provider || null}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
        isPending={updateProvider.isPending}
        isDeleting={isDeleting}
        deleteWithUser={deleteWithUser}
        onDeleteWithUserChange={setDeleteWithUser}
      />

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete {selectedIds.size} Provider(s)
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected facilities and all their associated data
              (leads, reviews, accreditations, images). Provider user accounts will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete {selectedIds.size} Provider(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
