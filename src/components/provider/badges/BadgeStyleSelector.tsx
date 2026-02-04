import { cn } from "@/lib/utils";
import { BadgeStyle, BADGE_STYLES } from "@/lib/badges/badgeTypes";
import { Sparkles, Medal, Layers, Square } from "lucide-react";

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

const STYLE_PREVIEW_COLORS: Record<BadgeStyle, { bg: string; accent: string }> = {
  seal: { bg: "bg-gradient-to-br from-amber-600 to-amber-800", accent: "bg-amber-400" },
  metallic: { bg: "bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700", accent: "bg-white/50" },
  gradient: { bg: "bg-gradient-to-br from-teal-400 to-teal-700", accent: "bg-white/30" },
  flat: { bg: "bg-teal-600", accent: "bg-teal-400" },
};

export function BadgeStyleSelector({
  selectedStyle,
  availableStyles,
  onStyleChange,
}: BadgeStyleSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {(Object.keys(BADGE_STYLES) as BadgeStyle[]).map((style) => {
        const isAvailable = availableStyles.includes(style);
        const isSelected = selectedStyle === style;
        const Icon = STYLE_ICONS[style];
        const colors = STYLE_PREVIEW_COLORS[style];
        const config = BADGE_STYLES[style];

        return (
          <button
            key={style}
            onClick={() => isAvailable && onStyleChange(style)}
            disabled={!isAvailable}
            className={cn(
              "relative p-3 rounded-lg border-2 transition-all duration-200",
              isAvailable
                ? "hover:border-primary/50 cursor-pointer"
                : "opacity-40 cursor-not-allowed border-muted",
              isSelected
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-muted bg-muted/20"
            )}
          >
            {/* Style Preview Mini Badge */}
            <div className="flex justify-center mb-2">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                colors.bg
              )}>
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center",
                  colors.accent
                )}>
                  <Icon className="h-3 w-3 text-white" />
                </div>
              </div>
            </div>

            {/* Style Name */}
            <p className={cn(
              "text-xs font-medium text-center",
              isSelected ? "text-primary" : "text-foreground"
            )}>
              {config.name}
            </p>
            <p className="text-[10px] text-muted-foreground text-center mt-0.5">
              {config.description}
            </p>

            {/* Selected Indicator */}
            {isSelected && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
