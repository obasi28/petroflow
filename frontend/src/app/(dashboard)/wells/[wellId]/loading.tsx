import { Skeleton } from "@/components/ui/skeleton";

export default function WellDetailLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  );
}
