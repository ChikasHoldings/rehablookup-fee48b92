import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  Building2,
  Search,
  CheckCircle,
  XCircle,
  Star,
  Shield,
  MoreHorizontal,
  Eye,
  Ban,
  BadgeCheck,
  Users,
  Clock,
  MapPin,
  Phone,
  Globe,
  Mail,
  Calendar,
  FileText,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  CreditCard,
  Receipt,
  Send,
  Inbox,
  Crown,
  DollarSign,
  Download,
  Image,
  Flag,
  AlertTriangle,
  X,
  ZoomIn,
  Award,
  History,
  Trash2,
  Handshake,
  Wallet,
  LayoutList,
  Plus,
  FileCheck2,
} from "lucide-react";
import { ProviderActivityTimeline } from "@/components/admin/ProviderActivityTimeline";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";

type Facility = {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string;
  zip_code: string;
  phone: string;
  email: string | null;
  website: string | null;
  description: string | null;
  facility_type: string;
  bed_count: string | null;
  gender_served: string | null;
  status: string;
  featured: boolean;
  verified: boolean | null;
  suspended: boolean | null;
  logo_url: string | null;
  gallery_urls: string[] | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  slug: string | null;
  user_id: string;
  concierge_network_opted_in: boolean | null;
  concierge_terms_accepted_at: string | null;
};

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  email_verified: boolean | null;
  source: string | null;
  urgency: string | null;
};

type FlaggedImage = {
  id: string;
  facility_id: string;
  image_url: string;
  image_type: string;
  reason: string | null;
  flagged_at: string;
  resolved: boolean;
};

type Accreditation = {
  id: string;
  facility_id: string;
  accreditation_type: string;
  verified: boolean | null;
  verified_at: string | null;
  verified_by: string | null;
  expiry_date: string | null;
  created_at: string | null;
};

type ProSubscription = {
  id: string;
  facility_id: string;
  status: string;
  unlock_discount_percent: number;
  current_period_end: string | null;
};

type CredentialDocument = {
  id: string;
  facility_id: string;
  document_name: string;
  document_type: string;
  document_url: string;
  status: string;
  rejection_reason: string | null;
  uploaded_at: string;
  verified_at: string | null;
  verified_by: string | null;
};

const ITEMS_PER_PAGE = 15;

