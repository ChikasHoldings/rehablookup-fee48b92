import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  CheckCircle,
  XCircle,
  Star,
  Shield,
  Ban,
  BadgeCheck,
  Users,
  MapPin,
  Phone,
  Globe,
  Mail,
  Calendar,
  FileText,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Send,
  Inbox,
  Crown,
  Image,
  Flag,
  AlertTriangle,
  ZoomIn,
  Award,
  History,
  Handshake,
  Wallet,
  LayoutList,
  FileCheck2,
  Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatSourceLabel } from "@/lib/sourceLabels";
import { ProviderActivityTimeline } from "@/components/admin/ProviderActivityTimeline";
import { type Facility, type ProSubscription, getStatusBadge } from "./ProviderListItem";

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
  verification_number: string | null;
  verification_url: string | null;
  document_url: string | null;
  document_name: string | null;
  issuing_authority: string | null;
  notes: string | null;
  rejection_reason: string | null;
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

interface ProviderDetailModalProps {
  provider: Facility | null;
  proSubscriptions: Record<string, ProSubscription> | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (id: string, status: string) => void;
  onToggleVerified: (id: string, currentValue: boolean | null) => void;
  onToggleFeatured: (id: string, currentValue: boolean) => void;
  onSuspend: (provider: Facility) => void;
  onReactivate: (provider: Facility) => void;
  onSaveNotes: (notes: string) => void;
  onFlagImage: (imageUrl: string, type: "logo" | "gallery") => void;
  onPreviewImage: (imageUrl: string) => void;
}

