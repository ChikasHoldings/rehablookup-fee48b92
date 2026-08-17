import { Link } from "react-router-dom";
import {
  Sparkles,
  Camera,
  Building2,
  ChevronRight,
  Phone,
  PanelsTopLeft,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProStatus } from "@/hooks/useProStatus";
import { useFacilityLimits } from "@/hooks/useFacilityLimits";
import { cn } from "@/lib/utils";
import { PRO_DIRECTORY_TRUST_NOTE } from "@/lib/proDirectoryBenefits";

interface ProBenefitsWidgetProps {
  className?: string;
}

export function ProBenefitsWidget({ className }: ProBenefitsWidgetProps) {
  const { data: proStatus, isLoading } = useProStatus();
  const { used: usedLocations } = useFacilityLimits();

  if (isLoading || !proStatus?.isPro) {
    return null;
  }

  const benefits = [
    {
      icon: Phone,
      label: "Phone + Call button",
      description: "Direct facility contact on the public listing",
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: PanelsTopLeft,
      label: "Enhanced profile",
      description: "Programs, amenities, staff & accreditation highlights",
      color: "text-violet-600",
      bgColor: "bg-violet-500/10",
    },
    {
      icon: Camera,
      label: "Rich media",
      description: "Up to 10 photos plus video & virtual tour",
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10",
    },
    {
      icon: Building2,
      label: `${usedLocations} location${usedLocations === 1 ? "" : "s"} managed`,
      description: "Pro supports up to 5 facility listings",
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <Card className={cn("border-amber-300/60 bg-amber-50/40", className)}>
      <CardHeader className="p-4 pb-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500">
              <Sparkles className="h-4 w-4 text-white" aria-hidden />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold">Pro listing features</CardTitle>
              <p className="mt-0.5 text-[11px] text-slate-600">Enhanced presentation + direct contact</p>
            </div>
          </div>
          <Badge className="border-amber-300 bg-amber-100 text-xs font-semibold text-amber-800 hover:bg-amber-100">
            ACTIVE
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-1">
        <div className="grid gap-2 sm:grid-cols-2">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div key={benefit.label} className="flex items-start gap-2.5 rounded-lg bg-white/80 p-2.5">
                <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", benefit.bgColor)}>
                  <Icon className={cn("h-3.5 w-3.5", benefit.color)} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900">{benefit.label}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{benefit.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200/70 bg-emerald-50/60 p-2.5">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden />
          <p className="text-[11px] leading-relaxed text-emerald-900">{PRO_DIRECTORY_TRUST_NOTE}</p>
        </div>

        <div className="mt-3 border-t border-amber-200/70 pt-3">
          {proStatus.currentPeriodEnd && (
            <p className="mb-2 text-center text-[11px] text-amber-800/80">
              {proStatus.cancelAtPeriodEnd ? "Ends " : "Renews "}
              {new Date(proStatus.currentPeriodEnd).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button variant="outline" size="sm" className="h-8 justify-between text-xs" asChild>
              <Link to="/provider/listings/profile">
                Manage enhanced profile
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 justify-between text-xs text-amber-800" asChild>
              <Link to="/provider/billing">
                Manage subscription
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
