import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";

interface AdminPageHeaderProps {
  icon: LucideIcon;
  iconGradient: string;
  title: string;
  subtitle?: string;
  badges?: Array<{ label: string; value: number; className?: string }>;
  actions?: React.ReactNode;
}

export function AdminPageHeader({
  icon: Icon,
  iconGradient,
  title,
  subtitle,
  badges,
  actions,
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div
          className={cn(
            "h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-lg shrink-0",
            iconGradient
          )}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-foreground truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {badges?.map((badge) => (
          <Badge
            key={badge.label}
            variant="secondary"
            className={cn("text-xs tabular-nums", badge.className)}
          >
            {badge.value} {badge.label}
          </Badge>
        ))}
        {actions}
      </div>
    </div>
  );
}
