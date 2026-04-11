import { 
  Building2, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Edit3,
  Eye,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ListingCardProps {
  facility: {
    id: string;
    name: string;
    slug: string | null;
    status: string;
    address?: string;
    city: string;
    state: string;
    zip_code?: string;
    facility_type?: string;
    logo_url: string | null;
    gallery_urls?: string[] | null;
    created_at: string;
  };
  onSelect: (facilityId: string) => void;
  onPreview?: (facility: { name: string; slug: string }) => void;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case "approved":
      return {
        label: "Live",
        description: "Visible to families",
        icon: CheckCircle,
        dotColor: "bg-emerald-500",
        badgeClass: "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800"
      };
    case "pending":
      return {
        label: "Pending Review",
        description: "Usually 24-48 hours",
        icon: Clock,
        dotColor: "bg-amber-500",
        badgeClass: "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800"
      };
    default:
      return {
        label: "Draft",
        description: "Not published yet",
        icon: AlertCircle,
        dotColor: "bg-muted-foreground",
        badgeClass: "bg-muted text-muted-foreground border-border"
      };
  }
};

export function ListingCard({ facility, onSelect, onPreview }: ListingCardProps) {
  const statusConfig = getStatusConfig(facility.status);
  const StatusIcon = statusConfig.icon;
  const createdDate = format(new Date(facility.created_at), "MMM d, yyyy");
  
  // Get the main image (first gallery image or logo as fallback)
  const mainImage = facility.gallery_urls?.[0] || facility.logo_url;
  
  // Build full address string - handle missing fields gracefully
  const addressParts = [
    facility.address,
    facility.city,
    facility.state && facility.zip_code ? `${facility.state} ${facility.zip_code}` : facility.state
  ].filter(Boolean);
  const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : `${facility.city}, ${facility.state}`;

  // Fetch views count from provider_events (profile_view + listing_impression)
  const { data: viewsData } = useQuery({
    queryKey: ['facility-views-count', facility.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('provider_events')
        .select('id', { count: 'exact', head: true })
        .eq('facility_id', facility.id)
        .in('event_type', ['profile_view', 'listing_impression']);
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch leads count
  const { data: leadsData } = useQuery({
    queryKey: ['facility-leads-count', facility.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('facility_id', facility.id);
      
      if (error) throw error;
      return count || 0;
    },
  });

  return (
    <Card className="group border-border/60 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Image Section */}
          <div className="relative w-full sm:w-40 lg:w-48 h-32 sm:h-auto sm:min-h-[140px] bg-muted/30 shrink-0 overflow-hidden">
            {mainImage ? (
              <img
                src={mainImage}
                alt={facility.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                <Building2 className="h-12 w-12 sm:h-16 sm:w-16 text-primary/30" />
              </div>
            )}
            {/* Gradient overlay for better badge visibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            {/* Status Badge */}
            <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
              <Badge variant="outline" className={cn("gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-medium backdrop-blur-md bg-background/90 shadow-sm", statusConfig.badgeClass)}>
                <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", statusConfig.dotColor)} />
                {statusConfig.label}
              </Badge>
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-h-[130px] sm:min-h-[140px]">
            <div className="space-y-1.5 sm:space-y-2">
              {/* Header: Name & Type Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground text-sm sm:text-base leading-tight mb-1 group-hover:text-primary transition-colors line-clamp-1">
                    {facility.name}
                  </h3>
                  <Badge variant="secondary" className="text-[10px] sm:text-xs font-normal">
                    {facility.facility_type || "Treatment Center"}
                  </Badge>
                </div>
              </div>
              
              {/* Full Address */}
              <div className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 mt-0.5 text-primary/60" />
                <span className="line-clamp-1">{fullAddress}</span>
              </div>

              {/* KPI Stats */}
              <div className="flex items-center gap-1.5 sm:gap-2 pt-0.5 sm:pt-1">
                <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-md sm:rounded-lg bg-muted/60 border border-border/40">
                  <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
                  <span className="text-xs sm:text-sm font-medium">{viewsData ?? 0}</span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">views</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-md sm:rounded-lg bg-muted/60 border border-border/40">
                  <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
                  <span className="text-xs sm:text-sm font-medium">{leadsData ?? 0}</span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">leads</span>
                </div>
              </div>
            </div>

            {/* Footer: Date & Actions */}
            <div className="flex items-center justify-between pt-2 sm:pt-3 mt-1.5 sm:mt-2 border-t border-border/50">
              <span className="text-[10px] sm:text-xs text-muted-foreground">
                Added {createdDate}
              </span>
              
              <div className="flex items-center gap-1.5 sm:gap-2">
                {facility.slug && onPreview && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-2.5 text-[11px] sm:text-xs"
                    onClick={() => onPreview({ name: facility.name, slug: facility.slug! })}
                  >
                    <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="hidden xs:inline sm:inline">Preview</span>
                  </Button>
                )}
                <Button
                  size="sm"
                  className="gap-1 sm:gap-1.5 h-7 sm:h-8 px-2.5 sm:px-3 text-[11px] sm:text-xs"
                  onClick={() => onSelect(facility.id)}
                >
                  <Edit3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>Edit</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
