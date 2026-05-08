import { useState, useEffect } from "react";
import { 
  Settings, 
  Loader2, 
  ShieldAlert, 
  Briefcase, 
  HeadphonesIcon, 
  Heart,
  ShieldOff 
} from "lucide-react";
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
  AdminRoleType, 
  ADMIN_PERMISSIONS, 
  ROLE_DEFAULTS,
  ADMIN_ROLE_CONFIG 
} from "@/hooks/useAdminUserManagement";
import { cn } from "@/lib/utils";

const ROLE_ICONS: Record<AdminRoleType, React.ElementType> = {
  super_admin: ShieldAlert,
  manager: Briefcase,
  customer_rep: HeadphonesIcon,
  advisor: Heart,
};

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
  
  const [adminRole, setAdminRole] = useState<AdminRoleType>("customer_rep");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [mfaSkip, setMfaSkip] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (user) {
      setAdminRole(user.admin_role);
      setMfaSkip(user.mfa_skip || false);
      
      // Merge defaults with user permissions
      const merged = { ...ROLE_DEFAULTS[user.admin_role], ...user.permissions };
      setPermissions(merged);
      setHasChanges(false);
    }
  }, [user]);

  const handleRoleChange = async (newRole: AdminRoleType) => {
    setAdminRole(newRole);
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
      const promises: Promise<any>[] = [];
      
      // Update role if changed
      if (adminRole !== user.admin_role) {
        promises.push(
          manageAdminUser({
            action: "update_role",
            targetUserId: user.user_id,
            newRole: adminRole,
          })
        );
      }

      // Only update permissions if they actually changed
      const permissionsChanged = Object.keys(permissions).some(
        key => permissions[key] !== user.permissions[key]
      ) || Object.keys(user.permissions).some(
        key => permissions[key] !== user.permissions[key]
      );

      if (permissionsChanged) {
        promises.push(
          manageAdminUser({
            action: "update_permissions",
            targetUserId: user.user_id,
            permissions,
          })
        );
      }

      // Update MFA skip if changed
      if (mfaSkip !== user.mfa_skip) {
        promises.push(
          manageAdminUser({
            action: "toggle_mfa_skip",
            targetUserId: user.user_id,
          })
        );
      }

      // Execute all changes in parallel
      if (promises.length > 0) {
        await Promise.all(promises);
      }

      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation - toast shown
      console.error("[AdminUserPermissionsDialog] Save failed:", error);
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

  const roleConfig = ADMIN_ROLE_CONFIG[adminRole];
  const RoleIcon = ROLE_ICONS[adminRole];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Edit Role & Permissions
          </DialogTitle>
          <DialogDescription>
            Modify role and page-level access for this staff member.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className={cn(
              "font-medium",
              ADMIN_ROLE_CONFIG[user.admin_role].bgColor,
              ADMIN_ROLE_CONFIG[user.admin_role].color
            )}>
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
              className={user.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}
            >
              {user.status}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="role" className="mt-4">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
            <TabsTrigger value="role">Role</TabsTrigger>
            <TabsTrigger value="permissions">Page Access</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="role" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Staff Role</Label>
              <Select value={adminRole} onValueChange={(v) => handleRoleChange(v as AdminRoleType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-amber-500" />
                      <span>Super Admin - Full access</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-blue-500" />
                      <span>Manager - Operations</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="customer_rep">
                    <div className="flex items-center gap-2">
                      <HeadphonesIcon className="h-4 w-4 text-emerald-500" />
                      <span>Customer Rep - Support</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="advisor">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-purple-500" />
                      <span>Advisor - Concierge</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className={cn("rounded-lg p-4 border", roleConfig.bgColor, roleConfig.borderColor)}>
              <div className="flex items-start gap-3">
                <RoleIcon className={cn("h-5 w-5 mt-0.5", roleConfig.iconColor)} />
                <div>
                  <p className={cn("font-medium", roleConfig.color)}>{roleConfig.label}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {roleConfig.description}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Customize which sections of the admin panel this user can access.
            </p>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {Object.entries(ADMIN_PERMISSIONS).map(([key, { label, description }]) => {
                const isSuperAdminOnly = key === "users" || key === "settings" || key === "audit_log" || key === "security_logs";
                const isSuperAdmin = adminRole === "super_admin";
                const isDisabled = isSuperAdmin || (isSuperAdminOnly && !isSuperAdmin);
                
                return (
                  <div
                    key={key}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      isDisabled ? "bg-muted/30" : "bg-card"
                    )}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Label className="font-medium text-sm">{label}</Label>
                        {isSuperAdminOnly && (
                          <Badge variant="outline" className="text-[10px]">Super Admin only</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                    <Switch
                      checked={adminRole === "super_admin" ? true : permissions[key] || false}
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
                    When enabled, this user will not be required to set up two-factor authentication.
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
