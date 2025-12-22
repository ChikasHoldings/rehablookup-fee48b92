import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, MapPin, Trash2, Phone, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/useFavorites";
import { supabase } from "@/integrations/supabase/client";

interface SavedFacility {
  id: string;
  name: string;
  city: string;
  state: string;
  phone: string;
  website: string | null;
  facility_type: string;
  slug: string;
}

export default function SeekerSaved() {
  const { favorites, toggleFavorite, isLoading: favoritesLoading } = useFavorites();
  const [facilities, setFacilities] = useState<SavedFacility[]>([]);
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
        .select('id, name, city, state, phone, website, facility_type, slug')
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
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-display font-bold mb-6">Saved Facilities</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-5 bg-muted rounded w-2/3 mb-2" />
                <div className="h-4 bg-muted rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-display font-bold mb-6">
        Saved Facilities
        {facilities.length > 0 && (
          <span className="text-muted-foreground font-normal text-lg ml-2">
            ({facilities.length})
          </span>
        )}
      </h1>

      {facilities.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No Saved Facilities</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Save facilities while browsing to keep track of options you're interested in.
            </p>
            <Button asChild variant="outline">
              <Link to="/rehab-centers">Browse Facilities</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {facilities.map((facility) => (
            <Card key={facility.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <Link to={`/center/${facility.slug}`} className="flex-1">
                    <h3 className="font-semibold text-foreground hover:text-primary transition-colors mb-1">
                      {facility.name}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {facility.city}, {facility.state}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {facility.facility_type}
                    </p>
                  </Link>

                  <div className="flex items-center gap-2">
                    {facility.phone && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={`tel:${facility.phone}`}>
                          <Phone className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {facility.website && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={facility.website} target="_blank" rel="noopener noreferrer">
                          <Globe className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(facility.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
