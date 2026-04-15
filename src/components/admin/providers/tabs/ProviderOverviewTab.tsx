import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CheckCircle, Ban, Star, Shield, RefreshCw, ExternalLink,
  MapPin, Phone, Globe, Mail, Image, Flag, ZoomIn, AlertTriangle,
  MessageSquare, Wallet, Users, Handshake, LayoutList,
  BadgeCheck, Crown, Eye, MousePointerClick, Monitor,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import type { Facility, ProSubscription } from "../ProviderListItem";

interface ProviderOverviewTabProps {
  provider: Facility;
  proSubscription: any;
  providerProfile: any;
  creditBalance: number;
  providerFacilities: Facility[];
  providerLeads: any[];
  placementStats: { introductions: number; placements: number };
  flaggedImages: any[];
  onStatusChange: (id: string, status: string) => void;
  onToggleVerified: (id: string, currentValue: boolean | null) => void;
  onToggleFeatured: (id: string, currentValue: boolean) => void;
  onSuspend: (provider: Facility) => void;
  onReactivate: (provider: Facility) => void;
  onSaveNotes: (notes: string) => void;
  onFlagImage: (imageUrl: string, type: "logo" | "gallery") => void;
  onPreviewImage: (imageUrl: string) => void;
  onCloseModal: () => void;
}

