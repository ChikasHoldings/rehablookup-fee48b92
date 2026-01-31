import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ProviderPageWrapperProps {
  children: ReactNode;
  /** Maximum content width. Defaults to "6xl" (72rem / 1152px) */
  maxWidth?: "4xl" | "5xl" | "6xl" | "7xl" | "full";
  /** Custom className for additional styling */
  className?: string;
  /** Whether to remove default padding (useful for edge-to-edge layouts) */
  noPadding?: boolean;
}

const maxWidthClasses = {
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl", 
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  "full": "max-w-full",
};

/**
 * Consistent responsive wrapper for Provider Panel pages.
 * Provides standardized padding, max-width, and responsive behavior.
 * 
 * Responsive breakpoints:
 * - Mobile: < 640px (sm)
 * - Tablet: 640px - 1024px (sm to lg)
 * - Desktop: > 1024px (lg+)
 */
export function ProviderPageWrapper({
  children,
  maxWidth = "6xl",
  className,
  noPadding = false,
}: ProviderPageWrapperProps) {
  return (
    <div
      className={cn(
        "min-h-full w-full",
        !noPadding && "px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6",
        className
      )}
    >
      <div className={cn("mx-auto w-full", maxWidthClasses[maxWidth])}>
        {children}
      </div>
    </div>
  );
}
