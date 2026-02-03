/**
 * Shell loading skeletons - show immediately without animation
 * These replace spinners for instant perceived loading
 */

/**
 * Seeker shell skeleton - shows full layout instantly
 */
export function SeekerShellSkeleton() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header skeleton */}
      <div className="flex-shrink-0 h-14 border-b border-border bg-card">
        <div className="container flex h-full items-center justify-between">
          <div className="h-8 w-32 bg-muted rounded" />
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 bg-muted rounded-full" />
          </div>
        </div>
      </div>
      
      {/* Main content skeleton */}
      <main className="flex-1 overflow-y-auto bg-muted/30 pb-20 lg:pb-0">
        <div className="container py-6 space-y-6">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-40 bg-card rounded-lg border border-border" />
            ))}
          </div>
        </div>
      </main>
      
      {/* Mobile nav skeleton */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-card">
        <div className="flex items-center justify-around h-full px-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-8 bg-muted rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Provider shell skeleton
 */
export function ProviderShellSkeleton() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex-shrink-0 h-14 border-b border-border bg-card">
        <div className="container flex h-full items-center justify-between">
          <div className="h-8 w-40 bg-muted rounded" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-24 bg-muted rounded" />
            <div className="h-8 w-8 bg-muted rounded-full" />
          </div>
        </div>
      </div>
      
      <div className="flex flex-1 min-h-0">
        {/* Sidebar skeleton */}
        <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 border-r border-border bg-card/50">
          <nav className="p-4 space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-10 bg-muted rounded-lg" />
            ))}
          </nav>
        </aside>
        
        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-muted/30 pb-20 lg:pb-0">
          <div className="p-6 space-y-6">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-card rounded-lg border border-border" />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Admin shell skeleton
 */
export function AdminShellSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Header */}
      <div className="h-16 border-b border-slate-200 bg-white">
        <div className="container flex h-full items-center justify-between">
          <div className="h-8 w-40 bg-slate-200 rounded" />
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 bg-slate-200 rounded" />
            <div className="h-8 w-8 bg-slate-200 rounded-full" />
          </div>
        </div>
      </div>
      
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 bg-white">
          <nav className="p-4 space-y-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-xl" />
            ))}
          </nav>
        </aside>
        
        {/* Main content */}
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="h-8 w-48 bg-slate-200 rounded" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-white rounded-lg border border-slate-200" />
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="h-80 bg-white rounded-lg border border-slate-200" />
              <div className="h-80 bg-white rounded-lg border border-slate-200" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
