import { useMemo } from "react";
import { 
  calculateLeadScore, 
  getScoreColor, 
  type LeadScoringInput,
  type LeadScore 
} from "@/lib/scoring";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { TrendingUp } from "lucide-react";


interface LeadScoreBadgeProps {
  lead: LeadScoringInput;
  showDetails?: boolean;
  size?: 'sm' | 'md';
}

export function LeadScoreBadge({ lead, showDetails = false, size = 'md' }: LeadScoreBadgeProps) {
  const score = useMemo(() => calculateLeadScore(lead), [lead]);
  const colors = getScoreColor(score.grade);

  if (size === 'sm') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold ${colors.bg} ${colors.text}`}>
              {score.grade}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium">Lead Score</span>
                <span className="font-bold">{score.total}/100</span>
              </div>
              <div className="space-y-1.5">
                {score.factors.map((factor) => (
                  <div key={factor.label} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">{factor.label}</span>
                    <span>{factor.points}/{factor.maxPoints}</span>
                  </div>
                ))}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={`rounded-lg border p-3 ${colors.bg} ${colors.border}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className={`h-4 w-4 ${colors.text}`} />
          <span className={`text-sm font-medium ${colors.text}`}>Lead Score</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold ${colors.text}`}>{score.total}</span>
          <span className={`px-2 py-0.5 rounded text-sm font-bold ${colors.bg} ${colors.text} border ${colors.border}`}>
            {score.grade}
          </span>
        </div>
      </div>
      
      {showDetails && (
        <div className="space-y-2 mt-3 pt-3 border-t border-current/10">
          {score.factors.map((factor) => (
            <div key={factor.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className={colors.text}>{factor.label}</span>
                <span className={`font-medium ${colors.text}`}>{factor.points}/{factor.maxPoints}</span>
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

export function useLeadScore(lead: LeadScoringInput): LeadScore {
  return useMemo(() => calculateLeadScore(lead), [lead]);
}
