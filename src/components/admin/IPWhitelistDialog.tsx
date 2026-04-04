import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Shield, Loader2, X, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { logAdminAction, AdminAuditActions } from "@/hooks/useAdminAuditLog";

interface IPWhitelistDialogProps {
  trigger?: React.ReactNode;
}

export function IPWhitelistDialog({ trigger }: IPWhitelistDialogProps) {
  const [open, setOpen] = useState(false);
  const [newIP, setNewIP] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const queryClient = useQueryClient();

  // Fetch whitelisted IPs from platform_settings
  const { data: whitelistData, isLoading } = useQuery({
    queryKey: ["ip-whitelist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("id, setting_key, setting_value")
        .eq("setting_key", "ip_whitelist")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      
      const settingValue = data?.setting_value as { ips?: Array<{ ip: string; label: string; addedAt: string }> } | null;
      return settingValue?.ips || [];
    },
    enabled: open,
  });

  // Add IP mutation
  const addIP = useMutation({
    mutationFn: async ({ ip, label }: { ip: string; label: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const currentIPs = whitelistData || [];
      const newIPs = [
        ...currentIPs,
        { ip, label, addedAt: new Date().toISOString() }
      ];

      const { error } = await supabase
        .from("platform_settings")
        .upsert({
          setting_key: "ip_whitelist",
          setting_value: { ips: newIPs },
          updated_by: user?.id,
        }, { onConflict: "setting_key" });

      if (error) throw error;

      await logAdminAction({
        actionType: AdminAuditActions.PLATFORM_SETTINGS_UPDATED,
        targetType: "ip_whitelist",
        details: { action: "add", ip, label }
      });
    },
    onSuccess: () => {
      toast.success("IP address added to whitelist");
      setNewIP("");
      setNewLabel("");
      queryClient.invalidateQueries({ queryKey: ["ip-whitelist"] });
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to add IP", { description: error.message });
    },
  });

  // Remove IP mutation
  const removeIP = useMutation({
    mutationFn: async (ip: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const currentIPs = whitelistData || [];
      const newIPs = currentIPs.filter(item => item.ip !== ip);

      const { error } = await supabase
        .from("platform_settings")
        .upsert({
          setting_key: "ip_whitelist",
          setting_value: { ips: newIPs },
          updated_by: user?.id,
        }, { onConflict: "setting_key" });

      if (error) throw error;

      await logAdminAction({
        actionType: AdminAuditActions.PLATFORM_SETTINGS_UPDATED,
        targetType: "ip_whitelist",
        details: { action: "remove", ip }
      });
    },
    onSuccess: () => {
      toast.success("IP address removed from whitelist");
      queryClient.invalidateQueries({ queryKey: ["ip-whitelist"] });
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to remove IP", { description: error.message });
    },
  });

  // Validate IP address format
  const isValidIP = (ip: string) => {
    // IPv4 validation
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    // CIDR notation
    const cidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/;
    return ipv4Regex.test(ip) || cidrRegex.test(ip);
  };

  const handleAddIP = () => {
    if (!newIP.trim()) {
      toast.error("Please enter an IP address");
      return;
    }
    if (!isValidIP(newIP.trim())) {
      toast.error("Invalid IP address format", { 
        description: "Use format like 192.168.1.1 or 192.168.1.0/24" 
      });
      return;
    }
    if (whitelistData?.some(item => item.ip === newIP.trim())) {
      toast.error("IP address already whitelisted");
      return;
    }
    addIP.mutate({ ip: newIP.trim(), label: newLabel.trim() || "Unlabeled" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Shield className="h-4 w-4" />
            Manage Whitelist
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-500" />
            IP Whitelist Management
          </DialogTitle>
          <DialogDescription>
            Add IP addresses that are allowed to access the admin panel when IP restriction is enabled.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new IP form */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/50 border">
            <div className="grid gap-2">
              <Label htmlFor="ip-address">IP Address</Label>
              <Input
                id="ip-address"
                placeholder="192.168.1.1 or 10.0.0.0/24"
                value={newIP}
                onChange={(e) => setNewIP(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddIP()}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ip-label">Label (optional)</Label>
              <Input
                id="ip-label"
                placeholder="e.g., Office, Home, VPN"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddIP()}
              />
            </div>
            <Button 
              onClick={handleAddIP} 
              className="w-full gap-2"
              disabled={addIP.isPending}
            >
              {addIP.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add IP Address
            </Button>
          </div>

          {/* Whitelisted IPs list */}
          <div className="space-y-2">
            <Label>Whitelisted IP Addresses</Label>
            <ScrollArea className="h-[200px] rounded-lg border p-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : whitelistData && whitelistData.length > 0 ? (
                <div className="space-y-2">
                  {whitelistData.map((item) => (
                    <div 
                      key={item.ip}
                      className="flex items-center justify-between p-2 rounded-lg bg-background border"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-green-500" />
                        <div>
                          <p className="font-mono text-sm">{item.ip}</p>
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeIP.mutate(item.ip)}
                        disabled={removeIP.isPending}
                      >
                        {removeIP.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Shield className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No IP addresses whitelisted</p>
                  <p className="text-xs text-muted-foreground">Add IPs above to restrict access</p>
                </div>
              )}
            </ScrollArea>
          </div>

          {whitelistData && whitelistData.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100">
              <Shield className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700">
                When IP restriction is enabled, only these addresses can access the admin panel.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
