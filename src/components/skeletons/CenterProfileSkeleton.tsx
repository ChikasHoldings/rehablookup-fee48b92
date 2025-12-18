import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function CenterProfileSkeleton() {
  return (
    <div className="bg-muted/30 min-h-screen pb-28 md:pb-0">
      <div className="container max-w-6xl px-4 py-5 md:px-6 md:py-8">
        {/* Back link skeleton */}
        <Skeleton className="h-5 w-40 mb-5" />

        {/* Header Card Skeleton */}
        <div className="mb-5 md:mb-6 rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              {/* Logo skeleton */}
              <Skeleton className="h-20 w-20 shrink-0 rounded-2xl" />
              
              <div className="flex-1 min-w-0 space-y-3">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-7 w-24 rounded-full" />
                  <Skeleton className="h-7 w-20 rounded-full" />
                </div>
                
                {/* Title */}
                <Skeleton className="h-7 w-64 md:w-80" />
                
                {/* Location */}
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-5 w-40" />
                </div>
              </div>
            </div>

            {/* Desktop action buttons */}
            <div className="hidden md:flex gap-3">
              <Skeleton className="h-11 w-32 rounded-lg" />
              <Skeleton className="h-11 w-36 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Gallery Skeleton */}
        <div className="mb-5 md:mb-6 rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <Skeleton className="aspect-[16/9] md:aspect-[21/9] w-full" />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-5 md:gap-6 md:grid-cols-3">
          {/* Left Column - Main Content */}
          <div className="md:col-span-2 space-y-5 md:space-y-6">
            {/* About Section */}
            <Card>
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-4/5" />
              </CardContent>
            </Card>

            {/* Facility Details */}
            <Card>
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-36" />
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="h-5 w-5 rounded-full shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-3.5 w-20" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Services Section */}
            <Card>
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-44" />
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {[...Array(8)].map((_, i) => (
                    <Skeleton 
                      key={i} 
                      className="h-8 rounded-full" 
                      style={{ width: `${60 + Math.random() * 60}px` }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Insurance Section */}
            <Card>
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton 
                      key={i} 
                      className="h-7 rounded-full" 
                      style={{ width: `${70 + Math.random() * 50}px` }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Trust Section */}
            <Card>
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-52" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Contact Card */}
          <div className="md:col-span-1">
            <div className="sticky top-24">
              <Card>
                <CardHeader className="pb-3">
                  <Skeleton className="h-6 w-36" />
                  <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Form fields skeleton */}
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-14" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-24 w-full rounded-md" />
                  </div>
                  
                  {/* Submit button */}
                  <Skeleton className="h-11 w-full rounded-lg mt-2" />
                  
                  {/* Quick response info */}
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
