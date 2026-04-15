import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Eye, LayoutList, Inbox, History, FileCheck2, Wallet, Send,
  Handshake, Star, TrendingUp, BadgeCheck, Crown, MapPin,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { type Facility, type ProSubscription, getStatusBadge } from "./ProviderListItem";

import { ProviderOverviewTab } from "./tabs/ProviderOverviewTab";
import { ProviderFacilitiesTab } from "./tabs/ProviderFacilitiesTab";
import { ProviderLeadsTab } from "./tabs/ProviderLeadsTab";
import { ProviderPlacementsTab } from "./tabs/ProviderPlacementsTab";
import { ProviderReviewsTab } from "./tabs/ProviderReviewsTab";
import { ProviderAnalyticsTab } from "./tabs/ProviderAnalyticsTab";
import { ProviderBillingTab } from "./tabs/ProviderBillingTab";
import { ProviderActivityTab } from "./tabs/ProviderActivityTab";
import { ProviderCredentialsTab } from "./tabs/ProviderCredentialsTab";
import { ProviderContactTab } from "./tabs/ProviderContactTab";

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
  const [detailTab, setDetailTab] = useState("overview");

  useEffect(() => {
    if (provider) setDetailTab("overview");
  }, [provider]);

  // Core data queries
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

  const { data: providerFacilities } = useQuery({
    queryKey: ["admin-provider-facilities", provider?.user_id],
    queryFn: async () => {
      if (!provider?.user_id) return [];
      const { data } = await supabase
        .from("facilities")
        .select("id, name, slug, city, state, facility_type, status, verified, featured, suspended, created_at, updated_at, logo_url, phone, email, concierge_network_opted_in, address, zip_code, bed_count, gender_served, description, website, gallery_urls, admin_notes, user_id, concierge_terms_accepted_at")
        .eq("user_id", provider.user_id)
        .order("created_at", { ascending: false });
      return (data || []) as Facility[];
    },
    enabled: !!provider?.user_id && open,
  });

  const { data: creditBalance } = useQuery({
    queryKey: ["admin-provider-credits", provider?.user_id],
    queryFn: async () => {
      if (!provider?.user_id) return 0;
      const { data } = await supabase
        .from("credit_transactions")
        .select("amount_cents, transaction_type")
        .eq("provider_id", provider.user_id);
      let balance = 0;
      data?.forEach((tx) => {
        if (["purchase", "refund", "admin_credit"].includes(tx.transaction_type)) balance += tx.amount_cents;
        else if (["unlock", "placement_fee"].includes(tx.transaction_type)) balance -= tx.amount_cents;
      });
      return balance;
    },
    enabled: !!provider?.user_id && open,
  });

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

  const { data: providerLeads } = useQuery({
    queryKey: ["admin-provider-leads", provider?.id],
    queryFn: async () => {
      if (!provider?.id) return [];
      const { data } = await supabase
        .from("leads")
        .select("id, facility_id, name, email, phone, status, source, created_at, urgency")
        .eq("facility_id", provider.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!provider?.id && open,
  });

  const { data: placementStats } = useQuery({
    queryKey: ["admin-provider-placement-stats", provider?.id],
    queryFn: async () => {
      if (!provider?.id) return { introductions: 0, placements: 0 };
      const [introResult, placementResult] = await Promise.all([
        supabase.from("concierge_introductions").select("id", { count: "exact", head: true }).eq("facility_id", provider.id),
        supabase.from("concierge_engagements").select("id", { count: "exact", head: true }).eq("facility_id", provider.id).eq("status", "placed"),
      ]);
      return { introductions: introResult.count || 0, placements: placementResult.count || 0 };
    },
    enabled: !!provider?.id && open,
  });

  const { data: flaggedImages } = useQuery({
    queryKey: ["admin-flagged-images", provider?.id],
    queryFn: async () => {
      if (!provider?.id) return [];
      const { data } = await supabase
        .from("flagged_images")
        .select("id, facility_id, image_type, image_url, reason, flagged_at, resolved")
        .eq("facility_id", provider.id)
        .eq("resolved", false);
      return data || [];
    },
    enabled: !!provider?.id && open,
  });

  if (!provider) return null;

  const tabs = [
    { value: "overview", label: "Overview", icon: Eye },
    { value: "facilities", label: "Facilities", icon: LayoutList, badge: providerFacilities?.length },
    { value: "leads", label: "Leads", icon: Inbox, badge: providerLeads?.length },
    { value: "placements", label: "Placements", icon: Handshake },
    { value: "reviews", label: "Reviews", icon: Star },
    { value: "analytics", label: "Analytics", icon: TrendingUp },
    { value: "credentials", label: "Credentials", icon: FileCheck2 },
    { value: "billing", label: "Billing", icon: Wallet },
    { value: "activity", label: "Activity", icon: History },
    { value: "contact", label: "Contact", icon: Send },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[92vh] p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 flex-shrink-0 border-b">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14 border-2 border-background shadow-lg flex-shrink-0">
              <AvatarImage src={provider.logo_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                {provider.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-lg">{provider.name}</DialogTitle>
                {provider.verified && <BadgeCheck className="h-4 w-4 text-blue-500" />}
                {provider.featured && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
              </div>
              <DialogDescription className="text-muted-foreground flex items-center gap-1 mt-0.5 text-sm">
                <MapPin className="h-3.5 w-3.5" />
                {provider.city}, {provider.state} • {provider.facility_type}
              </DialogDescription>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {getStatusBadge(provider)}
                {selectedProviderPro && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white gap-1 h-5 text-xs">
                    <Crown className="h-3 w-3" />Pro
                  </Badge>
                )}
                {provider.concierge_network_opted_in && (
                  <Badge variant="outline" className="text-chart-3 border-chart-3/30 gap-1 h-5 text-xs">
                    <Handshake className="h-3 w-3" />Placement
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={detailTab} onValueChange={setDetailTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-5 border-b flex-shrink-0 overflow-x-auto">
            <TabsList className="h-10 w-max justify-start bg-transparent border-none p-0 gap-1">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-2.5 pb-2.5 text-xs gap-1.5 whitespace-nowrap"
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 text-[10px] px-1">{tab.badge}</Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="overview" className="m-0 data-[state=inactive]:hidden">
              <ProviderOverviewTab
                provider={provider}
                proSubscription={selectedProviderPro}
                providerProfile={providerProfile}
                creditBalance={creditBalance || 0}
                providerFacilities={providerFacilities || []}
                providerLeads={providerLeads || []}
                placementStats={placementStats || { introductions: 0, placements: 0 }}
                flaggedImages={flaggedImages || []}
                onStatusChange={onStatusChange}
                onToggleVerified={onToggleVerified}
                onToggleFeatured={onToggleFeatured}
                onSuspend={onSuspend}
                onReactivate={onReactivate}
                onSaveNotes={onSaveNotes}
                onFlagImage={onFlagImage}
                onPreviewImage={onPreviewImage}
                onCloseModal={() => onOpenChange(false)}
              />
            </TabsContent>

            <TabsContent value="facilities" className="m-0 data-[state=inactive]:hidden">
              <ProviderFacilitiesTab
                provider={provider}
                providerFacilities={providerFacilities || []}
                proSubscriptions={proSubscriptions}
              />
            </TabsContent>

            <TabsContent value="leads" className="m-0 data-[state=inactive]:hidden">
              <ProviderLeadsTab
                provider={provider}
                providerFacilities={providerFacilities || []}
              />
            </TabsContent>

            <TabsContent value="placements" className="m-0 data-[state=inactive]:hidden">
              <ProviderPlacementsTab
                provider={provider}
                providerFacilities={providerFacilities || []}
              />
            </TabsContent>

            <TabsContent value="reviews" className="m-0 data-[state=inactive]:hidden">
              <ProviderReviewsTab
                provider={provider}
                providerFacilities={providerFacilities || []}
              />
            </TabsContent>

            <TabsContent value="analytics" className="m-0 data-[state=inactive]:hidden">
              <ProviderAnalyticsTab
                provider={provider}
                providerFacilities={providerFacilities || []}
              />
            </TabsContent>

            <TabsContent value="credentials" className="m-0 data-[state=inactive]:hidden">
              <ProviderCredentialsTab
                provider={provider}
                providerFacilities={providerFacilities || []}
              />
            </TabsContent>

            <TabsContent value="billing" className="m-0 data-[state=inactive]:hidden">
              <ProviderBillingTab
                provider={provider}
                proSubscription={selectedProviderPro}
                creditBalance={creditBalance || 0}
                placementStats={placementStats || { introductions: 0, placements: 0 }}
              />
            </TabsContent>

            <TabsContent value="activity" className="m-0 h-full data-[state=inactive]:hidden">
              <ProviderActivityTab facilityId={provider.id} userId={provider.user_id} />
            </TabsContent>

            <TabsContent value="contact" className="m-0 data-[state=inactive]:hidden">
              <ProviderContactTab provider={provider} providerProfile={providerProfile} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
