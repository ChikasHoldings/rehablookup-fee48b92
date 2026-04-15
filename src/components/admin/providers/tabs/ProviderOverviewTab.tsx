import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  CheckCircle, Ban, Star, Shield, RefreshCw, ExternalLink,
  MapPin, Phone, Globe, Mail, Image, Flag, ZoomIn, AlertTriangle,
  MessageSquare, Wallet, Users, Handshake, LayoutList,
  BadgeCheck, Crown, Eye, MousePointerClick, Monitor,
  Calendar, Clock, Building2, DollarSign, UserCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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

  const facilityIds = providerFacilities?.map((f) => f.id) || [provider.id];

  // Fetch engagement metrics across ALL facilities
  const { data: engagementMetrics } = useQuery({
    queryKey: ["admin-provider-engagement", provider.user_id, facilityIds],
    queryFn: async () => {
      const counts = { impressions: 0, profile_views: 0, click_to_call: 0, website_clicks: 0 };
      const [impressions, views, calls, clicks] = await Promise.all([
        supabase.from("provider_events").select("id", { count: "exact", head: true }).in("facility_id", facilityIds).eq("event_type", "listing_impression"),
        supabase.from("provider_events").select("id", { count: "exact", head: true }).in("facility_id", facilityIds).eq("event_type", "profile_view"),
        supabase.from("provider_events").select("id", { count: "exact", head: true }).in("facility_id", facilityIds).eq("event_type", "click_to_call"),
        supabase.from("provider_events").select("id", { count: "exact", head: true }).in("facility_id", facilityIds).eq("event_type", "website_click"),
      ]);
      counts.impressions = impressions.count || 0;
      counts.profile_views = views.count || 0;
      counts.click_to_call = calls.count || 0;
      counts.website_clicks = clicks.count || 0;
      return counts;
    },
  });

  // Fetch review count
  const { data: reviewCount } = useQuery({
    queryKey: ["admin-provider-review-count", provider.user_id, facilityIds],
    queryFn: async () => {
      const { count } = await supabase
        .from("facility_reviews")
        .select("id", { count: "exact", head: true })
        .in("facility_id", facilityIds);
      return count || 0;
    },
  });

  // Fetch unlock count
  const { data: unlockCount } = useQuery({
    queryKey: ["admin-provider-unlock-count", provider.user_id, facilityIds],
    queryFn: async () => {
      const { count } = await supabase
        .from("lead_unlocks")
        .select("id", { count: "exact", head: true })
        .in("facility_id", facilityIds);
      return count || 0;
    },
  });

  // Fetch total amount spent (all debit transactions)
  const { data: totalSpent } = useQuery({
    queryKey: ["admin-provider-total-spent", provider.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("credit_transactions")
        .select("amount_cents, transaction_type")
        .eq("provider_id", provider.user_id);
      let spent = 0;
      data?.forEach((tx) => {
        if (["unlock", "placement_fee"].includes(tx.transaction_type)) {
          spent += tx.amount_cents;
        }
      });
      return spent;
    },
  });

  // Fetch total purchased (all credit transactions)
  const { data: totalPurchased } = useQuery({
    queryKey: ["admin-provider-total-purchased", provider.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("credit_transactions")
        .select("amount_cents, transaction_type")
        .eq("provider_id", provider.user_id);
      let purchased = 0;
      data?.forEach((tx) => {
        if (["purchase", "admin_credit"].includes(tx.transaction_type)) {
          purchased += tx.amount_cents;
        }
      });
      return purchased;
    },
  });

  // Fetch staff across ALL facilities
  const { data: staffMembers, isLoading: loadingStaff } = useQuery({
    queryKey: ["admin-provider-staff", facilityIds],
    queryFn: async () => {
      const { data } = await supabase
        .from("facility_staff")
        .select("id, name, job_title, photo_url, email, phone, facility_id, is_visible")
        .in("facility_id", facilityIds)
        .order("display_order", { ascending: true });
      return data || [];
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

      {/* Account Summary */}
      <div>
        <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">Account Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />Organization</p>
            <p className="font-medium text-sm truncate">{provider.name}</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />Account Owner</p>
            <p className="font-medium text-sm truncate">
              {providerProfile?.first_name && providerProfile?.last_name
                ? `${providerProfile.first_name} ${providerProfile.last_name}`
                : "—"}
            </p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Crown className="h-3 w-3" />Membership</p>
            <p className="font-medium text-sm">
              {proSubscription ? (
                <span className="text-amber-600">Pro — ${proSubscription.price_cents ? (proSubscription.price_cents / 100).toFixed(0) : "—"}/mo</span>
              ) : (
                <span className="text-muted-foreground">Free Tier</span>
              )}
            </p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Signup Date</p>
            <p className="font-medium text-sm">{format(new Date(provider.created_at), "PPP")}</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Last Updated</p>
            <p className="font-medium text-sm">{formatDistanceToNow(new Date(provider.updated_at), { addSuffix: true })}</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><LayoutList className="h-3 w-3" />Facility Type</p>
            <p className="font-medium text-sm truncate">{provider.facility_type}</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* KPI Cards - Row 1: Financial + Core */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KPICard icon={Wallet} label="Credit Balance" value={`$${((creditBalance || 0) / 100).toFixed(2)}`} color="text-emerald-500" />
        <KPICard icon={DollarSign} label="Total Spent" value={`$${((totalSpent || 0) / 100).toFixed(2)}`} color="text-destructive" />
        <KPICard icon={DollarSign} label="Total Purchased" value={`$${((totalPurchased || 0) / 100).toFixed(2)}`} color="text-blue-500" />
        <KPICard icon={Users} label="Total Leads" value={String(providerLeads?.length || 0)} color="text-blue-500" />
        <KPICard icon={Handshake} label="Placements" value={String(placementStats?.placements || 0)} color="text-purple-500" />
      </div>

      {/* KPI Cards - Row 2: Engagement */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <KPICard icon={Eye} label="Impressions" value={String(engagementMetrics?.impressions || 0)} color="text-muted-foreground" small />
        <KPICard icon={Monitor} label="Profile Views" value={String(engagementMetrics?.profile_views || 0)} color="text-blue-400" small />
        <KPICard icon={Phone} label="Click-to-Call" value={String(engagementMetrics?.click_to_call || 0)} color="text-emerald-400" small />
        <KPICard icon={MousePointerClick} label="Web Clicks" value={String(engagementMetrics?.website_clicks || 0)} color="text-amber-400" small />
        <KPICard icon={Star} label="Reviews" value={String(reviewCount || 0)} color="text-orange-400" small />
        <KPICard icon={BadgeCheck} label="Unlocked" value={String(unlockCount || 0)} color="text-chart-3" small />
      </div>

      <Separator />

      {/* Contact Info */}
      <div>
        <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">Contact Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoRow icon={Mail} text={providerProfile?.email || provider.email || "No email"} />
          <InfoRow icon={Phone} text={provider.phone || "No phone"} />
          {provider.website && (
            <InfoRow icon={Globe} text={provider.website} href={provider.website} />
          )}
          <InfoRow icon={MapPin} text={`${provider.address}, ${provider.city}, ${provider.state} ${provider.zip_code}`} />
        </div>
      </div>

      <Separator />

      {/* Staff Section */}
      <div>
        <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <UserCircle className="h-4 w-4" />
          Listed Staff ({staffMembers?.length || 0})
        </h3>
        {loadingStaff ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        ) : staffMembers && staffMembers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {staffMembers.map((staff) => {
              const facilityName = providerFacilities.length > 1
                ? providerFacilities.find((f) => f.id === staff.facility_id)?.name
                : undefined;
              return (
                <div key={staff.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
                  <img
                    src={staff.photo_url}
                    alt={staff.name}
                    className="w-10 h-10 rounded-full object-cover border flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = ""; (e.target as HTMLImageElement).className = "hidden"; }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{staff.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{staff.job_title}</p>
                    {facilityName && <p className="text-[10px] text-muted-foreground/70 truncate">{facilityName}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    {!staff.is_visible && (
                      <Badge variant="outline" className="text-[10px] px-1 h-4">Hidden</Badge>
                    )}
                    {staff.email && (
                      <a href={`mailto:${staff.email}`} className="text-[10px] text-primary hover:underline truncate max-w-[100px]">{staff.email}</a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 bg-muted/30 rounded-lg">
            <UserCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">No staff members listed</p>
          </div>
        )}
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

        {/* Gallery - show ALL facility galleries */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            Gallery ({providerFacilities.reduce((sum, f) => sum + (f.gallery_urls?.length || 0), 0)})
          </p>
          {(() => {
            const allGalleryImages = providerFacilities.flatMap((f) =>
              (f.gallery_urls || []).map((url) => ({ url, facilityName: f.name, facilityId: f.id }))
            );
            if (allGalleryImages.length > 0) {
              return (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {allGalleryImages.map((img, index) => (
                    <div key={index} className="relative group" title={providerFacilities.length > 1 ? img.facilityName : undefined}>
                      <img
                        src={img.url}
                        alt={`Gallery ${index + 1}`}
                        className={`w-full aspect-square object-cover rounded-lg border-2 cursor-pointer transition-all hover:opacity-90 ${
                          isImageFlagged(img.url) ? "border-destructive ring-2 ring-destructive/20" : "border-border"
                        }`}
                        onClick={() => onPreviewImage(img.url)}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                        <Button size="icon" variant="secondary" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onPreviewImage(img.url); }}>
                          <ZoomIn className="h-3 w-3" />
                        </Button>
                        {!isImageFlagged(img.url) && (
                          <Button size="icon" variant="destructive" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onFlagImage(img.url, "gallery"); }}>
                            <Flag className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            }
            return (
              <div className="text-center py-4 bg-muted/30 rounded-lg">
                <Image className="h-8 w-8 text-muted-foreground/30 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">No gallery images</p>
              </div>
            );
          })()}
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
          maxLength={2000}
          className="resize-none"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">{adminNotes.length}/2000</span>
          <Button onClick={() => onSaveNotes(adminNotes)} size="sm" disabled={adminNotes === (provider.admin_notes || "")}>
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
