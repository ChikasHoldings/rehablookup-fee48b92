import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
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
  Heart,
  Building2,
  FileText,
  Activity,
  Send,
  Loader2,
  AlertCircle,
  TrendingUp,
  Target,
  Globe,
  Hash,
  Sparkles,
  UserCheck,
  Users,
  Briefcase,
  Brain,
  Stethoscope,
  CreditCard,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
}

export function MarketingLeadProfileModal({
  lead,
  open,
  onOpenChange,
  onUpdated,
}: MarketingLeadProfileModalProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const queryClient = useQueryClient();

  // Sync admin notes when lead changes
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
        hasAccount: false,
        hasConcierge: false,
        conciergeInquiries: [],
        hasReviews: false,
        reviews: [],
        hasFavorites: false,
        favoriteCount: 0,
        providerCommunications: [],
        leadInquiries: [],
      };

      // Check for seeker account by email
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
          .select("*")
          .eq("user_id", matchingSeeker.user_id)
          .single();
        seekerProfile = profile;
      }

      // Check concierge inquiries by email or phone
      const { data: conciergeInquiries } = await supabase
        .from("concierge_inquiries")
        .select("id, status, created_at, primary_concern, level_of_care, payment_status, user_name")
        .or(`user_email.ilike.${lead.email},user_phone.eq.${lead.phone}`)
        .order("created_at", { ascending: false });

      // Check for reviews if user has an account
      let reviews: any[] = [];
      let favoriteCount = 0;
      if (userId) {
        const { data: userReviews } = await supabase
          .from("facility_reviews")
          .select("id, rating, review_text, status, created_at, facility_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        reviews = userReviews || [];

        const { count } = await supabase
          .from("user_favorites")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);
        favoriteCount = count || 0;
      }

      // Check for provider communications (leads submitted to facilities)
      const { data: leadInquiries } = await supabase
        .from("leads")
        .select(`
          id, name, email, phone, status, created_at, facility_id,
          provider_response_status, provider_responded_at
        `)
        .or(`email.ilike.${lead.email},phone.eq.${lead.phone}`)
        .order("created_at", { ascending: false });

      // Get unique facility IDs for enrichment
      const facilityIds = [...new Set(leadInquiries?.map(l => l.facility_id).filter(Boolean) || [])];
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

  // Fetch requested facilities
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

  // Update status mutation
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
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  // Update admin notes mutation
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
    onError: () => {
      toast.error("Failed to save notes");
    },
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
      return <Badge className="bg-violet-100 text-violet-700 border-violet-200">Concierge</Badge>;
    }
    if ((lead.facilities_requested?.length || 0) > 0) {
      return <Badge className="bg-green-100 text-green-700 border-green-200">Engaged</Badge>;
    }
    if (lead.followup_email_sent) {
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Followed Up</Badge>;
    }
    return <Badge variant="secondary">New</Badge>;
  };

  const formatUrgency = (urgency: string | null) => {
    if (!urgency) return "Not specified";
    const map: Record<string, string> = {
      immediate: "Immediate (ASAP)",
      "within-week": "Within a Week",
      "within-month": "Within a Month",
      researching: "Just Researching",
    };
    return map[urgency] || urgency;
  };

  const getUrgencyColor = (urgency: string | null) => {
    const colors: Record<string, string> = {
      immediate: "text-red-600 bg-red-50 border-red-200",
      "within-week": "text-amber-600 bg-amber-50 border-amber-200",
      "within-month": "text-blue-600 bg-blue-50 border-blue-200",
      researching: "text-slate-600 bg-slate-50 border-slate-200",
    };
    return colors[urgency || ""] || "text-muted-foreground bg-muted border-border";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="p-6 pb-5 border-b bg-gradient-to-r from-muted/50 via-muted/30 to-transparent flex-shrink-0">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-semibold text-primary">
                {lead.first_name[0]}{lead.last_name[0]}
              </span>
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <DialogTitle className="text-xl font-semibold truncate">
                  {fullName}
                </DialogTitle>
                {getStatusBadge()}
                <Badge variant="outline" className="gap-1 text-xs">
                  <Target className="h-3 w-3" />
                  Marketing Lead
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
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
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
                    <UserCheck className="h-3 w-3" />
                    Account Created
                  </Badge>
                )}
                {journeyData?.hasConcierge && (
                  <Badge className="bg-violet-100 text-violet-700 border-violet-200 gap-1">
                    <Shield className="h-3 w-3" />
                    Concierge
                  </Badge>
                )}
                {(journeyData?.leadInquiries?.length || 0) > 0 && (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {journeyData?.leadInquiries?.length} Inquiries
                  </Badge>
                )}
                {journeyData?.hasReviews && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
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
          <div className="border-b px-6 bg-muted/20 flex-shrink-0">
            <TabsList className="h-11 w-full justify-start bg-transparent gap-1 p-0">
              <TabsTrigger
                value="overview"
                className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                <User className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="journey"
                className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                <Activity className="h-4 w-4" />
                Journey
              </TabsTrigger>
              <TabsTrigger
                value="clinical"
                className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                <Stethoscope className="h-4 w-4" />
                Clinical
              </TabsTrigger>
              <TabsTrigger
                value="tracking"
                className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                <TrendingUp className="h-4 w-4" />
                UTM
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 overflow-auto">
            {/* Overview Tab */}
            <TabsContent value="overview" className="p-6 space-y-6 mt-0">
              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-muted/30 border">
                <Button variant="outline" className="gap-2" asChild>
                  <a href={`tel:${lead.phone}`}>
                    <Phone className="h-4 w-4 text-green-600" />
                    Call
                  </a>
                </Button>
                <Button variant="outline" className="gap-2" asChild>
                  <a href={`mailto:${lead.email}`}>
                    <Mail className="h-4 w-4 text-blue-600" />
                    Email
                  </a>
                </Button>
                <div className="flex-1 sm:ml-auto">
                  <Select
                    value={lead.status || "new"}
                    onValueChange={(value) => updateStatus.mutate(value)}
                    disabled={updateStatus.isPending}
                  >
                    <SelectTrigger className="w-full sm:w-[160px]">
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
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-950/20 dark:to-green-950/10 border border-green-100 dark:border-green-900">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <Phone className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{lead.phone}</p>
                        <p className="text-xs text-muted-foreground">
                          {lead.preferred_contact === "call" ? "✓ Preferred" : "Phone"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => handleCopy(lead.phone, "phone")}
                    >
                      {copiedField === "phone" ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Email */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/20 dark:to-blue-950/10 border border-blue-100 dark:border-blue-900">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground truncate max-w-[180px]">{lead.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {lead.preferred_contact === "email" ? "✓ Preferred" : "Email"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => handleCopy(lead.email, "email")}
                    >
                      {copiedField === "email" ? (
                        <Check className="h-4 w-4 text-green-600" />
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
                    <span className="text-sm">
                      {lead.location_city_state || lead.location_zip}
                    </span>
                  </div>
                )}
              </div>

              {/* Key Details */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Key Details
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="text-xs text-muted-foreground mb-1">Urgency</p>
                    <Badge variant="outline" className={cn("text-xs", getUrgencyColor(lead.urgency))}>
                      {formatUrgency(lead.urgency)}
                    </Badge>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="text-xs text-muted-foreground mb-1">Level of Care</p>
                    <p className="font-medium text-sm">{lead.level_of_care || "Not specified"}</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="text-xs text-muted-foreground mb-1">Insurance</p>
                    <p className="font-medium text-sm">{lead.insurance_type || "Not specified"}</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="text-xs text-muted-foreground mb-1">Seeking For</p>
                    <p className="font-medium text-sm">{lead.who_seeking_help || "Not specified"}</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="text-xs text-muted-foreground mb-1">Age Range</p>
                    <p className="font-medium text-sm">{lead.age_range || "Not specified"}</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="text-xs text-muted-foreground mb-1">Gender</p>
                    <p className="font-medium text-sm">{lead.gender || "Not specified"}</p>
                  </div>
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
                  <div className="p-4 rounded-lg bg-muted/50 border">
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
                  className="min-h-[100px]"
                />
                <Button
                  size="sm"
                  onClick={() => updateNotes.mutate(adminNotes)}
                  disabled={updateNotes.isPending || adminNotes === lead.admin_notes}
                >
                  {updateNotes.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Save Notes
                </Button>
              </div>
            </TabsContent>

            {/* Journey Tab */}
            <TabsContent value="journey" className="p-6 space-y-6 mt-0">
              {journeyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Journey Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className={cn(
                      "p-4 rounded-xl border text-center",
                      journeyData?.hasAccount ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800" : "bg-muted/50"
                    )}>
                      <div className={cn(
                        "h-10 w-10 rounded-xl mx-auto mb-2 flex items-center justify-center",
                        journeyData?.hasAccount ? "bg-emerald-500/20" : "bg-muted"
                      )}>
                        {journeyData?.hasAccount ? (
                          <CheckCircle className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <p className="font-semibold text-sm">Account</p>
                      <p className="text-xs text-muted-foreground">
                        {journeyData?.hasAccount ? "Created" : "None"}
                      </p>
                    </div>

                    <div className={cn(
                      "p-4 rounded-xl border text-center",
                      (journeyData?.leadInquiries?.length || 0) > 0 ? "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800" : "bg-muted/50"
                    )}>
                      <div className={cn(
                        "h-10 w-10 rounded-xl mx-auto mb-2 flex items-center justify-center",
                        (journeyData?.leadInquiries?.length || 0) > 0 ? "bg-blue-500/20" : "bg-muted"
                      )}>
                        <MessageSquare className={cn(
                          "h-5 w-5",
                          (journeyData?.leadInquiries?.length || 0) > 0 ? "text-blue-600" : "text-muted-foreground"
                        )} />
                      </div>
                      <p className="font-semibold text-sm">Inquiries</p>
                      <p className="text-xs text-muted-foreground">
                        {journeyData?.leadInquiries?.length || 0} sent
                      </p>
                    </div>

                    <div className={cn(
                      "p-4 rounded-xl border text-center",
                      journeyData?.hasConcierge ? "bg-violet-50 border-violet-200 dark:bg-violet-950/20 dark:border-violet-800" : "bg-muted/50"
                    )}>
                      <div className={cn(
                        "h-10 w-10 rounded-xl mx-auto mb-2 flex items-center justify-center",
                        journeyData?.hasConcierge ? "bg-violet-500/20" : "bg-muted"
                      )}>
                        {journeyData?.hasConcierge ? (
                          <Shield className="h-5 w-5 text-violet-600" />
                        ) : (
                          <Shield className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <p className="font-semibold text-sm">Concierge</p>
                      <p className="text-xs text-muted-foreground">
                        {journeyData?.conciergeInquiries?.length || 0} requests
                      </p>
                    </div>

                    <div className={cn(
                      "p-4 rounded-xl border text-center",
                      journeyData?.hasReviews ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800" : "bg-muted/50"
                    )}>
                      <div className={cn(
                        "h-10 w-10 rounded-xl mx-auto mb-2 flex items-center justify-center",
                        journeyData?.hasReviews ? "bg-amber-500/20" : "bg-muted"
                      )}>
                        <Star className={cn(
                          "h-5 w-5",
                          journeyData?.hasReviews ? "text-amber-600" : "text-muted-foreground"
                        )} />
                      </div>
                      <p className="font-semibold text-sm">Reviews</p>
                      <p className="text-xs text-muted-foreground">
                        {journeyData?.reviews?.length || 0} written
                      </p>
                    </div>
                  </div>

                  {/* Inquiries to Providers */}
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
                              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <Building2 className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {inquiry.facility?.name || "Unknown Facility"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(inquiry.created_at), "MMM d, yyyy")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {inquiry.provider_response_status && (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                  {inquiry.provider_response_status}
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-xs">
                                {inquiry.status}
                              </Badge>
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
                              <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                                <Shield className="h-4 w-4 text-violet-600" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {inquiry.primary_concern || "Concierge Request"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(inquiry.created_at), "MMM d, yyyy")} • {inquiry.level_of_care || "N/A"}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className={cn(
                              "text-xs",
                              (inquiry.payment_status === "paid" || inquiry.payment_status === "succeeded") ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
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
                                      i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                                    )}
                                  />
                                ))}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {review.status}
                              </Badge>
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
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No journey activity found for this lead</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        They haven't created an account or engaged further yet
                      </p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Clinical Tab */}
            <TabsContent value="clinical" className="p-6 space-y-6 mt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <Stethoscope className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Level of Care</h4>
                  </div>
                  <p className="text-sm">{lead.level_of_care || "Not specified"}</p>
                </div>

                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Insurance</h4>
                  </div>
                  <p className="text-sm">{lead.insurance_type || "Not specified"}</p>
                  {lead.insurance_provider && (
                    <p className="text-xs text-muted-foreground mt-1">Provider: {lead.insurance_provider}</p>
                  )}
                </div>

                <div className="p-4 rounded-lg border bg-card">
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
                    <p className="text-sm text-muted-foreground">Not specified</p>
                  )}
                </div>

                <div className="p-4 rounded-lg border bg-card">
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

                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Seeking Help For</h4>
                  </div>
                  <p className="text-sm">{lead.who_seeking_help || "Not specified"}</p>
                </div>

                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Demographics</h4>
                  </div>
                  <div className="text-sm space-y-1">
                    <p>Age: {lead.age_range || "Not specified"}</p>
                    <p>Gender: {lead.gender || "Not specified"}</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Previous Treatment</h4>
                  </div>
                  <p className="text-sm">{lead.previous_treatment || "Not specified"}</p>
                </div>

                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Employment</h4>
                  </div>
                  <p className="text-sm">{lead.employment_status || "Not specified"}</p>
                </div>
              </div>
            </TabsContent>

            {/* UTM Tracking Tab */}
            <TabsContent value="tracking" className="p-6 space-y-6 mt-0">
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold">Campaign Attribution</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Source</p>
                    <p className="font-medium">{lead.utm_source || "direct"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Medium</p>
                    <p className="font-medium">{lead.utm_medium || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Campaign</p>
                    <p className="font-medium">{lead.utm_campaign || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Content</p>
                    <p className="font-medium">{lead.utm_content || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Term</p>
                    <p className="font-medium">{lead.utm_term || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Landing Page</p>
                    <p className="font-medium truncate">{lead.landing_page || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Follow-up Status */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <Send className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">Follow-up Status</h4>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {lead.followup_email_sent ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
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
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">Conversion</h4>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {lead.converted_to_concierge ? (
                      <CheckCircle className="h-4 w-4 text-violet-600" />
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
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
