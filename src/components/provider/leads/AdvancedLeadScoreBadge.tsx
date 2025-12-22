import { useMemo } from "react";
import { 
  calculateAdvancedLeadScore,
  getScoreColor,
  getPriorityColor,
  getQuickScore,
  getLeadPriority,
  type LeadScoringInput,
  type FacilityMatchInput,
  type AdvancedLeadScore,
} from "@/lib/scoring";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Flame, 
  Target, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface AdvancedLeadScoreBadgeProps {
  lead: LeadScoringInput;
  facility?: FacilityMatchInput;
  showDetails?: boolean;
  showPriority?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'card' | 'inline';
}

export function AdvancedLeadScoreBadge({ 
  lead, 
  facility,
  showDetails = false, 
  showPriority = true,
  size = 'md',
  variant = 'badge',
}: AdvancedLeadScoreBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const score = useMemo(() => 
    calculateAdvancedLeadScore(lead, facility), 
    [lead, facility]
  );
  
  const gradeColors = getScoreColor(score.overallGrade);
  const priorityColors = getPriorityColor(score.priorityRank);

  // Small inline badge
  if (size === 'sm' || variant === 'inline') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn(
              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold",
              gradeColors.bg, gradeColors.text
            )}>
              {showPriority && <span>{priorityColors.icon}</span>}
              <span>{score.overallScore}</span>
              <span className="opacity-70">{score.overallGrade}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-sm p-3">
            <ScoreTooltipContent score={score} />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Card variant with expandable details
  if (variant === 'card') {
    return (
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className={cn(
          "rounded-lg border p-4",
          gradeColors.bg, gradeColors.border
        )}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex items-center justify-center w-12 h-12 rounded-full",
                "bg-background/50 border",
                gradeColors.border
              )}>
                <span className={cn("text-xl font-bold", gradeColors.text)}>
                  {score.overallGrade}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-2xl font-bold", gradeColors.text)}>
                    {score.overallScore}
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium",
                    priorityColors.bg, priorityColors.text
                  )}>
                    {priorityColors.icon} {score.priorityRank.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Advanced Lead Score
                </p>
              </div>
            </div>
            
            <CollapsibleTrigger asChild>
              <button className={cn(
                "p-2 rounded-md hover:bg-background/50 transition-colors",
                gradeColors.text
              )}>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </CollapsibleTrigger>
          </div>

          {/* Recommendation */}
          <div className={cn(
            "mt-3 p-2 rounded-md bg-background/30 text-sm",
            gradeColors.text
          )}>
            <div className="flex items-start gap-2">
              {score.priorityRank === 'hot' ? (
                <Flame className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <Target className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <span>{score.recommendedAction}</span>
            </div>
          </div>

          {/* Expandable Details */}
          <CollapsibleContent>
            <div className="mt-4 pt-4 border-t border-current/10 space-y-4">
              {/* Score Breakdown */}
              <div className="grid grid-cols-3 gap-3">
                <ScoreCategory 
                  label="Base Score" 
                  value={score.baseScore.total} 
                  max={100}
                  colors={gradeColors}
                />
                <ScoreCategory 
                  label="Quality" 
                  value={Math.round(score.qualityMetrics.qualityMultiplier * 100 - 70)} 
                  max={60}
                  suffix="x"
                  colors={gradeColors}
                />
                {score.facilityMatch && (
                  <ScoreCategory 
                    label="Match" 
                    value={score.facilityMatch.matchPercentage} 
                    max={100}
                    suffix="%"
                    colors={gradeColors}
                  />
                )}
              </div>

              {/* Detailed Factors */}
              <div className="space-y-3">
                <h4 className={cn("text-xs font-semibold uppercase tracking-wide", gradeColors.text)}>
                  Base Factors
                </h4>
                {score.baseScore.factors.map((factor) => (
                  <FactorRow key={factor.label} factor={factor} colors={gradeColors} />
                ))}
              </div>

              <div className="space-y-3">
                <h4 className={cn("text-xs font-semibold uppercase tracking-wide", gradeColors.text)}>
                  Quality Metrics
                </h4>
                {score.qualityMetrics.qualityFactors.map((factor) => (
                  <FactorRow key={factor.label} factor={factor} colors={gradeColors} />
                ))}
              </div>

              {score.facilityMatch && (
                <div className="space-y-3">
                  <h4 className={cn("text-xs font-semibold uppercase tracking-wide", gradeColors.text)}>
                    Facility Match
                  </h4>
                  {score.facilityMatch.matchFactors.map((factor) => (
                    <FactorRow key={factor.label} factor={factor} colors={gradeColors} />
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  // Default badge variant
  return (
    <div className={cn(
      "rounded-lg border p-3",
      gradeColors.bg, gradeColors.border
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className={cn("h-4 w-4", gradeColors.text)} />
          <span className={cn("text-sm font-medium", gradeColors.text)}>Lead Score</span>
        </div>
        <div className="flex items-center gap-2">
          {showPriority && (
            <span className={cn(
              "px-1.5 py-0.5 rounded text-xs font-medium",
              priorityColors.bg, priorityColors.text
            )}>
              {priorityColors.icon}
            </span>
          )}
          <span className={cn("text-2xl font-bold", gradeColors.text)}>
            {score.overallScore}
          </span>
          <span className={cn(
            "px-2 py-0.5 rounded text-sm font-bold border",
            gradeColors.bg, gradeColors.text, gradeColors.border
          )}>
            {score.overallGrade}
          </span>
        </div>
      </div>
      
      {showDetails && (
        <div className="space-y-2 mt-3 pt-3 border-t border-current/10">
          {score.baseScore.factors.slice(0, 3).map((factor) => (
            <div key={factor.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className={gradeColors.text}>{factor.label}</span>
                <span className={cn("font-medium", gradeColors.text)}>
                  {factor.points}/{factor.maxPoints}
                </span>
              </div>
              <Progress 
                value={(factor.points / factor.maxPoints) * 100} 
                className="h-1.5"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper components
function ScoreCategory({ 
  label, 
  value, 
  max, 
  suffix = '',
  colors 
}: { 
  label: string; 
  value: number; 
  max: number;
  suffix?: string;
  colors: ReturnType<typeof getScoreColor>;
}) {
  return (
    <div className={cn("text-center p-2 rounded-md bg-background/30", colors.text)}>
      <div className="text-lg font-bold">{value}{suffix}</div>
      <div className="text-xs opacity-70">{label}</div>
    </div>
  );
}

function FactorRow({ 
  factor, 
  colors 
}: { 
  factor: { label: string; points: number; maxPoints: number; details?: string };
  colors: ReturnType<typeof getScoreColor>;
}) {
  const percentage = (factor.points / factor.maxPoints) * 100;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          {percentage >= 70 ? (
            <CheckCircle2 className="h-3 w-3 text-green-600" />
          ) : percentage >= 40 ? (
            <AlertCircle className="h-3 w-3 text-amber-600" />
          ) : (
            <AlertCircle className="h-3 w-3 text-red-600" />
          )}
          <span className={colors.text}>{factor.label}</span>
        </div>
        <span className={cn("font-medium", colors.text)}>
          {factor.points}/{factor.maxPoints}
        </span>
      </div>
      <Progress value={percentage} className="h-1" />
      {factor.details && (
        <p className="text-xs text-muted-foreground">{factor.details}</p>
      )}
    </div>
  );
}

function ScoreTooltipContent({ score }: { score: AdvancedLeadScore }) {
  const gradeColors = getScoreColor(score.overallGrade);
  const priorityColors = getPriorityColor(score.priorityRank);
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <span className="font-medium">Advanced Lead Score</span>
        <div className="flex items-center gap-2">
          <span className={cn(
            "px-1.5 py-0.5 rounded text-xs",
            priorityColors.bg, priorityColors.text
          )}>
            {priorityColors.icon} {score.priorityRank}
          </span>
          <span className="font-bold">{score.overallScore}/100</span>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-1.5 rounded bg-muted">
          <div className="font-semibold">{score.baseScore.total}</div>
          <div className="text-muted-foreground">Base</div>
        </div>
        <div className="p-1.5 rounded bg-muted">
          <div className="font-semibold">{score.qualityMetrics.qualityMultiplier}x</div>
          <div className="text-muted-foreground">Quality</div>
        </div>
        {score.facilityMatch && (
          <div className="p-1.5 rounded bg-muted">
            <div className="font-semibold">{score.facilityMatch.matchPercentage}%</div>
            <div className="text-muted-foreground">Match</div>
          </div>
        )}
      </div>

      <div className="pt-2 border-t text-xs text-muted-foreground">
        {score.recommendedAction}
      </div>
    </div>
  );
}

// Hook for easy access to advanced scoring
export function useAdvancedLeadScore(
  lead: LeadScoringInput, 
  facility?: FacilityMatchInput
): AdvancedLeadScore {
  return useMemo(() => calculateAdvancedLeadScore(lead, facility), [lead, facility]);
}

// Quick score hook for lists
export function useQuickLeadScore(lead: LeadScoringInput): {
  score: number;
  priority: 'hot' | 'warm' | 'cool' | 'cold';
} {
  return useMemo(() => ({
    score: getQuickScore(lead),
    priority: getLeadPriority(lead),
  }), [lead]);
}
