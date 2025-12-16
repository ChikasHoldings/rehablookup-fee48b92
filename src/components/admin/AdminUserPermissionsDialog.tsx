import { useState, useEffect } from "react";
import { Settings, Loader2, ShieldCheck, ShieldAlert, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  useAdminUserManagement, 
  AdminUser, 
  AdminRole, 
  ADMIN_PERMISSIONS, 
  ROLE_DEFAULTS 
} from "@/hooks/useAdminUserManagement";

interface AdminUserPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
}

export function AdminUserPermissionsDialog({ 
  open, 
  onOpenChange, 
  user 
}: AdminUserPermissionsDialogProps) {
  const { manageAdminUser, isManaging } = useAdminUserManagement();
  
  const [role, setRole] = useState<AdminRole>("moderator");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [mfaSkip, setMfaSkip] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (user) {
      const primaryRole = user.roles.includes("admin") ? "admin" : "moderator";
      setRole(primaryRole);
      setMfaSkip(user.mfa_skip || false);
      
      // Merge defaults with user permissions
      const merged = { ...ROLE_DEFAULTS[primaryRole], ...user.permissions };
      setPermissions(merged);
      setHasChanges(false);
    }
  }, [user]);

  const handleRoleChange = async (newRole: AdminRole) => {
    if (!user) return;
    
    setRole(newRole);
    setPermissions(ROLE_DEFAULTS[newRole]);
    setHasChanges(true);
  };

  const togglePermission = (key: string) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      // Update role if changed
      const currentRole = user.roles.includes("admin") ? "admin" : "moderator";
      if (role !== currentRole) {
        await manageAdminUser({
          action: "update_role",
          targetUserId: user.user_id,
          newRole: role,
        });
      }

      // Update permissions
      await manageAdminUser({
        action: "update_permissions",
        targetUserId: user.user_id,
        permissions,
      });

      // Update MFA skip if changed
      if (mfaSkip !== user.mfa_skip) {
        await manageAdminUser({
          action: "toggle_mfa_skip",
          targetUserId: user.user_id,
        });
      }

      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (!user) return null;

  const displayName = user.display_name || 
    (user.first_name && user.last_name 
      ? `${user.first_name} ${user.last_name}` 
      : user.email);

  const initials = 
    (user.first_name?.[0] || "") + (user.last_name?.[0] || "") || 
    user.email.slice(0, 2).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Edit User Permissions
          </DialogTitle>
          <DialogDescription>
            Modify role and page-level access for this admin user.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className="bg-slate-200 text-slate-700 font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{displayName}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="ml-auto">
            <Badge 
              variant="secondary"
              className={user.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
            >
              {user.status}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="role" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="role">Role</TabsTrigger>
            <TabsTrigger value="permissions">Page Access</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="role" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>User Role</Label>
              <Select value={role} onValueChange={(v) => handleRoleChange(v as AdminRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-amber-500" />
                      <span>Super Admin - Full access</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="moderator">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-blue-500" />
                      <span>Moderator - Limited access</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                {role === "admin" ? (
                  <ShieldAlert className="h-5 w-5 text-amber-500 mt-0.5" />
                ) : (
                  <ShieldCheck className="h-5 w-5 text-blue-500 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">{role === "admin" ? "Super Admin" : "Moderator"}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {role === "admin" 
                      ? "Full access to all admin features including user management, system settings, and audit logs."
                      : "Limited access for content moderation and provider support. Cannot manage users or access system settings."
                    }
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Customize which sections of the admin panel this user can access.
            </p>

            <div className="space-y-3">
              {Object.entries(ADMIN_PERMISSIONS).map(([key, { label, description }]) => {
                const isSuperAdminOnly = key === "users";
                const isDisabled = role === "admin" || (isSuperAdminOnly && role === "moderator");
                
                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isDisabled ? "bg-muted/30" : "bg-card"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Label className="font-medium">{label}</Label>
                        {isSuperAdminOnly && (
                          <Badge variant="outline" className="text-xs">Super Admin only</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                    <Switch
                      checked={role === "admin" ? true : permissions[key] || false}
                      onCheckedChange={() => togglePermission(key)}
                      disabled={isDisabled}
                    />
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Configure security settings for this user.
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldOff className="h-4 w-4 text-amber-500" />
                    <Label className="font-medium">Skip 2FA Enforcement</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    When enabled, this user will not be required to set up two-factor authentication on login.
                  </p>
                </div>
                <Switch
                  checked={mfaSkip}
                  onCheckedChange={(checked) => {
                    setMfaSkip(checked);
                    setHasChanges(true);
                  }}
                />
              </div>

              {mfaSkip && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800">
                    <strong>Warning:</strong> Skipping 2FA enforcement reduces account security. 
                    Only use this for accounts that require special access or during initial setup.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isManaging || !hasChanges}>
            {isManaging ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
