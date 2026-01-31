import { cn } from "@/lib/utils";

interface PipelineStage {
  key: string;
  label: string;
  count: number;
  color: string;
}

interface CompactPipelineStatsProps {
  stages: PipelineStage[];
  activeStage: string;
  onStageClick: (stage: string) => void;
  totalLabel?: string;
}

export function CompactPipelineStats({ 
  stages, 
  activeStage, 
  onStageClick,
  totalLabel = "Total"
}: CompactPipelineStatsProps) {
  const total = stages.reduce((sum, s) => sum + s.count, 0);
  
  return (
    <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg overflow-x-auto">
      {/* Total/All button */}
      <button
        onClick={() => onStageClick("all")}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap",
          activeStage === "all"
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
        )}
      >
        <span>{totalLabel}</span>
        <span className={cn(
          "text-xs px-1.5 py-0.5 rounded-full",
          activeStage === "all" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}>
          {total}
        </span>
      </button>
      
      <div className="w-px h-6 bg-border mx-1" />
      
      {/* Stage buttons */}
      {stages.map((stage) => (
        <button
          key={stage.key}
          onClick={() => onStageClick(stage.key)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap",
            activeStage === stage.key
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
        >
          <span 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: stage.color }}
          />
          <span>{stage.label}</span>
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded-full tabular-nums",
            activeStage === stage.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            {stage.count}
          </span>
        </button>
      ))}
    </div>
  );
}
