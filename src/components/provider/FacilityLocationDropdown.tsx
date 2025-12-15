import { Link } from "react-router-dom";
import { 
  Building2, 
  ChevronDown, 
  Check, 
  Plus, 
  MapPin, 
  Crown,
  Lock,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProviderFacilities, type ProviderFacility } from "@/hooks/useProviderFacilities";
import { useSubscription } from "@/hooks/useSubscription";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { cn } from "@/lib/utils";

const getLocationLimit = (plan: string): number => {
  switch (plan) {
    case "featured":
      return 5;
    case "professional":
      return 3;
    default:
      return 1;
  }
};

export function FacilityLocationDropdown() {
  const { facilities, isLoading } = useProviderFacilities();
  const { data: subscription } = useSubscription();
  const { selectedFacility, setSelectedFacility } = useSelectedFacility();
  
  const currentPlan = subscription?.plan || "basic";
  const locationLimit = getLocationLimit(currentPlan);
  const canAddMore = facilities.length < locationLimit;
  const approvedFacilities = facilities.filter(f => f.status === "approved");
  const pendingFacilities = facilities.filter(f => f.status === "pending");

  const handleFacilitySelect = (facility: ProviderFacility) => {
    if (facility.id !== selectedFacility?.id) {
      setSelectedFacility(facility);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "approved") {
      return (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600 border-green-500/20">
          Live
        </Badge>
      );
    }
    if (status === "pending") {
      return (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/20">
          Pending
        </Badge>
      );
    }
    return null;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="gap-2.5 text-white hover:text-white hover:bg-white/15 h-10 px-3 rounded-lg min-w-0"
        >
          <div className="flex items-center justify-center h-7 w-7 rounded-md bg-white/30 border border-white/20 shrink-0 overflow-hidden">
            {selectedFacility?.logo_url ? (
              <img src={selectedFacility.logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-4 w-4 text-white" />
            )}
          </div>
          <span className="font-medium text-sm truncate max-w-[140px] md:max-w-[200px] text-white">
            {selectedFacility?.name || "Select Facility"}
          </span>
          <ChevronDown className="h-4 w-4 text-white shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 bg-card" sideOffset={8}>
        {/* Header with location count */}
        <div className="px-3 py-2.5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Your Locations</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {facilities.length} / {locationLimit}
            </Badge>
          </div>
          {!canAddMore && (
            <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Upgrade for more locations
            </p>
          )}
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24 mt-1" />
                </div>
              </div>
            ))}
          </div>
        ) : facilities.length === 0 ? (
          <div className="p-4 text-center">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center mx-auto mb-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No facilities yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Add your first location to get started</p>
          </div>
        ) : (
          <>
            {/* Approved facilities */}
            {approvedFacilities.length > 0 && (
              <div className="py-1">
                {approvedFacilities.map((facility) => (
                  <DropdownMenuItem 
                    key={facility.id}
                    className={cn(
                      "flex items-center justify-between cursor-pointer py-2.5 px-3",
                      facility.id === selectedFacility?.id && "bg-primary/5"
                    )}
                    onClick={() => handleFacilitySelect(facility)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {facility.logo_url ? (
                          <img src={facility.logo_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Building2 className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm">{facility.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {facility.city}, {facility.state}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {getStatusBadge(facility.status)}
                      {facility.id === selectedFacility?.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            )}

            {/* Pending facilities */}
            {pendingFacilities.length > 0 && (
              <>
                {approvedFacilities.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel className="text-xs text-muted-foreground px-3 py-1.5">
                  Pending Review
                </DropdownMenuLabel>
                {pendingFacilities.map((facility) => (
                  <DropdownMenuItem 
                    key={facility.id}
                    className={cn(
                      "flex items-center justify-between cursor-pointer py-2.5 px-3 opacity-75",
                      facility.id === selectedFacility?.id && "bg-primary/5 opacity-100"
                    )}
                    onClick={() => handleFacilitySelect(facility)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {facility.logo_url ? (
                          <img src={facility.logo_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm">{facility.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {facility.city}, {facility.state}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {getStatusBadge(facility.status)}
                      {facility.id === selectedFacility?.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </>
        )}

        <DropdownMenuSeparator />
        
        {/* Add New Facility */}
        {canAddMore ? (
          <DropdownMenuItem asChild>
            <Link 
              to="/provider-signup" 
              className="flex items-center gap-2.5 cursor-pointer text-primary py-2.5 px-3"
            >
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Plus className="h-4 w-4" />
              </div>
              <span className="font-medium">Add New Location</span>
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <Link 
              to="/provider/billing" 
              className="flex items-center gap-2.5 cursor-pointer py-2.5 px-3"
            >
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Crown className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <span className="font-medium text-sm">Upgrade for More Locations</span>
                <p className="text-xs text-muted-foreground">
                  {currentPlan === "professional" ? "Featured plan: up to 5 locations" : "Upgrade to add locations"}
                </p>
              </div>
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
