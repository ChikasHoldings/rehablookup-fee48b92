import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Star, 
  Pin, 
  PinOff, 
  Users, 
  Eye, 
  RefreshCw, 
  Zap,
  TrendingUp,
  Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type ActivityEvent = {
  id: string;
  type: "featured" | "unfeatured" | "pinned" | "unpinned" | "lead_received" | "impression" | "click" | "rotation";
  facilityName: string;
  facilityId: string;
  timestamp: string;
  details?: string;
};

export function FeaturedActivityFeed() {
  const queryClient = useQueryClient();
  const [activities, setActivities] = useState<ActivityEvent[]>([]);

  // Fetch recent audit log entries for featured actions
  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ["featured-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("*")
        .in("action_type", [
          "featured_facility",
          "unfeatured_facility", 
          "pinned_featured",
          "unpinned_featured",
          "featured_rotation",
          "add_legacy_featured",
          "remove_legacy_featured"
        ])
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Fetch recent leads for featured facilities
  const { data: recentLeads, isLoading: leadsLoading } = useQuery({
    queryKey: ["featured-recent-leads"],
    queryFn: async () => {
      // First get featured facility IDs
      const { data: featuredFacilities } = await supabase
        .from("facilities")
        .select("id, name")
        .eq("featured", true);
      
      if (!featuredFacilities?.length) return [];
      
      const facilityIds = featuredFacilities.map(f => f.id);
      const facilityMap = new Map(featuredFacilities.map(f => [f.id, f.name]));
      
      // Get recent leads for featured facilities
      const { data: leads, error } = await supabase
        .from("leads")
        .select("id, facility_id, created_at")
        .in("facility_id", facilityIds)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      return (leads || []).map(lead => ({
        ...lead,
        facilityName: facilityMap.get(lead.facility_id) || "Unknown"
      }));
    },
    refetchInterval: 30000,
  });

  // Fetch recent analytics events
  const { data: analyticsEvents, isLoading: analyticsLoading } = useQuery({
    queryKey: ["featured-analytics-events"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("featured_placement_analytics")
        .select(`
          id,
          facility_id,
          event_type,
          event_count,
          updated_at,
          facilities:facility_id (name)
        `)
        .eq("event_date", today)
        .order("updated_at", { ascending: false })
        .limit(15);
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Combine all activities into a unified feed
  useEffect(() => {
    const combined: ActivityEvent[] = [];

    // Add audit log events
    if (auditLogs) {
      auditLogs.forEach((log: any) => {
        const details = log.details as any;
        let type: ActivityEvent["type"] = "featured";
        
        switch (log.action_type) {
          case "featured_facility":
          case "add_legacy_featured":
            type = "featured";
            break;
          case "unfeatured_facility":
          case "remove_legacy_featured":
            type = "unfeatured";
            break;
          case "pinned_featured":
            type = "pinned";
            break;
          case "unpinned_featured":
            type = "unpinned";
            break;
          case "featured_rotation":
            type = "rotation";
            break;
        }

        combined.push({
          id: log.id,
          type,
          facilityName: details?.facility_name || details?.facilityName || "Unknown Facility",
          facilityId: log.target_id || "",
          timestamp: log.created_at,
          details: details?.reason || undefined,
        });
      });
    }

    // Add lead events
    if (recentLeads) {
      recentLeads.forEach((lead: any) => {
        combined.push({
          id: `lead-${lead.id}`,
          type: "lead_received",
          facilityName: lead.facilityName,
          facilityId: lead.facility_id,
          timestamp: lead.created_at,
        });
      });
    }

    // Add analytics events (only high-value ones)
    if (analyticsEvents) {
      analyticsEvents.forEach((event: any) => {
        if (event.event_type === "click" || event.event_type === "lead_conversion") {
          combined.push({
            id: `analytics-${event.id}`,
            type: event.event_type === "click" ? "click" : "lead_received",
            facilityName: event.facilities?.name || "Unknown",
            facilityId: event.facility_id,
            timestamp: event.updated_at,
            details: `${event.event_count} ${event.event_type}(s) today`,
          });
        }
      });
    }

    // Sort by timestamp descending and dedupe
    const sorted = combined
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 25);

    setActivities(sorted);
  }, [auditLogs, recentLeads, analyticsEvents]);

  // Real-time subscriptions
  useEffect(() => {
    const auditChannel = supabase
      .channel("featured-audit-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_audit_log" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["featured-audit-logs"] });
        }
      )
      .subscribe();

    const leadsChannel = supabase
      .channel("featured-leads-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["featured-recent-leads"] });
        }
      )
      .subscribe();

    const analyticsChannel = supabase
      .channel("featured-analytics-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "featured_placement_analytics" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["featured-analytics-events"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(auditChannel);
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(analyticsChannel);
    };
  }, [queryClient]);

  const getEventIcon = (type: ActivityEvent["type"]) => {
    switch (type) {
      case "featured":
        return <Star className="h-4 w-4 text-amber-500" />;
      case "unfeatured":
        return <Star className="h-4 w-4 text-muted-foreground" />;
      case "pinned":
        return <Pin className="h-4 w-4 text-blue-500" />;
      case "unpinned":
        return <PinOff className="h-4 w-4 text-muted-foreground" />;
      case "lead_received":
        return <Users className="h-4 w-4 text-green-500" />;
      case "impression":
        return <Eye className="h-4 w-4 text-slate-500" />;
      case "click":
        return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case "rotation":
        return <RefreshCw className="h-4 w-4 text-purple-500" />;
      default:
        return <Zap className="h-4 w-4 text-amber-500" />;
    }
  };

  const getEventBadge = (type: ActivityEvent["type"]) => {
    switch (type) {
      case "featured":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Featured</Badge>;
      case "unfeatured":
        return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">Unfeatured</Badge>;
      case "pinned":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Pinned</Badge>;
      case "unpinned":
        return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">Unpinned</Badge>;
      case "lead_received":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Lead</Badge>;
      case "click":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Click</Badge>;
      case "rotation":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Rotated</Badge>;
      default:
        return <Badge variant="outline">Event</Badge>;
    }
  };

  const getEventDescription = (event: ActivityEvent) => {
    switch (event.type) {
      case "featured":
        return `${event.facilityName} was added to featured`;
      case "unfeatured":
        return `${event.facilityName} was removed from featured`;
      case "pinned":
        return `${event.facilityName} was pinned to top`;
      case "unpinned":
        return `${event.facilityName} was unpinned`;
      case "lead_received":
        return `${event.facilityName} received a new lead`;
      case "click":
        return `${event.facilityName} profile clicked`;
      case "rotation":
        return `Featured rotation completed`;
      default:
        return `Activity for ${event.facilityName}`;
    }
  };

  const isLoading = auditLoading || leadsLoading || analyticsLoading;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Featured Activity Feed
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Zap className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
              <p className="text-xs">Featured events will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    {getEventIcon(event.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getEventBadge(event.type)}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm mt-1 truncate">
                      {getEventDescription(event)}
                    </p>
                    {event.details && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {event.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
