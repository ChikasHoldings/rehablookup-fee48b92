import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  created_at: string;
  facility_id: string | null;
  email_verified: boolean | null;
  source: string | null;
  status: string | null;
}

interface RecentLeadsCardProps {
  recentLeads?: Lead[];
}

function formatTimeAgo(dateString: string): string {
  if (!dateString) return "Unknown";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Unknown";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  } catch {
    return "Unknown";
  }
}

const RecentLeadsCard = forwardRef<HTMLDivElement, RecentLeadsCardProps>(
  function RecentLeadsCard({ recentLeads }, ref) {
    return (
      <Card ref={ref} className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Recent Leads</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/leads" className="text-xs">
                View all <ChevronRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentLeads && recentLeads.length > 0 ? (
            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <span className="text-xs font-medium">{lead.name?.charAt(0)?.toUpperCase() || "?"}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{lead.name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {lead.email_verified && (
                      <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30 hidden sm:inline-flex">
                        Verified
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{formatTimeAgo(lead.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No recent leads</p>
          )}
        </CardContent>
      </Card>
    );
  }
);

RecentLeadsCard.displayName = "RecentLeadsCard";

export { RecentLeadsCard };
