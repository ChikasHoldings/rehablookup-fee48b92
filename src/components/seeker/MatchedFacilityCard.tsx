import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Phone, ExternalLink, CheckCircle } from "lucide-react";

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

interface MatchedFacilityCardProps {
  facility: Facility;
  isPlaced?: boolean;
}

export function MatchedFacilityCard({ facility, isPlaced }: MatchedFacilityCardProps) {
  const facilityTypeLabel = {
    residential: "Residential",
    outpatient: "Outpatient",
    detox: "Detox",
    php: "Partial Hospitalization",
    iop: "Intensive Outpatient",
    sober_living: "Sober Living",
  }[facility.facility_type] || facility.facility_type;

  return (
    <Card className={isPlaced ? "border-green-300 dark:border-green-800" : ""}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <Avatar className="h-14 w-14 rounded-lg">
            <AvatarImage src={facility.logo_url || ""} alt={facility.name} />
            <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-lg font-semibold">
              {facility.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold truncate">{facility.name}</h3>
              {isPlaced && (
                <Badge className="bg-green-500 text-white shrink-0">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Placed
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{facility.city}, {facility.state}</span>
            </div>
            
            <Badge variant="secondary" className="text-xs">
              {facilityTypeLabel}
            </Badge>
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <a href={`tel:${facility.phone}`}>
              <Phone className="h-3.5 w-3.5 mr-1.5" />
              Call
            </a>
          </Button>
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link to={`/center/${facility.slug}`}>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              View
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
