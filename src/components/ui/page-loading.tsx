import { Loader2 } from "lucide-react";

/**
 * Instant skeleton loading - shows content structure immediately
 * No spinner, no delay - just meaningful placeholders
 */
export function PageLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Instant content skeleton - no animations to reduce jank */}
      <div className="container py-6 space-y-6">
        {/* Title skeleton */}
        <div className="h-8 w-64 bg-muted rounded" />
        
        {/* Content grid skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Dashboard-style skeleton for admin/provider/seeker panels
 */
export function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Stats row skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-lg" />
        ))}
      </div>
      
      {/* Main content skeleton */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-80 bg-muted rounded-lg" />
        <div className="h-80 bg-muted rounded-lg" />
      </div>
    </div>
  );
}

/**
 * List page skeleton
 */
export function ListLoading() {
  return (
    <div className="space-y-4">
      {/* Search/filter bar skeleton */}
      <div className="flex gap-4">
        <div className="h-10 flex-1 bg-muted rounded" />
        <div className="h-10 w-32 bg-muted rounded" />
      </div>
      
      {/* List items skeleton */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-20 bg-muted rounded-lg" />
      ))}
    </div>
  );
}

/**
 * Section-level loading - minimal skeleton
 */
export function SectionLoading() {
  return (
    <div className="py-8">
      <div className="h-32 bg-muted rounded-lg" />
    </div>
  );
}

/**
 * Inline loading for small areas
 */
export function InlineLoading() {
  return (
    <div className="flex items-center justify-center p-4">
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * Button loading state
 */
export function ButtonLoading() {
  return <Loader2 className="h-4 w-4 animate-spin" />;
}

/**
 * Card loading placeholder
 */
export function CardLoading() {
  return <div className="h-48 bg-muted rounded-lg" />;
}
