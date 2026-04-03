import { Link } from "react-router-dom";
import facilityPlaceholder from "@/assets/facility-placeholder.jpg";
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
  HeadphonesIcon
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
  // onRequestTour removed - brokerage model requires advisor coordination
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
  isDismissing 
}: PlacementMatchCardProps) {
  const facilityTypeLabel = FACILITY_TYPE_LABELS[facility.facility_type] || facility.facility_type;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        "overflow-hidden transition-all hover:shadow-md",
        isPlaced && "ring-2 ring-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20"
      )}>
        <CardContent className="p-0">
          {/* Header with Logo */}
          <div className="flex items-start gap-4 p-4">
            <Avatar className="h-14 w-14 rounded-xl border-2 border-muted">
              <AvatarImage src={facility.logo_url || ""} alt={facility.name} className="object-cover" />
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
                  <Badge className="bg-emerald-500 text-white shrink-0 gap-1">
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
          
          {/* Actions - View Profile only, no direct contact */}
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
