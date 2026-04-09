import { Skeleton } from "@/components/ui/skeleton";

/**
 * Admin page loading - instant skeleton, no spinners
 * Shows content structure immediately for perceived instant loading
 */
export function AdminPageLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-48 rounded" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
      </div>
      
      {/* Stats row */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
            <Skeleton className="h-3.5 w-20 rounded" />
            <Skeleton className="h-7 w-14 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
        ))}
      </div>
      
      {/* Main content */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <Skeleton className="h-5 w-32 rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * Admin list page skeleton
 */
export function AdminListSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-7 w-48 rounded" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      
      {/* Filters */}
      <div className="flex gap-3">
        <Skeleton className="h-9 flex-1 max-w-xs rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      
      {/* Table rows */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="border-b px-4 py-3 bg-muted/30">
          <div className="flex gap-8">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-4 w-20 rounded" />
            ))}
          </div>
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b last:border-0">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        ))}
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
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-52 rounded" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
      </div>
      
      {/* Stats grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-20 rounded" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
            <Skeleton className="h-8 w-16 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
        ))}
      </div>
      
      {/* Content area */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36 rounded" />
            <Skeleton className="h-7 w-16 rounded" />
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/5 rounded" />
                <Skeleton className="h-3 w-2/5 rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <Skeleton className="h-5 w-28 rounded" />
          <Skeleton className="h-52 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
