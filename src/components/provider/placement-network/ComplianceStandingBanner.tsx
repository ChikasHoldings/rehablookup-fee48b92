/**
 * ComplianceStandingBanner
 * ========================
 * Shown at the top of the provider's placement network page when their
 * standing is anything other than "good". Provides clear messaging about
 * what actions are needed to restore good standing.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedFacilityOptional } from "@/contexts/SelectedFacilityContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Ban,
  Shield,
  ArrowRight,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STANDING_CONFIG: Record<string, {
  icon: typeof AlertTriangle;
  title: string;
  variant: "default" | "destructive";
  bgClass: string;
  message: string;
  action: string;
  actionHref: string;
}> = {
  warning: {
    icon: AlertTriangle,
    title: "Compliance Warning",
    variant: "default",
    bgClass: "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30",
    message: "Your placement network standing has been flagged. Please ensure all admission reports are submitted on time and any outstanding invoices are paid.",
    action: "View Outstanding Items",
    actionHref: "/provider/billing",
  },
  probation: {
    icon: AlertTriangle,
    title: "Probation Notice",
    variant: "destructive",
    bgClass: "border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-950/30",
    message: "Your facility is on probation. New placement introductions are restricted. To restore full access, please resolve all outstanding admission reports and billing issues.",
    action: "Resolve Issues",
    actionHref: "/provider/billing",
  },
  suspended: {
    icon: Ban,
    title: "Network Suspended",
    variant: "destructive",
    bgClass: "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/30",
    message: "Your facility has been suspended from the placement network. You will not receive new introductions. Please contact our team to resolve outstanding issues and request reinstatement.",
    action: "Contact Support",
    actionHref: "/provider/billing",
  },
};

export function ComplianceStandingBanner() {
  const { selectedFacility } = useSelectedFacilityOptional() || {};
  const selectedFacilityId = selectedFacility?.id;

  const { data: facilityStanding } = useQuery({
    queryKey: ["provider-facility-standing", selectedFacilityId],
    queryFn: async () => {
      if (!selectedFacilityId) return null;
      const { data, error } = await supabase
        .from("facilities")
        .select("placement_network_standing, placement_compliance_score, placement_suspension_reason, placement_suspended_at")
        .eq("id", selectedFacilityId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedFacilityId,
    staleTime: 60000,
  });

  if (!facilityStanding || facilityStanding.placement_network_standing === "good") {
    return null;
  }

  const standing = facilityStanding.placement_network_standing as string;
  const config = STANDING_CONFIG[standing];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Alert className={cn("mb-4", config.bgClass)}>
      <Icon className="h-5 w-5" />
      <AlertTitle className="flex items-center gap-2">
        {config.title}
        <Badge variant={config.variant} className="text-[10px]">
          Score: {facilityStanding.placement_compliance_score}/100
        </Badge>
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="text-sm">{config.message}</p>
        {facilityStanding.placement_suspension_reason && (
          <p className="text-xs mt-1 opacity-80">Reason: {facilityStanding.placement_suspension_reason}</p>
        )}
        <div className="mt-3">
          <Button size="sm" variant="outline" asChild className="gap-1.5">
            <Link to={config.actionHref}>
              {config.action}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
