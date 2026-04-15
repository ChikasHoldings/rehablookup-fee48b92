import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Crown, ExternalLink, Handshake, LayoutList, Users, Eye, Phone, MousePointerClick, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { type Facility, type ProSubscription, getStatusBadge } from "../ProviderListItem";

interface ProviderFacilitiesTabProps {
  provider: Facility;
  providerFacilities: Facility[];
  proSubscriptions: Record<string, ProSubscription> | undefined;
}

export function ProviderFacilitiesTab({ provider, providerFacilities, proSubscriptions }: ProviderFacilitiesTabProps) {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">All Facilities ({providerFacilities?.length || 0})</h3>
        <p className="text-sm text-muted-foreground">Owned by this provider account</p>
      </div>

      {providerFacilities && providerFacilities.length > 0 ? (
        <div className="space-y-3">
          {providerFacilities.map((facility) => (
            <FacilityCard
              key={facility.id}
              facility={facility}
              isCurrent={facility.id === provider.id}
              isPro={!!proSubscriptions?.[facility.id]}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <LayoutList className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No facilities found</p>
        </div>
      )}
    </div>
  );
}

function FacilityCard({ facility, isCurrent, isPro }: { facility: Facility; isCurrent: boolean; isPro: boolean }) {
  // Use count queries instead of fetching all event rows
  const { data: metrics } = useQuery({
    queryKey: ["admin-facility-metrics", facility.id],
    queryFn: async () => {
      const [impressions, views, calls, webClicks, leadsRes, reviewsRes] = await Promise.all([
        supabase.from("provider_events").select("id", { count: "exact", head: true }).eq("facility_id", facility.id).eq("event_type", "listing_impression"),
        supabase.from("provider_events").select("id", { count: "exact", head: true }).eq("facility_id", facility.id).eq("event_type", "profile_view"),
        supabase.from("provider_events").select("id", { count: "exact", head: true }).eq("facility_id", facility.id).eq("event_type", "click_to_call"),
        supabase.from("provider_events").select("id", { count: "exact", head: true }).eq("facility_id", facility.id).eq("event_type", "website_click"),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("facility_id", facility.id),
        supabase.from("facility_reviews").select("id", { count: "exact", head: true }).eq("facility_id", facility.id),
      ]);

      return {
        impressions: impressions.count || 0,
        views: views.count || 0,
        calls: calls.count || 0,
        webClicks: webClicks.count || 0,
        leads: leadsRes.count || 0,
        reviews: reviewsRes.count || 0,
      };
    },
  });

  return (
    <Card className={cn("transition-colors", isCurrent && "ring-2 ring-primary")}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={facility.logo_url || undefined} />
              <AvatarFallback>{facility.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{facility.name}</p>
                {facility.verified && <BadgeCheck className="h-4 w-4 text-blue-500" />}
                {isPro && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs h-5 px-1.5">
                    <Crown className="h-3 w-3 mr-0.5" />Pro
                  </Badge>
                )}
                {facility.concierge_network_opted_in && (
                  <Badge variant="outline" className="text-chart-3 border-chart-3/30 text-xs h-5 px-1.5">
                    <Handshake className="h-3 w-3 mr-0.5" />Placement
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{facility.city}, {facility.state} • {facility.facility_type}</p>
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

        {/* Facility-level metrics */}
        {metrics && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2 border-t">
            <MetricChip icon={Eye} label="Impressions" value={metrics.impressions} />
            <MetricChip icon={Users} label="Leads" value={metrics.leads} />
            <MetricChip icon={Phone} label="Calls" value={metrics.calls} />
            <MetricChip icon={MousePointerClick} label="Web" value={metrics.webClicks} />
            <MetricChip icon={Eye} label="Profile" value={metrics.views} />
            <MetricChip icon={Star} label="Reviews" value={metrics.reviews} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricChip({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="h-3 w-3" />
      <span className="font-medium text-foreground">{value}</span>
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}
