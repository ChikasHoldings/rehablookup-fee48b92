import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Trash2, Loader2, Shield, Clock, User, Globe } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { logAdminAction, AdminAuditActions } from "@/hooks/useAdminAuditLog";

interface BlockedIdentifier {
  id: string;
  identifier: string;
  identifier_type: string;
  reason: string | null;
  blocked_at: string;
  expires_at: string | null;
  is_active: boolean;
  blocked_by: string;
}

interface BlockedIdentifiersDialogProps {
  trigger?: React.ReactNode;
}

export function BlockedIdentifiersDialog({ trigger }: BlockedIdentifiersDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"ip" | "email">("ip");
  const queryClient = useQueryClient();

  // Fetch blocked identifiers
  const { data: blockedIdentifiers, isLoading } = useQuery({
    queryKey: ["blocked-identifiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocked_identifiers")
        .select("id, identifier, identifier_type, reason, blocked_by, blocked_at, expires_at, is_active")
        .eq("is_active", true)
        .order("blocked_at", { ascending: false });

      if (error) throw error;
      return data as BlockedIdentifier[];
    },
    enabled: open,
  });

  // Unblock identifier mutation
  const unblockIdentifier = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("blocked_identifiers")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      const identifier = blockedIdentifiers?.find(b => b.id === id);
      
      await logAdminAction({
        actionType: AdminAuditActions.PLATFORM_SETTINGS_UPDATED,
        targetType: "blocked_identifier",
        targetId: id,
        details: { action: "unblock", identifier: identifier?.identifier }
      });
    },
    onSuccess: () => {
      toast.success("Identifier unblocked");
      queryClient.invalidateQueries({ queryKey: ["blocked-identifiers"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to unblock", { description: error.message });
    },
  });

  const ipBlocked = blockedIdentifiers?.filter(b => b.identifier_type === "ip") || [];
  const emailBlocked = blockedIdentifiers?.filter(b => b.identifier_type === "email") || [];

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return "Permanent";
    const expiry = new Date(expiresAt);
    if (expiry < new Date()) return "Expired";
    return formatDistanceToNow(expiry, { addSuffix: true });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Ban className="h-4 w-4" />
            View Blocked
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            Blocked Identifiers
          </DialogTitle>
          <DialogDescription>
            View and manage blocked IP addresses and email addresses from brute force protection.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "ip" | "email")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ip" className="gap-2">
              <Globe className="h-4 w-4" />
              IP Addresses ({ipBlocked.length})
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-2">
              <User className="h-4 w-4" />
              Emails ({emailBlocked.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ip" className="mt-4">
            <ScrollArea className="h-[300px] rounded-lg border p-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : ipBlocked.length > 0 ? (
                <div className="space-y-2">
                  {ipBlocked.map((item) => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Ban className="h-4 w-4 text-destructive" />
                          <p className="font-mono text-sm font-medium">{item.identifier}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatExpiry(item.expires_at)}
                          </Badge>
                          {item.reason && (
                            <span className="text-xs text-muted-foreground">{item.reason}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Blocked {formatDistanceToNow(new Date(item.blocked_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-success hover:text-success"
                        onClick={() => unblockIdentifier.mutate(item.id)}
                        disabled={unblockIdentifier.isPending}
                      >
                        {unblockIdentifier.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Unblock"
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Shield className="h-8 w-8 text-success mb-2" />
                  <p className="text-sm text-muted-foreground">No blocked IP addresses</p>
                  <p className="text-xs text-muted-foreground">
                    IPs are auto-blocked after too many failed login attempts
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="email" className="mt-4">
            <ScrollArea className="h-[300px] rounded-lg border p-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : emailBlocked.length > 0 ? (
                <div className="space-y-2">
                  {emailBlocked.map((item) => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Ban className="h-4 w-4 text-destructive" />
                          <p className="text-sm font-medium">{item.identifier}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatExpiry(item.expires_at)}
                          </Badge>
                          {item.reason && (
                            <span className="text-xs text-muted-foreground">{item.reason}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Blocked {formatDistanceToNow(new Date(item.blocked_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-success hover:text-success"
                        onClick={() => unblockIdentifier.mutate(item.id)}
                        disabled={unblockIdentifier.isPending}
                      >
                        {unblockIdentifier.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Unblock"
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Shield className="h-8 w-8 text-success mb-2" />
                  <p className="text-sm text-muted-foreground">No blocked email addresses</p>
                  <p className="text-xs text-muted-foreground">
                    Emails are auto-blocked after too many failed login attempts
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-info/10 border border-info/20">
          <Shield className="h-4 w-4 text-info shrink-0" />
          <p className="text-xs text-muted-foreground">
            Blocked identifiers are automatically managed by the brute force protection system. 
            Unblocking an identifier allows them to attempt login again.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
