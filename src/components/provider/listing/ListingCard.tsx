import { 
  Building2, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Edit3,
  Eye,
  ExternalLink,
  Users,
  TrendingUp
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
    city: string;
    state: string;
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
        bgColor: "bg-emerald-500/10",
        textColor: "text-emerald-600 dark:text-emerald-400",
        badgeClass: "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800"
      };
    case "pending":
      return {
        label: "Under Review",
        description: "Usually 24-48 hours",
        icon: Clock,
        bgColor: "bg-amber-500/10",
        textColor: "text-amber-600 dark:text-amber-400",
        badgeClass: "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800"
      };
    default:
      return {
        label: "Draft",
        description: "Not published yet",
        icon: AlertCircle,
        bgColor: "bg-muted",
        textColor: "text-muted-foreground",
        badgeClass: "bg-muted text-muted-foreground border-border"
      };
  }
};

export function ListingCard({ facility, onSelect }: ListingCardProps) {
  const statusConfig = getStatusConfig(facility.status);
  const StatusIcon = statusConfig.icon;
  const createdDate = format(new Date(facility.created_at), "MMM d, yyyy");
  
  // Get the main image (first gallery image or logo as fallback)
  const mainImage = facility.gallery_urls?.[0] || facility.logo_url;

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
    <Card className="group border-border/60 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Image Section */}
          <div className="relative w-full sm:w-48 lg:w-56 h-40 sm:h-auto sm:min-h-[180px] bg-muted/30 shrink-0">
            {mainImage ? (
              <img
                src={mainImage}
                alt={facility.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                <Building2 className="h-16 w-16 text-primary/30" />
              </div>
            )}
            {/* Status Overlay on Image */}
            <div className="absolute top-3 left-3">
              <Badge variant="outline" className={cn("gap-1 text-xs backdrop-blur-sm bg-background/80", statusConfig.badgeClass)}>
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </Badge>
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 p-5 flex flex-col justify-between min-h-[180px]">
            <div>
              {/* Name & Type */}
              <h3 className="font-semibold text-foreground text-lg mb-1 truncate group-hover:text-primary transition-colors">
                {facility.name}
              </h3>
              
              {/* Location */}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>{facility.city}, {facility.state}</span>
                <span className="text-muted-foreground/40 mx-1">•</span>
                <span className="text-xs">{facility.facility_type || "Treatment Center"}</span>
              </div>

              {/* KPI Stats */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
                  <Eye className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">{viewsData ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Views</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
                  <Users className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">{leadsData ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Leads</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer: Date & Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <span className="text-xs text-muted-foreground">
                Added {createdDate}
              </span>
              
              <div className="flex items-center gap-2">
                {facility.slug && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-8"
                    asChild
                  >
                    <a
                      href={`/center/${facility.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Preview</span>
                    </a>
                  </Button>
                )}
                <Button
                  size="sm"
                  className="gap-1.5 h-8"
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
