import { Loader2 } from "lucide-react";

/**
 * Full-page loading with branded skeleton for instant perceived performance
 * Shows meaningful content structure instead of just a spinner
 */
export function PageLoading() {
  return (
    <div className="min-h-screen bg-background animate-in fade-in duration-150">
      {/* Minimal header placeholder */}
      <div className="h-16 border-b border-border/50 bg-card/50">
        <div className="container flex h-full items-center">
          <div className="h-8 w-32 rounded bg-muted animate-pulse" />
        </div>
      </div>
      
      {/* Content area with centered loader */}
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <Loader2 className="h-8 w-8 animate-spin text-primary relative" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Section-level loading for partial page updates
 */
export function SectionLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
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
