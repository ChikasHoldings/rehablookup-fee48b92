import { useState } from "react";
import {
  Settings,
  Shield,
  Database,
  Bell,
  Globe,
  Mail,
  Clock,
  Server,
  HardDrive,
  Zap,
  Lock,
  Key,
  Smartphone,
  Users,
  AlertTriangle,
  CheckCircle,
  Info,
  ExternalLink,
  RefreshCw,
  Palette,
  FileText,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SettingRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  comingSoon?: boolean;
}

const SettingRow = ({ icon, title, description, children, comingSoon }: SettingRowProps) => (
  <div className={cn(
    "flex items-center justify-between py-4",
    comingSoon && "opacity-60"
  )}>
    <div className="flex items-start gap-3">
      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="font-medium">{title}</p>
          {comingSoon && (
            <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
    <div className="shrink-0 ml-4">
      {children}
    </div>
  </div>
);

const StatusBadge = ({ status, label }: { status: "active" | "inactive" | "warning"; label: string }) => {
  const config = {
    active: "bg-green-100 text-green-700 border-green-200",
    inactive: "bg-slate-100 text-slate-600 border-slate-200",
    warning: "bg-amber-100 text-amber-700 border-amber-200",
  };
  
  return (
    <Badge variant="outline" className={cn("gap-1", config[status])}>
      {status === "active" && <CheckCircle className="h-3 w-3" />}
      {status === "inactive" && <Info className="h-3 w-3" />}
      {status === "warning" && <AlertTriangle className="h-3 w-3" />}
      {label}
    </Badge>
  );
};

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState("general");

  // Mock data for storage
  const storageUsed = 2.4;
  const storageTotal = 10;
  const storagePercent = (storageUsed / storageTotal) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-muted-foreground">Manage platform configuration and preferences</p>
        </div>
        <Button variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh Status
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Data</span>
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Platform Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="h-5 w-5 text-blue-500" />
                  Platform Settings
                </CardTitle>
                <CardDescription>General platform configuration options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <SettingRow
                  icon={<Server className="h-4 w-4 text-slate-500" />}
                  title="Maintenance Mode"
                  description="Temporarily disable public access to the platform"
                >
                  <Switch />
                </SettingRow>
                <Separator />
                <SettingRow
                  icon={<Zap className="h-4 w-4 text-slate-500" />}
                  title="API Rate Limiting"
                  description="Control request throttling for API endpoints"
                >
                  <Select defaultValue="default">
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
                <Separator />
                <SettingRow
                  icon={<Clock className="h-4 w-4 text-slate-500" />}
                  title="Session Timeout"
                  description="Auto logout after period of inactivity"
                >
                  <Select defaultValue="30">
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Palette className="h-5 w-5 text-purple-500" />
                  Appearance
                </CardTitle>
                <CardDescription>Customize the admin panel look and feel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <SettingRow
                  icon={<Palette className="h-4 w-4 text-slate-500" />}
                  title="Theme Mode"
                  description="Choose between light and dark themes"
                  comingSoon
                >
                  <Select defaultValue="light" disabled>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
                <Separator />
                <SettingRow
                  icon={<Activity className="h-4 w-4 text-slate-500" />}
                  title="Compact Mode"
                  description="Use condensed layouts for data tables"
                  comingSoon
                >
                  <Switch disabled />
                </SettingRow>
                <Separator />
                <SettingRow
                  icon={<FileText className="h-4 w-4 text-slate-500" />}
                  title="Show Timestamps"
                  description="Display relative or absolute timestamps"
                >
                  <Select defaultValue="relative">
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relative">Relative</SelectItem>
                      <SelectItem value="absolute">Absolute</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
              </CardContent>
            </Card>
          </div>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-green-500" />
                System Status
              </CardTitle>
              <CardDescription>Current platform health and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                  <div className="flex items-center gap-2 text-green-700 mb-1">
                    <Server className="h-4 w-4" />
                    <span className="text-sm font-medium">API Server</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">Healthy</p>
                  <p className="text-xs text-green-600 mt-1">99.9% uptime</p>
                </div>
                <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                  <div className="flex items-center gap-2 text-green-700 mb-1">
                    <Database className="h-4 w-4" />
                    <span className="text-sm font-medium">Database</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">Connected</p>
                  <p className="text-xs text-green-600 mt-1">15ms latency</p>
                </div>
                <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                  <div className="flex items-center gap-2 text-green-700 mb-1">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm font-medium">Email Service</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">Active</p>
                  <p className="text-xs text-green-600 mt-1">Resend configured</p>
                </div>
                <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                  <div className="flex items-center gap-2 text-green-700 mb-1">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm font-medium">Edge Functions</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">Running</p>
                  <p className="text-xs text-green-600 mt-1">24 functions deployed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Authentication */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lock className="h-5 w-5 text-amber-500" />
                  Authentication
                </CardTitle>
                <CardDescription>Configure login and access security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <SettingRow
                  icon={<Smartphone className="h-4 w-4 text-slate-500" />}
                  title="Two-Factor Authentication"
                  description="Require 2FA for all admin accounts"
                  comingSoon
                >
                  <Switch disabled />
                </SettingRow>
                <Separator />
                <SettingRow
                  icon={<Key className="h-4 w-4 text-slate-500" />}
                  title="Password Requirements"
                  description="Minimum password strength settings"
                >
                  <Select defaultValue="strong">
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="strong">Strong</SelectItem>
                      <SelectItem value="very-strong">Very Strong</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
                <Separator />
                <SettingRow
                  icon={<Clock className="h-4 w-4 text-slate-500" />}
                  title="Password Expiry"
                  description="Force password change after period"
                  comingSoon
                >
                  <Select defaultValue="never" disabled>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
              </CardContent>
            </Card>

            {/* Access Control */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-blue-500" />
                  Access Control
                </CardTitle>
                <CardDescription>Manage user permissions and roles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <SettingRow
                  icon={<Shield className="h-4 w-4 text-slate-500" />}
                  title="Role-Based Access"
                  description="Granular permission system for admin users"
                >
                  <StatusBadge status="active" label="Enabled" />
                </SettingRow>
                <Separator />
                <SettingRow
                  icon={<Activity className="h-4 w-4 text-slate-500" />}
                  title="Session Management"
                  description="Track and manage active user sessions"
                >
                  <StatusBadge status="active" label="Active" />
                </SettingRow>
                <Separator />
                <SettingRow
                  icon={<FileText className="h-4 w-4 text-slate-500" />}
                  title="Audit Logging"
                  description="Track all administrative actions"
                >
                  <StatusBadge status="active" label="Recording" />
                </SettingRow>
              </CardContent>
            </Card>
          </div>

          {/* Security Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-green-500" />
                Security Overview
              </CardTitle>
              <CardDescription>Current security posture and recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-green-50 border border-green-100">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="font-medium text-green-800">Row Level Security Enabled</p>
                    <p className="text-sm text-green-600">All database tables have RLS policies configured</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-green-50 border border-green-100">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="font-medium text-green-800">HTTPS Enforced</p>
                    <p className="text-sm text-green-600">All connections are encrypted with TLS 1.3</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-amber-50 border border-amber-100">
                  <AlertTriangle className="h-8 w-8 text-amber-500" />
                  <div className="flex-1">
                    <p className="font-medium text-amber-800">Two-Factor Authentication</p>
                    <p className="text-sm text-amber-600">Consider enabling 2FA for enhanced security</p>
                  </div>
                  <Badge variant="secondary">Recommended</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Email Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="h-5 w-5 text-blue-500" />
                  Email Notifications
                </CardTitle>
                <CardDescription>Configure admin email alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <SettingRow
                  icon={<Users className="h-4 w-4 text-slate-500" />}
                  title="New Provider Signups"
                  description="Get notified when providers register"
                >
                  <Switch defaultChecked />
                </SettingRow>
                <Separator />
                <SettingRow
                  icon={<AlertTriangle className="h-4 w-4 text-slate-500" />}
                  title="Payment Failures"
                  description="Alert when subscription payments fail"
                >
                  <Switch defaultChecked />
                </SettingRow>
                <Separator />
                <SettingRow
                  icon={<Activity className="h-4 w-4 text-slate-500" />}
                  title="System Alerts"
                  description="Critical system status notifications"
                >
                  <Switch defaultChecked />
                </SettingRow>
              </CardContent>
            </Card>

            {/* In-App Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bell className="h-5 w-5 text-purple-500" />
                  In-App Notifications
                </CardTitle>
                <CardDescription>Configure dashboard alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <SettingRow
                  icon={<Users className="h-4 w-4 text-slate-500" />}
                  title="Pending Approvals"
                  description="Show badge for pending provider reviews"
                >
                  <Switch defaultChecked />
                </SettingRow>
                <Separator />
                <SettingRow
                  icon={<Zap className="h-4 w-4 text-slate-500" />}
                  title="Unassigned Leads"
                  description="Alert when leads need assignment"
                >
                  <Switch defaultChecked />
                </SettingRow>
                <Separator />
                <SettingRow
                  icon={<FileText className="h-4 w-4 text-slate-500" />}
                  title="Flagged Content"
                  description="Notify about flagged images or content"
                >
                  <Switch defaultChecked />
                </SettingRow>
              </CardContent>
            </Card>
          </div>

          {/* Digest Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-green-500" />
                Digest & Summary
              </CardTitle>
              <CardDescription>Configure periodic summary notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <Label>Daily Summary Email</Label>
                  <div className="flex items-center gap-3">
                    <Switch defaultChecked />
                    <span className="text-sm text-muted-foreground">Send at 9:00 AM</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label>Weekly Analytics Report</Label>
                  <div className="flex items-center gap-3">
                    <Switch defaultChecked />
                    <span className="text-sm text-muted-foreground">Send every Monday</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Storage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <HardDrive className="h-5 w-5 text-blue-500" />
                  Storage Usage
                </CardTitle>
                <CardDescription>File storage and media management</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{storageUsed} GB of {storageTotal} GB used</span>
                    <span className="text-sm text-muted-foreground">{storagePercent.toFixed(0)}%</span>
                  </div>
                  <Progress value={storagePercent} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Facility Images</p>
                    <p className="text-lg font-semibold">1.8 GB</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Admin Avatars</p>
                    <p className="text-lg font-semibold">0.6 GB</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Backups */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Database className="h-5 w-5 text-green-500" />
                  Database Backups
                </CardTitle>
                <CardDescription>Automated backup configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <SettingRow
                  icon={<Clock className="h-4 w-4 text-slate-500" />}
                  title="Automatic Backups"
                  description="Daily automated database snapshots"
                >
                  <StatusBadge status="active" label="Enabled" />
                </SettingRow>
                <Separator />
                <SettingRow
                  icon={<HardDrive className="h-4 w-4 text-slate-500" />}
                  title="Backup Retention"
                  description="How long backups are stored"
                >
                  <Select defaultValue="30">
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
                <Separator />
                <div className="pt-4">
                  <p className="text-sm text-muted-foreground">Last backup: Today at 3:00 AM</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-purple-500" />
                Data Export
              </CardTitle>
              <CardDescription>Export platform data for analysis or compliance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <span>Export Providers</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  <span>Export Leads</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                  <FileText className="h-5 w-5 text-purple-500" />
                  <span>Export Analytics</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                  <Shield className="h-5 w-5 text-amber-500" />
                  <span>Export Audit Log</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>Irreversible actions that affect the entire platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 border border-red-100">
                <div>
                  <p className="font-medium text-red-800">Clear All Cache</p>
                  <p className="text-sm text-red-600">Reset all cached data across the platform</p>
                </div>
                <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                  Clear Cache
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
