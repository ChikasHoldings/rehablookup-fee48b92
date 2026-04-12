import { useState } from "react";
import { createAdminUserSchema, validateInput, sanitizeText } from "@/lib/adminValidation";
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
  EyeOff,
  Phone as PhoneIcon,
  Calendar,
  Percent,
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
import { PhoneInput } from "@/components/ui/phone-input";
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

type EmploymentType = "employee" | "contractor" | "va";

const EMPLOYMENT_OPTIONS: Record<AdminRoleType, { value: EmploymentType; label: string }[]> = {
  super_admin: [{ value: "employee", label: "Employee" }],
  manager: [{ value: "employee", label: "Employee" }],
  advisor: [
    { value: "employee", label: "Employee" },
    { value: "contractor", label: "Contractor" },
  ],
  customer_rep: [
    { value: "employee", label: "Employee" },
    { value: "va", label: "Virtual Assistant (VA)" },
  ],
};

interface CreateAdminUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAdminUserDialog({ open, onOpenChange }: CreateAdminUserDialogProps) {
  const { createAdminUser, isCreating } = useAdminUserManagement();
  
  const [step, setStep] = useState<"form" | "success">("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [adminRole, setAdminRole] = useState<AdminRoleType>("customer_rep");
  const [employmentType, setEmploymentType] = useState<EmploymentType>("employee");
  const [commissionRate, setCommissionRate] = useState(10);
  const [hireDate, setHireDate] = useState("");
  const [permissions, setPermissions] = useState<Record<string, boolean>>(ROLE_DEFAULTS.customer_rep);
  const [tempPassword, setTempPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRoleChange = (newRole: AdminRoleType) => {
    setAdminRole(newRole);
    setPermissions(ROLE_DEFAULTS[newRole]);
    // Auto-set employment type based on role
    const options = EMPLOYMENT_OPTIONS[newRole];
    if (options.length === 1) {
      setEmploymentType(options[0].value);
    } else {
      setEmploymentType("employee");
    }
  };

  const togglePermission = (key: string) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = async () => {
    // Validate with Zod schema
    const validation = validateInput(createAdminUserSchema, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      adminRole,
      employmentType,
      commissionRate: employmentType === "contractor" ? commissionRate : undefined,
      hireDate: hireDate || undefined,
      permissions,
    });

    if (!validation.success) {
      const errors = (validation as { success: false; errors: Record<string, string> }).errors;
      const firstError = Object.values(errors)[0];
      toast.error(firstError || "Please fix the form errors");
      return;
    }

    const { data: validated } = validation;
    const displayName = `${validated.firstName} ${validated.lastName || ""}`.trim();

    try {
      const result = await createAdminUser({
        email: sanitizeText(validated.email),
        displayName: sanitizeText(displayName),
        adminRole: validated.adminRole,
        permissions: validated.permissions,
        employmentType: validated.employmentType,
        phone: validated.phone ? sanitizeText(validated.phone) : undefined,
        commissionRate: validated.commissionRate,
        hireDate: validated.hireDate || undefined,
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
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setAdminRole("customer_rep");
    setEmploymentType("employee");
    setCommissionRate(10);
    setHireDate("");
    setPermissions(ROLE_DEFAULTS.customer_rep);
    setTempPassword("");
    setCopied(false);
    onOpenChange(false);
  };

  const roleConfig = ADMIN_ROLE_CONFIG[adminRole];
  const RoleIcon = ROLE_ICONS[adminRole];
  const employmentOptions = EMPLOYMENT_OPTIONS[adminRole];
  const isContractor = employmentType === "contractor";
  const isSingleEmploymentOption = employmentOptions.length === 1;

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
                Create a new admin staff member with role, classification, and permissions.
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="identity" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="identity">Identity</TabsTrigger>
                <TabsTrigger value="classification">Classification</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
              </TabsList>

              {/* Tab 1 — Identity */}
              <TabsContent value="identity" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Smith"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
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
                    A welcome email with login credentials will be sent here
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <PhoneInput value={phone} onChange={setPhone} />
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
                          <ShieldAlert className="h-4 w-4 text-warning" />
                          <span className="font-medium">Super Admin</span>
                          <span className="text-muted-foreground text-xs">— Full access</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="manager">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-primary" />
                          <span className="font-medium">Manager</span>
                          <span className="text-muted-foreground text-xs">— Operations</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="customer_rep">
                        <div className="flex items-center gap-2">
                          <HeadphonesIcon className="h-4 w-4 text-success" />
                          <span className="font-medium">Customer Rep</span>
                          <span className="text-muted-foreground text-xs">— Support</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="advisor">
                        <div className="flex items-center gap-2">
                          <Heart className="h-4 w-4 text-accent-foreground" />
                          <span className="font-medium">Placement Advisor</span>
                          <span className="text-muted-foreground text-xs">— Concierge</span>
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
                        <p className="text-sm text-muted-foreground mt-1">{roleConfig.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 2 — Classification */}
              <TabsContent value="classification" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Employment Type *</Label>
                  {isSingleEmploymentOption ? (
                    <div className="p-3 rounded-lg border bg-muted/50">
                      <p className="text-sm font-medium">{employmentOptions[0].label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {adminRole === "super_admin" || adminRole === "manager"
                          ? "This role is always classified as Employee"
                          : "Auto-assigned"}
                      </p>
                    </div>
                  ) : (
                    <Select value={employmentType} onValueChange={(v) => setEmploymentType(v as EmploymentType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {employmentOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {isContractor && (
                  <div className="space-y-2">
                    <Label htmlFor="commissionRate" className="flex items-center gap-1.5">
                      <Percent className="h-3.5 w-3.5" />
                      Commission Rate
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="commissionRate"
                        type="number"
                        min={1}
                        max={100}
                        value={commissionRate}
                        onChange={(e) => setCommissionRate(parseInt(e.target.value) || 10)}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">% per successful placement</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This rate will be used to calculate commissions on placement fees
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="hireDate" className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Start / Hire Date
                  </Label>
                  <Input
                    id="hireDate"
                    type="date"
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                  />
                </div>

                {/* Classification summary */}
                <Card className="border bg-muted/30">
                  <CardContent className="pt-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Summary</p>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Role</span>
                        <Badge variant="outline" className="text-xs">{roleConfig.label}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Classification</span>
                        <span className="font-medium capitalize">{employmentType.replace("_", " ")}</span>
                      </div>
                      {isContractor && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Commission</span>
                          <span className="font-medium">{commissionRate}%</span>
                        </div>
                      )}
                      {hireDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Start Date</span>
                          <span className="font-medium">{new Date(hireDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 3 — Permissions */}
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
              <DialogTitle className="flex items-center gap-2 text-success">
                <Check className="h-5 w-5" />
                Staff Member Created
              </DialogTitle>
              <DialogDescription>
                The user has been created and a branded welcome email has been sent.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                <p className="text-sm font-medium text-warning mb-2">
                  ⚠️ Important: Save these credentials
                </p>
                <p className="text-xs text-muted-foreground">
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
                      {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-muted rounded-lg p-4 text-sm">
                <p className="font-medium mb-1">Next Steps:</p>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  <li>• The user will receive a role-specific welcome email with login instructions</li>
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
