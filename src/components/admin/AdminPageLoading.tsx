import { Loader2 } from "lucide-react";

/**
 * Admin page loading with instant skeleton for faster perceived performance
 */
export function AdminPageLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <Loader2 className="h-6 w-6 animate-spin text-slate-600 relative" />
        </div>
        <p className="text-sm text-slate-500 animate-pulse">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Admin dashboard skeleton for instant content structure
 */
export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
        <div>
          <div className="h-6 w-48 bg-muted rounded animate-pulse mb-1" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse" />
        </div>
      </div>
      
      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
      
      {/* Content area */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 rounded-lg bg-muted animate-pulse" />
        <div className="h-64 rounded-lg bg-muted animate-pulse" />
      </div>
    </div>
  );
}
