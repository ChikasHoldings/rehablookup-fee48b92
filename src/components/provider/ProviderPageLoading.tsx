import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

/**
 * Provider page loading with instant skeleton for faster perceived performance
 */
export function ProviderPageLoading() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-200">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-4 w-72 bg-muted rounded animate-pulse" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-4 w-24 bg-muted rounded animate-pulse mb-2" />
              <div className="h-8 w-16 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content skeleton */}
      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 w-full bg-muted rounded animate-pulse" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Provider table loading skeleton
 */
export function ProviderTableLoading() {
  return (
    <div className="space-y-3 animate-in fade-in duration-150">
      <div className="h-10 w-full bg-muted rounded animate-pulse" />
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-14 w-full bg-muted rounded animate-pulse" />
      ))}
    </div>
  );
}

/**
 * Provider card loading skeleton
 */
export function ProviderCardLoading() {
  return (
    <Card className="animate-in fade-in duration-150">
      <CardContent className="pt-6 space-y-4">
        <div className="h-6 w-3/4 bg-muted rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
        <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}

/**
 * Inline loading spinner for buttons and small areas
 */
export function ProviderInlineLoading() {
  return (
    <div className="flex items-center justify-center p-4">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
    </div>
  );
}
