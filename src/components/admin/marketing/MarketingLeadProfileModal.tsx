import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { logAdminAction, AdminAuditActions } from "@/hooks/useAdminAuditLog";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Zap,
  Copy,
  ExternalLink,
  Check,
  CheckCircle,
  XCircle,
  Shield,
  MessageSquare,
  Star,
  Building2,
  FileText,
  Activity,
  Send,
  Loader2,
  AlertCircle,
  TrendingUp,
  Target,
  Globe,
  Sparkles,
  UserCheck,
  Users,
  Briefcase,
  Brain,
  Stethoscope,
  CreditCard,
  Trash2,
  ArrowRightCircle,
  Search,
  Settings,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export interface MarketingLead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  location_city_state: string | null;
  location_zip: string | null;
  urgency: string | null;
  level_of_care: string | null;
  insurance_type: string | null;
  insurance_provider: string | null;
  primary_substance: string[] | null;
  co_occurring_conditions: string[] | null;
  who_seeking_help: string | null;
  age_range: string | null;
  gender: string | null;
  previous_treatment: string | null;
  dual_diagnosis: string | null;
  employment_status: string | null;
  preferred_contact: string | null;
  message: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  landing_page: string | null;
  source: string;
  facilities_requested: string[] | null;
  matched_facility_ids: string[] | null;
  followup_email_sent: boolean | null;
  followup_email_sent_at: string | null;
  converted_to_concierge: boolean | null;
  converted_at: string | null;
  status: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface LeadJourneyData {
  hasAccount: boolean;
  accountCreatedAt?: string;
  hasConcierge: boolean;
  conciergeInquiries: any[];
  hasReviews: boolean;
  reviews: any[];
  hasFavorites: boolean;
  favoriteCount: number;
  providerCommunications: any[];
  leadInquiries: any[];
}

interface MarketingLeadProfileModalProps {
  lead: MarketingLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
  onDeleted?: () => void;
}

