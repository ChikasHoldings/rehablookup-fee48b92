import { useState, useEffect } from "react";
import { History, LogIn, KeyRound, UserCog, Mail, Image, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  password_change: KeyRound,
  profile_update: UserCog,
  email_change: Mail,
  avatar_update: Image,
};

const eventColors: Record<string, string> = {
  sign_in: "text-blue-500 bg-blue-500/10",
  password_change: "text-amber-500 bg-amber-500/10",
  profile_update: "text-green-500 bg-green-500/10",
  email_change: "text-purple-500 bg-purple-500/10",
  avatar_update: "text-pink-500 bg-pink-500/10",
};

export function ActivityLog(props: React.HTMLAttributes<HTMLDivElement>) {
  const { userId, isAuthenticated, isReady } = useSeekerSession();
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchActivities = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from("account_activity_log")
          .select("id, event_type, event_description, created_at, metadata")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);

        if (!isMounted) return;
        
        if (!error && data) {
          setActivities(data);
        }
      } catch (err) {
        console.error("Failed to fetch activities:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        if (session?.user) {
          setIsAuthenticated(true);
          // Defer data fetch to avoid deadlock
          setTimeout(() => {
            if (isMounted) {
              fetchActivities(session.user.id);
            }
          }, 0);
        } else {
          setIsAuthenticated(false);
          setActivities([]);
          setIsLoading(false);
        }
      }
    );

    // Then check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      
      if (session?.user) {
        setIsAuthenticated(true);
        fetchActivities(session.user.id);
      } else {
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    });
    
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
        {activities.length === 0 ? (
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
