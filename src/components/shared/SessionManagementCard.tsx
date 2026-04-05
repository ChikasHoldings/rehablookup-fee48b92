import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  Globe, 
  LogOut, 
  Shield, 
  Clock,
  MapPin,
  AlertTriangle,
  RefreshCw
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
import { useSessionManager, Session } from "@/hooks/useSessionManager";

interface SessionManagementCardProps {
  className?: string;
  compact?: boolean;
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

export function SessionManagementCard({ className, compact = false }: SessionManagementCardProps) {
  const {
    sessions,
    currentSession,
    otherSessions,
    isLoadingSessions,
    sessionsError,
    refetchSessions,
    revokeSession,
    revokeAllOtherSessions,
    isRevokingSession,
    isRevokingAllOthers,
  } = useSessionManager();

  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  const handleRevokeSession = (sessionId: string) => {
    setRevokingSessionId(sessionId);
    revokeSession(sessionId);
  };

  if (isLoadingSessions) {
    return (
      <Card className={className}>
        <CardHeader className={compact ? "pb-3" : undefined}>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Active Sessions
          </CardTitle>
          {!compact && (
            <CardDescription>
              Manage your active sessions across devices
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (sessionsError) {
    return (
      <Card className={className}>
        <CardHeader className={compact ? "pb-3" : undefined}>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Active Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2 text-destructive">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm">Failed to load sessions.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetchSessions()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className={compact ? "pb-3" : undefined}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Active Sessions
            </CardTitle>
            {!compact && (
              <CardDescription>
                Manage your active sessions across devices
              </CardDescription>
            )}
          </div>
          {otherSessions.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={isRevokingAllOthers}
                  className="h-8 text-xs"
                >
                  <LogOut className="h-3 w-3 mr-1.5" />
                  Sign Out All
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
                  <AlertDialogAction onClick={() => revokeAllOtherSessions()}>
                    Sign Out All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Current Session */}
        {currentSession && (
          <div className="p-3 border-2 border-primary/20 bg-primary/5 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-primary/10 rounded-full shrink-0">
                {(() => {
                  const Icon = getDeviceIcon(currentSession.device_name, currentSession.os);
                  return <Icon className="h-4 w-4 text-primary" />;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-foreground truncate">
                    {getDeviceLabel(currentSession)}
                  </span>
                  <Badge variant="default" className="text-xs h-5">
                    This Device
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
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
          <div className="space-y-2">
            {otherSessions.map((session) => {
              const Icon = getDeviceIcon(session.device_name, session.os);
              const isRevoking = revokingSessionId === session.id && isRevokingSession;

              return (
                <div 
                  key={session.id} 
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-muted rounded-full shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm text-foreground truncate block">
                        {getDeviceLabel(session)}
                      </span>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
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
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 text-xs px-2"
                          disabled={isRevoking}
                        >
                          {isRevoking ? "..." : "Sign Out"}
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
            })}
          </div>
        ) : !currentSession ? (
          <div className="text-center py-6 text-muted-foreground">
            <Shield className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No active sessions found.</p>
            <p className="text-xs mt-1">Sessions will appear here after you sign in.</p>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground border rounded-lg bg-muted/30">
            <p className="text-xs">No other active sessions.</p>
            <p className="text-xs mt-0.5 opacity-75">You're only signed in on this device.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
