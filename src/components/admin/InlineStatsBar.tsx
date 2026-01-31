import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatItem {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  color?: string;
}

interface InlineStatsBarProps {
  stats: StatItem[];
  className?: string;
}

export function InlineStatsBar({ stats, className }: InlineStatsBarProps) {
  return (
    <div className={cn(
      "flex flex-wrap items-center gap-4 px-4 py-2.5 bg-muted/30 rounded-lg border",
      className
    )}>
      {stats.map((stat, index) => (
        <div key={index} className="flex items-center gap-2">
          {stat.icon && (
            <stat.icon 
              className="h-4 w-4" 
              style={{ color: stat.color || 'hsl(var(--muted-foreground))' }}
            />
          )}
          <span className="text-sm text-muted-foreground">{stat.label}:</span>
          <span 
            className="text-sm font-semibold tabular-nums"
            style={{ color: stat.color }}
          >
            {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}
