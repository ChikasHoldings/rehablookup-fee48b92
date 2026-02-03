/**
 * Admin page loading - instant skeleton, no spinners
 * Shows content structure immediately for perceived instant loading
 */
export function AdminPageLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-muted" />
        <div>
          <div className="h-6 w-48 bg-muted rounded mb-1" />
          <div className="h-4 w-64 bg-muted rounded" />
        </div>
      </div>
      
      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-muted" />
        ))}
      </div>
      
      {/* Main content */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-80 rounded-lg bg-muted" />
        <div className="h-80 rounded-lg bg-muted" />
      </div>
    </div>
  );
}

/**
 * Admin list page skeleton
 */
export function AdminListSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-10 w-32 bg-muted rounded" />
      </div>
      
      {/* Filters */}
      <div className="flex gap-4">
        <div className="h-10 flex-1 bg-muted rounded" />
        <div className="h-10 w-32 bg-muted rounded" />
      </div>
      
      {/* Table rows */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-16 bg-muted rounded-lg" />
      ))}
    </div>
  );
}

/**
 * Admin dashboard skeleton for instant content structure
 */
export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-muted" />
        <div>
          <div className="h-6 w-48 bg-muted rounded mb-1" />
          <div className="h-4 w-64 bg-muted rounded" />
        </div>
      </div>
      
      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-lg bg-muted" />
        ))}
      </div>
      
      {/* Content area */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 rounded-lg bg-muted" />
        <div className="h-64 rounded-lg bg-muted" />
      </div>
    </div>
  );
}
