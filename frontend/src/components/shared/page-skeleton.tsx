import { Skeleton } from "@/components/ui/skeleton";

interface PageSkeletonProps {
  cards?: number;
  showChart?: boolean;
}

export function PageSkeleton({ cards = 4, showChart = true }: PageSkeletonProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: Math.min(cards, 4) }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
      {showChart && <Skeleton className="h-[350px] w-full rounded-lg" />}
    </div>
  );
}
