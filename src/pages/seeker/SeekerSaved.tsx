import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Heart, Bookmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFavorites } from "@/hooks/useFavorites";
import { supabase } from "@/integrations/supabase/client";
import { FacilityCard, FacilityCardData, FacilityCardSkeleton } from "@/components/seeker/FacilityCard";
import { AuthPrompt } from "@/components/seeker/AuthPrompt";

export default function SeekerSaved() {
  const { favorites, toggleFavorite, isLoading: favoritesLoading, isAuthenticated } = useFavorites();
  const [facilities, setFacilities] = useState<FacilityCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFacilities = async () => {
      if (favorites.length === 0) {
        setFacilities([]);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: queryError } = await supabase
          .from('facilities')
          .select('id, name, city, state, phone, facility_type, slug, description, logo_url, gallery_urls, verified, year_established')
          .in('id', favorites)
          .eq('status', 'approved')
          .limit(200);

        if (queryError) {
          setError('Failed to load saved facilities');
          setFacilities([]);
        } else {
          // Map to ensure proper typing
          const mappedFacilities: FacilityCardData[] = (data || []).map(f => ({
            id: f.id,
            name: f.name,
            city: f.city,
            state: f.state,
            phone: f.phone,
            facility_type: f.facility_type,
            slug: f.slug,
            description: f.description,
            logo_url: f.logo_url,
            gallery_urls: f.gallery_urls,
            verified: f.verified,
            year_established: f.year_established
          }));
          setFacilities(mappedFacilities);
          setError(null);
        }
      } catch (err) {
        setError('An unexpected error occurred');
        setFacilities([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (!favoritesLoading) {
      fetchFacilities();
    }
  }, [favorites, favoritesLoading]);

  const handleRemove = (facilityId: string) => {
    toggleFavorite(facilityId);
    setFacilities(prev => prev.filter(f => f.id !== facilityId));
  };

  // Show auth prompt if not authenticated
  if (!isAuthenticated && !favoritesLoading) {
    return (
      <AuthPrompt 
        title="Sign in to view saved facilities"
        description="Create a free account to save and organize your favorite treatment centers."
        icon="heart"
        returnTo="/account/saved"
      />
    );
  }

  if (isLoading || favoritesLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bookmark className="h-5 w-5 text-primary" />
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
    <>
    <Helmet>
      <title>Saved Facilities | RehabLookup</title>
      <meta name="description" content="View and manage your saved treatment centers." />
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
            <Bookmark className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <h1 className="text-lg sm:text-2xl font-display font-bold">Saved Facilities</h1>
        </div>
        {facilities.length > 0 && (
          <Badge variant="secondary" className="text-[10px] sm:text-xs">
            {facilities.length}
          </Badge>
        )}
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5 mb-4">
          <CardContent className="p-4 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {facilities.length === 0 && !error ? (
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
    </>
  );
}