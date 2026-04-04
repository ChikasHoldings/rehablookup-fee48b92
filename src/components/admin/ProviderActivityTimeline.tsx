import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  CheckCircle,
  Star,
  Shield,
  Ban,
  Users,
  Mail,
  Flag,
  CreditCard,
  FileText,
  Eye,
  RefreshCw,
  AlertTriangle,
  Clock,
  Send,
  MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatSourceLabel } from "@/lib/sourceLabels";

type ActivityEvent = {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  metadata?: Record<string, unknown>;
};

type ProviderActivityTimelineProps = {
  facilityId: string;
  userId: string;
};

export function ProviderActivityTimeline({ facilityId, userId }: ProviderActivityTimelineProps) {
  // Fetch all activity data in parallel
  const { data: activities, isLoading } = useQuery({
    queryKey: ["provider-activity-timeline", facilityId, userId],
    queryFn: async () => {
      const events: ActivityEvent[] = [];

      // Fetch admin audit log for this facility
      const { data: auditLogs } = await supabase
        .from("admin_audit_log")
        .select("id, action_type, target_type, target_id, details, created_at")
        .or(`target_id.eq.${facilityId},target_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (auditLogs) {
        auditLogs.forEach((log) => {
          const eventInfo = getAuditEventInfo(log.action_type, log.details);
          events.push({
            id: `audit-${log.id}`,
            type: "admin_action",
            title: eventInfo.title,
            description: eventInfo.description,
            timestamp: log.created_at,
            icon: eventInfo.icon,
            iconColor: eventInfo.color,
            metadata: log.details as Record<string, unknown>,
          });
        });
      }

      // Fetch leads for this facility
      const { data: leads } = await supabase
        .from("leads")
        .select("id, name, email, status, source, created_at")
        .eq("facility_id", facilityId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (leads) {
        leads.forEach((lead) => {
          events.push({
            id: `lead-${lead.id}`,
            type: "lead_received",
            title: "Inquiry Received",
            description: `${lead.name} submitted via ${formatSourceLabel(lead.source)}`,
            timestamp: lead.created_at,
            icon: Users,
            iconColor: "text-blue-500",
            metadata: {
              lead_name: lead.name,
              lead_email: lead.email,
              status: lead.status,
              source: lead.source,
            },
          });
        });
      }

      // Fetch provider notifications sent to this provider
      const { data: notifications } = await supabase
        .from("provider_notifications")
        .select("id, title, message, type, created_at, metadata")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (notifications) {
        notifications.forEach((notif) => {
          events.push({
            id: `notif-${notif.id}`,
            type: "notification",
            title: notif.title,
            description: notif.message.substring(0, 100) + (notif.message.length > 100 ? "..." : ""),
            timestamp: notif.created_at,
            icon: MessageSquare,
            iconColor: "text-blue-500",
            metadata: notif.metadata as Record<string, unknown>,
          });
        });
      }

      // Fetch flagged images for this facility
      const { data: flaggedImages } = await supabase
        .from("flagged_images")
        .select("*")
        .eq("facility_id", facilityId)
        .order("flagged_at", { ascending: false })
        .limit(20);

      if (flaggedImages) {
        flaggedImages.forEach((flag) => {
          events.push({
            id: `flag-${flag.id}`,
            type: "image_flagged",
            title: flag.resolved ? "Image Flag Resolved" : "Image Flagged",
            description: `${flag.image_type} flagged: ${flag.reason || "No reason provided"}`,
            timestamp: flag.resolved_at || flag.flagged_at,
            icon: Flag,
            iconColor: flag.resolved ? "text-emerald-500" : "text-destructive",
            metadata: {
              image_type: flag.image_type,
              reason: flag.reason,
              resolved: flag.resolved,
            },
          });
        });
      }

      // Sort all events by timestamp descending
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return events;
    },
    staleTime: 30000, // 30 seconds
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">No activity recorded yet</p>
        <p className="text-sm text-muted-foreground/70">
          Provider interactions will appear here
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          {/* Events */}
          <div className="space-y-6">
            {activities.map((event, index) => {
              const Icon = event.icon;
              return (
                <div key={event.id} className="relative flex gap-4">
                  {/* Icon */}
                  <div
                    className={cn(
                      "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 bg-background",
                      event.iconColor === "text-destructive" && "border-destructive/30",
                      event.iconColor === "text-emerald-500" && "border-emerald-200",
                      event.iconColor === "text-blue-500" && "border-blue-200",
                      event.iconColor === "text-amber-500" && "border-amber-200",
                      event.iconColor === "text-muted-foreground" && "border-muted"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", event.iconColor)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{event.title}</p>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                        </p>
                        <p className="text-xs text-muted-foreground/60">
                          {format(new Date(event.timestamp), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>

                    {/* Metadata badges */}
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {event.type === "lead_received" && event.metadata.source && (
                          <Badge variant="outline" className="text-xs">
                            {String(event.metadata.source)}
                          </Badge>
                        )}
                        {event.type === "lead_received" && event.metadata.status && (
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              event.metadata.status === "new" && "bg-blue-100 text-blue-700",
                              event.metadata.status === "contacted" && "bg-amber-100 text-amber-700",
                              event.metadata.status === "closed" && "bg-emerald-100 text-emerald-700"
                            )}
                          >
                            {String(event.metadata.status)}
                          </Badge>
                        )}
                        {event.type === "image_flagged" && event.metadata.image_type && (
                          <Badge variant="outline" className="text-xs">
                            {String(event.metadata.image_type)}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// Helper function to get event info from audit action type
function getAuditEventInfo(
  actionType: string,
  details?: unknown
): { title: string; description: string; icon: React.ComponentType<{ className?: string }>; color: string } {
  const detailsObj = details as Record<string, unknown> | undefined;

  switch (actionType) {
    case "provider_approved":
      return {
        title: "Provider Approved",
        description: "Admin approved this provider listing",
        icon: CheckCircle,
        color: "text-emerald-500",
      };
    case "provider_suspended":
      return {
        title: "Provider Suspended",
        description: detailsObj?.reason ? `Reason: ${detailsObj.reason}` : "Provider account suspended",
        icon: Ban,
        color: "text-destructive",
      };
    case "provider_reactivated":
      return {
        title: "Provider Reactivated",
        description: "Admin reactivated this provider account",
        icon: RefreshCw,
        color: "text-emerald-500",
      };
    case "provider_verified":
      return {
        title: "Verified Badge Added",
        description: "Provider marked as verified",
        icon: Shield,
        color: "text-blue-500",
      };
    case "provider_unverified":
      return {
        title: "Verified Badge Removed",
        description: "Provider verification removed",
        icon: Shield,
        color: "text-muted-foreground",
      };
    case "provider_featured":
      return {
        title: "Featured Status Added",
        description: "Provider marked as featured",
        icon: Star,
        color: "text-amber-500",
      };
    case "provider_unfeatured":
      return {
        title: "Featured Status Removed",
        description: "Provider featured status removed",
        icon: Star,
        color: "text-muted-foreground",
      };
    case "admin_notes_updated":
      return {
        title: "Admin Notes Updated",
        description: "Internal notes were updated",
        icon: FileText,
        color: "text-blue-500",
      };
    case "message_sent":
      return {
        title: "Message Sent",
        description: detailsObj?.subject ? `Subject: ${detailsObj.subject}` : "Admin sent a message",
        icon: Send,
        color: "text-blue-500",
      };
    case "email_sent":
      return {
        title: "Email Sent",
        description: detailsObj?.subject ? `Subject: ${detailsObj.subject}` : "Email notification sent",
        icon: Mail,
        color: "text-blue-500",
      };
    case "image_flagged":
      return {
        title: "Image Flagged",
        description: detailsObj?.reason ? `Reason: ${detailsObj.reason}` : "Image flagged for review",
        icon: Flag,
        color: "text-destructive",
      };
    case "image_flag_resolved":
      return {
        title: "Image Flag Resolved",
        description: "Flagged image issue resolved",
        icon: CheckCircle,
        color: "text-emerald-500",
      };
    case "subscription_changed":
      return {
        title: "Subscription Changed",
        description: detailsObj?.new_plan ? `Changed to ${detailsObj.new_plan}` : "Subscription updated",
        icon: CreditCard,
        color: "text-blue-500",
      };
    case "lead_limit_override":
      return {
        title: "Lead Limit Override",
        description: detailsObj?.new_limit ? `New limit: ${detailsObj.new_limit}` : "Lead limit adjusted",
        icon: Users,
        color: "text-amber-500",
      };
    case "profile_viewed":
      return {
        title: "Profile Viewed",
        description: "Admin viewed provider details",
        icon: Eye,
        color: "text-muted-foreground",
      };
    default:
      return {
        title: actionType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        description: "Admin action performed",
        icon: AlertTriangle,
        color: "text-muted-foreground",
      };
  }
}
