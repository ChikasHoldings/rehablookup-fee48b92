import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

const SearchResultCardSkeleton: React.FC = () => {
  return (
    <Card className="overflow-hidden h-full">
      {/* Image skeleton */}
      <div className="relative h-44 md:h-48 overflow-hidden">
        <Skeleton className="absolute inset-0" />
        {/* Featured badge skeleton */}
        <div className="absolute top-3 left-3">
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
      
      <CardContent className="p-4 md:p-5 space-y-3">
        {/* Title */}
        <Skeleton className="h-6 w-4/5" />
        
        {/* Location */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-28" />
        </div>
        
        {/* Rating */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
        
        {/* Description */}
        <div className="space-y-2 pt-1">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-11/12" />
        </div>
        
        {/* Treatment types */}
        <div className="flex flex-wrap gap-1.5 pt-2">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-18 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        
        {/* Button */}
        <Skeleton className="h-9 w-full mt-3 rounded-lg" />
      </CardContent>
    </Card>
  );
};

const SearchResultsLoading: React.FC<{ count?: number }> = ({ count = 9 }) => {
  return (
    <div className="grid gap-5 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SearchResultCardSkeleton key={i} />
      ))}
    </div>
  );
};

export { SearchResultCardSkeleton, SearchResultsLoading };
