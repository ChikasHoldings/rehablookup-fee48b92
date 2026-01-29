import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, History, MessageSquare } from "lucide-react";
import { ConciergeIntroductionCard } from "./ConciergeIntroductionCard";

const PAGE_SIZE = 10;

export function ConciergeIntroductionsHistory() {
  const { selectedFacility } = useSelectedFacility();
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["concierge-introductions-history", selectedFacility?.id, page],
    queryFn: async () => {
      if (!selectedFacility?.id) return { introductions: [], total: 0 };
      
      // Get count first
      const { count } = await supabase
        .from("concierge_introductions")
        .select("*", { count: "exact", head: true })
        .eq("facility_id", selectedFacility.id);

      // Then get paginated data
      const { data, error } = await supabase
        .from("concierge_introductions")
        .select(`
          *,
          concierge_inquiries (
            id, user_name, level_of_care, payment_type, timeline_urgency, 
            preferred_state, status, primary_concern, gender, age_range,
            seeker_confirmed, seeker_confirmed_at, placement_confirmed, placement_confirmed_at
          )
        `)
        .eq("facility_id", selectedFacility.id)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      
      if (error) throw error;
      
      return {
        introductions: data || [],
        total: count || 0,
      };
    },
    enabled: !!selectedFacility?.id,
  });

  const introductions = data?.introductions || [];
  const totalCount = data?.total || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasNext = page < totalPages - 1;
  const hasPrev = page > 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60 mt-1" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              Introduction History
            </CardTitle>
            <CardDescription>
              All {totalCount} introduction{totalCount !== 1 ? "s" : ""} for your facility
            </CardDescription>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p - 1)}
                disabled={!hasPrev}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={!hasNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {introductions.length > 0 ? (
          <ScrollArea className="h-[500px]">
            <div className="space-y-3 pr-4">
              {introductions.map((intro: any) => (
                <ConciergeIntroductionCard
                  key={intro.id}
                  introduction={intro}
                  facilityId={selectedFacility?.id || ""}
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-12">
            <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No introductions yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Cases matching your profile will appear here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
