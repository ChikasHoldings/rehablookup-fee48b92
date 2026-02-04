import { Lock, Check, TrendingUp, Star, Award, Trophy, Gem, Shield, Heart, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { BadgeTier, BadgeType, BadgeTierConfig } from "@/lib/badges/badgeTypes";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BadgeCardProps {
  badge: BadgeType;
  tier: BadgeTier;
  config: BadgeTierConfig | null;
  nextTier: BadgeTierConfig | null;
  progress: number;
  isSelected?: boolean;
  onSelect?: () => void;
}

const TIER_STYLES: Record<BadgeTier, { bg: string; border: string; text: string; glow: string }> = {
  locked: { bg: "bg-muted/50", border: "border-muted", text: "text-muted-foreground", glow: "" },
  bronze: { bg: "bg-amber-950/20", border: "border-amber-700/50", text: "text-amber-600", glow: "shadow-amber-500/10" },
  silver: { bg: "bg-slate-200/10", border: "border-slate-400/50", text: "text-slate-300", glow: "shadow-slate-400/10" },
  gold: { bg: "bg-yellow-950/20", border: "border-yellow-500/50", text: "text-yellow-500", glow: "shadow-yellow-500/20" },
  platinum: { bg: "bg-slate-100/10", border: "border-slate-200/50", text: "text-slate-100", glow: "shadow-slate-200/20" },
};

const BADGE_ICONS: Record<string, typeof Shield> = {
  "shield-check": Shield,
  "star": Star,
  "message-square": MessageSquare,
  "award": Award,
  "trophy": Trophy,
  "gem": Gem,
  "heart-handshake": Heart,
  "trending-up": TrendingUp,
};

export function BadgeCard({
  badge,
  tier,
  config,
  nextTier,
  progress,
  isSelected,
  onSelect,
}: BadgeCardProps) {
  const isLocked = tier === "locked";
  const styles = TIER_STYLES[tier];
  const Icon = BADGE_ICONS[badge.icon] || Shield;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onSelect}
            disabled={isLocked}
            className={cn(
              "relative w-full p-4 rounded-xl border-2 transition-all duration-200 text-left",
              styles.bg,
              styles.border,
              isLocked ? "opacity-60 cursor-not-allowed" : "hover:scale-[1.02] cursor-pointer",
              isSelected && !isLocked && "ring-2 ring-primary ring-offset-2 ring-offset-background",
              !isLocked && `shadow-lg ${styles.glow}`
            )}
          >
            {/* Lock overlay for locked badges */}
            {isLocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-xl backdrop-blur-[1px]">
                <Lock className="h-6 w-6 text-muted-foreground" />
              </div>
            )}

            {/* Tier indicator */}
            {!isLocked && (
              <div className={cn(
                "absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                tier === "bronze" && "bg-amber-700 text-amber-100",
                tier === "silver" && "bg-slate-400 text-slate-900",
                tier === "gold" && "bg-yellow-500 text-yellow-950",
                tier === "platinum" && "bg-gradient-to-r from-slate-200 to-white text-slate-900"
              )}>
                {tier}
              </div>
            )}

            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={cn(
                "p-2 rounded-lg",
                isLocked ? "bg-muted" : styles.bg
              )}>
                <Icon className={cn("h-5 w-5", isLocked ? "text-muted-foreground" : styles.text)} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className={cn(
                  "font-semibold text-sm truncate",
                  isLocked ? "text-muted-foreground" : "text-foreground"
                )}>
                  {config?.label || badge.name}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {config?.description || badge.description}
                </p>
              </div>

              {/* Selected indicator */}
              {isSelected && !isLocked && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
            </div>

            {/* Progress to next tier */}
            {nextTier && progress > 0 && progress < 1 && (
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Progress to {nextTier.label}</span>
                  <span>{Math.round(progress * 100)}%</span>
                </div>
                <Progress value={progress * 100} className="h-1.5" />
              </div>
            )}

            {/* Unlock requirements for locked badges */}
            {isLocked && nextTier && (
              <div className="mt-3 pt-3 border-t border-muted">
                <p className="text-[10px] text-muted-foreground">
                  <span className="font-medium">Unlock:</span> {nextTier.description}
                </p>
              </div>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px]">
          <p className="text-xs">
            {isLocked
              ? `Complete requirements to unlock: ${nextTier?.description || badge.description}`
              : `Click to select this badge for embedding`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
