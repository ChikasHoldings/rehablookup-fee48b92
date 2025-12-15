import { useState } from "react";
import { UserPlus, ShieldCheck, ShieldAlert, Loader2, Copy, Check, Eye, EyeOff } from "lucide-react";
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
  AdminRole, 
  ADMIN_PERMISSIONS, 
  ROLE_DEFAULTS 
} from "@/hooks/useAdminUserManagement";

interface CreateAdminUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAdminUserDialog({ open, onOpenChange }: CreateAdminUserDialogProps) {
  const { createAdminUser, isCreating } = useAdminUserManagement();
  
  const [step, setStep] = useState<"form" | "success">("form");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<AdminRole>("moderator");
  const [permissions, setPermissions] = useState<Record<string, boolean>>(ROLE_DEFAULTS.moderator);
  const [tempPassword, setTempPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRoleChange = (newRole: AdminRole) => {
    setRole(newRole);
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
        role,
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
    setRole("moderator");
    setPermissions(ROLE_DEFAULTS.moderator);
    setTempPassword("");
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Create Admin User
              </DialogTitle>
              <DialogDescription>
                Create a new admin user with specific role and permissions. They will receive an email with login credentials.
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="details" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">User Details</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name *</Label>
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
                  <Select value={role} onValueChange={(v) => handleRoleChange(v as AdminRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4 text-amber-500" />
                          <div>
                            <span className="font-medium">Super Admin</span>
                            <span className="text-muted-foreground ml-2">- Full access</span>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="moderator">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-blue-500" />
                          <div>
                            <span className="font-medium">Moderator</span>
                            <span className="text-muted-foreground ml-2">- Limited access</span>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      {role === "admin" ? (
                        <ShieldAlert className="h-5 w-5 text-amber-500 mt-0.5" />
                      ) : (
                        <ShieldCheck className="h-5 w-5 text-blue-500 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium">{role === "admin" ? "Super Admin" : "Moderator"}</p>
                        <p className="text-sm text-muted-foreground">
                          {role === "admin" 
                            ? "Full access to all admin features including user management and system settings."
                            : "Limited access for content moderation and provider support. Cannot manage users or system settings."
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="permissions" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Customize which sections of the admin panel this user can access.
                  {role === "admin" && (
                    <Badge variant="secondary" className="ml-2">Super Admin has all permissions</Badge>
                  )}
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
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                Admin User Created Successfully
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
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
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
