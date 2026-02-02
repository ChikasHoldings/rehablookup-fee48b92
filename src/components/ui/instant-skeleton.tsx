import { cn } from "@/lib/utils";

interface InstantSkeletonProps {
  className?: string;
  variant?: "text" | "card" | "circle" | "button";
}

/**
 * Instant skeleton component for perceived performance
 * Uses CSS-only animation for zero-JS overhead during load
 */
export function InstantSkeleton({ className, variant = "text" }: InstantSkeletonProps) {
  const variants = {
    text: "h-4 w-full rounded",
    card: "h-48 w-full rounded-xl",
    circle: "h-10 w-10 rounded-full",
    button: "h-10 w-24 rounded-lg",
  };

  return (
    <div
      className={cn(
        "animate-pulse bg-gradient-to-r from-muted via-muted/70 to-muted bg-[length:200%_100%]",
        variants[variant],
        className
      )}
      aria-hidden="true"
    />
  );
}

/**
 * Page-level skeleton for instant perceived loading
 */
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="h-16 border-b border-border bg-card">
        <div className="container flex h-full items-center justify-between">
          <InstantSkeleton className="h-8 w-32" />
          <div className="hidden md:flex items-center gap-4">
            <InstantSkeleton className="h-4 w-20" />
            <InstantSkeleton className="h-4 w-20" />
            <InstantSkeleton className="h-4 w-20" />
          </div>
          <InstantSkeleton variant="button" />
        </div>
      </div>

      {/* Hero skeleton */}
      <div className="bg-primary/5 py-16">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center space-y-4">
            <InstantSkeleton className="h-10 w-3/4 mx-auto" />
            <InstantSkeleton className="h-5 w-1/2 mx-auto" />
            <InstantSkeleton className="h-12 w-full max-w-md mx-auto rounded-lg" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="container py-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <InstantSkeleton key={i} variant="card" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Card skeleton for facility cards
 */
export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <InstantSkeleton className="h-32 rounded-lg" />
      <InstantSkeleton className="h-5 w-3/4" />
      <InstantSkeleton className="h-4 w-1/2" />
      <div className="flex gap-2">
        <InstantSkeleton className="h-6 w-16 rounded-full" />
        <InstantSkeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

/**
 * Dashboard skeleton for panel pages
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <InstantSkeleton className="h-8 w-48" />
        <InstantSkeleton className="h-4 w-72" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <InstantSkeleton className="h-4 w-20 mb-2" />
            <InstantSkeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Content area */}
      <div className="rounded-xl border border-border bg-card p-6">
        <InstantSkeleton className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <InstantSkeleton key={i} className="h-12" />
          ))}
        </div>
      </div>
    </div>
  );
}
