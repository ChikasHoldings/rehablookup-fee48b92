import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ProviderDashboardSkeleton() {
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-56 sm:w-72" />
            <Skeleton className="h-5 w-44 sm:w-52" />
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Skeleton className="h-9 sm:h-10 w-24 sm:w-28 rounded-md" />
            <Skeleton className="h-9 sm:h-10 w-28 sm:w-32 rounded-md" />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg" />
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <Skeleton className="h-8 w-14" />
                <Skeleton className="h-3 w-24 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Leads Section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg border border-border"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Avatar */}
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Name and location */}
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-20 hidden sm:block" />
                    </div>
                    
                    {/* Contact info */}
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-3.5 w-24" />
                      <Skeleton className="h-3.5 w-28 hidden sm:block" />
                    </div>
                  </div>
                </div>

                {/* Right side - status and time */}
                <div className="flex items-center gap-3 shrink-0">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-4 w-16 hidden sm:block" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions / Additional Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-28" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-44" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-36" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-3 w-40 mt-2" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
