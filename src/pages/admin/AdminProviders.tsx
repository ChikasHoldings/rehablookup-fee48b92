import { useState } from "react";
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  lead_limit_override: number | null;
  slug: string | null;
  user_id: string;
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

type SubscriptionData = {
  plan: string;
  plan_name: string;
  subscribed: boolean;
  subscription: {
    id: string;
    status: string;
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
  } | null;
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    created: string;
    invoice_pdf: string | null;
    description: string;
  }>;
};

const ITEMS_PER_PAGE = 15;

export default function AdminProviders() {
  const queryClient = useQueryClient();
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

  // Fetch all status counts
  const { data: statusCounts } = useQuery({
    queryKey: ["admin-providers-status-counts"],
    queryFn: async () => {
      const [allResult, approvedResult, pendingResult, suspendedResult] = await Promise.all([
        supabase.from("facilities").select("id", { count: "exact", head: true }),
        supabase.from("facilities").select("id", { count: "exact", head: true }).eq("status", "approved").neq("suspended", true),
        supabase.from("facilities").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("facilities").select("id", { count: "exact", head: true }).eq("suspended", true),
      ]);

      return {
        all: allResult.count || 0,
        approved: approvedResult.count || 0,
        pending: pendingResult.count || 0,
        suspended: suspendedResult.count || 0,
      };
    },
  });

  // Fetch providers with pagination and filtering
  const { data: providers, isLoading } = useQuery({
    queryKey: ["admin-providers", activeTab, searchQuery, currentPage],
    queryFn: async () => {
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
      }

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Facility[];
    },
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

  // Fetch subscription data for selected provider
  const { data: subscriptionData, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ["admin-provider-subscription", selectedProvider?.user_id],
    queryFn: async () => {
      if (!selectedProvider?.user_id) return null;
      const { data, error } = await supabase.functions.invoke("get-provider-subscription", {
        body: { userId: selectedProvider.user_id },
      });
      if (error) throw error;
      return data as SubscriptionData;
    },
    enabled: !!selectedProvider?.user_id && showDetailDialog,
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
      const { error } = await supabase.from("facilities").update(updates).eq("id", id);
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("admin_audit_log").insert({
        admin_user_id: user?.id,
        action_type: actionType,
        target_type: "facility",
        target_id: id,
        details: updates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-providers-status-counts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-providers-count"] });
      toast.success("Provider updated successfully");
    },
    onError: () => {
      toast.error("Failed to update provider");
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

      // Log admin action
      await supabase.from("admin_audit_log").insert({
        admin_user_id: user.id,
        action_type: "flag_image",
        target_type: "facility",
        target_id: selectedProvider.id,
        details: { image_url: flagImageUrl, image_type: flagImageType, reason: flagReason },
      });
    },
    onSuccess: () => {
      toast.success("Image flagged successfully");
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

  const handleSuspend = (id: string) => {
    updateProvider.mutate({
      id,
      updates: { suspended: true },
      actionType: "suspended",
    });
  };

  const handleReactivate = (id: string) => {
    updateProvider.mutate({
      id,
      updates: { suspended: false, status: "approved" },
      actionType: "reactivated",
    });
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

  const getPlanBadge = (plan: string) => {
    if (plan === "featured") {
      return <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white gap-1"><Crown className="h-3 w-3" />Featured</Badge>;
    }
    if (plan === "professional") {
      return <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white gap-1"><Star className="h-3 w-3" />Professional</Badge>;
    }
    return <Badge variant="secondary" className="gap-1">Basic</Badge>;
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Provider Management</h1>
          <p className="text-muted-foreground">Manage and monitor all facility providers</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-providers"] })}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Providers</p>
                <p className="text-2xl font-bold">{statusCounts?.all || 0}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-emerald-600">{statusCounts?.approved || 0}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold text-amber-600">{statusCounts?.pending || 0}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Suspended</p>
                <p className="text-2xl font-bold text-destructive">{statusCounts?.suspended || 0}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Ban className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full sm:w-auto">
          <TabsList className="grid w-full sm:w-auto grid-cols-4 h-10">
            <TabsTrigger value="all" className="gap-1.5 text-xs sm:text-sm">
              All
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{statusCounts?.all || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-1.5 text-xs sm:text-sm">
              Approved
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-emerald-100 text-emerald-700">{statusCounts?.approved || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-1.5 text-xs sm:text-sm">
              Pending
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-amber-100 text-amber-700">{statusCounts?.pending || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="suspended" className="gap-1.5 text-xs sm:text-sm">
              Suspended
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-red-100 text-red-700">{statusCounts?.suspended || 0}</Badge>
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
              {providers.map((provider) => (
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
                          <DropdownMenuItem onClick={() => handleReactivate(provider.id)} className="text-emerald-600">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reactivate Provider
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleSuspend(provider.id)} className="text-destructive">
                            <Ban className="h-4 w-4 mr-2" />
                            Suspend Provider
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
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
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 border-2 border-background shadow-lg">
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
                <p className="text-muted-foreground flex items-center gap-1 mt-1 text-sm">
                  <MapPin className="h-4 w-4" />
                  {selectedProvider?.city}, {selectedProvider?.state}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {selectedProvider && getStatusBadge(selectedProvider)}
                  {subscriptionData && getPlanBadge(subscriptionData.plan)}
                  <Badge variant="outline">{selectedProvider?.facility_type}</Badge>
                </div>
              </div>
            </div>
          </DialogHeader>

          <Tabs value={detailTab} onValueChange={setDetailTab} className="flex-1">
            <div className="px-6 border-b">
              <TabsList className="h-12 w-full justify-start bg-transparent border-none p-0 gap-4">
                <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-1 pb-3">
                  <Eye className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="leads" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-1 pb-3">
                  <Inbox className="h-4 w-4 mr-2" />
                  Leads
                  <Badge variant="secondary" className="ml-2 h-5">{providerLeads?.length || 0}</Badge>
                </TabsTrigger>
                <TabsTrigger value="subscription" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-1 pb-3">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Subscription
                </TabsTrigger>
                <TabsTrigger value="contact" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-1 pb-3">
                  <Send className="h-4 w-4 mr-2" />
                  Contact
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="max-h-[calc(90vh-220px)]">
              {/* Overview Tab */}
              <TabsContent value="overview" className="p-6 space-y-6 m-0">
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
                      handleReactivate(selectedProvider.id);
                      setShowDetailDialog(false);
                    }}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reactivate
                    </Button>
                  ) : selectedProvider && (
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => {
                      handleSuspend(selectedProvider.id);
                      setShowDetailDialog(false);
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Total Leads</p>
                      <p className="text-xl font-bold text-primary">{leadCounts?.[selectedProvider?.id || ""] || 0}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Bed Count</p>
                      <p className="text-xl font-bold">{selectedProvider?.bed_count || "N/A"}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Gender Served</p>
                      <p className="text-lg font-semibold capitalize">{selectedProvider?.gender_served || "All"}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Lead Limit</p>
                      <p className="text-xl font-bold">{selectedProvider?.lead_limit_override || "Default"}</p>
                    </div>
                  </div>
                </div>

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

              {/* Leads Tab */}
              <TabsContent value="leads" className="p-6 m-0">
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

              {/* Subscription Tab */}
              <TabsContent value="subscription" className="p-6 space-y-6 m-0">
                {isLoadingSubscription ? (
                  <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-48 w-full" />
                  </div>
                ) : subscriptionData ? (
                  <>
                    {/* Current Plan */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <CreditCard className="h-5 w-5" />
                          Current Plan
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {getPlanBadge(subscriptionData.plan)}
                            <div>
                              <p className="font-semibold">{subscriptionData.plan_name}</p>
                              {subscriptionData.subscription ? (
                                <p className="text-sm text-muted-foreground">
                                  Renews {format(new Date(subscriptionData.subscription.current_period_end), "PPP")}
                                  {subscriptionData.subscription.cancel_at_period_end && (
                                    <span className="text-destructive ml-2">(Cancels at period end)</span>
                                  )}
                                </p>
                              ) : (
                                <p className="text-sm text-muted-foreground">Free plan - no active subscription</p>
                              )}
                            </div>
                          </div>
                          <Badge variant={subscriptionData.subscribed ? "default" : "secondary"}>
                            {subscriptionData.subscribed ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Payment History */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Receipt className="h-5 w-5" />
                          Payment History
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {subscriptionData.payments.length > 0 ? (
                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50">
                                  <TableHead>Date</TableHead>
                                  <TableHead>Description</TableHead>
                                  <TableHead>Amount</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {subscriptionData.payments.map((payment) => (
                                  <TableRow key={payment.id}>
                                    <TableCell>
                                      {format(new Date(payment.created), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell>{payment.description}</TableCell>
                                    <TableCell>
                                      <span className="font-medium">
                                        ${payment.amount.toFixed(2)} {payment.currency.toUpperCase()}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={payment.status === "paid" ? "default" : "secondary"} className={payment.status === "paid" ? "bg-emerald-100 text-emerald-700" : ""}>
                                        {payment.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {payment.invoice_pdf && (
                                        <Button size="sm" variant="ghost" asChild>
                                          <a href={payment.invoice_pdf} target="_blank" rel="noopener noreferrer">
                                            <Download className="h-4 w-4" />
                                          </a>
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <DollarSign className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-muted-foreground">No payment history</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <CreditCard className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">Unable to load subscription data</p>
                  </div>
                )}
              </TabsContent>

              {/* Contact Tab */}
              <TabsContent value="contact" className="p-6 space-y-6 m-0">
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
            </ScrollArea>
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
              Flag this image for review. The provider will be notified that their image has been flagged.
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
    </div>
  );
}
