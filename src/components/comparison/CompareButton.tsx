import { GitCompare } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCompareList } from "@/hooks/useCompareList";
import { analytics } from "@/lib/analytics";

interface CompareButtonProps {
  facilityId: string;
  facilityName: string;
  className?: string;
  /**
   * "icon" — compact icon button (for tight card overlays)
   * "chip" — text + icon (for card footers)
   */
  variant?: "icon" | "chip";
}

export function CompareButton({
  facilityId,
  facilityName,
  className,
  variant = "icon",
}: CompareButtonProps) {
  const { isInCompare, toggleCompare, max } = useCompareList();
  const inCompare = isInCompare(facilityId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await toggleCompare(facilityId);
    if (result === "full") {
      analytics.ctaClick("compare_cap_hit", `facility:${facilityId}`);
      toast.error(`You can compare up to ${max} facilities at a time. Remove one before adding another.`);
      return;
    }
    if (result === "added") {
      analytics.ctaClick("compare_added", `facility:${facilityId}`);
      toast.success(`Added ${facilityName} to compare`, {
        description: "Open the compare tray to view side-by-side.",
      });
    } else if (result === "removed") {
      analytics.ctaClick("compare_removed", `facility:${facilityId}`);
    }
  };

  if (variant === "chip") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
          "border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          inCompare
            ? "bg-primary/10 border-primary/30 text-primary"
            : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/30",
          className
        )}
        aria-pressed={inCompare}
        aria-label={inCompare ? `Remove ${facilityName} from compare` : `Add ${facilityName} to compare`}
      >
        <GitCompare className="h-3.5 w-3.5" />
        {inCompare ? "In compare" : "Compare"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-md transition-all duration-200 drop-shadow-lg",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        inCompare ? "text-primary" : "text-white/90 hover:text-primary hover:bg-white/10",
        className
      )}
      aria-pressed={inCompare}
      aria-label={inCompare ? `Remove ${facilityName} from compare` : `Add ${facilityName} to compare`}
    >
      <GitCompare
        className={cn("h-6 w-6", inCompare && "fill-current/20")}
        aria-hidden="true"
      />
    </button>
  );
}
