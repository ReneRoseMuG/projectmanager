import { Skeleton } from "../ui/Skeleton";

export function FeatureCardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="grid min-h-48 gap-4 rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <Skeleton className="h-11 w-11" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-12 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" radius="round" />
            <Skeleton className="h-6 w-16" radius="round" />
          </div>
        </div>
      ))}
    </div>
  );
}
