import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  CalendarDays, 
  MessageCircle,
  ThumbsDown
} from "lucide-react";
import { MatchedFacilityCard } from "@/components/seeker/MatchedFacilityCard";
import { ConciergeToursList } from "@/components/seeker/ConciergeToursList";
import { ConciergeMessaging } from "@/components/seeker/ConciergeMessaging";

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

interface ConciergeInquiry {
  id: string;
  matched_facility_ids: string[] | null;
}

interface TourTabsSectionProps {
  selectedCase: ConciergeInquiry;
  matchedFacilities: Facility[] | undefined;
  hasMatches: boolean;
  setTourModalFacility: (facility: Facility | null) => void;
}

export function TourTabsSection({ 
  selectedCase, 
  matchedFacilities, 
  hasMatches,
  setTourModalFacility 
}: TourTabsSectionProps) {
  // Fetch tour count for badge
  const { data: tourCount } = useQuery({
    queryKey: ["tour-count", selectedCase.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("concierge_tour_requests")
        .select("id", { count: "exact", head: true })
        .eq("inquiry_id", selectedCase.id);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!selectedCase.id,
  });

  return (
    <Tabs defaultValue="facilities" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="facilities" className="gap-2">
          <Users className="h-4 w-4" />
          Matches
          {hasMatches && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {matchedFacilities?.length || 0}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="tours" className="gap-2">
          <CalendarDays className="h-4 w-4" />
          Tours
          {tourCount !== undefined && tourCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {tourCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="messages" className="gap-2">
          <MessageCircle className="h-4 w-4" />
          Messages
        </TabsTrigger>
      </TabsList>

      {/* Matched Facilities Tab */}
      <TabsContent value="facilities" className="space-y-4">
        {hasMatches ? (
          <>
            <p className="text-sm text-muted-foreground">
              These treatment centers match your needs. Request tours or send messages to learn more.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {matchedFacilities?.map((facility) => (
                <Card key={facility.id}>
                  <CardContent className="p-4">
                    <MatchedFacilityCard facility={facility} />
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 gap-1.5"
                        onClick={() => setTourModalFacility(facility)}
                      >
                        <CalendarDays className="h-3.5 w-3.5" />
                        Request Tour
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No matched facilities yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Our team is reviewing your case and finding the best matches.
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* Tours Tab */}
      <TabsContent value="tours">
        <ConciergeToursList inquiryId={selectedCase.id} />
      </TabsContent>

      {/* Messages Tab */}
      <TabsContent value="messages">
        <ConciergeMessaging 
          inquiryId={selectedCase.id} 
          matchedFacilityIds={selectedCase.matched_facility_ids || []}
        />
      </TabsContent>
    </Tabs>
  );
}
