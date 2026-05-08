import { cn } from "@/lib/utils";
import { BadgeStyle, BADGE_STYLES } from "@/lib/badges/badgeTypes";
import { Sparkles, Medal, Layers, Square, Check } from "lucide-react";

interface BadgeStyleSelectorProps {
  selectedStyle: BadgeStyle;
  availableStyles: BadgeStyle[];
  onStyleChange: (style: BadgeStyle) => void;
}

const STYLE_ICONS: Record<BadgeStyle, typeof Medal> = {
  seal: Medal,
  metallic: Sparkles,
  gradient: Layers,
  flat: Square,
};

const STYLE_COLORS: Record<BadgeStyle, string> = {
  seal: "from-amber-500 to-amber-700",
  metallic: "from-yellow-400 via-yellow-200 to-yellow-500",
  gradient: "from-primary to-primary/70",
  flat: "from-slate-500 to-slate-600",
};

export function BadgeStyleSelector({
  selectedStyle,
  availableStyles,
  onStyleChange,
}: BadgeStyleSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {(Object.keys(BADGE_STYLES) as BadgeStyle[]).map((style) => {
        const isAvailable = availableStyles.includes(style);
        const isSelected = selectedStyle === style;
        const Icon = STYLE_ICONS[style];
        const config = BADGE_STYLES[style];

        return (
          <button
            key={style}
            onClick={() => isAvailable && onStyleChange(style)}
            disabled={!isAvailable}
            className={cn(
              "relative p-2.5 rounded-lg border transition-all duration-200 flex flex-col items-center gap-1.5",
              isAvailable
                ? "hover:bg-muted/50 cursor-pointer"
                : "opacity-30 cursor-not-allowed",
              isSelected
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border/50 bg-background"
            )}
          >
            {/* Icon Circle */}
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br",
              STYLE_COLORS[style]
            )}>
              <Icon className="h-3.5 w-3.5 text-white" />
            </div>

            {/* Label */}
            <span className={cn(
              "text-[10px] font-medium leading-tight text-center",
              isSelected ? "text-primary" : "text-muted-foreground"
            )}>
              {config.name.split(' ')[0]}
            </span>

            {/* Selected Indicator */}
            {isSelected && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-sm">
                <Check className="w-2.5 h-2.5 text-primary-foreground" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
