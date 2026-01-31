import { useState } from "react";
import { 
  UserPlus, 
  ShieldAlert, 
  Briefcase, 
  HeadphonesIcon, 
  Heart,
  Loader2, 
  Copy, 
  Check, 
  Eye, 
  EyeOff 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  useAdminUserManagement, 
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

interface CreateAdminUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAdminUserDialog({ open, onOpenChange }: CreateAdminUserDialogProps) {
  const { createAdminUser, isCreating } = useAdminUserManagement();
  
  const [step, setStep] = useState<"form" | "success">("form");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [adminRole, setAdminRole] = useState<AdminRoleType>("customer_rep");
  const [permissions, setPermissions] = useState<Record<string, boolean>>(ROLE_DEFAULTS.customer_rep);
  const [tempPassword, setTempPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRoleChange = (newRole: AdminRoleType) => {
    setAdminRole(newRole);
    setPermissions(ROLE_DEFAULTS[newRole]);
  };

  const togglePermission = (key: string) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = async () => {
    if (!email.trim() || !displayName.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const result = await createAdminUser({
        email: email.trim(),
        displayName: displayName.trim(),
        adminRole,
        permissions,
      });

      if (result?.tempPassword) {
        setTempPassword(result.tempPassword);
        setStep("success");
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Password copied to clipboard");
  };

  const handleClose = () => {
    setStep("form");
    setEmail("");
    setDisplayName("");
    setAdminRole("customer_rep");
    setPermissions(ROLE_DEFAULTS.customer_rep);
    setTempPassword("");
    setCopied(false);
    onOpenChange(false);
  };

  const roleConfig = ADMIN_ROLE_CONFIG[adminRole];
  const RoleIcon = ROLE_ICONS[adminRole];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Add Staff Member
              </DialogTitle>
              <DialogDescription>
                Create a new admin staff member with specific role and permissions.
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="details" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">User Details</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Full Name *</Label>
                  <Input
                    id="displayName"
                    placeholder="John Smith"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Login credentials will be sent to this email
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Role *</Label>
                  <Select value={adminRole} onValueChange={(v) => handleRoleChange(v as AdminRoleType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4 text-amber-500" />
                          <div>
                            <span className="font-medium">Super Admin</span>
                            <span className="text-muted-foreground ml-2 text-xs">- Full access</span>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="manager">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-blue-500" />
                          <div>
                            <span className="font-medium">Manager</span>
                            <span className="text-muted-foreground ml-2 text-xs">- Operations</span>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="customer_rep">
                        <div className="flex items-center gap-2">
                          <HeadphonesIcon className="h-4 w-4 text-emerald-500" />
                          <div>
                            <span className="font-medium">Customer Rep</span>
                            <span className="text-muted-foreground ml-2 text-xs">- Support</span>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="advisor">
                        <div className="flex items-center gap-2">
                          <Heart className="h-4 w-4 text-purple-500" />
                          <div>
                            <span className="font-medium">Placement Advisor</span>
                            <span className="text-muted-foreground ml-2 text-xs">- Concierge</span>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Card className={cn("border", roleConfig.borderColor, roleConfig.bgColor)}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <RoleIcon className={cn("h-5 w-5 mt-0.5", roleConfig.iconColor)} />
                      <div>
                        <p className={cn("font-medium", roleConfig.color)}>{roleConfig.label}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {roleConfig.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="permissions" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Customize page access for this user.
                  {adminRole === "super_admin" && (
                    <Badge variant="secondary" className="ml-2">Super Admin has all permissions</Badge>
                  )}
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
            </Tabs>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create User
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600">
                <Check className="h-5 w-5" />
                Staff Member Created
              </DialogTitle>
              <DialogDescription>
                The user has been created and an invitation email has been sent.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm font-medium text-amber-800 mb-2">
                  ⚠️ Important: Save these credentials
                </p>
                <p className="text-xs text-amber-700">
                  The temporary password is shown only once. Make sure to copy it if needed.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs uppercase">Email</Label>
                  <div className="font-mono text-sm bg-muted p-2 rounded">{email}</div>
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs uppercase">Temporary Password</Label>
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-sm bg-muted p-2 rounded flex-1">
                      {showPassword ? tempPassword : "••••••••••••"}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyPassword}
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-muted rounded-lg p-4 text-sm">
                <p className="font-medium mb-1">Next Steps:</p>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  <li>• The user will receive an invitation email with login instructions</li>
                  <li>• They must change their password upon first login</li>
                  <li>• The temporary password expires in 72 hours</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
