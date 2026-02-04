import { Lock, Check, TrendingUp, Star, Award, Trophy, Gem, Shield, Heart, MessageSquare, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BadgeTier, BadgeType, BadgeTierConfig } from "@/lib/badges/badgeTypes";
import { Progress } from "@/components/ui/progress";

interface BadgeCardProps {
  badge: BadgeType;
  tier: BadgeTier;
  config: BadgeTierConfig | null;
  nextTier: BadgeTierConfig | null;
  progress: number;
  isSelected?: boolean;
  onSelect?: () => void;
}

const TIER_STYLES: Record<BadgeTier, { 
  bg: string; 
  border: string; 
  text: string; 
  iconBg: string;
  badge: string;
}> = {
  locked: { 
    bg: "bg-muted/30", 
    border: "border-border/50", 
    text: "text-muted-foreground",
    iconBg: "bg-muted",
    badge: "bg-muted text-muted-foreground"
  },
  bronze: { 
    bg: "bg-gradient-to-br from-amber-950/30 to-amber-900/10", 
    border: "border-amber-700/40", 
    text: "text-amber-500",
    iconBg: "bg-amber-500/10",
    badge: "bg-gradient-to-r from-amber-700 to-amber-600 text-white"
  },
  silver: { 
    bg: "bg-gradient-to-br from-slate-400/20 to-slate-300/5", 
    border: "border-slate-400/40", 
    text: "text-slate-300",
    iconBg: "bg-slate-400/10",
    badge: "bg-gradient-to-r from-slate-400 to-slate-300 text-slate-900"
  },
  gold: { 
    bg: "bg-gradient-to-br from-yellow-500/20 to-yellow-400/5", 
    border: "border-yellow-500/40", 
    text: "text-yellow-500",
    iconBg: "bg-yellow-500/10",
    badge: "bg-gradient-to-r from-yellow-500 to-yellow-400 text-yellow-950"
  },
  platinum: { 
    bg: "bg-gradient-to-br from-white/20 to-slate-100/5", 
    border: "border-white/30", 
    text: "text-white",
    iconBg: "bg-white/10",
    badge: "bg-gradient-to-r from-white to-slate-100 text-slate-900"
  },
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
    <button
      onClick={onSelect}
      disabled={isLocked}
      className={cn(
        "relative w-full p-4 rounded-xl border transition-all duration-200 text-left group",
        styles.bg,
        styles.border,
        isLocked 
          ? "opacity-70 cursor-not-allowed" 
          : "hover:scale-[1.02] hover:shadow-lg cursor-pointer",
        isSelected && !isLocked && "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg"
      )}
    >
      {/* Tier Badge */}
      {!isLocked && (
        <div className={cn(
          "absolute -top-2 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm",
          styles.badge
        )}>
          {tier}
        </div>
      )}

      {/* Main Content */}
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform",
          styles.iconBg,
          !isLocked && "group-hover:scale-110"
        )}>
          {isLocked ? (
            <Lock className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Icon className={cn("h-5 w-5", styles.text)} />
          )}
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2">
            <h4 className={cn(
              "font-semibold text-sm truncate",
              isLocked ? "text-muted-foreground" : "text-foreground"
            )}>
              {config?.label || badge.name}
            </h4>
            {isSelected && !isLocked && (
              <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center shrink-0">
                <Check className="h-2.5 w-2.5 text-primary-foreground" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
            {config?.description || badge.description}
          </p>
        </div>
      </div>

      {/* Progress Bar (for unlocked with next tier) */}
      {!isLocked && nextTier && progress > 0 && progress < 1 && (
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Next: {nextTier.label}</span>
            <span className={styles.text}>{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-500",
                tier === "bronze" && "bg-gradient-to-r from-amber-600 to-amber-500",
                tier === "silver" && "bg-gradient-to-r from-slate-400 to-slate-300",
                tier === "gold" && "bg-gradient-to-r from-yellow-500 to-yellow-400",
                tier === "platinum" && "bg-gradient-to-r from-white to-slate-200"
              )}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Unlock Requirements (for locked) */}
      {isLocked && nextTier && (
        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <ChevronRight className="h-3 w-3" />
            <span className="line-clamp-1">{nextTier.description}</span>
          </div>
        </div>
      )}
    </button>
  );
}
