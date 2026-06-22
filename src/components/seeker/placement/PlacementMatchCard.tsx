import { Link } from "react-router-dom";
import { getFacilityPlaceholder } from "@/lib/facilityPlaceholder";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MapPin,
  ExternalLink,
  ThumbsDown,
  CheckCircle,
  Building2,
  Loader2,
  HeadphonesIcon,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Facility {
  id: string;
  name: string;
  city: string;
  state: string;
  phone: string;
  slug: string;
  logo_url: string | null;
  facility_type: string;
}

interface PlacementMatchCardProps {
  facility: Facility;
  isPlaced?: boolean;
  onDismiss?: () => void;
  isDismissing?: boolean;
  /** Position in the list (0-based). First facility gets "Top Recommended" badge */
  rank?: number;
}

const FACILITY_TYPE_LABELS: Record<string, string> = {
  residential: "Residential",
  outpatient: "Outpatient",
  detox: "Detox",
  php: "Partial Hospitalization",
  iop: "Intensive Outpatient",
  sober_living: "Sober Living",
};

export function PlacementMatchCard({
  facility, 
  isPlaced,
  onDismiss,
  isDismissing,
  rank = 99,
}: PlacementMatchCardProps) {
  const facilityTypeLabel = FACILITY_TYPE_LABELS[facility.facility_type] || facility.facility_type;
  const isTopPick = rank === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        "overflow-hidden transition-all hover:shadow-md",
        isPlaced && "ring-2 ring-success/50 bg-success/5",
        isTopPick && !isPlaced && "ring-2 ring-warning/40 bg-warning/5",
      )}>
        <CardContent className="p-0">
          {/* Top Recommended Banner */}
          {isTopPick && !isPlaced && (
            <div className="flex items-center gap-1.5 px-4 py-1.5 bg-warning/10 border-b border-warning/20">
              <Sparkles className="h-3.5 w-3.5 text-warning" />
              <span className="text-xs font-semibold text-warning">🏥 Top Recommended</span>
            </div>
          )}

          {/* Header with Logo */}
          <div className="flex items-start gap-4 p-4">
            <Avatar className="h-14 w-14 rounded-xl border-2 border-muted">
              <AvatarImage src={facility.logo_url || getFacilityPlaceholder(facility)} alt={facility.name} className="object-cover" />
              <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-lg font-bold">
                {facility.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-base leading-tight line-clamp-2">
                  {facility.name}
                </h3>
                {isPlaced && (
                  <Badge className="bg-success text-white shrink-0 gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Placed
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{facility.city}, {facility.state}</span>
              </div>
              
              <Badge variant="secondary" className="text-xs gap-1">
                <Building2 className="h-3 w-3" />
                {facilityTypeLabel}
              </Badge>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 px-4 pb-4 pt-0">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 gap-1.5"
              asChild
            >
              <Link to={`/center/${facility.slug}`}>
                <ExternalLink className="h-3.5 w-3.5" />
                View Profile
              </Link>
            </Button>
            
            {/* Coordinator message */}
            {!isPlaced && (
              <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground gap-1">
                <HeadphonesIcon className="h-3.5 w-3.5" />
                <span>Advisor coordinating</span>
              </div>
            )}
            
            {onDismiss && !isPlaced && (
              <Button 
                variant="ghost" 
                size="sm"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2"
                onClick={onDismiss}
                disabled={isDismissing}
              >
                {isDismissing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ThumbsDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
