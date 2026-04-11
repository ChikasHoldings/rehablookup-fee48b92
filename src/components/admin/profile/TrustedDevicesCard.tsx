import { useState } from "react";
import { Monitor, Smartphone, Laptop, Globe, Trash2, Shield, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface TrustedDevicesCardProps {
  userId: string;
}

function getDeviceIcon(browser?: string | null, os?: string | null) {
  const osLower = (os || "").toLowerCase();
  if (osLower.includes("android") || osLower.includes("ios")) return <Smartphone className="h-4 w-4" />;
  if (osLower.includes("mac") || osLower.includes("windows") || osLower.includes("linux")) return <Laptop className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
}

export function TrustedDevicesCard({ userId }: TrustedDevicesCardProps) {
  const queryClient = useQueryClient();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const { data: devices, isLoading } = useQuery({
    queryKey: ["trusted-devices", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_trusted_devices")
        .select("id, device_label, browser, os, ip_address, last_used_at, created_at, expires_at, is_active")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("last_used_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const handleRevoke = async (deviceId: string) => {
    if (!window.confirm("Revoke trust for this device? You'll need to verify with 2FA next time you log in from it.")) return;

    setRevokingId(deviceId);
    try {
      const { error } = await supabase
        .from("admin_trusted_devices")
        .update({ is_active: false })
        .eq("id", deviceId);

      if (error) throw error;
      toast.success("Device trust revoked");
      queryClient.invalidateQueries({ queryKey: ["trusted-devices"] });
    } catch {
      toast.error("Failed to revoke device");
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAll = async () => {
    if (!window.confirm("Revoke all trusted devices? You'll need to verify with 2FA on your next login.")) return;

    try {
      const { error } = await supabase
        .from("admin_trusted_devices")
        .update({ is_active: false })
        .eq("user_id", userId);

      if (error) throw error;
      // Also clear local trusted device token
      try { localStorage.removeItem("rl_admin_td_token"); } catch {}
      toast.success("All trusted devices revoked");
      queryClient.invalidateQueries({ queryKey: ["trusted-devices"] });
    } catch {
      toast.error("Failed to revoke devices");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Trusted Devices
            </CardTitle>
            <CardDescription>Devices that can skip two-factor authentication</CardDescription>
          </div>
          {devices && devices.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleRevokeAll}>
              Revoke All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !devices || devices.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No trusted devices. Complete 2FA verification and check "Trust this device" to add one.
          </p>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <div key={device.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                    {getDeviceIcon(device.browser, device.os)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {device.browser || "Unknown"} on {device.os || "Unknown"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {device.ip_address && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {device.ip_address}
                        </span>
                      )}
                      <span>Last used {formatDistanceToNow(new Date(device.last_used_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRevoke(device.id)}
                  disabled={revokingId === device.id}
                  className="text-muted-foreground hover:text-destructive"
                >
                  {revokingId === device.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
