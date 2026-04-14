import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock, Crown, MapPin, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface DashboardMissedLeadsProps {
  facilityId: string;
  isPro: boolean;
}

interface MissedLead {
  id: string;
  created_at: string;
  urgency: string | null;
  level_of_care: string | null;
  location_city_state: string | null;
  insurance_type: string | null;
}

export function DashboardMissedLeads({ facilityId, isPro }: DashboardMissedLeadsProps) {
  const { data: missedLeads = [], isLoading } = useQuery({
    queryKey: ["missed-leads", facilityId],
    queryFn: async (): Promise<MissedLead[]> => {
      if (!facilityId) return [];

      // Get leads that expired or were redistributed without being unlocked
      const { data, error } = await supabase
        .from("leads_provider_view")
        .select("id, created_at, urgency, level_of_care, location_city_state, insurance_type, is_unlocked, status")
        .eq("facility_id", facilityId)
        .eq("is_unlocked", false)
        .in("status", ["expired", "closed"])
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data || []) as MissedLead[];
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return <Skeleton className="h-32 rounded-lg" />;
  }

  if (!missedLeads.length) return null;

  const estimatedRevenueLost = missedLeads.length * 5000;

  return (
    <Card className="border-destructive/30 bg-destructive/[0.03]">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                You missed {missedLeads.length} opportunit{missedLeads.length === 1 ? "y" : "ies"}
              </p>
              <p className="text-xs text-muted-foreground">
                ~${estimatedRevenueLost.toLocaleString()} in potential revenue lost
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-destructive/30 text-destructive bg-destructive/5 shrink-0">
            Expired
          </Badge>
        </div>

        {/* Missed lead cards */}
        <div className="space-y-2">
          {missedLeads.slice(0, 3).map(lead => (
            <div
              key={lead.id}
              className="flex items-center gap-3 rounded-md border border-border/60 bg-card px-3 py-2.5"
            >
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {lead.level_of_care && (
                    <span className="text-xs font-medium text-foreground">{lead.level_of_care}</span>
                  )}
                  {lead.urgency && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0",
                        lead.urgency === "Urgent" || lead.urgency === "Immediately"
                          ? "border-destructive/40 text-destructive bg-destructive/5"
                          : "border-muted-foreground/30 text-muted-foreground"
                      )}
                    >
                      {lead.urgency}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  {lead.location_city_state && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-2.5 w-2.5" /> {lead.location_city_state}
                    </span>
                  )}
                  {lead.insurance_type && (
                    <span className="flex items-center gap-0.5">
                      <Shield className="h-2.5 w-2.5" /> {lead.insurance_type}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
              </div>
            </div>
          ))}
          {missedLeads.length > 3 && (
            <p className="text-[11px] text-muted-foreground text-center">
              +{missedLeads.length - 3} more missed lead{missedLeads.length - 3 > 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* CTA */}
        {!isPro ? (
          <div className="rounded-lg border border-amber-300/40 bg-gradient-to-r from-amber-500/5 to-amber-600/5 p-3">
            <p className="text-xs font-semibold text-foreground mb-1">
              You missed this lead — Pro providers get priority
            </p>
            <p className="text-[11px] text-muted-foreground mb-2.5">
              Pro members get first access to every lead + 20% off every unlock. Don't let another opportunity slip away.
            </p>
            <Button
              size="sm"
              className="h-7 text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
              asChild
            >
              <Link to="/provider/pro-upgrade">
                <Crown className="h-3 w-3 mr-1" />
                Upgrade to Pro — $399/mo
              </Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">⚡ Pro tip:</span> Top providers respond within 10 minutes. Faster response = higher admissions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
