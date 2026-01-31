import { Link } from "react-router-dom";
import { AlertCircle, Star, CreditCard, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ProviderStats {
  pending: number;
}

interface QuickActionsCardProps {
  providerStats?: ProviderStats;
}

export function QuickActionsCard({ providerStats }: QuickActionsCardProps) {
  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        {providerStats?.pending && providerStats.pending > 0 && (
          <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 hover:bg-warning/10" asChild>
            <Link to="/admin/providers?status=pending">
              <AlertCircle className="h-4 w-4 text-warning mr-2" />
              <div className="flex flex-col items-start">
                <span className="text-sm">Review Providers</span>
                <span className="text-xs text-muted-foreground">{providerStats.pending} pending</span>
              </div>
            </Link>
          </Button>
        )}
        <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 hover:bg-info/10" asChild>
          <Link to="/admin/leads">
            <UserPlus className="h-4 w-4 text-info mr-2" />
            <div className="flex flex-col items-start">
              <span className="text-sm">View Leads</span>
              <span className="text-xs text-muted-foreground">Manage inquiries</span>
            </div>
          </Link>
        </Button>
        <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 hover:bg-warning/10" asChild>
          <Link to="/admin/featured">
            <Star className="h-4 w-4 text-warning mr-2" />
            <div className="flex flex-col items-start">
              <span className="text-sm">Featured Placement</span>
              <span className="text-xs text-muted-foreground">Premium listings</span>
            </div>
          </Link>
        </Button>
        <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 hover:bg-success/10" asChild>
          <Link to="/admin/subscriptions">
            <CreditCard className="h-4 w-4 text-success mr-2" />
            <div className="flex flex-col items-start">
              <span className="text-sm">Subscriptions</span>
              <span className="text-xs text-muted-foreground">Billing & plans</span>
            </div>
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
