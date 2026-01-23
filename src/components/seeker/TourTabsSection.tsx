import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  CalendarDays, 
  MessageCircle,
  ThumbsDown,
  Loader2
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
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch rejected facilities from database
  const { data: rejectedFacilities, isLoading: rejectedLoading } = useQuery({
    queryKey: ["rejected-facilities", selectedCase.id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("concierge_rejected_facilities")
        .select("facility_id")
        .eq("inquiry_id", selectedCase.id)
        .eq("user_id", user.id);
      
      if (error) throw error;
      return data?.map(r => r.facility_id) || [];
    },
    enabled: !!selectedCase.id,
  });

  // Mutation to dismiss a facility
  const dismissMutation = useMutation({
    mutationFn: async (facilityId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("concierge_rejected_facilities")
        .insert({
          inquiry_id: selectedCase.id,
          facility_id: facilityId,
          user_id: user.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Facility dismissed",
        description: "This facility has been hidden from your matches.",
      });
      queryClient.invalidateQueries({ queryKey: ["rejected-facilities", selectedCase.id] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to dismiss facility. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDismissFacility = (facilityId: string) => {
    dismissMutation.mutate(facilityId);
  };

  const rejectedSet = new Set(rejectedFacilities || []);
  const visibleFacilities = matchedFacilities?.filter(f => !rejectedSet.has(f.id));

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

  // Fetch unread message count
  const { data: unreadMessageCount } = useQuery({
    queryKey: ["unread-message-count", selectedCase.id],
    queryFn: async () => {
      const { data: threads, error } = await supabase
        .from("concierge_threads")
        .select("id, last_message_at, user_last_read_at")
        .eq("inquiry_id", selectedCase.id);
      
      if (error) throw error;
      
      // Count threads with unread messages
      let count = 0;
      for (const thread of threads || []) {
        if (thread.last_message_at) {
          const lastMessage = new Date(thread.last_message_at);
          const lastRead = thread.user_last_read_at ? new Date(thread.user_last_read_at) : null;
          if (!lastRead || lastMessage > lastRead) {
            count++;
          }
        }
      }
      return count;
    },
    enabled: !!selectedCase.id,
  });

  // Subscribe to realtime thread updates
  useEffect(() => {
    if (!selectedCase.id) return;

    const channel = supabase
      .channel(`threads-${selectedCase.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "concierge_threads",
          filter: `inquiry_id=eq.${selectedCase.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["unread-message-count", selectedCase.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCase.id, queryClient]);

  return (
    <Tabs defaultValue="facilities" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3 h-auto">
        <TabsTrigger value="facilities" className="gap-1 sm:gap-2 px-2 py-2 text-xs sm:text-sm">
          <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">Matches</span>
          {hasMatches && visibleFacilities && visibleFacilities.length > 0 && (
            <Badge variant="secondary" className="ml-0.5 sm:ml-1 h-4 sm:h-5 px-1 sm:px-1.5 text-[10px] sm:text-xs">
              {visibleFacilities.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="tours" className="gap-1 sm:gap-2 px-2 py-2 text-xs sm:text-sm">
          <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">Tours</span>
          {tourCount !== undefined && tourCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 sm:ml-1 h-4 sm:h-5 px-1 sm:px-1.5 text-[10px] sm:text-xs">
              {tourCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="messages" className="gap-1 sm:gap-2 px-2 py-2 text-xs sm:text-sm">
          <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">Messages</span>
          {unreadMessageCount !== undefined && unreadMessageCount > 0 && (
            <Badge variant="destructive" className="ml-0.5 sm:ml-1 h-4 sm:h-5 px-1 sm:px-1.5 text-[10px] sm:text-xs">
              {unreadMessageCount}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      {/* Matched Facilities Tab */}
      <TabsContent value="facilities" className="space-y-4">
        {rejectedLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : hasMatches && visibleFacilities && visibleFacilities.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground">
              These treatment centers match your needs. Request tours or send messages to learn more.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {visibleFacilities.map((facility) => (
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
                        <span className="hidden sm:inline">Request Tour</span>
                        <span className="sm:hidden">Tour</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDismissFacility(facility.id)}
                        disabled={dismissMutation.isPending}
                      >
                        {dismissMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ThumbsDown className="h-3.5 w-3.5" />
                        )}
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
