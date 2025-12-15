import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  Globe, 
  LogOut, 
  Shield, 
  Clock,
  MapPin,
  AlertTriangle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Session {
  id: string;
  user_id: string;
  session_token: string;
  device_name: string | null;
  browser: string | null;
  os: string | null;
  ip_address: string | null;
  location: string | null;
  is_current: boolean;
  last_active_at: string;
  created_at: string;
  revoked_at: string | null;
}

const getDeviceIcon = (deviceName: string | null, os: string | null) => {
  const name = (deviceName || os || "").toLowerCase();
  if (name.includes("mobile") || name.includes("iphone") || name.includes("android")) {
    return Smartphone;
  }
  if (name.includes("tablet") || name.includes("ipad")) {
    return Tablet;
  }
  return Monitor;
};

const getDeviceLabel = (session: Session) => {
  const parts = [];
  if (session.browser) parts.push(session.browser);
  if (session.os) parts.push(`on ${session.os}`);
  return parts.length > 0 ? parts.join(" ") : "Unknown device";
};

export function SessionManagementTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  const { data: sessions, isLoading, error } = useQuery({
    queryKey: ["user-sessions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_sessions")
        .select("*")
        .eq("user_id", user.id)
        .is("revoked_at", null)
        .order("last_active_at", { ascending: false });

      if (error) throw error;
      return data as Session[];
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from("user_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", sessionId);

      if (error) throw error;

      // Log the activity
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.functions.invoke("log-activity", {
          body: {
            user_id: user.id,
            event_type: "session_revoked",
            event_description: "Revoked a session from another device",
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
      toast({
        title: "Session Revoked",
        description: "The session has been signed out successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to revoke session. Please try again.",
        variant: "destructive",
      });
      console.error("Revoke session error:", error);
    },
  });

  const revokeAllOtherSessionsMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get current session token from localStorage
      const currentToken = localStorage.getItem("current_session_token");

      // Revoke all sessions except current
      const { error } = await supabase
        .from("user_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("revoked_at", null)
        .neq("session_token", currentToken || "");

      if (error) throw error;

      // Also sign out other Supabase sessions
      await supabase.auth.signOut({ scope: "others" });

      // Log the activity
      await supabase.functions.invoke("log-activity", {
        body: {
          user_id: user.id,
          event_type: "all_sessions_revoked",
          event_description: "Signed out all other devices",
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
      toast({
        title: "All Other Sessions Revoked",
        description: "You have been signed out from all other devices.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to revoke sessions. Please try again.",
        variant: "destructive",
      });
      console.error("Revoke all sessions error:", error);
    },
  });

  const handleRevokeSession = (sessionId: string) => {
    setRevokingSessionId(sessionId);
    revokeSessionMutation.mutate(sessionId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>
            Manage your active sessions across devices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-9 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Active Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <p>Failed to load sessions. Please try again.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const otherSessions = sessions?.filter(s => !s.is_current) || [];
  const currentSession = sessions?.find(s => s.is_current);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Active Sessions
            </CardTitle>
            <CardDescription>
              Manage your active sessions across devices. You can sign out from other devices here.
            </CardDescription>
          </div>
          {otherSessions.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={revokeAllOtherSessionsMutation.isPending}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out All Others
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign out all other devices?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will sign you out from all other devices. You'll remain signed in on this device.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => revokeAllOtherSessionsMutation.mutate()}
                  >
                    Sign Out All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Session */}
        {currentSession && (
          <div className="p-4 border-2 border-primary/20 bg-primary/5 rounded-lg">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-full">
                {(() => {
                  const Icon = getDeviceIcon(currentSession.device_name, currentSession.os);
                  return <Icon className="h-5 w-5 text-primary" />;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground">
                    {getDeviceLabel(currentSession)}
                  </span>
                  <Badge variant="default" className="text-xs">
                    This Device
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                  {currentSession.ip_address && (
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {currentSession.ip_address}
                    </span>
                  )}
                  {currentSession.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {currentSession.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Active now
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other Sessions */}
        {otherSessions.length > 0 ? (
          otherSessions.map((session) => {
            const Icon = getDeviceIcon(session.device_name, session.os);
            const isRevoking = revokingSessionId === session.id && revokeSessionMutation.isPending;

            return (
              <div 
                key={session.id} 
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-muted rounded-full">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-foreground">
                      {getDeviceLabel(session)}
                    </span>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                      {session.ip_address && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {session.ip_address}
                        </span>
                      )}
                      {session.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {session.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(session.last_active_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={isRevoking}
                      >
                        {isRevoking ? "Revoking..." : "Sign Out"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Sign out this device?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will sign out the session on {getDeviceLabel(session)}. 
                          Anyone using that device will need to sign in again.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRevokeSession(session.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Sign Out Device
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })
        ) : !currentSession ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No active sessions found.</p>
            <p className="text-sm">Sessions will appear here after you sign in.</p>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground border rounded-lg">
            <p className="text-sm">No other active sessions.</p>
            <p className="text-xs mt-1">You're only signed in on this device.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
