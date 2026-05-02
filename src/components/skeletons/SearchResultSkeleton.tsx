import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const SearchResultCardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col md:flex-row overflow-hidden rounded-xl border border-border bg-card shadow-md">
      {/* Image skeleton — matches SearchResultCard exactly to avoid swap-in jump */}
      <div className="relative md:w-60 lg:w-64 shrink-0 overflow-hidden">
        <div className="aspect-[16/10] md:aspect-auto md:h-full md:min-h-[180px]">
          <Skeleton className="h-full w-full" />
        </div>
        {/* Logo skeleton */}
        <div className="absolute bottom-3 left-3">
          <Skeleton className="h-11 w-11 rounded-lg" />
        </div>
        {/* Years badge skeleton */}
        <div className="absolute bottom-3 right-3">
          <Skeleton className="h-6 w-20 rounded-md" />
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="flex flex-1 flex-col p-4 md:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-40" />
          </div>
          {/* Rating skeleton */}
          <div className="flex flex-col items-end gap-1.5">
            <Skeleton className="h-7 w-16 rounded-lg" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>

        {/* Phone skeleton */}
        <Skeleton className="h-5 w-36 mb-3" />

        {/* Badges Row */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-5 w-28 rounded-md" />
          <Skeleton className="h-5 w-24 rounded-md" />
        </div>

        {/* Description */}
        <div className="space-y-1.5 mb-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>

        {/* Treatment Types */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="h-5 w-18 rounded-md" />
        </div>

        {/* Actions Footer */}
        <div className="flex items-center gap-2 mt-auto">
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 flex-1 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

const SearchResultsLoading: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SearchResultCardSkeleton key={i} />
      ))}
    </div>
  );
};

export { SearchResultCardSkeleton, SearchResultsLoading };
