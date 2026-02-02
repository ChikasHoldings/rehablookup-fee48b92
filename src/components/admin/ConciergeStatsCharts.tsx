import { forwardRef, useMemo } from "react";
import { cn } from "@/lib/utils";

interface ConciergeStatsChartsProps {
  stats: Record<string, number> | undefined;
  onStatusClick: (status: string) => void;
  activeStatus: string;
}

const PIPELINE_STAGES = [
  { key: "new", label: "New", color: "bg-primary" },
  { key: "reviewing", label: "Reviewing", color: "bg-info" },
  { key: "matching", label: "Matching", color: "bg-warning" },
  { key: "matched", label: "Matched", color: "bg-accent" },
  { key: "introductions_sent", label: "Intros Sent", color: "bg-primary" },
  { key: "in_contact", label: "In Contact", color: "bg-info" },
  { key: "placed", label: "Placed", color: "bg-success" },
  { key: "closed", label: "Closed", color: "bg-muted-foreground" },
];

export const ConciergeStatsCharts = forwardRef<HTMLDivElement, ConciergeStatsChartsProps>(
  function ConciergeStatsCharts({ stats, onStatusClick, activeStatus }, ref) {
  const totalCases = useMemo(() => {
    if (!stats) return 0;
    return Object.values(stats).reduce((sum, val) => sum + val, 0);
  }, [stats]);

  const activeCases = useMemo(() => {
    if (!stats) return 0;
    return (stats.new || 0) + (stats.reviewing || 0) + (stats.matching || 0) + 
           (stats.matched || 0) + (stats.introductions_sent || 0) + (stats.in_contact || 0);
  }, [stats]);

  const placedCount = stats?.placed || 0;
  const closedCount = stats?.closed || 0;

  const placementRate = useMemo(() => {
    const closedAndPlaced = placedCount + closedCount;
    if (closedAndPlaced === 0) return 0;
    return Math.round(placedCount / closedAndPlaced * 100);
  }, [placedCount, closedCount]);

  return (
    <div ref={ref} className="bg-card border rounded-lg">
      {/* Summary Row */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-6">
          <button
            onClick={() => onStatusClick("all")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors",
              activeStatus === "all" ? "bg-primary/10 text-primary" : "hover:bg-muted"
            )}
          >
            <span className="text-2xl font-bold tabular-nums">{totalCases}</span>
            <span className="text-sm text-muted-foreground">Total Cases</span>
          </button>
          
          <div className="h-6 w-px bg-border" />
          
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />
            <span className="text-lg font-semibold tabular-nums">{activeCases}</span>
            <span className="text-sm text-muted-foreground">Active</span>
          </div>
          
          <div className="h-6 w-px bg-border" />
          
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold tabular-nums text-success">{placementRate}%</span>
            <span className="text-sm text-muted-foreground">Placement Rate</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success" />
            {placedCount} placed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-muted-foreground" />
            {closedCount} closed
          </span>
        </div>
      </div>

      {/* Pipeline Stages */}
      <div className="flex items-center gap-1 p-2 overflow-x-auto">
        {PIPELINE_STAGES.map((stage) => {
          const count = stats?.[stage.key] || 0;
          const isActive = activeStatus === stage.key;
          
          return (
            <button
              key={stage.key}
              onClick={() => onStatusClick(stage.key)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md transition-all min-w-fit",
                isActive 
                  ? "bg-accent text-accent-foreground shadow-sm" 
                  : "hover:bg-muted"
              )}
            >
              <span className={cn("h-2 w-2 rounded-full shrink-0", stage.color)} />
              <span className="font-medium tabular-nums">{count}</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{stage.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

ConciergeStatsCharts.displayName = "ConciergeStatsCharts";
