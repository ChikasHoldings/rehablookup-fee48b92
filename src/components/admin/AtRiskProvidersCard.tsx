import { useState, forwardRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, TrendingDown, Clock, Mail, RefreshCw, ChevronDown, ChevronUp, ExternalLink, Send } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface AtRiskProvider {
  facilityId: string;
  facilityName: string;
  email: string;
  plan: string;
  riskScore: number;
  riskFactors: string[];
  lastActivity: string | null;
  leadsUsed: number;
  leadLimit: number;
  daysInactive: number;
}

export const AtRiskProvidersCard = forwardRef<HTMLDivElement, object>(function AtRiskProvidersCard(_, ref) {
  const [isExpanded, setIsExpanded] = useState(true);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["at-risk-providers"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-provider-health-alerts");
      if (error) throw error;
      return data as { atRiskProviders: AtRiskProvider[]; totalChecked: number };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const sendRetentionMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("send-retention-outreach");
      if (error) throw error;
      return data as { emailsSent: number; emailsFailed: number; sentTo: string[] };
    },
    onSuccess: (result) => {
      if (result.emailsSent > 0) {
        toast.success(`Sent ${result.emailsSent} retention email(s)`, {
          description: result.sentTo.slice(0, 3).join(", ") + (result.sentTo.length > 3 ? ` +${result.sentTo.length - 3} more` : ""),
        });
      } else {
        toast.info("No emails sent", {
          description: "All at-risk providers have received outreach recently",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["at-risk-providers"] });
    },
    onError: (error) => {
      toast.error("Failed to send retention emails", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const getRiskBadgeColor = (score: number) => {
    if (score >= 70) return "bg-destructive text-destructive-foreground";
    if (score >= 50) return "bg-warning text-warning-foreground";
    return "bg-warning/50 text-warning-foreground";
  };

  const getRiskLabel = (score: number) => {
    if (score >= 70) return "High Risk";
    if (score >= 50) return "Medium Risk";
    return "Low Risk";
  };

  const formatLastActivity = (date: string | null) => {
    if (!date) return "Never";
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const atRiskProviders = data?.atRiskProviders || [];
  const highRiskCount = atRiskProviders.filter(p => p.riskScore >= 50).length;

  return (
    <Card ref={ref} className={highRiskCount > 0 ? "border-amber-500/50" : ""}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${highRiskCount > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
              <CardTitle className="text-lg">At-Risk Providers</CardTitle>
              {highRiskCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {highRiskCount} at risk
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {highRiskCount > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendRetentionMutation.mutate()}
                      disabled={sendRetentionMutation.isPending}
                    >
                      <Send className={`h-4 w-4 mr-1.5 ${sendRetentionMutation.isPending ? "animate-pulse" : ""}`} />
                      {sendRetentionMutation.isPending ? "Sending..." : "Send Outreach"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Send personalized re-engagement emails</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => refetch()}
                    disabled={isFetching}
                  >
                    <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh health check</TooltipContent>
              </Tooltip>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          <CardDescription>
            Providers showing signs of potential churn based on activity patterns
          </CardDescription>
        </CardHeader>

        <CollapsibleContent>
          <CardContent>
            {atRiskProviders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingDown className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No at-risk providers detected</p>
                <p className="text-sm">All active subscribers appear healthy</p>
              </div>
            ) : (
              <div className="space-y-4">
                {atRiskProviders.slice(0, 5).map((provider) => (
                  <div
                    key={provider.facilityId}
                    className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{provider.facilityName}</h4>
                          <Badge variant="outline" className="text-xs">
                            {provider.plan}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{provider.email}</p>
                      </div>
                      <Badge className={getRiskBadgeColor(provider.riskScore)}>
                        {getRiskLabel(provider.riskScore)} ({provider.riskScore})
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Last active:</span>
                        <span className={provider.daysInactive > 7 ? "text-amber-600 font-medium" : ""}>
                          {formatLastActivity(provider.lastActivity)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Leads this month:</span>{" "}
                        <span className={provider.leadsUsed < 3 ? "text-amber-600 font-medium" : ""}>
                          {provider.leadsUsed}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Inactive:</span>
                        <span className={provider.daysInactive > 14 ? "text-destructive font-medium" : ""}>
                          {provider.daysInactive} days
                        </span>
                      </div>
                    </div>

                    <div className="border-t pt-3 mt-3">
                      <p className="text-xs text-muted-foreground mb-2">Risk Factors:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {provider.riskFactors.map((factor, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs font-normal">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(`mailto:${provider.email}?subject=RehabLookup - How can we help?`, "_blank")}
                      >
                        <Mail className="h-3.5 w-3.5 mr-1.5" />
                        Contact Provider
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/admin/providers?search=${encodeURIComponent(provider.facilityName)}`, "_blank")}
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}

                {atRiskProviders.length > 5 && (
                  <p className="text-center text-sm text-muted-foreground">
                    + {atRiskProviders.length - 5} more at-risk providers
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
});

AtRiskProvidersCard.displayName = "AtRiskProvidersCard";