export function MarketingLeadProfileModal({
  lead,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: MarketingLeadProfileModalProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [routeDialogOpen, setRouteDialogOpen] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState("");
  const [facilitySearch, setFacilitySearch] = useState("");
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (lead) {
      setAdminNotes(lead.admin_notes || "");
      setActiveTab("overview");
    }
  }, [lead?.id]);

  // Fetch lead journey data
  const { data: journeyData, isLoading: journeyLoading } = useQuery({
    queryKey: ["marketing-lead-journey", lead?.email, lead?.phone],
    queryFn: async (): Promise<LeadJourneyData> => {
      if (!lead) return {
        hasAccount: false, hasConcierge: false, conciergeInquiries: [],
        hasReviews: false, reviews: [], hasFavorites: false, favoriteCount: 0,
        providerCommunications: [], leadInquiries: [],
      };

      const { data: seekerEmails } = await supabase.rpc("get_seeker_emails_for_admin");
      const matchingSeeker = seekerEmails?.find((s: any) =>
        s.email?.toLowerCase() === lead.email.toLowerCase()
      );

      let seekerProfile = null;
      let userId: string | null = null;

      if (matchingSeeker) {
        userId = matchingSeeker.user_id;
        const { data: profile } = await supabase
          .from("seeker_profiles")
          .select("user_id, first_name, last_name, display_name, phone, zipcode, city, state, created_at")
          .eq("user_id", matchingSeeker.user_id)
          .single();
        seekerProfile = profile;
      }

      const { data: conciergeInquiries } = await supabase
        .from("concierge_inquiries")
        .select("id, status, created_at, primary_concern, level_of_care, payment_status, user_name")
        .or(`user_email.ilike.${lead.email},user_phone.eq.${lead.phone}`)
        .order("created_at", { ascending: false })
        .limit(50);

      let reviews: any[] = [];
      let favoriteCount = 0;
      if (userId) {
        const { data: userReviews } = await supabase
          .from("facility_reviews")
          .select("id, rating, review_text, status, created_at, facility_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50);
        reviews = userReviews || [];

        const { count } = await supabase
          .from("user_favorites")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);
        favoriteCount = count || 0;
      }

      const { data: leadInquiries } = await supabase
        .from("leads")
        .select("id, name, email, phone, status, created_at, facility_id, provider_response_status, provider_responded_at")
        .or(`email.ilike.${lead.email},phone.eq.${lead.phone}`)
        .order("created_at", { ascending: false })
        .limit(100);

      const facilityIds = [...new Set(pluckNonNull(leadInquiries, "facility_id"))];
      let facilitiesMap: Record<string, any> = {};

      if (facilityIds.length > 0) {
        const { data: facilities } = await supabase
          .from("facilities")
          .select("id, name, city, state")
          .in("id", facilityIds);
        facilities?.forEach(f => { facilitiesMap[f.id] = f; });
      }

      const enrichedLeadInquiries = leadInquiries?.map(l => ({
        ...l,
        facility: facilitiesMap[l.facility_id] || null,
      })) || [];

      return {
        hasAccount: !!seekerProfile,
        accountCreatedAt: seekerProfile?.created_at,
        hasConcierge: (conciergeInquiries?.length || 0) > 0,
        conciergeInquiries: conciergeInquiries || [],
        hasReviews: reviews.length > 0,
        reviews,
        hasFavorites: favoriteCount > 0,
        favoriteCount,
        providerCommunications: enrichedLeadInquiries.filter(l => l.provider_response_status),
        leadInquiries: enrichedLeadInquiries,
      };
    },
    enabled: !!lead && open,
  });

  const { data: requestedFacilities } = useQuery({
    queryKey: ["marketing-lead-facilities", lead?.facilities_requested],
    queryFn: async () => {
      if (!lead?.facilities_requested?.length) return [];
      const { data } = await supabase
        .from("facilities")
        .select("id, name, city, state")
        .in("id", lead.facilities_requested);
      return data || [];
    },
    enabled: !!(lead?.facilities_requested?.length),
  });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!lead) return;
      const { error } = await supabase
        .from("marketing_leads")
        .update({ status: newStatus })
        .eq("id", lead.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketing-leads"] });
      toast.success("Status updated");
      onUpdated?.();
    },
    onError: () => toast.error("Failed to update status"),
  });

  const updateNotes = useMutation({
    mutationFn: async (notes: string) => {
      if (!lead) return;
      const { error } = await supabase
        .from("marketing_leads")
        .update({ admin_notes: notes })
        .eq("id", lead.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketing-leads"] });
      toast.success("Notes saved");
      onUpdated?.();
    },
    onError: () => toast.error("Failed to save notes"),
  });
  // Delete lead
  const deleteLead = useMutation({
    mutationFn: async () => {
      if (!lead) return;
      const { error } = await supabase.from("marketing_leads").delete().eq("id", lead.id);
      if (error) throw error;
      // Audit destructive admin action
      await logAdminAction({
        actionType: AdminAuditActions.MARKETING_LEAD_DELETED,
        targetType: "marketing_lead",
        targetId: lead.id,
        details: {
          email: lead.email,
          first_name: lead.first_name,
          last_name: lead.last_name,
          urgency: lead.urgency,
          converted_to_concierge: lead.converted_to_concierge,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketing-leads"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sidebar-counts"] });
      toast.success("Marketing lead deleted");
      setDeleteConfirmOpen(false);
      onOpenChange(false);
      onDeleted?.();
    },
    onError: () => toast.error("Failed to delete lead"),
  });

  // Route to provider
  const routeToProvider = useMutation({
    mutationFn: async (facilityId: string) => {
      if (!lead) return;
      const fullName = `${lead.first_name} ${lead.last_name}`.trim();
      const { error } = await supabase.from("leads").insert({
        facility_id: facilityId,
        name: fullName,
        email: lead.email,
        phone: lead.phone,
        urgency: lead.urgency || "flexible",
        level_of_care: lead.level_of_care,
        insurance_type: lead.insurance_type,
        location_zip: lead.location_zip,
        location_city_state: lead.location_city_state,
        primary_substance: lead.primary_substance || [],
        dual_diagnosis: lead.dual_diagnosis,
        message: lead.message,
        source: "marketing_routed",
        status: "new",
      });
      if (error) throw error;
      await supabase.from("marketing_leads").update({ status: "contacted" }).eq("id", lead.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketing-leads"] });
      toast.success("Lead routed to provider");
      setRouteDialogOpen(false);
      setSelectedFacilityId("");
      setFacilitySearch("");
      onUpdated?.();
    },
    onError: () => toast.error("Failed to route lead"),
  });

  // Convert to concierge
  const convertToConcierge = useMutation({
    mutationFn: async () => {
      if (!lead) return;
      const { error } = await supabase.from("marketing_leads").update({
        converted_to_concierge: true,
        converted_at: new Date().toISOString(),
        status: "converted",
      }).eq("id", lead.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketing-leads"] });
      toast.success("Marked as converted to concierge");
      onUpdated?.();
    },
    onError: () => toast.error("Failed to convert"),
  });

  // Send follow-up email manually
  const sendFollowup = useMutation({
    mutationFn: async () => {
      if (!lead) return;
      const { error } = await supabase.functions.invoke("send-marketing-followup", {
        body: { manualLeadId: lead.id },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketing-leads"] });
      toast.success("Follow-up email sent");
      onUpdated?.();
    },
    onError: () => toast.error("Failed to send follow-up email"),
  });

  // Search facilities for routing
  const { data: searchedFacilities = [] } = useQuery({
    queryKey: ["admin-facility-search-route", facilitySearch],
    queryFn: async () => {
      if (!facilitySearch || facilitySearch.length < 2) return [];
      const { data } = await supabase
        .from("facilities")
        .select("id, name, city, state")
        .eq("status", "approved")
        .ilike("name", `%${facilitySearch}%`)
        .limit(10);
      return data || [];
    },
    enabled: facilitySearch.length >= 2,
  });

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success("Copied to clipboard");
  };

  if (!lead) return null;

  const fullName = `${lead.first_name} ${lead.last_name}`;

  const getStatusBadge = () => {
    if (lead.converted_to_concierge) {
      return <Badge className="bg-chart-3/10 text-chart-3 border-chart-3/30">Concierge</Badge>;
    }
    if ((lead.facilities_requested?.length || 0) > 0) {
      return <Badge className="bg-success/10 text-success border-success/30">Engaged</Badge>;
    }
    if (lead.followup_email_sent) {
      return <Badge className="bg-info/10 text-info border-info/30">Followed Up</Badge>;
    }
    return <Badge variant="secondary">New</Badge>;
  };

  const formatUrgency = (urgency: string | null) => {
    if (!urgency) return null;
    const map: Record<string, string> = {
      immediate: "Immediate (ASAP)",
      "within-week": "Within a Week",
      "within-month": "Within a Month",
      flexible: "Flexible",
      researching: "Just Researching",
    };
    return map[urgency] || urgency;
  };

  const getUrgencyColor = (urgency: string | null) => {
    const colors: Record<string, string> = {
      immediate: "text-destructive bg-destructive/10 border-destructive/30",
      "within-week": "text-warning bg-warning/10 border-warning/30",
      "within-month": "text-info bg-info/10 border-info/30",
      researching: "text-muted-foreground bg-muted border-border",
    };
    return colors[urgency || ""] || "text-muted-foreground bg-muted border-border";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl h-[90vh] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-6 pb-4 sm:pb-5 border-b bg-gradient-to-r from-muted/50 via-muted/30 to-transparent flex-shrink-0">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-lg sm:text-xl font-semibold text-primary">
                {lead.first_name?.[0]}{lead.last_name?.[0]}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <DialogTitle className="text-lg sm:text-xl font-semibold truncate">
                  {fullName}
                </DialogTitle>
                {getStatusBadge()}
                <Badge variant="outline" className="gap-1 text-xs">
                  <Target className="h-3 w-3" />
                  Marketing Lead
                </Badge>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 mt-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(lead.created_at), "MMM d, yyyy")}
                  <span className="text-muted-foreground/50">•</span>
                  {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                </span>
                {lead.utm_source && (
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    {lead.utm_source}
                  </span>
                )}
              </div>

              {/* Journey Quick Stats */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {journeyData?.hasAccount && (
                  <Badge className="bg-success/10 text-success border-success/30 gap-1">
                    <UserCheck className="h-3 w-3" />
                    Account Created
                  </Badge>
                )}
                {journeyData?.hasConcierge && (
                  <Badge className="bg-chart-3/10 text-chart-3 border-chart-3/30 gap-1">
                    <Shield className="h-3 w-3" />
                    Concierge
                  </Badge>
                )}
                {(journeyData?.leadInquiries?.length || 0) > 0 && (
                  <Badge className="bg-info/10 text-info border-info/30 gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {journeyData?.leadInquiries?.length} Inquiries
                  </Badge>
                )}
                {journeyData?.hasReviews && (
                  <Badge className="bg-warning/10 text-warning border-warning/30 gap-1">
                    <Star className="h-3 w-3" />
                    {journeyData?.reviews?.length} Reviews
                  </Badge>
                )}
                {lead.urgency === "immediate" && (
                  <Badge variant="destructive" className="gap-1 animate-pulse">
                    <Zap className="h-3 w-3" />
                    Urgent
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="border-b px-4 sm:px-6 bg-muted/20 flex-shrink-0 overflow-x-auto scrollbar-hide">
            <TabsList className="h-11 w-auto inline-flex sm:w-full justify-start bg-transparent gap-1 p-0">
              <TabsTrigger
                value="overview"
                className="gap-1.5 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="journey"
                className="gap-1.5 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Journey
              </TabsTrigger>
              <TabsTrigger
                value="clinical"
                className="gap-1.5 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                <Stethoscope className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Clinical
              </TabsTrigger>
              <TabsTrigger
                value="tracking"
                className="gap-1.5 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                UTM
              </TabsTrigger>
              <TabsTrigger
                value="actions"
                className="gap-1.5 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Actions
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 overflow-auto">
            {/* Overview Tab */}
            <TabsContent value="overview" className="p-4 sm:p-6 space-y-5 sm:space-y-6 mt-0">
              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-3 p-3 sm:p-4 rounded-xl bg-muted/30 border">
                <Button variant="outline" className="gap-2 text-xs sm:text-sm h-8 sm:h-9" asChild>
                  <a href={`tel:${lead.phone}`}>
                    <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-success" />
                    Call
                  </a>
                </Button>
                <Button variant="outline" className="gap-2 text-xs sm:text-sm h-8 sm:h-9" asChild>
                  <a href={`mailto:${lead.email}`}>
                    <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-info" />
                    Email
                  </a>
                </Button>
                <div className="flex-1 sm:ml-auto">
                  <Select
                    value={lead.status || "new"}
                    onValueChange={(value) => updateStatus.mutate(value)}
                    disabled={updateStatus.isPending}
                  >
                    <SelectTrigger className="w-full sm:w-[160px] h-8 sm:h-9 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Contact Cards */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Contact Information
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Phone */}
                  <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-success/5 border border-success/20">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-success/10 flex items-center justify-center">
                        <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{lead.phone}</p>
                        <p className="text-xs text-muted-foreground">
                          {lead.preferred_contact === "call" ? "✓ Preferred" : "Phone"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9"
                      onClick={() => handleCopy(lead.phone, "phone")}
                    >
                      {copiedField === "phone" ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Email */}
                  <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-info/5 border border-info/20">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-info/10 flex items-center justify-center">
                        <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-info" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground truncate max-w-[160px] sm:max-w-[180px] text-sm">{lead.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {lead.preferred_contact === "email" ? "✓ Preferred" : "Email"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9"
                      onClick={() => handleCopy(lead.email, "email")}
                    >
                      {copiedField === "email" ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Location */}
                {(lead.location_city_state || lead.location_zip) && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{lead.location_city_state || lead.location_zip}</span>
                  </div>
                )}
              </div>

              {/* Key Details */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Key Details
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="text-xs text-muted-foreground mb-1">Urgency</p>
                    <Badge variant="outline" className={cn("text-xs", getUrgencyColor(lead.urgency))}>
                      {formatUrgency(lead.urgency) || "—"}
                    </Badge>
                  </div>
                  {lead.level_of_care && (
                    <div className="p-3 rounded-lg border bg-card">
                      <p className="text-xs text-muted-foreground mb-1">Level of Care</p>
                      <p className="font-medium text-sm">{lead.level_of_care}</p>
                    </div>
                  )}
                  {lead.insurance_type && (
                    <div className="p-3 rounded-lg border bg-card">
                      <p className="text-xs text-muted-foreground mb-1">Insurance</p>
                      <p className="font-medium text-sm">{lead.insurance_type}</p>
                    </div>
                  )}
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="text-xs text-muted-foreground mb-1">Seeking For</p>
                    <p className="font-medium text-sm">{lead.who_seeking_help || "Themselves"}</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="text-xs text-muted-foreground mb-1">Age Range</p>
                    <p className="font-medium text-sm">{lead.age_range || "Adult"}</p>
                  </div>
                  {lead.gender && (
                    <div className="p-3 rounded-lg border bg-card">
                      <p className="text-xs text-muted-foreground mb-1">Gender</p>
                      <p className="font-medium text-sm">{lead.gender}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Requested Facilities */}
              {requestedFacilities && requestedFacilities.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Requested Facilities ({requestedFacilities.length})
                  </h3>
                  <div className="space-y-2">
                    {requestedFacilities.map((facility) => (
                      <div key={facility.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{facility.name}</p>
                          <p className="text-xs text-muted-foreground">{facility.city}, {facility.state}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message */}
              {lead.message && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Message
                  </h3>
                  <div className="p-3 sm:p-4 rounded-lg bg-muted/50 border">
                    <p className="text-sm whitespace-pre-wrap">{lead.message}</p>
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Admin Notes
                </h3>
                <Textarea
                  placeholder="Add notes about this lead..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="min-h-[100px] text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => updateNotes.mutate(adminNotes)}
                  disabled={updateNotes.isPending || adminNotes === (lead.admin_notes || "")}
                  className="h-8 text-xs sm:text-sm"
                >
                  {updateNotes.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                  Save Notes
                </Button>
              </div>
            </TabsContent>

            {/* Journey Tab */}
            <TabsContent value="journey" className="p-4 sm:p-6 space-y-5 sm:space-y-6 mt-0">
              {journeyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Journey Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <div className={cn(
                      "p-3 sm:p-4 rounded-xl border text-center",
                      journeyData?.hasAccount ? "bg-success/5 border-success/20" : "bg-muted/50"
                    )}>
                      <div className={cn(
                        "h-9 w-9 sm:h-10 sm:w-10 rounded-xl mx-auto mb-2 flex items-center justify-center",
                        journeyData?.hasAccount ? "bg-success/10" : "bg-muted"
                      )}>
                        {journeyData?.hasAccount ? (
                          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                        )}
                      </div>
                      <p className="font-semibold text-sm">Account</p>
                      <p className="text-xs text-muted-foreground">{journeyData?.hasAccount ? "Created" : "None"}</p>
                    </div>

                    <div className={cn(
                      "p-3 sm:p-4 rounded-xl border text-center",
                      (journeyData?.leadInquiries?.length || 0) > 0 ? "bg-info/5 border-info/20" : "bg-muted/50"
                    )}>
                      <div className={cn(
                        "h-9 w-9 sm:h-10 sm:w-10 rounded-xl mx-auto mb-2 flex items-center justify-center",
                        (journeyData?.leadInquiries?.length || 0) > 0 ? "bg-info/10" : "bg-muted"
                      )}>
                        <MessageSquare className={cn(
                          "h-4 w-4 sm:h-5 sm:w-5",
                          (journeyData?.leadInquiries?.length || 0) > 0 ? "text-info" : "text-muted-foreground"
                        )} />
                      </div>
                      <p className="font-semibold text-sm">Inquiries</p>
                      <p className="text-xs text-muted-foreground">{journeyData?.leadInquiries?.length || 0} sent</p>
                    </div>

                    <div className={cn(
                      "p-3 sm:p-4 rounded-xl border text-center",
                      journeyData?.hasConcierge ? "bg-chart-3/5 border-chart-3/20" : "bg-muted/50"
                    )}>
                      <div className={cn(
                        "h-9 w-9 sm:h-10 sm:w-10 rounded-xl mx-auto mb-2 flex items-center justify-center",
                        journeyData?.hasConcierge ? "bg-chart-3/10" : "bg-muted"
                      )}>
                        <Shield className={cn(
                          "h-4 w-4 sm:h-5 sm:w-5",
                          journeyData?.hasConcierge ? "text-chart-3" : "text-muted-foreground"
                        )} />
                      </div>
                      <p className="font-semibold text-sm">Concierge</p>
                      <p className="text-xs text-muted-foreground">{journeyData?.conciergeInquiries?.length || 0} requests</p>
                    </div>

                    <div className={cn(
                      "p-3 sm:p-4 rounded-xl border text-center",
                      journeyData?.hasReviews ? "bg-warning/5 border-warning/20" : "bg-muted/50"
                    )}>
                      <div className={cn(
                        "h-9 w-9 sm:h-10 sm:w-10 rounded-xl mx-auto mb-2 flex items-center justify-center",
                        journeyData?.hasReviews ? "bg-warning/10" : "bg-muted"
                      )}>
                        <Star className={cn(
                          "h-4 w-4 sm:h-5 sm:w-5",
                          journeyData?.hasReviews ? "text-warning" : "text-muted-foreground"
                        )} />
                      </div>
                      <p className="font-semibold text-sm">Reviews</p>
                      <p className="text-xs text-muted-foreground">{journeyData?.reviews?.length || 0} written</p>
                    </div>
                  </div>

                  {/* Provider Inquiries */}
                  {(journeyData?.leadInquiries?.length || 0) > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        Provider Inquiries ({journeyData?.leadInquiries?.length})
                      </h3>
                      <div className="space-y-2">
                        {journeyData?.leadInquiries?.map((inquiry: any) => (
                          <div key={inquiry.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-info/10 flex items-center justify-center">
                                <Building2 className="h-4 w-4 text-info" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{inquiry.facility?.name || "Unknown Facility"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(inquiry.created_at), "MMM d, yyyy")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {inquiry.provider_response_status && (
                                <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                                  {inquiry.provider_response_status}
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-xs">{inquiry.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Concierge Inquiries */}
                  {(journeyData?.conciergeInquiries?.length || 0) > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        Concierge Requests ({journeyData?.conciergeInquiries?.length})
                      </h3>
                      <div className="space-y-2">
                        {journeyData?.conciergeInquiries?.map((inquiry: any) => (
                          <div key={inquiry.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-chart-3/10 flex items-center justify-center">
                                <Shield className="h-4 w-4 text-chart-3" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{inquiry.primary_concern || "Concierge Request"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(inquiry.created_at), "MMM d, yyyy")}{inquiry.level_of_care ? ` • ${inquiry.level_of_care}` : ""}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className={cn(
                              "text-xs",
                              (inquiry.payment_status === "paid" || inquiry.payment_status === "succeeded")
                                ? "bg-success/10 text-success"
                                : "bg-warning/10 text-warning"
                            )}>
                              {inquiry.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reviews */}
                  {(journeyData?.reviews?.length || 0) > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Star className="h-4 w-4 text-primary" />
                        Reviews Written ({journeyData?.reviews?.length})
                      </h3>
                      <div className="space-y-2">
                        {journeyData?.reviews?.map((review: any) => (
                          <div key={review.id} className="p-3 rounded-lg border bg-card">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={cn(
                                      "h-4 w-4",
                                      i < review.rating ? "fill-warning text-warning" : "text-muted-foreground"
                                    )}
                                  />
                                ))}
                              </div>
                              <Badge variant="outline" className="text-xs">{review.status}</Badge>
                            </div>
                            {review.review_text && (
                              <p className="text-sm text-muted-foreground line-clamp-2">{review.review_text}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(new Date(review.created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {!journeyData?.hasAccount &&
                   (journeyData?.leadInquiries?.length || 0) === 0 &&
                   !journeyData?.hasConcierge &&
                   !journeyData?.hasReviews && (
                    <div className="text-center py-12">
                      <AlertCircle className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                      <p className="text-muted-foreground font-medium">No journey activity found for this lead</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        They haven't created an account or engaged further yet
                      </p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Clinical Tab */}
            <TabsContent value="clinical" className="p-4 sm:p-6 space-y-5 sm:space-y-6 mt-0">
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                {lead.level_of_care && (
                  <div className="p-3 sm:p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      <Stethoscope className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold text-sm">Level of Care</h4>
                    </div>
                    <p className="text-sm">{lead.level_of_care}</p>
                  </div>
                )}

                {lead.insurance_type && (
                  <div className="p-3 sm:p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold text-sm">Insurance</h4>
                    </div>
                    <p className="text-sm">{lead.insurance_type}</p>
                    {lead.insurance_provider && (
                      <p className="text-xs text-muted-foreground mt-1">Provider: {lead.insurance_provider}</p>
                    )}
                  </div>
                )}

                <div className="p-3 sm:p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Primary Substance</h4>
                  </div>
                  {lead.primary_substance?.length ? (
                    <div className="flex flex-wrap gap-1">
                      {lead.primary_substance.map((s, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">None reported</p>
                  )}
                </div>

                <div className="p-3 sm:p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Co-occurring Conditions</h4>
                  </div>
                  {lead.co_occurring_conditions?.length ? (
                    <div className="flex flex-wrap gap-1">
                      {lead.co_occurring_conditions.map((c, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">None specified</p>
                  )}
                </div>

                <div className="p-3 sm:p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Seeking Help For</h4>
                  </div>
                  <p className="text-sm">{lead.who_seeking_help || "Themselves"}</p>
                </div>

                <div className="p-3 sm:p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Demographics</h4>
                  </div>
                  <div className="text-sm space-y-1">
                    <p>Age: {lead.age_range || "Adult"}</p>
                    {lead.gender && <p>Gender: {lead.gender}</p>}
                  </div>
                </div>

                <div className="p-3 sm:p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Previous Treatment</h4>
                  </div>
                  <p className="text-sm">{lead.previous_treatment || "No prior treatment"}</p>
                </div>

                {lead.employment_status && (
                  <div className="p-3 sm:p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      <Briefcase className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold text-sm">Employment</h4>
                    </div>
                    <p className="text-sm">{lead.employment_status}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* UTM Tracking Tab */}
            <TabsContent value="tracking" className="p-4 sm:p-6 space-y-5 sm:space-y-6 mt-0">
              <div className="p-3 sm:p-4 rounded-xl bg-info/5 border border-info/20">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="h-5 w-5 text-info" />
                  <h3 className="font-semibold">Campaign Attribution</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Source</p>
                    <p className="font-medium text-sm">{lead.utm_source || "direct"}</p>
                  </div>
                  {lead.utm_medium && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Medium</p>
                      <p className="font-medium text-sm">{lead.utm_medium}</p>
                    </div>
                  )}
                  {lead.utm_campaign && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Campaign</p>
                      <p className="font-medium text-sm">{lead.utm_campaign}</p>
                    </div>
                  )}
                  {lead.utm_content && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Content</p>
                      <p className="font-medium text-sm">{lead.utm_content}</p>
                    </div>
                  )}
                  {lead.utm_term && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Term</p>
                      <p className="font-medium text-sm">{lead.utm_term}</p>
                    </div>
                  )}
                  {lead.landing_page && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Landing Page</p>
                      <p className="font-medium truncate text-sm">{lead.landing_page}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Follow-up Status */}
              <div className="p-3 sm:p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <Send className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">Follow-up Status</h4>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    {lead.followup_email_sent ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">
                      {lead.followup_email_sent ? "Follow-up sent" : "No follow-up sent"}
                    </span>
                  </div>
                  {lead.followup_email_sent_at && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(lead.followup_email_sent_at), "MMM d, yyyy h:mm a")}
                    </span>
                  )}
                </div>
              </div>

              {/* Conversion Status */}
              <div className="p-3 sm:p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">Conversion</h4>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    {lead.converted_to_concierge ? (
                      <CheckCircle className="h-4 w-4 text-chart-3" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">
                      {lead.converted_to_concierge ? "Converted to Concierge" : "Not converted"}
                    </span>
                  </div>
                  {lead.converted_at && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(lead.converted_at), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Actions Tab */}
            <TabsContent value="actions" className="p-4 sm:p-6 space-y-5 sm:space-y-6 mt-0">
              {/* Route to Provider */}
              <div className="p-4 rounded-xl border bg-card space-y-3">
                <div className="flex items-center gap-2">
                  <ArrowRightCircle className="h-5 w-5 text-info" />
                  <h3 className="font-semibold">Route to Provider</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Manually route this lead to a specific provider. This creates an inquiry in the provider's dashboard.
                </p>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setRouteDialogOpen(true)}
                >
                  <Building2 className="h-4 w-4" />
                  Select Provider & Route
                </Button>
              </div>

              {/* Convert to Concierge */}
              <div className="p-4 rounded-xl border bg-card space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-chart-3" />
                  <h3 className="font-semibold">Convert to Concierge</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Mark this lead as converted to concierge placement. Use when they've signed up for concierge service.
                </p>
                {lead.converted_to_concierge ? (
                  <Badge className="bg-chart-3/10 text-chart-3 border-chart-3/30 gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Already Converted
                    {lead.converted_at && ` • ${format(new Date(lead.converted_at), "MMM d, yyyy")}`}
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => convertToConcierge.mutate()}
                    disabled={convertToConcierge.isPending}
                  >
                    {convertToConcierge.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Sparkles className="h-4 w-4" />
                    Mark as Converted
                  </Button>
                )}
              </div>

              {/* Send Follow-up Email */}
              <div className="p-4 rounded-xl border bg-card space-y-3">
                <div className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-warning" />
                  <h3 className="font-semibold">Follow-up Email</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Send a follow-up email to this lead encouraging them to engage with matched facilities.
                </p>
                {lead.followup_email_sent ? (
                  <Badge className="bg-success/10 text-success border-success/30 gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Already Sent
                    {lead.followup_email_sent_at && ` • ${format(new Date(lead.followup_email_sent_at), "MMM d, yyyy h:mm a")}`}
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => sendFollowup.mutate()}
                    disabled={sendFollowup.isPending}
                  >
                    {sendFollowup.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Mail className="h-4 w-4" />
                    Send Follow-up
                  </Button>
                )}
              </div>

              <Separator />

              {/* Delete Lead - Danger Zone */}
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 space-y-3">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-destructive" />
                  <h3 className="font-semibold text-destructive">Danger Zone</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Permanently delete this marketing lead. This action cannot be undone.
                </p>
                <Button
                  variant="destructive"
                  className="gap-2"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Lead
                </Button>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete marketing lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {lead.first_name} {lead.last_name}'s marketing lead record. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteLead.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLead.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Route to Provider Dialog */}
      <AlertDialog open={routeDialogOpen} onOpenChange={setRouteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Route Lead to Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Search for a provider and route this lead to them. This creates an inquiry in their dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search facilities by name..."
                value={facilitySearch}
                onChange={(e) => setFacilitySearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {searchedFacilities.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-1">
                {searchedFacilities.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFacilityId(f.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2.5 rounded-md text-left transition-colors text-sm",
                      selectedFacilityId === f.id
                        ? "bg-primary/10 ring-1 ring-primary"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-medium">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{f.city}, {f.state}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {facilitySearch.length >= 2 && searchedFacilities.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No approved facilities found</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setFacilitySearch(""); setSelectedFacilityId(""); }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => routeToProvider.mutate(selectedFacilityId)}
              disabled={!selectedFacilityId || routeToProvider.isPending}
            >
              {routeToProvider.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Route Lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
