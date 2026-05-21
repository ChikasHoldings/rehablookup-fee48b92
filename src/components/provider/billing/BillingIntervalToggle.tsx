import { cn } from "@/lib/utils";

export type BillingInterval = "monthly" | "annual";

interface BillingIntervalToggleProps {
  value: BillingInterval;
  onChange: (next: BillingInterval) => void;
  /** Disable the toggle (e.g. while an upgrade is in flight). */
  disabled?: boolean;
  /** Show a smaller variant suitable for table headers / dense UIs. */
  size?: "default" | "sm";
}

/**
 * Reusable monthly/annual interval toggle.
 *
 * Monthly is positioned as the default everywhere; the Annual chip
 * carries a "Save 15%" badge until it's the active state, at which
 * point the badge style flips to the brand-gold accent.
 */
export function BillingIntervalToggle({
  value,
  onChange,
  disabled,
  size = "default",
}: BillingIntervalToggleProps) {
  const px = size === "sm" ? "px-3 py-1" : "px-4 py-1.5";
  const text = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div
      role="radiogroup"
      aria-label="Billing interval"
      className={cn(
        "inline-flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm",
        disabled && "opacity-50 pointer-events-none",
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={value === "monthly"}
        onClick={() => onChange("monthly")}
        disabled={disabled}
        className={cn(
          "rounded-full font-medium transition-colors",
          px,
          text,
          value === "monthly"
            ? "bg-[#1B365D] text-white"
            : "text-slate-700 hover:text-[#1B365D]",
        )}
      >
        Monthly
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === "annual"}
        onClick={() => onChange("annual")}
        disabled={disabled}
        className={cn(
          "rounded-full font-medium transition-colors flex items-center gap-1.5",
          px,
          text,
          value === "annual"
            ? "bg-[#1B365D] text-white"
            : "text-slate-700 hover:text-[#1B365D]",
        )}
      >
        Annual
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            value === "annual"
              ? "bg-[#CDA223] text-[#1B365D]"
              : "bg-emerald-100 text-emerald-700",
          )}
        >
          Save 15%
        </span>
      </button>
    </div>
  );
}
