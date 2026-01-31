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
import { useNavigate } from "react-router-dom";
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

export function ListingCard({ facility, onSelect }: ListingCardProps) {
  const navigate = useNavigate();
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

  // Fetch views count
  const { data: viewsData } = useQuery({
    queryKey: ['facility-views-count', facility.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facility_views')
        .select('view_count')
        .eq('facility_id', facility.id);
      
      if (error) throw error;
      return data?.reduce((sum, row) => sum + (row.view_count || 0), 0) || 0;
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
          <div className="relative w-full sm:w-44 lg:w-52 h-36 sm:h-auto sm:min-h-[160px] bg-muted/30 shrink-0 overflow-hidden">
            {mainImage ? (
              <img
                src={mainImage}
                alt={facility.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                <Building2 className="h-16 w-16 text-primary/30" />
              </div>
            )}
            {/* Gradient overlay for better badge visibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            {/* Status Badge */}
            <div className="absolute top-3 left-3">
              <Badge variant="outline" className={cn("gap-1.5 text-xs font-medium backdrop-blur-md bg-background/90 shadow-sm", statusConfig.badgeClass)}>
                <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", statusConfig.dotColor)} />
                {statusConfig.label}
              </Badge>
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-h-[160px]">
            <div className="space-y-2">
              {/* Header: Name & Type Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground text-base leading-tight mb-1 group-hover:text-primary transition-colors line-clamp-1">
                    {facility.name}
                  </h3>
                  <Badge variant="secondary" className="text-xs font-normal">
                    {facility.facility_type || "Treatment Center"}
                  </Badge>
                </div>
              </div>
              
              {/* Full Address */}
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary/60" />
                <span className="line-clamp-1">{fullAddress}</span>
              </div>

              {/* KPI Stats */}
              <div className="flex items-center gap-2 pt-1">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/60 border border-border/40">
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  <span className="text-sm font-medium">{viewsData ?? 0}</span>
                  <span className="text-xs text-muted-foreground">views</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/60 border border-border/40">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <span className="text-sm font-medium">{leadsData ?? 0}</span>
                  <span className="text-xs text-muted-foreground">leads</span>
                </div>
              </div>
            </div>

            {/* Footer: Date & Actions */}
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-border/50">
              <span className="text-xs text-muted-foreground">
                Added {createdDate}
              </span>
              
              <div className="flex items-center gap-2">
                {facility.slug && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-8 px-2.5"
                    onClick={() => navigate(`/provider/listing/preview/${facility.slug}`)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Preview</span>
                  </Button>
                )}
                <Button
                  size="sm"
                  className="gap-1.5 h-8 px-3"
                  onClick={() => onSelect(facility.id)}
                >
                  <Edit3 className="h-3.5 w-3.5" />
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
