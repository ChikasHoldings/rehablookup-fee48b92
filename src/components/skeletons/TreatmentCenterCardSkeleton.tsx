import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder card that matches TreatmentCenterCard's footprint so the
 * grid doesn't reflow when real data arrives. Used by /rehab-centers and
 * any other directory page while useStaticFacilities is still loading.
 */
const TreatmentCenterCardSkeleton: React.FC = () => (
  <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
    <div className="aspect-[16/10] w-full">
      <Skeleton className="h-full w-full rounded-none" />
    </div>
    <div className="p-4 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-md" />
        <Skeleton className="h-5 w-20 rounded-md" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
    </div>
  </div>
);

interface TreatmentCenterCardSkeletonGridProps {
  count?: number;
}

const TreatmentCenterCardSkeletonGrid: React.FC<TreatmentCenterCardSkeletonGridProps> = ({
  count = 6,
}) => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: count }).map((_, i) => (
      <TreatmentCenterCardSkeleton key={i} />
    ))}
  </div>
);

export { TreatmentCenterCardSkeleton, TreatmentCenterCardSkeletonGrid };