export function ProviderDetailModal({
  provider,
  proSubscriptions,
  open,
  onOpenChange,
  onStatusChange,
  onToggleVerified,
  onToggleFeatured,
  onSuspend,
  onReactivate,
  onSaveNotes,
  onFlagImage,
  onPreviewImage,
}: ProviderDetailModalProps) {
  const queryClient = useQueryClient();
  const [detailTab, setDetailTab] = useState("overview");
  const [adminNotes, setAdminNotes] = useState(provider?.admin_notes || "");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendInApp, setSendInApp] = useState(true);

  // Reset state when provider changes
  useEffect(() => {
    if (provider) {
      setAdminNotes(provider.admin_notes || "");
      setDetailTab("overview");
    }
  }, [provider]);

  // Fetch provider profile for email
  const { data: providerProfile } = useQuery({
    queryKey: ["admin-provider-profile", provider?.user_id],
    queryFn: async () => {
      if (!provider?.user_id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email, phone, created_at")
        .eq("user_id", provider.user_id)
        .maybeSingle();
      return data;
    },
    enabled: !!provider?.user_id && open,
  });

  // Fetch all facilities for selected provider's user
  const { data: providerFacilities } = useQuery({
    queryKey: ["admin-provider-facilities", provider?.user_id],
    queryFn: async () => {
      if (!provider?.user_id) return [];
      const { data } = await supabase
        .from("facilities")
        .select("id, name, slug, city, state, facility_type, status, verified, featured, suspended, created_at, updated_at, logo_url, phone, email")
        .eq("user_id", provider.user_id)
        .order("created_at", { ascending: false });
      return data as Facility[];
    },
    enabled: !!provider?.user_id && open,
  });

  // Fetch credit balance for provider
  const { data: creditBalance } = useQuery({
    queryKey: ["admin-provider-credits", provider?.user_id],
    queryFn: async () => {
      if (!provider?.user_id) return 0;
      const { data } = await supabase
        .from("credit_transactions")
        .select("amount_cents, transaction_type")
        .eq("provider_id", provider.user_id);
      
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
    enabled: !!provider?.user_id && open,
  });

  // Fetch Pro subscription for selected provider
  const { data: selectedProviderPro } = useQuery({
    queryKey: ["admin-provider-pro", provider?.id],
    queryFn: async () => {
      if (!provider?.id) return null;
      const { data } = await supabase
        .from("pro_subscriptions")
        .select("id, facility_id, status, price_cents, current_period_end, stripe_subscription_id, unlock_discount_percent, created_at")
        .eq("facility_id", provider.id)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
    enabled: !!provider?.id && open,
  });

  // Fetch leads for selected provider
  const { data: providerLeads, isLoading: isLoadingLeads } = useQuery({
    queryKey: ["admin-provider-leads", provider?.id],
    queryFn: async () => {
      if (!provider?.id) return [];
      const { data } = await supabase
        .from("leads")
        .select("id, facility_id, name, email, phone, status, source, created_at, urgency, level_of_care, insurance_type, message, inquiry_type")
        .eq("facility_id", provider.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data as Lead[];
    },
    enabled: !!provider?.id && open,
  });

  // Fetch flagged images for selected provider
  const { data: flaggedImages } = useQuery({
    queryKey: ["admin-flagged-images", provider?.id],
    queryFn: async () => {
      if (!provider?.id) return [];
      const { data } = await supabase
        .from("flagged_images")
        .select("id, facility_id, image_type, image_url, reason, flagged_at, resolved, resolved_at")
        .eq("facility_id", provider.id)
        .eq("resolved", false);
      return (data || []) as FlaggedImage[];
    },
    enabled: !!provider?.id && open,
  });

  // Fetch accreditations for selected provider
  const { data: providerAccreditations, refetch: refetchAccreditations } = useQuery({
    queryKey: ["admin-provider-accreditations", provider?.id],
    queryFn: async () => {
      if (!provider?.id) return [];
      const { data } = await supabase
        .from("facility_accreditations")
        .select("id, facility_id, accreditation_type, issuing_authority, verification_number, verified, verified_at, expiry_date, document_url, created_at")
        .eq("facility_id", provider.id)
        .order("created_at", { ascending: true });
      return (data || []) as Accreditation[];
    },
    enabled: !!provider?.id && open,
  });

  // Fetch credential documents for selected provider
  const { data: credentialDocuments, refetch: refetchCredentialDocuments } = useQuery({
    queryKey: ["admin-provider-credentials", provider?.id],
    queryFn: async () => {
      if (!provider?.id) return [];
      const { data } = await supabase
        .from("facility_credential_documents")
        .select("id, facility_id, document_type, document_name, document_url, status, uploaded_at, verified_at, verified_by, rejection_reason")
        .eq("facility_id", provider.id)
        .order("uploaded_at", { ascending: false });
      return (data || []) as CredentialDocument[];
    },
    enabled: !!provider?.id && open,
  });

  // Fetch placement stats
  const { data: placementStats } = useQuery({
    queryKey: ["admin-provider-placement-stats", provider?.id],
    queryFn: async () => {
      if (!provider?.id) return { introductions: 0, placements: 0 };
      
      const [introResult, placementResult] = await Promise.all([
        supabase
          .from("concierge_introductions")
          .select("id", { count: "exact", head: true })
          .eq("facility_id", provider.id),
        supabase
          .from("concierge_engagements")
          .select("id", { count: "exact", head: true })
          .eq("facility_id", provider.id)
          .eq("status", "placed"),
      ]);

      return {
        introductions: introResult.count || 0,
        placements: placementResult.count || 0,
      };
    },
    enabled: !!provider?.id && open,
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
      if (!provider || !contactSubject || !contactMessage) {
        throw new Error("Missing required fields");
      }
      
      const { data, error } = await supabase.functions.invoke("send-admin-notification", {
        body: {
          providerUserId: provider.user_id,
          facilityId: provider.id,
          subject: contactSubject,
          message: contactMessage,
          sendEmail,
          sendInApp,
          providerEmail: providerProfile?.email || provider.email,
          providerName: providerProfile?.first_name || provider.name,
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
      queryClient.invalidateQueries({ queryKey: ["admin-flagged-images", provider?.id] });
    },
  });

  const isImageFlagged = (imageUrl: string) => {
    return flaggedImages?.some(f => f.image_url === imageUrl) || false;
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

  if (!provider) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-6 pb-4 flex-shrink-0 border-b">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-background shadow-lg flex-shrink-0">
              <AvatarImage src={provider.logo_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {provider.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-xl">{provider.name}</DialogTitle>
                {provider.verified && <BadgeCheck className="h-5 w-5 text-blue-500" />}
                {provider.featured && <Star className="h-5 w-5 text-amber-500 fill-amber-500" />}
              </div>
              <DialogDescription className="text-muted-foreground flex items-center gap-1 mt-1 text-sm">
                <MapPin className="h-4 w-4" />
                {provider.city}, {provider.state}
              </DialogDescription>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {getStatusBadge(provider)}
                {selectedProviderPro && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white gap-1">
                    <Crown className="h-3 w-3" />
                    Pro
                  </Badge>
                )}
                {provider.concierge_network_opted_in && (
                  <Badge variant="outline" className="text-purple-600 border-purple-300 gap-1">
                    <Handshake className="h-3 w-3" />
                    Placement Network
                  </Badge>
                )}
                <Badge variant="outline">{provider.facility_type}</Badge>
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
                {provider.status === "pending" && (
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => {
                    onStatusChange(provider.id, "approved");
                    onOpenChange(false);
                  }}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                )}
                {provider.suspended ? (
                  <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-300" onClick={() => onReactivate(provider)}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reactivate
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => onSuspend(provider)}>
                    <Ban className="h-4 w-4 mr-2" />
                    Suspend
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => onToggleVerified(provider.id, provider.verified)}>
                  <Shield className="h-4 w-4 mr-2" />
                  {provider.verified ? "Remove Verified" : "Mark Verified"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => onToggleFeatured(provider.id, provider.featured)}>
                  <Star className="h-4 w-4 mr-2" />
                  {provider.featured ? "Remove Featured" : "Mark Featured"}
                </Button>
                {provider.slug && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/center/${provider.slug}`} target="_blank" rel="noopener noreferrer">
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
                    <Users className="h-5 w-5 mx-auto mb-2 text-blue-500" />
                    <p className="text-2xl font-bold">{providerLeads?.length || 0}</p>
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
                <Card>
                  <CardContent className="p-4 text-center">
                    <LayoutList className="h-5 w-5 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{providerFacilities?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Facilities</p>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Contact Info */}
              <div>
                <h3 className="font-semibold mb-3">Contact Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{providerProfile?.email || provider.email || "No email"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{provider.phone}</span>
                  </div>
                  {provider.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a href={provider.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {provider.website}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{provider.address}, {provider.city}, {provider.state} {provider.zip_code}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Images Section */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Images
                </h3>
                
                {/* Logo */}
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">Logo</p>
                  {provider.logo_url ? (
                    <div className="relative group w-24 h-24">
                      <img
                        src={provider.logo_url}
                        alt="Logo"
                        className={`w-full h-full object-cover rounded-lg border-2 cursor-pointer transition-all hover:opacity-90 ${
                          isImageFlagged(provider.logo_url) 
                            ? "border-destructive ring-2 ring-destructive/20" 
                            : "border-border"
                        }`}
                        onClick={() => onPreviewImage(provider.logo_url!)}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreviewImage(provider.logo_url!);
                          }}
                        >
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                        {!isImageFlagged(provider.logo_url) && (
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              onFlagImage(provider.logo_url!, "logo");
                            }}
                          >
                            <Flag className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {isImageFlagged(provider.logo_url) && (
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
                    Gallery Images ({provider.gallery_urls?.length || 0})
                  </p>
                  {provider.gallery_urls && provider.gallery_urls.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                      {provider.gallery_urls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Gallery image ${index + 1}`}
                            className={`w-full aspect-square object-cover rounded-lg border-2 cursor-pointer transition-all hover:opacity-90 ${
                              isImageFlagged(url) 
                                ? "border-destructive ring-2 ring-destructive/20" 
                                : "border-border"
                            }`}
                            onClick={() => onPreviewImage(url)}
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                onPreviewImage(url);
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
                                  onFlagImage(url, "gallery");
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
                  <p className="font-medium">{format(new Date(provider.created_at), "PPP")}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Last Updated</p>
                  <p className="font-medium">{format(new Date(provider.updated_at), "PPP")}</p>
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
                  <Button onClick={() => onSaveNotes(adminNotes)} size="sm">
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
                          facility.id === provider.id && "ring-2 ring-primary"
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
                    <LayoutList className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
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
                              {formatSourceLabel(lead.source)}
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
              <ProviderActivityTimeline
                facilityId={provider.id}
                userId={provider.user_id}
              />
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
                      {providerAccreditations.map((acc) => {
                        const hasDetails = !!(acc.verification_number || acc.document_url);
                        const lookupUrls: Record<string, string> = {
                          "JCAHO": "https://www.qualitycheck.org",
                          "CARF": "https://carf.org/providerSearch",
                          "LegitScript": "https://www.legitscript.com/search",
                          "NAATP": "https://www.naatp.org/membership-directory",
                          "SAMHSA Listed": "https://findtreatment.gov",
                        };
                        const lookupUrl = lookupUrls[acc.accreditation_type];
                        
                        return (
                          <div
                            key={acc.id}
                            className="p-3 border rounded-lg hover:bg-muted/30 transition-colors space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={!!acc.verified}
                                  onCheckedChange={(checked) => {
                                    updateAccreditationVerification.mutate({
                                      accreditationId: acc.id,
                                      verified: !!checked,
                                    });
                                  }}
                                />
                                <div>
                                  <p className="font-medium">{acc.accreditation_type}</p>
                                  {acc.expiry_date && (
                                    <p className="text-xs text-muted-foreground">
                                      Expires: {format(new Date(acc.expiry_date), "PPP")}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {acc.verified ? (
                                  <Badge className="bg-emerald-100 text-emerald-700">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Verified
                                  </Badge>
                                ) : hasDetails ? (
                                  <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                                    Pending Review
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground">
                                    No Details
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            {/* Verification Details */}
                            {(acc.verification_number || acc.document_url || acc.notes) && (
                              <div className="pl-9 pt-2 border-t border-dashed space-y-2">
                                {acc.verification_number && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-muted-foreground">ID/Number:</span>
                                    <span className="font-mono bg-muted px-2 py-0.5 rounded text-sm">
                                      {acc.verification_number}
                                    </span>
                                    {lookupUrl && (
                                      <Button size="sm" variant="ghost" className="h-6 px-2" asChild>
                                        <a href={lookupUrl} target="_blank" rel="noopener noreferrer">
                                          <ExternalLink className="h-3 w-3 mr-1" />
                                          Verify
                                        </a>
                                      </Button>
                                    )}
                                  </div>
                                )}
                                {acc.document_url && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-muted-foreground">Document:</span>
                                    <Button size="sm" variant="outline" className="h-7" asChild>
                                      <a href={acc.document_url} target="_blank" rel="noopener noreferrer">
                                        <FileText className="h-3 w-3 mr-1" />
                                        {acc.document_name || "View Certificate"}
                                      </a>
                                    </Button>
                                  </div>
                                )}
                                {acc.notes && (
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">Provider Notes:</span>
                                    <p className="text-muted-foreground italic mt-1">{acc.notes}</p>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Lookup Link (when no verification number) */}
                            {!acc.verification_number && lookupUrl && (
                              <div className="pl-9">
                                <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                                  <a href={lookupUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Open verification site
                                  </a>
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Award className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">No accreditations listed</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Credential Documents Section */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
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
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{doc.document_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.document_type} • Uploaded {format(new Date(doc.uploaded_at), "PPP")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                            >
                              <a href={doc.document_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                View
                              </a>
                            </Button>
                            {doc.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700"
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
                                  size="sm"
                                  variant="destructive"
                                  onClick={async () => {
                                    const reason = window.prompt("Enter rejection reason:");
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
                  {provider.concierge_network_opted_in ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-purple-600 border-purple-300 gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Opted In
                        </Badge>
                        {provider.concierge_terms_accepted_at && (
                          <p className="text-sm text-muted-foreground">
                            Agreement signed {format(new Date(provider.concierge_terms_accepted_at), "PPP")}
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
                        <p><strong>Placement Fee:</strong></p>
                        <p className="mt-1">
                          ${selectedProviderPro ? "800" : "1,000"} per placement {selectedProviderPro && <span className="text-emerald-600">(Pro: save $200)</span>}
                        </p>
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
                  {(providerProfile?.email || provider.email) && (
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a href={`mailto:${providerProfile?.email || provider.email}`}>
                        <Mail className="h-4 w-4 mr-2" />
                        Email: {providerProfile?.email || provider.email}
                      </a>
                    </Button>
                  )}
                  {provider.phone && (
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a href={`tel:${provider.phone}`}>
                        <Phone className="h-4 w-4 mr-2" />
                        Call: {provider.phone}
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
  );
}
