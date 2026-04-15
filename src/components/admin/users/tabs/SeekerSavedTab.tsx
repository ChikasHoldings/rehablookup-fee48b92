import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Building2, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SeekerSavedTabProps {
  userId: string;
}

export function SeekerSavedTab({ userId }: SeekerSavedTabProps) {
  const { data: favorites, isLoading } = useQuery({
    queryKey: ["admin-seeker-favorites", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_favorites")
        .select("id, facility_id, created_at, facilities(id, name, city, state, facility_type, logo_url)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  if (isLoading) {
    return <div className="p-5 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  if (!favorites?.length) {
    return (
      <div className="p-5 text-center py-16">
        <Heart className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
        <p className="text-muted-foreground font-medium">No saved facilities</p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-3">
      <p className="text-sm text-muted-foreground">{favorites.length} saved facilit{favorites.length === 1 ? "y" : "ies"}</p>
      {favorites.map((fav: any) => (
        <div key={fav.id} className="p-3 rounded-lg border bg-card flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{fav.facilities?.name || "Unknown"}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {fav.facilities?.city}, {fav.facilities?.state}
                {fav.facilities?.facility_type && <span className="ml-2">• {fav.facilities.facility_type}</span>}
              </div>
            </div>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(fav.created_at), { addSuffix: true })}
          </span>
        </div>
      ))}
    </div>
  );
}