export default function AdminProviders() {
  const queryClient = useQueryClient();
  const { logError } = useAdminErrorHandler("AdminProviders");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedProvider, setSelectedProvider] = useState<Facility | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [detailTab, setDetailTab] = useState("overview");
  
  // Contact form state
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendInApp, setSendInApp] = useState(true);
  
  // Image flagging state
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [flagImageUrl, setFlagImageUrl] = useState("");
  const [flagImageType, setFlagImageType] = useState<"logo" | "gallery">("gallery");
  const [flagReason, setFlagReason] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Confirmation dialog state
  const [confirmAction, setConfirmAction] = useState<{
    action: "suspend" | "reactivate" | "reject" | "delete";
    provider: Facility;
  } | null>(null);
  const [deleteWithUser, setDeleteWithUser] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Invalidate all provider queries for real-time updates
  const invalidateProviderQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
    queryClient.invalidateQueries({ queryKey: ["admin-providers-status-counts"] });
    queryClient.invalidateQueries({ queryKey: ["admin-providers-count"] });
    queryClient.invalidateQueries({ queryKey: ["admin-provider-lead-counts"] });
    queryClient.invalidateQueries({ queryKey: ["admin-pro-subscriptions"] });
  }, [queryClient]);

  // Real-time subscriptions
  useEffect(() => {
    const facilitiesChannel = supabase
      .channel("admin-providers-facilities")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "facilities" },
        () => {
          invalidateProviderQueries();
        }
      )
      .subscribe();

    const proChannel = supabase
      .channel("admin-pro-subscriptions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pro_subscriptions" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-pro-subscriptions"] });
        }
      )
      .subscribe();

    const leadsChannel = supabase
      .channel("admin-providers-leads")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-provider-lead-counts"] });
          queryClient.invalidateQueries({ queryKey: ["admin-provider-leads"] });
        }
      )
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
        .select("*")
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
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, to);

        if (activeTab === "approved") {
          query = query.eq("status", "approved").neq("suspended", true);
        } else if (activeTab === "pending") {
          query = query.eq("status", "pending");
        } else if (activeTab === "suspended") {
          query = query.eq("suspended", true);
        } else if (activeTab === "pro") {
          // Filter by pro subscriptions - need to get facility IDs first
          const { data: proFacilities } = await supabase
            .from("pro_subscriptions")
            .select("facility_id")
            .eq("status", "active");
          const proIds = proFacilities?.map(p => p.facility_id) || [];
          if (proIds.length === 0) return [];
          query = supabase
            .from("facilities")
            .select("*")
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
        return proFacilities?.length || 0;
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
      const { data } = await supabase.from("leads").select("facility_id");
      const counts: Record<string, number> = {};
      data?.forEach((lead) => {
        if (lead.facility_id) {
          counts[lead.facility_id] = (counts[lead.facility_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  // Fetch provider profile for email
  const { data: providerProfile } = useQuery({
    queryKey: ["admin-provider-profile", selectedProvider?.user_id],
    queryFn: async () => {
      if (!selectedProvider?.user_id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", selectedProvider.user_id)
        .maybeSingle();
      return data;
    },
    enabled: !!selectedProvider?.user_id,
  });

  // Fetch all facilities for selected provider's user
  const { data: providerFacilities } = useQuery({
    queryKey: ["admin-provider-facilities", selectedProvider?.user_id],
    queryFn: async () => {
      if (!selectedProvider?.user_id) return [];
      const { data } = await supabase
        .from("facilities")
        .select("*")
        .eq("user_id", selectedProvider.user_id)
        .order("created_at", { ascending: false });
      return data as Facility[];
    },
    enabled: !!selectedProvider?.user_id && showDetailDialog,
  });

  // Fetch credit balance for provider
  const { data: creditBalance } = useQuery({
    queryKey: ["admin-provider-credits", selectedProvider?.user_id],
    queryFn: async () => {
      if (!selectedProvider?.user_id) return 0;
      const { data } = await supabase
        .from("credit_transactions")
        .select("amount_cents, transaction_type")
        .eq("provider_id", selectedProvider.user_id);
      
      let balance = 0;
      data?.forEach(tx => {
        if (tx.transaction_type === "purchase" || tx.transaction_type === "refund" || tx.transaction_type === "admin_credit") {
          balance += tx.amount_cents;
        } else if (tx.transaction_type === "unlock" || tx.transaction_type === "placement_fee") {
          balance -= tx.amount_cents;
        }
      });
      return balance;
    },
    enabled: !!selectedProvider?.user_id && showDetailDialog,
  });

  // Fetch Pro subscription for selected provider
  const { data: selectedProviderPro } = useQuery({
    queryKey: ["admin-provider-pro", selectedProvider?.id],
    queryFn: async () => {
      if (!selectedProvider?.id) return null;
      const { data } = await supabase
        .from("pro_subscriptions")
        .select("*")
        .eq("facility_id", selectedProvider.id)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
    enabled: !!selectedProvider?.id && showDetailDialog,
  });

  // Fetch leads for selected provider
  const { data: providerLeads, isLoading: isLoadingLeads } = useQuery({
    queryKey: ["admin-provider-leads", selectedProvider?.id],
    queryFn: async () => {
      if (!selectedProvider?.id) return [];
      const { data } = await supabase
        .from("leads")
        .select("*")
        .eq("facility_id", selectedProvider.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data as Lead[];
    },
    enabled: !!selectedProvider?.id && showDetailDialog,
  });

  // Fetch flagged images for selected provider
  const { data: flaggedImages } = useQuery({
    queryKey: ["admin-flagged-images", selectedProvider?.id],
    queryFn: async () => {
      if (!selectedProvider?.id) return [];
      const { data } = await supabase
        .from("flagged_images")
        .select("*")
        .eq("facility_id", selectedProvider.id)
        .eq("resolved", false);
      return (data || []) as FlaggedImage[];
    },
    enabled: !!selectedProvider?.id && showDetailDialog,
  });

  // Fetch accreditations for selected provider
  const { data: providerAccreditations, refetch: refetchAccreditations } = useQuery({
    queryKey: ["admin-provider-accreditations", selectedProvider?.id],
    queryFn: async () => {
      if (!selectedProvider?.id) return [];
      const { data } = await supabase
        .from("facility_accreditations")
        .select("*")
        .eq("facility_id", selectedProvider.id)
        .order("created_at", { ascending: true });
      return (data || []) as Accreditation[];
    },
    enabled: !!selectedProvider?.id && showDetailDialog,
  });

  // Fetch credential documents for selected provider
  const { data: credentialDocuments, refetch: refetchCredentialDocuments } = useQuery({
    queryKey: ["admin-provider-credentials", selectedProvider?.id],
    queryFn: async () => {
      if (!selectedProvider?.id) return [];
      const { data } = await supabase
        .from("facility_credential_documents")
        .select("*")
        .eq("facility_id", selectedProvider.id)
        .order("uploaded_at", { ascending: false });
      return (data || []) as CredentialDocument[];
    },
    enabled: !!selectedProvider?.id && showDetailDialog,
  });

  // Fetch placement introductions count
  const { data: placementStats } = useQuery({
    queryKey: ["admin-provider-placement-stats", selectedProvider?.id],
    queryFn: async () => {
      if (!selectedProvider?.id) return { introductions: 0, placements: 0 };
      
      const [introResult, placementResult] = await Promise.all([
        supabase
          .from("concierge_introductions")
          .select("id", { count: "exact", head: true })
          .eq("facility_id", selectedProvider.id),
        supabase
          .from("concierge_engagements")
          .select("id", { count: "exact", head: true })
          .eq("facility_id", selectedProvider.id)
          .eq("status", "placed"),
      ]);

      return {
        introductions: introResult.count || 0,
        placements: placementResult.count || 0,
      };
    },
    enabled: !!selectedProvider?.id && showDetailDialog,
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
      queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-providers-status-counts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-providers-count"] });
      toast.success("Provider updated successfully");
    },
    onError: (error) => {
      console.error("Provider update failed:", error);
      toast.error("Failed to update provider");
    },
  });

  // Update accreditation verification mutation
  const updateAccreditationVerification = useMutation({
    mutationFn: async ({
      accreditationId,
      verified,
    }: {
      accreditationId: string;
      verified: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("facility_accreditations")
        .update({
          verified,
          verified_at: verified ? new Date().toISOString() : null,
          verified_by: verified ? user?.id : null,
        })
        .eq("id", accreditationId);
      
      if (error) throw error;

      if (user?.id && selectedProvider?.id) {
        await supabase.from("admin_audit_log").insert({
          admin_user_id: user.id,
          action_type: verified ? "verify_accreditation" : "unverify_accreditation",
          target_type: "facility_accreditation",
          target_id: accreditationId,
          details: { facility_id: selectedProvider.id, verified },
        });
      }
    },
    onSuccess: () => {
      refetchAccreditations();
      toast.success("Accreditation updated");
    },
    onError: () => {
      toast.error("Failed to update accreditation");
    },
  });

  // Send notification mutation
  const sendNotification = useMutation({
    mutationFn: async () => {
      if (!selectedProvider || !contactSubject || !contactMessage) {
        throw new Error("Missing required fields");
      }
      
      const { data, error } = await supabase.functions.invoke("send-admin-notification", {
        body: {
          providerUserId: selectedProvider.user_id,
          facilityId: selectedProvider.id,
          subject: contactSubject,
          message: contactMessage,
          sendEmail,
          sendInApp,
          providerEmail: providerProfile?.email || selectedProvider.email,
          providerName: providerProfile?.first_name || selectedProvider.name,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Message sent successfully");
      setContactSubject("");
      setContactMessage("");
      setDetailTab("overview");
    },
    onError: (error) => {
      toast.error(`Failed to send message: ${error.message}`);
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

      const providerEmail = providerProfile?.email || selectedProvider.email;
      const providerName = providerProfile?.first_name || selectedProvider.name;
      
      if (providerEmail) {
        await supabase.functions.invoke("notify-flagged-image", {
          body: {
            facilityId: selectedProvider.id,
            facilityName: selectedProvider.name,
            imageType: flagImageType,
            reason: flagReason,
            providerEmail,
            providerName,
          },
        });
      }
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

  // Resolve flagged image mutation
  const resolveFlaggedImage = useMutation({
    mutationFn: async (imageId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("flagged_images").update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
      }).eq("id", imageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Flag resolved");
      queryClient.invalidateQueries({ queryKey: ["admin-flagged-images", selectedProvider?.id] });
    },
  });

  const openFlagDialog = (imageUrl: string, type: "logo" | "gallery") => {
    setFlagImageUrl(imageUrl);
    setFlagImageType(type);
    setFlagReason("");
    setShowFlagDialog(true);
  };

  const isImageFlagged = (imageUrl: string) => {
    return flaggedImages?.some(f => f.image_url === imageUrl) || false;
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

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

  const handleSaveNotes = () => {
    if (!selectedProvider) return;
    updateProvider.mutate({
      id: selectedProvider.id,
      updates: { admin_notes: adminNotes },
      actionType: "notes_updated",
    });
  };

  const openProviderDetail = (provider: Facility) => {
    setSelectedProvider(provider);
    setAdminNotes(provider.admin_notes || "");
    setDetailTab("overview");
    setShowDetailDialog(true);
  };

  const getStatusIcon = (provider: Facility) => {
    if (provider.suspended) return <Ban className="h-4 w-4 text-destructive" />;
    if (provider.status === "approved") return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    if (provider.status === "pending") return <Clock className="h-4 w-4 text-amber-500" />;
    return <XCircle className="h-4 w-4 text-destructive" />;
  };

  const getStatusBadge = (provider: Facility) => {
    if (provider.suspended) {
      return <Badge variant="destructive" className="gap-1"><Ban className="h-3 w-3" />Suspended</Badge>;
    }
    if (provider.status === "approved") {
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 gap-1"><CheckCircle className="h-3 w-3" />Approved</Badge>;
    }
    if (provider.status === "pending") {
      return <Badge variant="secondary" className="gap-1 bg-amber-500/10 text-amber-600 border-amber-200"><Clock className="h-3 w-3" />Pending</Badge>;
    }
    return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
  };

  const getLeadStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700">New</Badge>;
      case "contacted":
        return <Badge className="bg-emerald-100 text-emerald-700">Contacted</Badge>;
      case "converted":
        return <Badge className="bg-purple-100 text-purple-700">Converted</Badge>;
      case "lost":
        return <Badge variant="destructive">Lost</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Provider Management</h1>
        <p className="text-muted-foreground">Manage facilities, subscriptions, and placement network</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Facilities</p>
                <p className="text-2xl font-bold">{statusCounts?.all || 0}</p>
              </div>
              <Building2 className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-emerald-600">{statusCounts?.approved || 0}</p>
              </div>
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{statusCounts?.pending || 0}</p>
              </div>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Suspended</p>
                <p className="text-2xl font-bold text-destructive">{statusCounts?.suspended || 0}</p>
              </div>
              <Ban className="h-5 w-5 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-400">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pro Subscribers</p>
                <p className="text-2xl font-bold text-amber-600">{statusCounts?.pro || 0}</p>
              </div>
              <Crown className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Placement Network</p>
                <p className="text-2xl font-bold text-purple-600">{statusCounts?.placement || 0}</p>
              </div>
              <Handshake className="h-5 w-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full sm:w-auto">
          <TabsList className="grid w-full sm:w-auto grid-cols-6 h-10">
            <TabsTrigger value="all" className="text-xs">
              All
            </TabsTrigger>
            <TabsTrigger value="approved" className="text-xs">
              Approved
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">
              Pending
            </TabsTrigger>
            <TabsTrigger value="suspended" className="text-xs">
              Suspended
            </TabsTrigger>
            <TabsTrigger value="pro" className="text-xs gap-1">
              <Crown className="h-3 w-3" />
              Pro
            </TabsTrigger>
            <TabsTrigger value="placement" className="text-xs gap-1">
              <Handshake className="h-3 w-3" />
              Placement
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, city, or email..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
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
              {providers.map((provider) => {
                const isPro = !!proSubscriptions?.[provider.id];
                const isPlacement = provider.concierge_network_opted_in;
                
                return (
                  <div
                    key={provider.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer group"
                    onClick={() => openProviderDetail(provider)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative">
                        <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                          <AvatarImage src={provider.logo_url || undefined} />
                          <AvatarFallback className="bg-primary/5 text-primary font-semibold">
                            {provider.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1">
                          {getStatusIcon(provider)}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {provider.name}
                          </p>
                          {provider.verified && (
                            <BadgeCheck className="h-4 w-4 text-blue-500 shrink-0" />
                          )}
                          {provider.featured && (
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                          {isPro && (
                            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs h-5 px-1.5">
                              <Crown className="h-3 w-3 mr-0.5" />
                              Pro
                            </Badge>
                          )}
                          {isPlacement && (
                            <Badge variant="outline" className="text-purple-600 border-purple-200 text-xs h-5 px-1.5">
                              <Handshake className="h-3 w-3 mr-0.5" />
                              Placement
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {provider.city}, {provider.state}
                          </span>
                          <span className="hidden sm:flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {leadCounts?.[provider.id] || 0} leads
                          </span>
                          <span className="hidden md:flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(new Date(provider.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {getStatusBadge(provider)}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => openProviderDetail(provider)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {provider.slug && (
                            <DropdownMenuItem onClick={() => window.open(`/center/${provider.slug}`, "_blank")}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Public Profile
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          
                          {provider.status === "pending" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(provider.id, "approved")} className="text-emerald-600">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve Provider
                            </DropdownMenuItem>
                          )}
                          {provider.status === "approved" && !provider.suspended && (
                            <DropdownMenuItem onClick={() => handleStatusChange(provider.id, "pending")} className="text-amber-600">
                              <Clock className="h-4 w-4 mr-2" />
                              Set to Pending
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleVerified(provider.id, provider.verified)}>
                            <Shield className="h-4 w-4 mr-2" />
                            {provider.verified ? "Remove Verification" : "Mark as Verified"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleFeatured(provider.id, provider.featured)}>
                            <Star className="h-4 w-4 mr-2" />
                            {provider.featured ? "Remove Featured" : "Mark as Featured"}
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          {provider.suspended ? (
                            <DropdownMenuItem onClick={() => handleReactivate(provider)} className="text-emerald-600">
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Reactivate Provider
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleSuspend(provider)} className="text-destructive">
                              <Ban className="h-4 w-4 mr-2" />
                              Suspend Provider
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDelete(provider)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Provider
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-medium">No providers found</p>
              <p className="text-sm text-muted-foreground/70">Try adjusting your search or filters</p>
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount || 0)} of {totalCount} providers
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

      {/* Provider Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="p-6 pb-4 flex-shrink-0 border-b">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 border-2 border-background shadow-lg flex-shrink-0">
                <AvatarImage src={selectedProvider?.logo_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                  {selectedProvider?.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-xl">{selectedProvider?.name}</DialogTitle>
                  {selectedProvider?.verified && <BadgeCheck className="h-5 w-5 text-blue-500" />}
                  {selectedProvider?.featured && <Star className="h-5 w-5 text-amber-500 fill-amber-500" />}
                </div>
                <DialogDescription className="text-muted-foreground flex items-center gap-1 mt-1 text-sm">
                  <MapPin className="h-4 w-4" />
                  {selectedProvider?.city}, {selectedProvider?.state}
                </DialogDescription>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {selectedProvider && getStatusBadge(selectedProvider)}
                  {selectedProviderPro && (
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white gap-1">
                      <Crown className="h-3 w-3" />
                      Pro
                    </Badge>
                  )}
                  {selectedProvider?.concierge_network_opted_in && (
                    <Badge variant="outline" className="text-purple-600 border-purple-300 gap-1">
                      <Handshake className="h-3 w-3" />
                      Placement Network
                    </Badge>
                  )}
                  <Badge variant="outline">{selectedProvider?.facility_type}</Badge>
                </div>
              </div>
            </div>
          </DialogHeader>

          <Tabs value={detailTab} onValueChange={setDetailTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="px-6 border-b flex-shrink-0">
              <TabsList className="h-12 w-full justify-start bg-transparent border-none p-0 gap-4">
                <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-1 pb-3">
                  <Eye className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="facilities" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-1 pb-3">
                  <LayoutList className="h-4 w-4 mr-2" />
                  Facilities
                  <Badge variant="secondary" className="ml-2 h-5">{providerFacilities?.length || 0}</Badge>
                </TabsTrigger>
                <TabsTrigger value="leads" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-1 pb-3">
                  <Inbox className="h-4 w-4 mr-2" />
                  Leads
                  <Badge variant="secondary" className="ml-2 h-5">{providerLeads?.length || 0}</Badge>
                </TabsTrigger>
                <TabsTrigger value="activity" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-1 pb-3">
                  <History className="h-4 w-4 mr-2" />
                  Activity
                </TabsTrigger>
                <TabsTrigger value="credentials" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-1 pb-3">
                  <FileCheck2 className="h-4 w-4 mr-2" />
                  Credentials
                  {((providerAccreditations?.length || 0) + (credentialDocuments?.length || 0)) > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5">
                      {(providerAccreditations?.length || 0) + (credentialDocuments?.length || 0)}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="billing" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-1 pb-3">
                  <Wallet className="h-4 w-4 mr-2" />
                  Billing
                </TabsTrigger>
                <TabsTrigger value="contact" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-1 pb-3">
                  <Send className="h-4 w-4 mr-2" />
                  Contact
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Overview Tab */}
              <TabsContent value="overview" className="p-6 space-y-6 m-0 data-[state=inactive]:hidden">
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2">
                  {selectedProvider?.status === "pending" && (
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => {
                      handleStatusChange(selectedProvider.id, "approved");
                      setShowDetailDialog(false);
                    }}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  )}
                  {selectedProvider?.suspended ? (
                    <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-300" onClick={() => {
                      handleReactivate(selectedProvider);
                    }}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reactivate
                    </Button>
                  ) : selectedProvider && (
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => {
                      handleSuspend(selectedProvider);
                    }}>
                      <Ban className="h-4 w-4 mr-2" />
                      Suspend
                    </Button>
                  )}
                  {selectedProvider && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleToggleVerified(selectedProvider.id, selectedProvider.verified)}>
                        <Shield className="h-4 w-4 mr-2" />
                        {selectedProvider.verified ? "Remove Verified" : "Mark Verified"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleToggleFeatured(selectedProvider.id, selectedProvider.featured)}>
                        <Star className="h-4 w-4 mr-2" />
                        {selectedProvider.featured ? "Remove Featured" : "Mark Featured"}
                      </Button>
                    </>
                  )}
                  {selectedProvider?.slug && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/center/${selectedProvider.slug}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Public Page
                      </a>
                    </Button>
                  )}
                </div>

                <Separator />

                {/* Account Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Wallet className="h-5 w-5 mx-auto mb-2 text-emerald-500" />
                      <p className="text-2xl font-bold text-emerald-600">
                        ${((creditBalance || 0) / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">Credit Balance</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <LayoutList className="h-5 w-5 mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold">{providerFacilities?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">Facilities</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Users className="h-5 w-5 mx-auto mb-2 text-blue-500" />
                      <p className="text-2xl font-bold">{leadCounts?.[selectedProvider?.id || ""] || 0}</p>
                      <p className="text-xs text-muted-foreground">Total Leads</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Handshake className="h-5 w-5 mx-auto mb-2 text-purple-500" />
                      <p className="text-2xl font-bold">{placementStats?.placements || 0}</p>
                      <p className="text-xs text-muted-foreground">Placements</p>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                {/* Contact Information */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-medium">{selectedProvider?.phone}</p>
                      </div>
                    </div>
                    {(providerProfile?.email || selectedProvider?.email) && (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="font-medium truncate">{providerProfile?.email || selectedProvider?.email}</p>
                        </div>
                      </div>
                    )}
                    {selectedProvider?.website && (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg sm:col-span-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Website</p>
                          <a href={selectedProvider.website} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline truncate block">
                            {selectedProvider.website}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Facility Details */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Facility Details
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Bed Count</p>
                      <p className="text-xl font-bold">{selectedProvider?.bed_count || "N/A"}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Gender Served</p>
                      <p className="text-lg font-semibold capitalize">{selectedProvider?.gender_served || "All"}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Facility Type</p>
                      <p className="text-lg font-semibold">{selectedProvider?.facility_type}</p>
                    </div>
                  </div>
                </div>

                {/* Credentials Summary - Links to Credentials tab */}
                {((providerAccreditations && providerAccreditations.length > 0) || (credentialDocuments && credentialDocuments.length > 0)) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Credentials
                        <Badge variant="outline" className="ml-2">
                          {(providerAccreditations?.filter(a => a.verified).length || 0) + (credentialDocuments?.filter(d => d.status === "verified").length || 0)}/
                          {(providerAccreditations?.length || 0) + (credentialDocuments?.length || 0)} verified
                        </Badge>
                      </h3>
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="flex gap-6">
                          <div className="text-center">
                            <p className="text-2xl font-bold">{providerAccreditations?.length || 0}</p>
                            <p className="text-xs text-muted-foreground">Accreditations</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold">{credentialDocuments?.length || 0}</p>
                            <p className="text-xs text-muted-foreground">Documents</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-amber-600">
                              {(providerAccreditations?.filter(a => !a.verified).length || 0) + (credentialDocuments?.filter(d => d.status === "pending").length || 0)}
                            </p>
                            <p className="text-xs text-muted-foreground">Pending Review</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDetailTab("credentials")}
                        >
                          <FileCheck2 className="h-4 w-4 mr-2" />
                          Review Credentials
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* Description */}
                {selectedProvider?.description && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Description
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{selectedProvider.description}</p>
                    </div>
                  </>
                )}

                {/* Profile Images */}
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Profile Images
                    {flaggedImages && flaggedImages.length > 0 && (
                      <Badge variant="destructive" className="ml-2 gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {flaggedImages.length} flagged
                      </Badge>
                    )}
                  </h3>
                  
                  {/* Logo */}
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-2">Facility Logo</p>
                    {selectedProvider?.logo_url ? (
                      <div className="relative inline-block group">
                        <img
                          src={selectedProvider.logo_url}
                          alt="Facility logo"
                          className={`w-24 h-24 object-cover rounded-lg border-2 cursor-pointer transition-all hover:opacity-90 ${
                            isImageFlagged(selectedProvider.logo_url) 
                              ? "border-destructive ring-2 ring-destructive/20" 
                              : "border-border"
                          }`}
                          onClick={() => setPreviewImage(selectedProvider.logo_url)}
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImage(selectedProvider.logo_url);
                            }}
                          >
                            <ZoomIn className="h-4 w-4" />
                          </Button>
                          {!isImageFlagged(selectedProvider.logo_url) && (
                            <Button
                              size="icon"
                              variant="destructive"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                openFlagDialog(selectedProvider.logo_url!, "logo");
                              }}
                            >
                              <Flag className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {isImageFlagged(selectedProvider.logo_url) && (
                          <div className="absolute -top-2 -right-2">
                            <Badge variant="destructive" className="h-5 px-1">
                              <Flag className="h-3 w-3" />
                            </Badge>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
                        <Image className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>

                  {/* Gallery */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Gallery Images ({selectedProvider?.gallery_urls?.length || 0})
                    </p>
                    {selectedProvider?.gallery_urls && selectedProvider.gallery_urls.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                        {selectedProvider.gallery_urls.map((url, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={`Gallery image ${index + 1}`}
                              className={`w-full aspect-square object-cover rounded-lg border-2 cursor-pointer transition-all hover:opacity-90 ${
                                isImageFlagged(url) 
                                  ? "border-destructive ring-2 ring-destructive/20" 
                                  : "border-border"
                              }`}
                              onClick={() => setPreviewImage(url)}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewImage(url);
                                }}
                              >
                                <ZoomIn className="h-3 w-3" />
                              </Button>
                              {!isImageFlagged(url) && (
                                <Button
                                  size="icon"
                                  variant="destructive"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openFlagDialog(url, "gallery");
                                  }}
                                >
                                  <Flag className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            {isImageFlagged(url) && (
                              <div className="absolute -top-2 -right-2">
                                <Badge variant="destructive" className="h-5 px-1">
                                  <Flag className="h-3 w-3" />
                                </Badge>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-muted/30 rounded-lg">
                        <Image className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No gallery images uploaded</p>
                      </div>
                    )}
                  </div>

                  {/* Flagged Images List */}
                  {flaggedImages && flaggedImages.length > 0 && (
                    <div className="mt-4 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                      <h4 className="font-medium text-destructive flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-4 w-4" />
                        Flagged Images ({flaggedImages.length})
                      </h4>
                      <div className="space-y-2">
                        {flaggedImages.map((flag) => (
                          <div key={flag.id} className="flex items-center justify-between p-2 bg-background rounded border">
                            <div className="flex items-center gap-3">
                              <img
                                src={flag.image_url}
                                alt="Flagged"
                                className="w-10 h-10 object-cover rounded"
                              />
                              <div>
                                <Badge variant="outline" className="text-xs">{flag.image_type}</Badge>
                                {flag.reason && (
                                  <p className="text-xs text-muted-foreground mt-1">{flag.reason}</p>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resolveFlaggedImage.mutate(flag.id)}
                            >
                              Resolve
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Timestamps */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="font-medium">{selectedProvider ? format(new Date(selectedProvider.created_at), "PPP") : ""}</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Last Updated</p>
                    <p className="font-medium">{selectedProvider ? format(new Date(selectedProvider.updated_at), "PPP") : ""}</p>
                  </div>
                </div>

                <Separator />

                {/* Admin Notes */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Admin Notes
                  </h3>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add internal notes about this provider..."
                    rows={4}
                    className="resize-none"
                  />
                  <div className="flex justify-end mt-3">
                    <Button onClick={handleSaveNotes} size="sm">
                      Save Notes
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Facilities Tab */}
              <TabsContent value="facilities" className="p-6 m-0 data-[state=inactive]:hidden">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">All Facilities ({providerFacilities?.length || 0})</h3>
                    <p className="text-sm text-muted-foreground">
                      Owned by this provider account
                    </p>
                  </div>
                  
                  {providerFacilities && providerFacilities.length > 0 ? (
                    <div className="space-y-3">
                      {providerFacilities.map((facility) => {
                        const facilityPro = proSubscriptions?.[facility.id];
                        return (
                          <Card key={facility.id} className={cn(
                            "transition-colors",
                            facility.id === selectedProvider?.id && "ring-2 ring-primary"
                          )}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={facility.logo_url || undefined} />
                                    <AvatarFallback>{facility.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium">{facility.name}</p>
                                      {facility.verified && <BadgeCheck className="h-4 w-4 text-blue-500" />}
                                      {facilityPro && (
                                        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs">
                                          <Crown className="h-3 w-3 mr-0.5" />
                                          Pro
                                        </Badge>
                                      )}
                                      {facility.concierge_network_opted_in && (
                                        <Badge variant="outline" className="text-purple-600 border-purple-200 text-xs">
                                          <Handshake className="h-3 w-3 mr-0.5" />
                                          Placement
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      {facility.city}, {facility.state} • {facility.facility_type}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(facility)}
                                  {facility.slug && (
                                    <Button size="sm" variant="ghost" asChild>
                                      <a href={`/center/${facility.slug}`} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-4 w-4" />
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground">No facilities found</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Leads Tab */}
              <TabsContent value="leads" className="p-6 m-0 data-[state=inactive]:hidden">
                {isLoadingLeads ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : providerLeads && providerLeads.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Lead</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {providerLeads.map((lead) => (
                          <TableRow key={lead.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{lead.name}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  {lead.email_verified && <BadgeCheck className="h-3 w-3 text-emerald-500" />}
                                  {lead.email}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">{lead.phone}</p>
                            </TableCell>
                            <TableCell>
                              {getLeadStatusBadge(lead.status)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {lead.source || "direct"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                              </p>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Inbox className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">No leads received yet</p>
                  </div>
                )}
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="m-0 h-full data-[state=inactive]:hidden">
                {selectedProvider && (
                  <ProviderActivityTimeline
                    facilityId={selectedProvider.id}
                    userId={selectedProvider.user_id}
                  />
                )}
              </TabsContent>

              {/* Credentials Tab */}
              <TabsContent value="credentials" className="p-6 space-y-6 m-0 data-[state=inactive]:hidden">
                {/* Accreditations Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Award className="h-5 w-5 text-primary" />
                        Accreditations
                      </CardTitle>
                      <Badge variant="outline">
                        {providerAccreditations?.filter(a => a.verified).length || 0}/{providerAccreditations?.length || 0} verified
                      </Badge>
                    </div>
                    <CardDescription>
                      Verify claimed accreditations by checking the boxes below.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {providerAccreditations && providerAccreditations.length > 0 ? (
                      <div className="space-y-3">
                        {providerAccreditations.map((accreditation) => (
                          <div 
                            key={accreditation.id} 
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border transition-colors",
                              accreditation.verified 
                                ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800" 
                                : "bg-muted/50 border-border"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                id={`cred-accred-${accreditation.id}`}
                                checked={accreditation.verified || false}
                                onCheckedChange={(checked) => {
                                  updateAccreditationVerification.mutate({
                                    accreditationId: accreditation.id,
                                    verified: checked as boolean,
                                  });
                                }}
                              />
                              <label 
                                htmlFor={`cred-accred-${accreditation.id}`}
                                className="flex flex-col cursor-pointer"
                              >
                                <span className="font-medium text-sm">
                                  {accreditation.accreditation_type}
                                </span>
                                {accreditation.expiry_date && (
                                  <span className="text-xs text-muted-foreground">
                                    Expires: {format(new Date(accreditation.expiry_date), "MMM d, yyyy")}
                                  </span>
                                )}
                              </label>
                            </div>
                            <div className="flex items-center gap-2">
                              {accreditation.verified ? (
                                <Badge className="bg-emerald-600 text-white">
                                  <BadgeCheck className="h-3 w-3 mr-1" />
                                  Verified
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">
                                  Pending
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Award className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground">No accreditations claimed</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Credential Documents Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileCheck2 className="h-5 w-5 text-primary" />
                        Uploaded Documents
                      </CardTitle>
                      <Badge variant="outline">
                        {credentialDocuments?.filter(d => d.status === "verified").length || 0}/{credentialDocuments?.length || 0} verified
                      </Badge>
                    </div>
                    <CardDescription>
                      Review and verify uploaded credential documents.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {credentialDocuments && credentialDocuments.length > 0 ? (
                      <div className="space-y-3">
                        {credentialDocuments.map((doc) => (
                          <div 
                            key={doc.id} 
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border transition-colors",
                              doc.status === "verified" 
                                ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800" 
                                : doc.status === "rejected"
                                ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                                : "bg-muted/50 border-border"
                            )}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{doc.document_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {doc.document_type} • Uploaded {formatDistanceToNow(new Date(doc.uploaded_at), { addSuffix: true })}
                                </p>
                                {doc.status === "rejected" && doc.rejection_reason && (
                                  <p className="text-xs text-destructive mt-1">
                                    Rejected: {doc.rejection_reason}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                              >
                                <a href={doc.document_url} target="_blank" rel="noopener noreferrer">
                                  <Eye className="h-3.5 w-3.5 mr-1" />
                                  View
                                </a>
                              </Button>
                              {doc.status === "pending" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                                    onClick={async () => {
                                      const { data: { user } } = await supabase.auth.getUser();
                                      const { error } = await supabase
                                        .from("facility_credential_documents")
                                        .update({
                                          status: "verified",
                                          verified_at: new Date().toISOString(),
                                          verified_by: user?.id,
                                        })
                                        .eq("id", doc.id);
                                      if (error) {
                                        toast.error("Failed to verify document");
                                      } else {
                                        toast.success("Document verified");
                                        refetchCredentialDocuments();
                                      }
                                    }}
                                  >
                                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                    Verify
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                    onClick={async () => {
                                      const reason = prompt("Enter rejection reason:");
                                      if (reason) {
                                        const { error } = await supabase
                                          .from("facility_credential_documents")
                                          .update({
                                            status: "rejected",
                                            rejection_reason: reason,
                                          })
                                          .eq("id", doc.id);
                                        if (error) {
                                          toast.error("Failed to reject document");
                                        } else {
                                          toast.success("Document rejected");
                                          refetchCredentialDocuments();
                                        }
                                      }
                                    }}
                                  >
                                    <XCircle className="h-3.5 w-3.5 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              {doc.status === "verified" && (
                                <Badge className="bg-emerald-600 text-white">
                                  <BadgeCheck className="h-3 w-3 mr-1" />
                                  Verified
                                </Badge>
                              )}
                              {doc.status === "rejected" && (
                                <Badge variant="destructive">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Rejected
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground">No documents uploaded</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Billing Tab */}
              <TabsContent value="billing" className="p-6 space-y-6 m-0 data-[state=inactive]:hidden">
                {/* Pro Subscription Status */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Crown className="h-5 w-5 text-amber-500" />
                      Pro Subscription
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedProviderPro ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                            <Crown className="h-3 w-3 mr-1" />
                            Pro Active
                          </Badge>
                          <div>
                            <p className="font-semibold">$399/month</p>
                            {selectedProviderPro.current_period_end && (
                              <p className="text-sm text-muted-foreground">
                                Renews {format(new Date(selectedProviderPro.current_period_end), "PPP")}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700">
                          {selectedProviderPro.unlock_discount_percent}% Discount
                        </Badge>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground">No active Pro subscription</p>
                        <p className="text-sm text-muted-foreground mt-1">Free tier - pay-per-unlock model</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Credit Balance */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-emerald-500" />
                      Credit Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-3xl font-bold text-emerald-600">
                          ${((creditBalance || 0) / 100).toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">Available for lead unlocks</p>
                      </div>
                      {(creditBalance || 0) < 5000 && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Low Balance
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Placement Network Status */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Handshake className="h-5 w-5 text-purple-500" />
                      Placement Network
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedProvider?.concierge_network_opted_in ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-purple-600 border-purple-300 gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Opted In
                          </Badge>
                          {selectedProvider.concierge_terms_accepted_at && (
                            <p className="text-sm text-muted-foreground">
                              Agreement signed {format(new Date(selectedProvider.concierge_terms_accepted_at), "PPP")}
                            </p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <p className="text-2xl font-bold">{placementStats?.introductions || 0}</p>
                            <p className="text-xs text-muted-foreground">Introductions</p>
                          </div>
                          <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <p className="text-2xl font-bold text-purple-600">{placementStats?.placements || 0}</p>
                            <p className="text-xs text-muted-foreground">Placements</p>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p><strong>Fee Structure:</strong></p>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>Flat fee: ${selectedProviderPro ? "960" : "1,200"} {selectedProviderPro && <span className="text-emerald-600">(Pro discount)</span>}</li>
                            <li>Commission: {selectedProviderPro ? "6.4%" : "8%"} of first month (max $1,500)</li>
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground">Not opted into Placement Network</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Contact Tab */}
              <TabsContent value="contact" className="p-6 space-y-6 m-0 data-[state=inactive]:hidden">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Send className="h-5 w-5" />
                      Send Message to Provider
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact-subject">Subject</Label>
                      <Input
                        id="contact-subject"
                        placeholder="Enter message subject..."
                        value={contactSubject}
                        onChange={(e) => setContactSubject(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact-message">Message</Label>
                      <Textarea
                        id="contact-message"
                        placeholder="Write your message to the provider..."
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        rows={6}
                        className="resize-none"
                      />
                    </div>

                    <div className="flex flex-col gap-3">
                      <Label>Delivery Method</Label>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="send-email"
                            checked={sendEmail}
                            onCheckedChange={(checked) => setSendEmail(!!checked)}
                          />
                          <Label htmlFor="send-email" className="text-sm font-normal flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            Email
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="send-inapp"
                            checked={sendInApp}
                            onCheckedChange={(checked) => setSendInApp(!!checked)}
                          />
                          <Label htmlFor="send-inapp" className="text-sm font-normal flex items-center gap-1">
                            <MessageSquare className="h-4 w-4" />
                            In-App Notification
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={() => sendNotification.mutate()}
                        disabled={!contactSubject || !contactMessage || (!sendEmail && !sendInApp) || sendNotification.isPending}
                      >
                        {sendNotification.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send Message
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Contact */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(providerProfile?.email || selectedProvider?.email) && (
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <a href={`mailto:${providerProfile?.email || selectedProvider?.email}`}>
                          <Mail className="h-4 w-4 mr-2" />
                          Email: {providerProfile?.email || selectedProvider?.email}
                        </a>
                      </Button>
                    )}
                    {selectedProvider?.phone && (
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <a href={`tel:${selectedProvider.phone}`}>
                          <Phone className="h-4 w-4 mr-2" />
                          Call: {selectedProvider.phone}
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

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

      {/* Flag Image Dialog */}
      <Dialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Flag className="h-5 w-5" />
              Flag Inappropriate Image
            </DialogTitle>
            <DialogDescription>
              Flag this image for review. The provider will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {flagImageUrl && (
              <div className="flex justify-center">
                <img
                  src={flagImageUrl}
                  alt="Image to flag"
                  className="max-w-48 max-h-48 object-contain rounded-lg border"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Reason for flagging</Label>
              <Select value={flagReason} onValueChange={setFlagReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inappropriate">Inappropriate content</SelectItem>
                  <SelectItem value="misleading">Misleading or fake image</SelectItem>
                  <SelectItem value="low_quality">Low quality / unprofessional</SelectItem>
                  <SelectItem value="copyright">Copyright violation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowFlagDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => flagImage.mutate()}
                disabled={!flagReason || flagImage.isPending}
              >
                {flagImage.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Flagging...
                  </>
                ) : (
                  <>
                    <Flag className="h-4 w-4 mr-2" />
                    Flag Image
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Destructive Actions */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => !isDeleting && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {confirmAction?.action === "suspend" && (
                <>
                  <Ban className="h-5 w-5 text-destructive" />
                  Suspend Provider
                </>
              )}
              {confirmAction?.action === "reactivate" && (
                <>
                  <RefreshCw className="h-5 w-5 text-emerald-500" />
                  Reactivate Provider
                </>
              )}
              {confirmAction?.action === "delete" && (
                <>
                  <Trash2 className="h-5 w-5 text-destructive" />
                  Delete Provider Permanently
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {confirmAction?.action === "suspend" && (
                  <p>
                    Are you sure you want to suspend <strong>{confirmAction.provider.name}</strong>?
                    Their listing will be hidden from search results.
                  </p>
                )}
                {confirmAction?.action === "reactivate" && (
                  <p>
                    Reactivate <strong>{confirmAction?.provider.name}</strong>?
                    Their listing will be visible again.
                  </p>
                )}
                {confirmAction?.action === "delete" && (
                  <>
                    <p>
                      Are you sure you want to <strong className="text-destructive">permanently delete</strong>{" "}
                      <strong>{confirmAction.provider.name}</strong>?
                    </p>
                    <p className="text-sm text-muted-foreground">
                      This will permanently remove the facility and all associated data.
                    </p>
                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox
                        id="deleteUser"
                        checked={deleteWithUser}
                        onCheckedChange={(checked) => setDeleteWithUser(checked === true)}
                      />
                      <label
                        htmlFor="deleteUser"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Also delete the provider's user account (if no other facilities)
                      </label>
                    </div>
                    <p className="text-sm font-semibold text-destructive">
                      This action cannot be undone.
                    </p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={cn(
                confirmAction?.action === "suspend" && "bg-destructive hover:bg-destructive/90",
                confirmAction?.action === "reactivate" && "bg-emerald-600 hover:bg-emerald-700",
                confirmAction?.action === "delete" && "bg-destructive hover:bg-destructive/90"
              )}
              disabled={updateProvider.isPending || isDeleting}
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : updateProvider.isPending ? (
                "Processing..."
              ) : confirmAction?.action === "delete" ? (
                "Delete Permanently"
              ) : (
                "Confirm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
