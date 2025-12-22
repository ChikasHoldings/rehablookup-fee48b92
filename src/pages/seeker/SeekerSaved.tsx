import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, Bookmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFavorites } from "@/hooks/useFavorites";
import { supabase } from "@/integrations/supabase/client";
import { FacilityCard, FacilityCardData, FacilityCardSkeleton } from "@/components/seeker/FacilityCard";

export default function SeekerSaved() {
  const { favorites, toggleFavorite, isLoading: favoritesLoading } = useFavorites();
  const [facilities, setFacilities] = useState<FacilityCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFacilities = async () => {
      if (favorites.length === 0) {
        setFacilities([]);
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from('facilities')
        .select('id, name, city, state, phone, facility_type, slug, description, logo_url, gallery_urls, verified, year_established')
        .in('id', favorites)
        .eq('status', 'approved');

      setFacilities(data || []);
      setIsLoading(false);
    };

    if (!favoritesLoading) {
      fetchFacilities();
    }
  }, [favorites, favoritesLoading]);

  const handleRemove = (facilityId: string) => {
    toggleFavorite(facilityId);
    setFacilities(prev => prev.filter(f => f.id !== facilityId));
  };

  if (isLoading || favoritesLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-rose-100">
            <Bookmark className="h-5 w-5 text-rose-600" />
          </div>
          <h1 className="text-2xl font-display font-bold">Saved Facilities</h1>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <FacilityCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rose-100">
            <Bookmark className="h-5 w-5 text-rose-600" />
          </div>
          <h1 className="text-2xl font-display font-bold">Saved Facilities</h1>
        </div>
        {facilities.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {facilities.length} saved
          </Badge>
        )}
      </div>

      {facilities.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <div className="p-3 rounded-full bg-muted w-fit mx-auto mb-4">
              <Heart className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No Saved Facilities</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              Save facilities while browsing to keep track of treatment options you're interested in.
            </p>
            <Button asChild>
              <Link to="/account">Browse Facilities</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {facilities.map((facility) => (
            <FacilityCard 
              key={facility.id} 
              facility={facility} 
              onRemove={handleRemove}
              showRemoveButton
            />
          ))}
        </div>
      )}
    </div>
  );
}
