import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  ShieldCheck, 
  Clock, 
  Award, 
  CheckCircle,
  Building2,
  FileCheck,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AccreditationType = 
  | "JCAHO" 
  | "CARF" 
  | "LegitScript" 
  | "NAATP" 
  | "State Licensed"
  | "SAMHSA Listed";

export type TrustBadgeType = 
  | "verified" 
  | "years" 
  | AccreditationType
  | "pending";

interface TrustBadgeProps {
  type: TrustBadgeType;
  years?: number;
  verified?: boolean;
  className?: string;
  size?: "sm" | "md";
}

const badgeConfig: Record<string, {
  label: string;
  description: string;
  icon: typeof ShieldCheck;
  variant: "default" | "secondary" | "outline";
  className: string;
}> = {
  verified: {
    label: "Verified",
    description: "This facility has been verified by our team",
    icon: ShieldCheck,
    variant: "secondary",
    className: "bg-blue-500/10 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-800",
  },
  years: {
    label: "Years",
    description: "Years in operation",
    icon: Clock,
    variant: "secondary",
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-800",
  },
  JCAHO: {
    label: "JCAHO",
    description: "Joint Commission Accredited - Gold standard in healthcare quality",
    icon: Award,
    variant: "secondary",
    className: "bg-amber-500/10 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-800",
  },
  CARF: {
    label: "CARF",
    description: "Commission on Accreditation of Rehabilitation Facilities certified",
    icon: Award,
    variant: "secondary",
    className: "bg-amber-500/10 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-800",
  },
  LegitScript: {
    label: "LegitScript",
    description: "LegitScript Certified - Verified for advertising compliance",
    icon: CheckCircle,
    variant: "secondary",
    className: "bg-teal-500/10 text-teal-700 border-teal-200 dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-800",
  },
  NAATP: {
    label: "NAATP",
    description: "National Association of Addiction Treatment Providers member",
    icon: Building2,
    variant: "secondary",
    className: "bg-purple-500/10 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-800",
  },
  "State Licensed": {
    label: "State Licensed",
    description: "Licensed by state regulatory authority",
    icon: FileCheck,
    variant: "secondary",
    className: "bg-slate-500/10 text-slate-700 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-800",
  },
  "SAMHSA Listed": {
    label: "SAMHSA",
    description: "Listed in SAMHSA's National Directory of Treatment Facilities",
    icon: Building2,
    variant: "secondary",
    className: "bg-indigo-500/10 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-800",
  },
  pending: {
    label: "Pending",
    description: "Accreditation verification in progress",
    icon: Loader2,
    variant: "outline",
    className: "text-muted-foreground border-dashed",
  },
};

export function TrustBadge({ type, years, verified = true, className, size = "md" }: TrustBadgeProps) {
  // For accreditations, show pending state if not verified
  const effectiveType = type !== "verified" && type !== "years" && !verified ? "pending" : type;
  const config = badgeConfig[effectiveType] || badgeConfig.verified;
  const Icon = config.icon;

  const label = type === "years" && years 
    ? `${years}+ Years` 
    : effectiveType === "pending" 
      ? `${type} (Pending)` 
      : config.label;

  const sizeClasses = size === "sm" 
    ? "text-xs px-2 py-0.5 gap-1" 
    : "text-sm px-2.5 py-1 gap-1.5";

  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={config.variant}
            className={cn(
              "font-medium border cursor-help",
              config.className,
              sizeClasses,
              className
            )}
          >
            <Icon className={cn(iconSize, effectiveType === "pending" && "animate-spin")} />
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-center">
          <p className="text-xs">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Accreditation options for forms
export const ACCREDITATION_OPTIONS: { value: AccreditationType; label: string; description: string }[] = [
  { value: "JCAHO", label: "JCAHO Accredited", description: "Joint Commission on Accreditation of Healthcare Organizations" },
  { value: "CARF", label: "CARF Certified", description: "Commission on Accreditation of Rehabilitation Facilities" },
  { value: "LegitScript", label: "LegitScript Certified", description: "Verified for advertising compliance" },
  { value: "NAATP", label: "NAATP Member", description: "National Association of Addiction Treatment Providers" },
  { value: "State Licensed", label: "State Licensed", description: "Licensed by state regulatory authority" },
  { value: "SAMHSA Listed", label: "SAMHSA Listed", description: "Listed in SAMHSA's National Directory" },
];
