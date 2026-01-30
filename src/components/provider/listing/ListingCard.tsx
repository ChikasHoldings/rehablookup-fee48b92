import { Link } from "react-router-dom";
import { 
  Building2, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ChevronRight,
  Edit3,
  Eye,
  ExternalLink
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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

  return (
    <Card className="group border-border/60 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200">
      <CardContent className="p-0">
        <div className="flex items-stretch">
          {/* Logo Section */}
          <div className="hidden sm:flex items-center justify-center w-28 lg:w-36 bg-muted/30 border-r border-border/50 p-4">
            {facility.logo_url ? (
              <img
                src={facility.logo_url}
                alt={facility.name}
                className="w-16 h-16 lg:w-20 lg:h-20 object-contain rounded-xl"
              />
            ) : (
              <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-8 w-8 lg:h-10 lg:w-10 text-primary/60" />
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="flex-1 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              {/* Left Content */}
              <div className="flex-1 min-w-0">
                {/* Mobile Logo + Name */}
                <div className="flex items-center gap-3 sm:hidden mb-2">
                  {facility.logo_url ? (
                    <img
                      src={facility.logo_url}
                      alt={facility.name}
                      className="w-10 h-10 object-contain rounded-lg shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-primary/60" />
                    </div>
                  )}
                  <h3 className="font-semibold text-foreground text-base truncate">
                    {facility.name}
                  </h3>
                </div>

                {/* Desktop Name */}
                <h3 className="hidden sm:block font-semibold text-foreground text-lg mb-1 truncate group-hover:text-primary transition-colors">
                  {facility.name}
                </h3>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {facility.city}, {facility.state}
                  </span>
                  <span className="hidden sm:inline text-muted-foreground/40">•</span>
                  <span className="hidden sm:inline">{facility.facility_type || "Treatment Center"}</span>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline" className={cn("gap-1 text-xs", statusConfig.badgeClass)}>
                    <StatusIcon className="h-3 w-3" />
                    {statusConfig.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Added {createdDate}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex sm:flex-col items-center sm:items-end gap-2 pt-1 sm:pt-0">
                <Button
                  size="sm"
                  className="gap-1.5 flex-1 sm:flex-none"
                  onClick={() => onSelect(facility.id)}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit Listing</span>
                </Button>
                
                {facility.slug && facility.status === "approved" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 flex-1 sm:flex-none"
                    asChild
                  >
                    <a
                      href={`/center/${facility.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">View</span>
                      <ExternalLink className="h-3 w-3 sm:hidden" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
