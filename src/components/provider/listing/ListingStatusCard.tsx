import { Link } from "react-router-dom";
import { CheckCircle, Clock, AlertCircle, HelpCircle, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface ListingStatusCardProps {
  status: string;
  facilityType: string;
  city: string;
  state: string;
  slug: string | null;
  onPreview?: () => void;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case "approved":
      return {
        label: "Live",
        description: "Visible to families",
        icon: CheckCircle,
        bgColor: "bg-green-500/10",
        textColor: "text-green-600 dark:text-green-400",
        badgeClass: "bg-green-500/10 text-green-700 border-green-200 dark:text-green-400 dark:border-green-800"
      };
    case "pending":
      return {
        label: "Under Review",
        description: "Usually 24-48 hours",
        icon: Clock,
        bgColor: "bg-amber-500/10",
        textColor: "text-amber-600 dark:text-amber-400",
        badgeClass: "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800"
      };
    default:
      return {
        label: "Draft",
        description: "Not published yet",
        icon: AlertCircle,
        bgColor: "bg-muted",
        textColor: "text-muted-foreground",
        badgeClass: "bg-muted text-muted-foreground border-border"
      };
  }
};

export function ListingStatusCard({
  status,
  facilityType,
  city,
  state,
  slug,
  onPreview
}: ListingStatusCardProps) {
  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          Listing Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border/50">
          <div className={cn(
            "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
            statusConfig.bgColor
          )}>
            <StatusIcon className={cn("h-6 w-6", statusConfig.textColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{statusConfig.label}</p>
              <Badge variant="outline" className={cn("text-xs", statusConfig.badgeClass)}>
                {status === 'approved' ? 'Public' : 'Private'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {statusConfig.description}
            </p>
          </div>
        </div>

        {/* Quick Info */}
        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Type</span>
            <span className="text-xs font-medium truncate max-w-[140px]">
              {facilityType || "Not set"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Location</span>
            <span className="text-xs font-medium">
              {city}, {state}
            </span>
          </div>
        </div>

        {slug && onPreview && (
          <>
            <Separator />
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs"
              onClick={onPreview}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview Listing
            </Button>
          </>
        )}

        <Separator />

        {/* Support Link */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-2 text-xs text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link to="/provider/help">
            <HelpCircle className="h-3.5 w-3.5" />
            Need Help? Contact Support
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
