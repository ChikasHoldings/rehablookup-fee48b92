import type { ComponentType } from "react";

/**
 * LocationStatTile — premium metric card used in directory-style
 * location hero sections (StatePage, CityPage, CountyPage…). Two
 * variants:
 *   - default: dark glass-effect for use over the hero image
 *   - compact: light card for the mobile stat band below the hero
 *
 * Kept here so the visual is identical across every directory hero
 * and tweaks happen in one place.
 */
export function LocationStatTile({
  label,
  value,
  icon: Icon,
  compact = false,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="text-base font-bold leading-none text-foreground">{value}</div>
          <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground truncate">
            {label}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-white/70">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
    </div>
  );
}
