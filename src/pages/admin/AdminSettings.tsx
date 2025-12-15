import {
  Settings,
  Shield,
  Database,
  Bell,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Settings</h1>
        <p className="text-muted-foreground">System configuration and preferences</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>Authentication and access control</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">
                  Add extra security to admin accounts
                </p>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Session Management</p>
                <p className="text-sm text-muted-foreground">
                  View and manage active sessions
                </p>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Management
            </CardTitle>
            <CardDescription>Database and storage settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Database Backups</p>
                <p className="text-sm text-muted-foreground">
                  Automated daily backups enabled
                </p>
              </div>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Storage Usage</p>
                <p className="text-sm text-muted-foreground">
                  Facility images and documents
                </p>
              </div>
              <Badge variant="outline">Managed</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Admin alert preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">New Provider Alerts</p>
                <p className="text-sm text-muted-foreground">
                  Get notified of new signups
                </p>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Lead Volume Alerts</p>
                <p className="text-sm text-muted-foreground">
                  Unusual activity notifications
                </p>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Platform
            </CardTitle>
            <CardDescription>General platform settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Maintenance Mode</p>
                <p className="text-sm text-muted-foreground">
                  Temporarily disable public access
                </p>
              </div>
              <Badge variant="outline">Off</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">API Rate Limits</p>
                <p className="text-sm text-muted-foreground">
                  Request throttling settings
                </p>
              </div>
              <Badge className="bg-green-100 text-green-800">Default</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
