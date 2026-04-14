import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown, Lock, Handshake, Clock, CheckCircle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface DashboardPlacementPanelProps {
  facilityIds: string[];
  isPro: boolean;
}

interface PlacementItem {
  id: string;
  status: string;
  created_at: string;
  facility_id: string;
  facility_name?: string;
  provider_response: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "New", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  interested: { label: "Interested", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  not_interested: { label: "Declined", color: "bg-muted text-muted-foreground border-border" },
  admitted: { label: "Admitted", color: "bg-primary/10 text-primary border-primary/30" },
};

export function DashboardPlacementPanel({ facilityIds, isPro }: DashboardPlacementPanelProps) {
  const { data: placements = [], isLoading } = useQuery({
    queryKey: ["dashboard-placements", facilityIds],
    queryFn: async (): Promise<PlacementItem[]> => {
      if (!facilityIds.length) return [];

      const { data, error } = await supabase
        .from("concierge_introductions")
        .select("id, created_at, facility_id, provider_response, inquiry_id")
        .in("facility_id", facilityIds)
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;
      return (data || []).map(d => ({
        id: d.id,
        status: d.provider_response || "pending",
        created_at: d.created_at || new Date().toISOString(),
        facility_id: d.facility_id,
        provider_response: d.provider_response,
      }));
    },
    enabled: facilityIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  // Locked preview for free users
  if (!isPro) {
    return (
      <Card className="relative overflow-hidden border-dashed border-muted-foreground/30">
        <CardContent className="p-5">
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 to-background/90 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-center p-6">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3">
              <Crown className="h-6 w-6 text-amber-500" />
            </div>
            <h3 className="text-sm font-bold text-foreground mb-1">
              Priority Placement Matching
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs mb-3">
              Pro providers get priority placement matching + 20% discount on placement fees.
            </p>
            <Button
              size="sm"
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md"
              asChild
            >
              <Link to="/provider/pro-upgrade">
                <Crown className="h-3.5 w-3.5 mr-1.5" />
                Upgrade to Pro
              </Link>
            </Button>
          </div>
          {/* Blurred preview */}
          <div className="space-y-3 opacity-40 select-none pointer-events-none" aria-hidden>
            <div className="flex items-center gap-2">
              <Handshake className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Placement Opportunities</span>
            </div>
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 rounded-md border bg-muted/20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <Skeleton className="h-48 rounded-lg" />;
  }

  const activePlacements = placements.filter(p => p.status !== "not_interested");
  const pendingCount = placements.filter(p => p.status === "pending").length;

  return (
    <Card>
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Handshake className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Placement Opportunities</CardTitle>
            {pendingCount > 0 && (
              <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 text-[10px] px-1.5 py-0">
                {pendingCount} new
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" asChild>
            <Link to="/provider/placements">
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {activePlacements.length === 0 ? (
          <div className="py-8 text-center">
            <Handshake className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              No active placements yet. New opportunities will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activePlacements.slice(0, 4).map(placement => {
              const cfg = STATUS_CONFIG[placement.status] || STATUS_CONFIG.pending;
              return (
                <div
                  key={placement.id}
                  className="flex items-center gap-3 rounded-md border px-3 py-2.5 hover:bg-muted/20 transition-colors"
                >
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                    placement.status === "pending" ? "bg-blue-500/10" : "bg-emerald-500/10"
                  )}>
                    {placement.status === "pending" ? (
                      <Clock className="h-4 w-4 text-blue-600" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">
                      Case #{placement.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(placement.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", cfg.color)}>
                    {cfg.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
