import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSeekerSession } from "@/hooks/useSeekerSession";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  HeadphonesIcon,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PlacementMatchCard } from "./PlacementMatchCard";
import { AdvisorMessaging } from "./AdvisorMessaging";

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

interface PlacementTabsProps {
  inquiryId: string;
  matchedFacilityIds: string[] | null;
  matchedFacilities: Facility[] | undefined;
  // Tour request removed - all coordination goes through advisor (brokerage model)
}

export function PlacementTabs({ 
  inquiryId, 
  matchedFacilityIds,
  matchedFacilities,
}: PlacementTabsProps) {
  const { userId: currentUserId } = useSeekerSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("facilities");

  // Fetch rejected facilities
  const { data: rejectedFacilities, isLoading: rejectedLoading } = useQuery({
    queryKey: ["rejected-facilities", inquiryId],
    queryFn: async () => {
      if (!currentUserId) return [];

      const { data, error } = await supabase
        .from("concierge_rejected_facilities")
        .select("facility_id")
        .eq("inquiry_id", inquiryId)
        .eq("user_id", currentUserId);
      
      if (error) throw error;
      return data?.map(r => r.facility_id) || [];
    },
    enabled: !!inquiryId && !!currentUserId,
  });

  // Dismiss mutation
  const dismissMutation = useMutation({
    mutationFn: async (facilityId: string) => {
      if (!currentUserId) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("concierge_rejected_facilities")
        .insert({
          inquiry_id: inquiryId,
          facility_id: facilityId,
          user_id: user.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Facility dismissed" });
      queryClient.invalidateQueries({ queryKey: ["rejected-facilities", inquiryId] });
    },
    onError: () => {
      toast({ title: "Failed to dismiss", variant: "destructive" });
    },
  });

  // Unread advisor message count
  const { data: unreadCount } = useQuery({
    queryKey: ["unread-advisor-count", inquiryId],
    queryFn: async () => {
      const { data: thread, error } = await supabase
        .from("concierge_threads")
        .select("id, last_message_at, user_last_read_at")
        .eq("inquiry_id", inquiryId)
        .eq("thread_type", "advisor")
        .maybeSingle();
      
      if (error || !thread) return 0;
      
      if (thread.last_message_at) {
        const lastMessage = new Date(thread.last_message_at);
        const lastRead = thread.user_last_read_at ? new Date(thread.user_last_read_at) : null;
        if (!lastRead || lastMessage > lastRead) return 1;
      }
      return 0;
    },
    enabled: !!inquiryId,
  });

  // Realtime subscription for advisor thread
  useEffect(() => {
    if (!inquiryId) return;

    const channel = supabase
      .channel(`advisor-thread-${inquiryId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "concierge_threads", filter: `inquiry_id=eq.${inquiryId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["unread-advisor-count", inquiryId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [inquiryId, queryClient]);

  const rejectedSet = new Set(rejectedFacilities || []);
  const visibleFacilities = matchedFacilities?.filter(f => !rejectedSet.has(f.id));
  const hasMatches = visibleFacilities && visibleFacilities.length > 0;

  return (
    <Card className="border-0 shadow-lg">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <CardHeader className="pb-0 border-b">
          <TabsList className="w-full justify-start gap-1 h-auto p-1 bg-transparent">
            <TabsTrigger 
              value="facilities" 
              className="gap-2 px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
            >
              <Users className="h-4 w-4" />
              <span>Matches</span>
              {hasMatches && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-background">
                  {visibleFacilities?.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="advisor" 
              className="gap-2 px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
            >
              <HeadphonesIcon className="h-4 w-4" />
              <span>Advisor</span>
              {unreadCount !== undefined && unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </CardHeader>

        <CardContent className="p-6">
          <AnimatePresence mode="wait">
            {/* Matches Tab */}
            <TabsContent value="facilities" className="m-0">
              {rejectedLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : hasMatches ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <p className="text-sm text-muted-foreground">
                    These treatment centers match your needs. Your advisor will coordinate all communication and next steps.
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    {visibleFacilities?.map((facility) => (
                      <PlacementMatchCard
                        key={facility.id}
                        facility={facility}
                        onDismiss={() => dismissMutation.mutate(facility.id)}
                        isDismissing={dismissMutation.isPending}
                      />
                    ))}
                  </div>
                </motion.div>
              ) : (
                <EmptyState 
                  icon={<Users className="h-12 w-12" />}
                title="No facilities yet"
                  description="Our team is reviewing your case and finding the best treatment centers for you."
                />
              )}
            </TabsContent>

            {/* Advisor Tab - ONLY communication channel */}
            <TabsContent value="advisor" className="m-0">
              <AdvisorMessaging inquiryId={inquiryId} />
            </TabsContent>
          </AnimatePresence>
        </CardContent>
      </Tabs>
    </Card>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <div className="text-muted-foreground/30 mb-4">
        {icon}
      </div>
      <h3 className="font-medium text-muted-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">{description}</p>
    </motion.div>
  );
}
