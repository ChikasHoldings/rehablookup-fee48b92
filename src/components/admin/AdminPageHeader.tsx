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
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div
          className={cn(
            "h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-lg shrink-0",
            iconGradient
          )}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-foreground truncate">
              {title}
            </h1>
            {badges && badges.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {badges.map((badge) => (
                  <Badge
                    key={badge.label}
                    variant="secondary"
                    className={cn("text-[10px] sm:text-xs tabular-nums font-semibold px-1.5 sm:px-2", badge.className)}
                  >
                    {badge.value} {badge.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * Reusable stat card for admin pages — consistent sizing and alignment
 */
interface AdminStatCardProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  className?: string;
  valueClassName?: string;
  subtitle?: string;
  onClick?: () => void;
  active?: boolean;
}

export function AdminStatCard({
  label,
  value,
  icon: Icon,
  className,
  valueClassName,
  subtitle,
  onClick,
  active,
}: AdminStatCardProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "rounded-xl border bg-card p-3 sm:p-4 text-left transition-all",
        onClick && "hover:shadow-sm cursor-pointer",
        active && "ring-2 ring-primary/30 border-primary/50",
        className
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate">{label}</p>
        {Icon && <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />}
      </div>
      <p className={cn("text-xl sm:text-2xl font-bold tabular-nums", valueClassName)}>{value}</p>
      {subtitle && <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </Comp>
  );
}
