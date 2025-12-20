import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const SearchResultCardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col md:flex-row overflow-hidden rounded-2xl border border-border bg-card shadow-md">
      {/* Image skeleton */}
      <div className="relative w-full md:w-80 lg:w-96 shrink-0 overflow-hidden">
        <div className="aspect-[16/10] md:aspect-auto md:h-full md:min-h-[220px]">
          <Skeleton className="h-full w-full" />
        </div>
        {/* Logo skeleton */}
        <div className="absolute bottom-3 left-3">
          <Skeleton className="h-14 w-14 rounded-xl" />
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="flex flex-1 flex-col p-5 md:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          {/* Rating skeleton */}
          <Skeleton className="h-16 w-16 rounded-xl shrink-0" />
        </div>

        {/* Badges Row */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>

        {/* Description */}
        <div className="space-y-2 mb-4 flex-1">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>

        {/* Treatment Types */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-18 rounded-full" />
        </div>

        {/* Actions Footer */}
        <div className="flex items-center gap-3 pt-4 border-t border-border/50">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 flex-1 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

const SearchResultsLoading: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="flex flex-col gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <SearchResultCardSkeleton key={i} />
      ))}
    </div>
  );
};

export { SearchResultCardSkeleton, SearchResultsLoading };
