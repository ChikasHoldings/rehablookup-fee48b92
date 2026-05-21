import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Download, Trash2, Loader2, Info, ExternalLink, ShieldCheck, FileCheck, RefreshCw, ToggleRight, Link2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
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
import { PaginationFooter } from "@/components/common/PaginationFooter";
import { usePagination } from "@/hooks/usePagination";
import { BulkProviderStatusDialog } from "@/components/admin/providers/BulkProviderStatusDialog";
import { BulkProviderFlagDialog } from "@/components/admin/providers/BulkProviderFlagDialog";
import { PUBLIC_FACILITIES_QUERY_KEY } from "@/hooks/useStaticFacilities";
import {
  FACILITY_LIST_COLUMNS,
  TAB_FILTERS,
  applyProviderSearch,
  type AdminProvidersTab,
} from "./adminProvidersConfig";

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
  const { adminRole, isSuperAdmin } = useAdminAuth();
  const canModerate = isSuperAdmin || adminRole === "super_admin" || adminRole === "manager";

  // URL-state — tab + search round-trip through the URL so any
  // filtered view is bookmarkable / shareable / reload-stable.
  // Matches /admin/leads and /admin/insurance-verifications patterns.
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(() => searchParams.get("q") ?? "");
  const searchQuery = useDebounce(searchInput, 350);
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") ?? "all");
  const [selectedProvider, setSelectedProvider] = useState<Facility | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Sync state → URL on every change. `replace: true` keeps the
  // browser history short. Skip the default "all" tab to keep the
  // URL tidy. Loop-guard compares before writing.
  useEffect(() => {
    const next = new URLSearchParams();
    if (searchQuery) next.set("q", searchQuery);
    if (activeTab && activeTab !== "all") next.set("tab", activeTab);
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [searchQuery, activeTab, searchParams, setSearchParams]);
  
  
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
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkFlagOpen, setBulkFlagOpen] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Copy-link helper for shareable filtered URLs.
  const copyFilterLink = useCallback(async () => {
    try {
      const url = window.location.href;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const tmp = document.createElement("input");
        tmp.value = url;
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand("copy");
        document.body.removeChild(tmp);
      }
      toast.success("Filter link copied to clipboard");
    } catch {
      toast.error("Could not copy link");
    }
  }, []);

  const hasActiveFilters = activeTab !== "all" || searchInput !== "";

  // Bulk delete walks the selected facility IDs sequentially through the
  // edge function. We track failures explicitly (not just silently dropping
  // them from the success count) so the admin sees exactly which rows
  // didn't delete — critical when a partial batch fails and the admin
  // assumes everything succeeded.
  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    const results: { id: string; ok: boolean; message?: string }[] = [];
    const ids = [...selectedIds];
    const idToName: Record<string, string> = {};
    for (const p of providers || []) idToName[p.id] = p.name;
    try {
      for (const facilityId of ids) {
        try {
          const { error } = await supabase.functions.invoke("admin-delete-provider", {
            body: { facilityId, deleteUser: false },
          });
          results.push({
            id: facilityId,
            ok: !error,
            message: error?.message,
          });
        } catch (err: any) {
          results.push({ id: facilityId, ok: false, message: err?.message ?? "Unknown error" });
        }
      }

      const successes = results.filter((r) => r.ok);
      const failures = results.filter((r) => !r.ok);

      if (failures.length === 0) {
        toast.success(`Deleted ${successes.length} provider(s)`);
        setSelectedIds(new Set());
      } else if (successes.length === 0) {
        toast.error(
          `Bulk delete failed — 0 of ${ids.length} succeeded. First error: ${failures[0].message ?? "unknown"}`,
          { duration: 10000 },
        );
        // Keep the selection so the admin can retry without re-selecting.
      } else {
        const failedNames = failures
          .slice(0, 3)
          .map((f) => idToName[f.id] || f.id.slice(0, 8))
          .join(", ");
        toast.warning(
          `Partial delete: ${successes.length} succeeded, ${failures.length} failed (${failedNames}${failures.length > 3 ? `, +${failures.length - 3} more` : ""}). Retry the failed rows manually.`,
          { duration: 10000 },
        );
        // Narrow the selection to the failed rows so the admin can retry.
        setSelectedIds(new Set(failures.map((f) => f.id)));
      }
      setBulkDeleteOpen(false);
      invalidateProviderQueries();
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
      Source: p.data_source === "samhsa_import"
        ? "SAMHSA"
        : p.data_source === "provider"
          ? "Provider"
          : p.data_source === "manual"
            ? "Manual"
            : (p.data_source || ""),
      "SAMHSA ID": p.samhsa_facility_id || "",
      "Claim Status": p.user_id ? "Claimed" : "Unclaimed",
      "Claimed At": p.claimed_at ? new Date(p.claimed_at).toLocaleDateString() : "",
      "Pending Claims": String(pendingClaimCounts?.[p.id] || 0),
      Email: p.email || "",
      Phone: p.phone,
      Verified: p.verified ? "Yes" : "No",
      // Pro plan column — derived from the proSubscriptions map
      // populated by the active-subscription query. Closes the
      // monetization-visibility gap the audit flagged (the column
      // existed in the map but never made it into the export).
      "Pro Plan": proSubscriptions?.[p.id] ? "Yes" : "No",
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

  // Invalidate all provider queries for real-time updates. Also includes
  // the PUBLIC facility snapshot key so the admin who just approved /
  // rejected / suspended a facility sees their own /search-results and
  // /rehab-centers pages refresh instantly (in addition to the realtime
  // event that fires for every other connected client).
  const invalidateProviderQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
    queryClient.invalidateQueries({ queryKey: ["admin-providers-status-counts"] });
    queryClient.invalidateQueries({ queryKey: ["admin-providers-count"] });
    queryClient.invalidateQueries({ queryKey: ["admin-provider-lead-counts"] });
    queryClient.invalidateQueries({ queryKey: ["admin-provider-pending-claim-counts"] });
    queryClient.invalidateQueries({ queryKey: ["admin-pro-subscriptions"] });
    queryClient.invalidateQueries({ queryKey: ["admin-sidebar-counts"] });
    queryClient.invalidateQueries({ queryKey: PUBLIC_FACILITIES_QUERY_KEY });
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

    // Poll for leads data every 60 seconds (leads removed from Realtime for PII security)
    const leadsInterval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["admin-provider-lead-counts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-provider-leads"] });
    }, 60000);

    return () => {
      supabase.removeChannel(facilitiesChannel);
      supabase.removeChannel(proChannel);
      clearInterval(leadsInterval);
    };
  }, [invalidateProviderQueries, queryClient]);

  // Fetch all status counts
  const { data: statusCounts } = useQuery({
    queryKey: ["admin-providers-status-counts"],
    queryFn: async () => {
      try {
        const [
          allResult,
          approvedResult,
          pendingResult,
          suspendedResult,
          proResult,
          placementResult,
          samhsaResult,
          unclaimedResult,
          claimedResult,
          pendingClaimResult,
        ] = await Promise.all([
          supabase.from("facilities").select("id", { count: "exact", head: true }),
          supabase.from("facilities").select("id", { count: "exact", head: true }).eq("status", "approved").neq("suspended", true),
          supabase.from("facilities").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("facilities").select("id", { count: "exact", head: true }).eq("suspended", true),
          supabase.from("facility_subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("facilities").select("id", { count: "exact", head: true }).eq("concierge_network_opted_in", true),
          supabase.from("facilities").select("id", { count: "exact", head: true }).eq("data_source", "samhsa_import"),
          supabase.from("facilities").select("id", { count: "exact", head: true }).is("user_id", null),
          supabase.from("facilities").select("id", { count: "exact", head: true }).not("user_id", "is", null),
          supabase.from("facility_claim_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        ]);

        return {
          all: allResult.count || 0,
          approved: approvedResult.count || 0,
          pending: pendingResult.count || 0,
          suspended: suspendedResult.count || 0,
          pro: proResult.count || 0,
          placement: placementResult.count || 0,
          samhsa: samhsaResult.count || 0,
          unclaimed: unclaimedResult.count || 0,
          claimed: claimedResult.count || 0,
          pendingClaims: pendingClaimResult.count || 0,
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
        .from("facility_subscriptions")
        .select("id, facility_id, status, current_period_end, price_cents, created_at")
        .eq("status", "active");
      
      const map: Record<string, ProSubscription> = {};
      data?.forEach(sub => {
        map[sub.facility_id] = sub;
      });
      return map;
    },
  });

  // Fetch total count for current filter — drives pagination.
  // Uses the shared TAB_FILTERS config so count + list never drift.
  const { data: totalCount } = useQuery({
    queryKey: ["admin-providers-count", activeTab, searchQuery],
    queryFn: async () => {
      const base = supabase.from("facilities").select("id", { count: "exact", head: true });
      const filter = TAB_FILTERS[activeTab as AdminProvidersTab] ?? TAB_FILTERS.all;
      const resolved = await filter(base, { supabase, selectCols: "id" });
      if (resolved === null) return 0; // short-circuit when sibling subquery returned []
      const { count, error } = await applyProviderSearch(resolved, searchQuery);
      if (error) throw error;
      return count || 0;
    },
  });

  const { page: currentPage, pageSize, totalPages, setPage: setCurrentPage, setPageSize } = usePagination({
    tableId: "admin-providers",
    defaultPageSize: 25,
    totalItems: totalCount ?? 0,
  });


  const { data: providers, isLoading } = useQuery({
    queryKey: ["admin-providers", activeTab, searchQuery, currentPage],
    queryFn: async () => {
      try {
        const from = (currentPage - 1) * pageSize;
        const to = from + pageSize - 1;

        const base = supabase
          .from("facilities")
          .select(FACILITY_LIST_COLUMNS)
          .order("created_at", { ascending: false })
          .range(from, to);

        const filter = TAB_FILTERS[activeTab as AdminProvidersTab] ?? TAB_FILTERS.all;
        const resolved = await filter(base, {
          supabase,
          selectCols: FACILITY_LIST_COLUMNS,
          range: [from, to],
        });
        if (resolved === null) return []; // short-circuit when sibling subquery returned []

        const { data, error } = await applyProviderSearch(resolved, searchQuery);
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

  // Lead counts per visible facility. Previously fired N parallel
  // `count(*) WHERE facility_id = ?` queries (one per row) — 25 round-trips
  // per list page render. Replaced with a single `SELECT facility_id FROM
  // leads WHERE facility_id IN (...)` and a client-side tally. One round-
  // trip regardless of page size; PII-safe (only the foreign-key column is
  // returned, no name/email/phone).
  const { data: leadCounts } = useQuery({
    queryKey: ["admin-provider-lead-counts", providers?.map((p) => p.id)],
    queryFn: async () => {
      if (!providers?.length) return {};
      const facilityIds = providers.map((p) => p.id);
      const { data } = await supabase
        .from("leads")
        .select("facility_id")
        .in("facility_id", facilityIds);
      const counts: Record<string, number> = {};
      for (const fid of facilityIds) counts[fid] = 0;
      for (const row of data || []) {
        counts[row.facility_id] = (counts[row.facility_id] || 0) + 1;
      }
      return counts;
    },
    enabled: !!providers?.length,
  });

  // Pending claim-request counts per visible facility — drives the "N pending
  // claims" bell badge on each row in the list. Single query for all visible
  // rows; we tally client-side to avoid one round-trip per facility.
  const { data: pendingClaimCounts } = useQuery({
    queryKey: ["admin-provider-pending-claim-counts", providers?.map((p) => p.id)],
    queryFn: async () => {
      if (!providers?.length) return {};
      const facilityIds = providers.map((p) => p.id);
      const { data } = await supabase
        .from("facility_claim_requests")
        .select("facility_id")
        .eq("status", "pending")
        .in("facility_id", facilityIds);
      const counts: Record<string, number> = {};
      for (const row of data || []) {
        counts[row.facility_id] = (counts[row.facility_id] || 0) + 1;
      }
      return counts;
    },
    enabled: !!providers?.length,
  });

  // Update provider mutation
  // Provider mutation. Hardened to:
  //   • Verify the acting admin is still signed in BEFORE the DB write so
  //     we never produce an audit-log entry with no admin_user_id and
  //     never silently lose attribution.
  //   • Surface email-send failures so admins see when an approved provider
  //     wasn't notified (was silently swallowed before).
  //   • Return a status flag so onSuccess can craft the right toast.
  const updateProvider = useMutation({
    mutationFn: async ({
      id,
      updates,
      actionType,
    }: {
      id: string;
      updates: Partial<Facility>;
      actionType: string;
    }): Promise<{ approvalEmailSent?: boolean }> => {
      // 1. Capture acting admin upfront. If the session expired or RLS
      //    will reject us, fail loudly here rather than after the write.
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw new Error(`Could not verify admin session: ${userErr.message}`);
      const adminUserId = userData.user?.id;
      if (!adminUserId) throw new Error("Sign-in expired — please log back in.");

      const { data: facility, error: fetchErr } = await supabase
        .from("facilities")
        .select("name, user_id, status")
        .eq("id", id)
        .single();
      if (fetchErr) throw fetchErr;

      const { error } = await supabase.from("facilities").update(updates).eq("id", id);
      if (error) throw error;

      // 2. Send approval email when status transitions to approved. Return
      //    the send status so onSuccess can warn admins on failure.
      let approvalEmailSent: boolean | undefined;
      if (updates.status === "approved" && facility && facility.status !== "approved") {
        try {
          const { error: mailErr } = await supabase.functions.invoke("send-approval-email", {
            body: {
              facilityId: id,
              facilityName: facility.name,
              userId: facility.user_id,
            },
          });
          approvalEmailSent = !mailErr;
          if (mailErr) console.warn("[AdminProviders] approval email failed", mailErr);
        } catch (emailError) {
          approvalEmailSent = false;
          console.warn("[AdminProviders] approval email exception", emailError);
        }
      }

      // 3. Audit log — non-fatal on failure but we now know the admin id.
      try {
        await supabase.from("admin_audit_log").insert({
          admin_user_id: adminUserId,
          action_type: actionType,
          target_type: "facility",
          target_id: id,
          details: { ...updates, prev_status: facility?.status ?? null },
        });
      } catch (auditError) {
        console.warn("[AdminProviders] audit log write failed", auditError);
      }

      return { approvalEmailSent };
    },
    onSuccess: (result) => {
      invalidateProviderQueries();
      if (result.approvalEmailSent === false) {
        toast.warning(
          "Provider approved, but the notification email failed to send. The provider will not know they're approved until you message them directly.",
          { duration: 10000 },
        );
      } else {
        toast.success("Provider updated successfully");
      }
    },
    onError: (error) => {
      console.error("Provider update failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update provider");
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
  // setCurrentPage is a stable useState setter — safe to include in deps
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, setCurrentPage]);

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
        // Capture both the error AND the response body — supabase.functions
        // returns a 4xx/5xx as `{ data: { error: "..." }, error: FunctionsError }`
        // and the FunctionsError's message is the generic "Edge Function
        // returned a non-2xx status code", not the actual reason. Surfacing
        // `data.error` lets the admin see "Forbidden - Only Super Admins
        // and Managers can delete providers" instead of a useless generic
        // toast when they hit the role gate.
        const { data, error } = await supabase.functions.invoke("admin-delete-provider", {
          body: {
            facilityId: confirmAction.provider.id,
            deleteUser: deleteWithUser,
          },
        });

        const serverErrorMessage =
          (data as { error?: string } | null)?.error
          ?? (error instanceof Error ? error.message : null);

        if (error || serverErrorMessage) {
          throw new Error(serverErrorMessage ?? "Delete failed");
        }

        toast.success(`Provider "${confirmAction.provider.name}" deleted successfully`);
        invalidateProviderQueries();
        setConfirmAction(null);
        setShowDetailDialog(false);
      } catch (error) {
        console.error("Delete provider failed:", error);
        const reason = error instanceof Error ? error.message : "Unknown error";
        toast.error(`Failed to delete provider: ${reason}`);
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

      {/* Tab-specific workflow banner. Surfaces the moderation rules so
          admins don't have to memorize them, and links the two action-queue
          tabs to the canonical review surfaces. */}
      {activeTab === "pending" && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex items-start gap-3">
            <FileCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                New facility submissions awaiting approval
              </p>
              <p className="text-xs text-amber-800/80 dark:text-amber-200/70 mt-0.5">
                Each row below is a provider-submitted listing currently hidden from the public directory.
                Approve to publish it, or reject to keep it hidden. Use the inline Approve / Reject buttons
                for quick decisions, or open the row for the full review surface.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      {activeTab === "pending_claims" && (
        <Card className="border-rose-200 bg-rose-50/50 dark:bg-rose-950/20">
          <CardContent className="p-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                SAMHSA listings under active claim review
              </p>
              <p className="text-xs text-rose-800/80 dark:text-rose-200/70 mt-0.5">
                Each row below is currently <strong>hidden from the public directory</strong> because a
                provider has filed a claim awaiting your review. Use the Claim Review Panel to inspect
                evidence, verify the claimant, and approve or reject the claim — once approved, the
                facility reappears in the public directory under the claimant's ownership.
              </p>
              <Button asChild size="sm" variant="default" className="gap-1.5 mt-2 bg-rose-600 hover:bg-rose-700">
                <Link to="/admin/claims">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Claim Review Panel
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {activeTab === "samhsa" && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                SAMHSA bulk-imported listings
              </p>
              <p className="text-xs text-blue-800/80 dark:text-blue-200/70 mt-0.5">
                These facilities were imported from the SAMHSA national directory and are
                <strong> visible to the public</strong> so providers can find and claim them. When a
                provider files a claim, the listing is hidden from the public directory until you
                approve or reject the claim in the Claim Review Panel.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search + Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 sm:h-4 w-3.5 sm:w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, city, or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8 sm:pl-9 h-9 text-sm"
            aria-label="Search providers by name, city, or email"
            type="search"
            autoComplete="off"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedIds.size > 0 && canModerate && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkStatusOpen(true)}
                className="gap-1.5 h-9"
                aria-label={`Bulk update status for ${selectedIds.size} selected provider${selectedIds.size === 1 ? "" : "s"}`}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Status</span>
                <span>({selectedIds.size})</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkFlagOpen(true)}
                className="gap-1.5 h-9"
                aria-label={`Bulk toggle flag for ${selectedIds.size} selected provider${selectedIds.size === 1 ? "" : "s"}`}
              >
                <ToggleRight className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Flags</span>
                <span>({selectedIds.size})</span>
              </Button>
            </>
          )}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={copyFilterLink}
              className="gap-1.5 h-9 text-muted-foreground hover:text-foreground"
              aria-label="Copy a shareable link to this filtered view"
              title="Copy a shareable link to this filtered view"
            >
              <Link2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Copy link</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 h-9">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          {selectedIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)} className="gap-1.5 h-9">
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Delete</span>
              <span>({selectedIds.size})</span>
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
                      aria-label={`Select ${provider.name}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <ProviderListItem
                      provider={provider}
                      isPro={!!proSubscriptions?.[provider.id]}
                      leadCount={leadCounts?.[provider.id] || 0}
                      pendingClaimCount={pendingClaimCounts?.[provider.id] || 0}
                      canModerate={canModerate}
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
        <div className="px-4 pb-4">
          <PaginationFooter
            page={currentPage}
            pageSize={pageSize}
            totalPages={totalPages}
            totalItems={totalCount ?? 0}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="provider"
          />
        </div>
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

      {/* Bulk Status Change */}
      <BulkProviderStatusDialog
        open={bulkStatusOpen}
        onOpenChange={setBulkStatusOpen}
        selectedIds={selectedIds}
        onSuccess={() => {
          invalidateProviderQueries();
          setSelectedIds(new Set());
        }}
      />

      {/* Bulk Flag Toggle (suspend / verify / feature / concierge network) */}
      <BulkProviderFlagDialog
        open={bulkFlagOpen}
        onOpenChange={setBulkFlagOpen}
        selectedIds={selectedIds}
        onSuccess={() => {
          invalidateProviderQueries();
          setSelectedIds(new Set());
        }}
      />
    </div>
  );
}
