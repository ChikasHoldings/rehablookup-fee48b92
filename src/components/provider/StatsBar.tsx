import { CheckCircle, Clock, AlertCircle, Users, Eye, TrendingUp } from "lucide-react";

interface StatsBarProps {
  status: string;
  leadsCount: number;
  viewsCount?: number;
}

export function StatsBar({ status, leadsCount, viewsCount = 0 }: StatsBarProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "approved":
        return { 
          label: "Live", 
          icon: CheckCircle, 
          dotClass: "bg-green-500",
          textClass: "text-green-600"
        };
      case "pending":
        return { 
          label: "Pending", 
          icon: Clock, 
          dotClass: "bg-amber-500",
          textClass: "text-amber-600"
        };
      default:
        return { 
          label: "Inactive", 
          icon: AlertCircle, 
          dotClass: "bg-muted-foreground",
          textClass: "text-muted-foreground"
        };
    }
  };

  const statusConfig = getStatusConfig(status);

  return (
    <div className="bg-card border-b border-border">
      <div className="max-w-[1800px] mx-auto px-4 md:px-6">
        <div className="flex items-center justify-end gap-5 py-2.5 overflow-x-auto">
          {/* Listing Status */}
          <div className="flex items-center gap-2 shrink-0">
            <span className={`h-2 w-2 rounded-full ${statusConfig.dotClass} animate-pulse`} />
            <span className="text-xs text-muted-foreground">Status:</span>
            <span className={`text-sm font-medium ${statusConfig.textClass}`}>
              {statusConfig.label}
            </span>
          </div>

          <div className="h-4 w-px bg-border shrink-0" />

          {/* Profile Views */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">
              <span className="font-semibold text-foreground">{viewsCount}</span>
              <span className="text-muted-foreground ml-1 text-xs">views</span>
            </span>
          </div>

          <div className="h-4 w-px bg-border shrink-0" />

          {/* Leads */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">
              <span className="font-semibold text-foreground">{leadsCount}</span>
              <span className="text-muted-foreground ml-1 text-xs">leads</span>
            </span>
            {leadsCount > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-green-600">
                <TrendingUp className="h-3 w-3" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