export function ProviderOverviewTab({
  provider,
  proSubscription,
  providerProfile,
  creditBalance,
  providerFacilities,
  providerLeads,
  placementStats,
  flaggedImages,
  onStatusChange,
  onToggleVerified,
  onToggleFeatured,
  onSuspend,
  onReactivate,
  onSaveNotes,
  onFlagImage,
  onPreviewImage,
  onCloseModal,
}: ProviderOverviewTabProps) {
  const [adminNotes, setAdminNotes] = useState(provider.admin_notes || "");

  // Fetch engagement metrics from provider_events
  const { data: engagementMetrics } = useQuery({
    queryKey: ["admin-provider-engagement", provider.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("provider_events")
        .select("event_type")
        .eq("facility_id", provider.id);

      const counts = { impressions: 0, profile_views: 0, click_to_call: 0, website_clicks: 0 };
      data?.forEach((e) => {
        if (e.event_type === "listing_impression") counts.impressions++;
        else if (e.event_type === "profile_view") counts.profile_views++;
        else if (e.event_type === "click_to_call") counts.click_to_call++;
        else if (e.event_type === "website_click") counts.website_clicks++;
      });
      return counts;
    },
  });

  // Fetch review count
  const { data: reviewCount } = useQuery({
    queryKey: ["admin-provider-review-count", provider.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("facility_reviews")
        .select("id", { count: "exact", head: true })
        .eq("facility_id", provider.id);
      return count || 0;
    },
  });

  const isImageFlagged = (url: string) => flaggedImages?.some((f) => f.image_url === url) || false;

  return (
    <div className="p-6 space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {provider.status === "pending" && (
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => {
            onStatusChange(provider.id, "approved");
            onCloseModal();
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard icon={Wallet} label="Credit Balance" value={`$${((creditBalance || 0) / 100).toFixed(2)}`} color="text-emerald-500" />
        <KPICard icon={Users} label="Total Leads" value={String(providerLeads?.length || 0)} color="text-blue-500" />
        <KPICard icon={Handshake} label="Placements" value={String(placementStats?.placements || 0)} color="text-purple-500" />
        <KPICard icon={LayoutList} label="Facilities" value={String(providerFacilities?.length || 0)} color="text-primary" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KPICard icon={Eye} label="Impressions" value={String(engagementMetrics?.impressions || 0)} color="text-muted-foreground" small />
        <KPICard icon={Monitor} label="Profile Views" value={String(engagementMetrics?.profile_views || 0)} color="text-blue-400" small />
        <KPICard icon={Phone} label="Click-to-Call" value={String(engagementMetrics?.click_to_call || 0)} color="text-emerald-400" small />
        <KPICard icon={MousePointerClick} label="Website Clicks" value={String(engagementMetrics?.website_clicks || 0)} color="text-amber-400" small />
        <KPICard icon={Star} label="Reviews" value={String(reviewCount || 0)} color="text-orange-400" small />
      </div>

      <Separator />

      {/* Contact Info */}
      <div>
        <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">Contact Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoRow icon={Mail} text={providerProfile?.email || provider.email || "No email"} />
          <InfoRow icon={Phone} text={provider.phone} />
          {provider.website && (
            <InfoRow icon={Globe} text={provider.website} href={provider.website} />
          )}
          <InfoRow icon={MapPin} text={`${provider.address}, ${provider.city}, ${provider.state} ${provider.zip_code}`} />
        </div>
      </div>

      <Separator />

      {/* Images Section */}
      <div>
        <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Image className="h-4 w-4" />
          Images
        </h3>

        {/* Logo */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">Logo</p>
          {provider.logo_url ? (
            <div className="relative group w-20 h-20">
              <img
                src={provider.logo_url}
                alt="Logo"
                className={`w-full h-full object-cover rounded-lg border-2 cursor-pointer transition-all hover:opacity-90 ${
                  isImageFlagged(provider.logo_url) ? "border-destructive ring-2 ring-destructive/20" : "border-border"
                }`}
                onClick={() => onPreviewImage(provider.logo_url!)}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                <Button size="icon" variant="secondary" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onPreviewImage(provider.logo_url!); }}>
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                {!isImageFlagged(provider.logo_url) && (
                  <Button size="icon" variant="destructive" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onFlagImage(provider.logo_url!, "logo"); }}>
                    <Flag className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
              <Image className="h-6 w-6 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Gallery */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Gallery ({provider.gallery_urls?.length || 0})</p>
          {provider.gallery_urls && provider.gallery_urls.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {provider.gallery_urls.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Gallery ${index + 1}`}
                    className={`w-full aspect-square object-cover rounded-lg border-2 cursor-pointer transition-all hover:opacity-90 ${
                      isImageFlagged(url) ? "border-destructive ring-2 ring-destructive/20" : "border-border"
                    }`}
                    onClick={() => onPreviewImage(url)}
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                    <Button size="icon" variant="secondary" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onPreviewImage(url); }}>
                      <ZoomIn className="h-3 w-3" />
                    </Button>
                    {!isImageFlagged(url) && (
                      <Button size="icon" variant="destructive" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onFlagImage(url, "gallery"); }}>
                        <Flag className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 bg-muted/30 rounded-lg">
              <Image className="h-8 w-8 text-muted-foreground/30 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">No gallery images</p>
            </div>
          )}
        </div>

        {/* Flagged images alert */}
        {flaggedImages && flaggedImages.length > 0 && (
          <div className="mt-3 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
            <h4 className="font-medium text-destructive flex items-center gap-2 text-sm mb-2">
              <AlertTriangle className="h-4 w-4" />
              {flaggedImages.length} Flagged Image(s)
            </h4>
            <div className="space-y-1.5">
              {flaggedImages.map((flag) => (
                <div key={flag.id} className="flex items-center justify-between p-2 bg-background rounded border text-xs">
                  <div className="flex items-center gap-2">
                    <img src={flag.image_url} alt="Flagged" className="w-8 h-8 object-cover rounded" />
                    <Badge variant="outline" className="text-[10px]">{flag.image_type}</Badge>
                    {flag.reason && <span className="text-muted-foreground">{flag.reason}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Timestamps */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground">Created</p>
          <p className="font-medium text-sm">{format(new Date(provider.created_at), "PPP")}</p>
        </div>
        <div className="p-3 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground">Last Updated</p>
          <p className="font-medium text-sm">{format(new Date(provider.updated_at), "PPP")}</p>
        </div>
      </div>

      <Separator />

      {/* Admin Notes */}
      <div>
        <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Admin Notes
        </h3>
        <Textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          placeholder="Add internal notes about this provider..."
          rows={3}
          className="resize-none"
        />
        <div className="flex justify-end mt-2">
          <Button onClick={() => onSaveNotes(adminNotes)} size="sm">
            Save Notes
          </Button>
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color, small }: { icon: any; label: string; value: string; color: string; small?: boolean }) {
  return (
    <Card>
      <CardContent className={`${small ? "p-2.5" : "p-3"} text-center`}>
        <Icon className={`${small ? "h-3.5 w-3.5" : "h-4 w-4"} mx-auto mb-1 ${color}`} />
        <p className={`font-bold ${small ? "text-lg" : "text-xl"}`}>{value}</p>
        <p className={`${small ? "text-[10px]" : "text-xs"} text-muted-foreground`}>{label}</p>
      </CardContent>
    </Card>
  );
}

function InfoRow({ icon: Icon, text, href }: { icon: any; text: string; href?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{text}</a>
      ) : (
        <span className="truncate">{text}</span>
      )}
    </div>
  );
}
