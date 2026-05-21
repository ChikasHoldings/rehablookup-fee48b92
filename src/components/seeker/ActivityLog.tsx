import { useState, useEffect, useCallback } from "react";
import { History, LogIn, LogOut, KeyRound, UserCog, Mail, Image, Phone, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSeekerSession } from "@/hooks/useSeekerSession";
import { formatDistanceToNow } from "date-fns";

interface ActivityEvent {
  id: string;
  event_type: string;
  event_description: string;
  created_at: string;
  metadata: unknown;
}

const eventIcons: Record<string, typeof LogIn> = {
  sign_in: LogIn,
  sign_out: LogOut,
  password_change: KeyRound,
  profile_update: UserCog,
  email_change: Mail,
  avatar_update: Image,
  avatar_remove: Image,
  phone_verify: Phone,
};

const eventColors: Record<string, string> = {
  sign_in: "text-blue-500 bg-blue-500/10",
  sign_out: "text-slate-500 bg-slate-500/10",
  password_change: "text-amber-500 bg-amber-500/10",
  profile_update: "text-green-500 bg-green-500/10",
  email_change: "text-purple-500 bg-purple-500/10",
  avatar_update: "text-pink-500 bg-pink-500/10",
  avatar_remove: "text-pink-500 bg-pink-500/10",
  phone_verify: "text-teal-500 bg-teal-500/10",
};

export function ActivityLog(props: React.HTMLAttributes<HTMLDivElement>) {
  const { userId, isAuthenticated } = useSeekerSession();
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!userId) {
      setActivities([]);
      setIsLoading(false);
      return;
    }
    setError(null);
    const { data, error: queryError } = await supabase
      .from("account_activity_log")
      .select("id, event_type, event_description, created_at, metadata")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (queryError) {
      setError(queryError.message || "Failed to load activity");
      setActivities([]);
    } else {
      setActivities(data || []);
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchActivities();
      if (cancelled) setActivities([]);
    })();
    return () => { cancelled = true; };
  }, [fetchActivities]);

  // Realtime: account_activity_log was added to supabase_realtime in
  // migration 20260704000000 so INSERT events propagate. Filter by
  // user_id server-side; RLS independently gates row visibility.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`seeker-activity-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "account_activity_log", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as ActivityEvent | null;
          if (!row) return;
          setActivities((prev) => {
            if (prev.some((a) => a.id === row.id)) return prev;
            return [row, ...prev].slice(0, 20);
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const getIcon = (eventType: string) => {
    const Icon = eventIcons[eventType] || History;
    return Icon;
  };

  const getColorClasses = (eventType: string) => {
    return eventColors[eventType] || "text-muted-foreground bg-muted";
  };

  // Don't render anything if not authenticated
  if (isAuthenticated === false) {
    return null;
  }
  
  if (isLoading || isAuthenticated === null) {
    return (
      <Card {...props}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center py-4 space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchActivities}>
              Try again
            </Button>
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No recent activity to show
          </p>
        ) : (
          <ScrollArea className="h-[280px] pr-4">
            <div className="space-y-3">
              {activities.map((activity) => {
                const Icon = getIcon(activity.event_type);
                const colorClasses = getColorClasses(activity.event_type);
                
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className={`p-2 rounded-full ${colorClasses}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {activity.event_description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
