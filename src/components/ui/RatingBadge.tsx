import { forwardRef } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingBadgeProps {
  rating: number | null;
  reviewCount: number;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  className?: string;
}

export const RatingBadge = forwardRef<HTMLDivElement, RatingBadgeProps>(
  function RatingBadge({ 
    rating, 
    reviewCount, 
    size = "md", 
    showCount = true,
    className 
  }, ref) {
    if (!rating || reviewCount === 0) return null;

  const sizeClasses = {
    sm: {
      container: "px-1.5 py-0.5 gap-1",
      star: "h-2.5 w-2.5",
      text: "text-xs",
      count: "text-[9px]",
    },
    md: {
      container: "px-2 py-1 gap-1.5",
      star: "h-3.5 w-3.5",
      text: "text-xs",
      count: "text-xs",
    },
    lg: {
      container: "px-2.5 py-1.5 gap-2",
      star: "h-4 w-4",
      text: "text-sm",
      count: "text-xs",
    },
  };

  const styles = sizeClasses[size];

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full font-semibold",
          "bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/60",
          "text-amber-700 shadow-sm",
          styles.container,
          className
        )}
      >
        <Star className={cn(styles.star, "fill-amber-400 text-amber-400")} />
        <span className={cn(styles.text, "font-bold")}>{rating.toFixed(1)}</span>
        {showCount && (
          <span className={cn(styles.count, "text-amber-600/80 font-medium")}>
            ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
          </span>
        )}
      </div>
    );
  }
);

interface RatingStarsProps {
  rating: number;
  maxStars?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
}

export function RatingStars({ 
  rating, 
  maxStars = 5, 
  size = "md",
  showValue = false,
  className 
}: RatingStarsProps) {
  const sizeClasses = {
    sm: { star: "h-3 w-3", gap: "gap-0.5", text: "text-xs" },
    md: { star: "h-4 w-4", gap: "gap-1", text: "text-sm" },
    lg: { star: "h-5 w-5", gap: "gap-1", text: "text-base" },
  };

  const styles = sizeClasses[size];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div className={cn("inline-flex items-center", styles.gap, className)}>
      {[...Array(maxStars)].map((_, i) => {
        const isFilled = i < fullStars;
        const isHalf = i === fullStars && hasHalfStar;
        
        return (
          <div key={i} className="relative">
            <Star 
              className={cn(
                styles.star,
                isFilled || isHalf 
                  ? "fill-amber-400 text-amber-400" 
                  : "fill-muted text-muted-foreground/30"
              )} 
            />
            {isHalf && (
              <div className="absolute inset-0 overflow-hidden w-1/2">
                <Star className={cn(styles.star, "fill-amber-400 text-amber-400")} />
              </div>
            )}
          </div>
        );
      })}
      {showValue && (
        <span className={cn(styles.text, "font-semibold text-foreground ml-1")}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
