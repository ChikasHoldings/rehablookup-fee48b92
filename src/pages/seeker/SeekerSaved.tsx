import { useState, useEffect, useCallback, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Heart, Bookmark, RefreshCw, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFavorites } from "@/hooks/useFavorites";
import { usePagination } from "@/hooks/usePagination";
import { PaginationFooter } from "@/components/common/PaginationFooter";
import { supabase } from "@/integrations/supabase/client";
import { FacilityCard, FacilityCardData, FacilityCardSkeleton } from "@/components/seeker/FacilityCard";
import { AuthPrompt } from "@/components/seeker/AuthPrompt";
import { toast } from "@/hooks/use-toast";

export default function SeekerSaved() {
  const { favorites, toggleFavorite, isLoading: favoritesLoading, isAuthenticated } = useFavorites();
  const [facilities, setFacilities] = useState<FacilityCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchFacilities = useCallback(async () => {
    if (favorites.length === 0) {
      setFacilities([]);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      // Use `public_facilities` view so SAMHSA-imported / unclaimed listings
      // (which live with `status='approved'` but no claim) still resolve.
      // Querying `facilities` directly with `.eq('status','approved')` works
      // for most rows but the view also applies the same Pro-masking + claim
      // flags everywhere else in the app uses.
      const { data, error: queryError } = await supabase
        .from('public_facilities')
        .select('id, name, city, state, phone, facility_type, slug, description, logo_url, gallery_urls, verified, year_established')
        .in('id', favorites)
        .limit(500);

      if (queryError) {
        setError('Failed to load saved facilities');
        setFacilities([]);
      } else {
        const mappedFacilities: FacilityCardData[] = (data || []).map((f) => ({
          id: f.id as string,
          name: (f.name as string) ?? "",
          city: (f.city as string) ?? "",
          state: (f.state as string) ?? "",
          phone: (f.phone as string | null) ?? null,
          facility_type: (f.facility_type as string) ?? "",
          slug: (f.slug as string) ?? "",
          description: (f.description as string | null) ?? null,
          logo_url: (f.logo_url as string | null) ?? null,
          gallery_urls: (f.gallery_urls as string[] | null) ?? null,
          verified: (f.verified as boolean | null) ?? null,
          year_established: (f.year_established as number | null) ?? null,
        }));
        setFacilities(mappedFacilities);
        setError(null);
      }
    } catch {
      setError('An unexpected error occurred');
      setFacilities([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [favorites]);

  useEffect(() => {
    if (!favoritesLoading) {
      fetchFacilities();
    }
  }, [favorites, favoritesLoading, fetchFacilities]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchFacilities();
  };

  const handleRemove = (facilityId: string) => {
    toggleFavorite(facilityId);
    setFacilities(prev => prev.filter(f => f.id !== facilityId));
    toast({
      title: "Removed from saved",
      description: "Facility has been removed from your saved list.",
    });
  };

  // Paginate the saved list rather than silently truncating at the fetch
  // limit. Page size persisted per-user via the usePagination hook.
  const pagination = usePagination({
    tableId: "seeker-saved",
    defaultPageSize: 10,
    totalItems: facilities.length,
  });
  const visibleFacilities = useMemo(
    () => pagination.paginate(facilities),
    [facilities, pagination],
  );

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
          {facilities.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {facilities.length}
            </Badge>
          )}
        </div>
        {facilities.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        )}
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5 mb-4">
          <CardContent className="p-4 text-center">
            <p className="text-destructive mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Try Again
            </Button>
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
            <Button asChild className="gap-2">
              <Link to="/account">
                <Search className="h-4 w-4" />
                Browse Facilities
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {visibleFacilities.map((facility) => (
              <FacilityCard
                key={facility.id}
                facility={facility}
                onRemove={handleRemove}
                showRemoveButton
              />
            ))}
          </div>
          {facilities.length > pagination.pageSize && (
            <PaginationFooter
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              pageSize={pagination.pageSize}
              totalItems={facilities.length}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
              className="mt-4"
            />
          )}
        </>
      )}
    </div>
    </>
  );
}