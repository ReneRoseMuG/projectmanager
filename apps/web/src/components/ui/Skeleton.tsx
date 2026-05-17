import type { CSSProperties, HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  className?: string;
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  radius?: "sm" | "md" | "round";
}

const radiusClass: Record<NonNullable<SkeletonProps["radius"]>, string> = {
  sm: "rounded",
  md: "rounded-md",
  round: "rounded-full"
};

/** Loading placeholder with the shared shimmer treatment. */
export function Skeleton({ className = "", width, height, radius = "md", style, ...props }: SkeletonProps) {
  return <span className={`skeleton-shimmer block bg-steel-100 ${radiusClass[radius]} ${className}`} style={{ width, height, ...style }} aria-hidden="true" {...props} />;
}

export function TaskListSkeleton() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className={`grid gap-3 rounded-lg border border-line border-l-4 bg-white p-4 shadow-sm ${index % 4 === 1 ? "border-l-tangerine" : index % 4 === 2 ? "border-l-crimson" : "border-l-steel-300"}`}>
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-8 w-20" radius="round" />
          </div>
          <Skeleton className="h-3 w-4/5" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" radius="round" />
            <Skeleton className="h-6 w-24" radius="round" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <div className="grid gap-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="flex gap-2 border-b border-line pb-3">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
      <TaskListSkeleton />
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-9 w-48" />
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-line bg-line">
        {Array.from({ length: 28 }, (_, index) => {
          const first = (index * 17) % 7 < 3;
          const second = (index * 17) % 7 < 1;
          return (
            <div key={index} className="min-h-24 bg-white p-2">
              <Skeleton className="h-3 w-8" />
              {first ? <Skeleton className="mt-4 h-5 w-full" /> : null}
              {second ? <Skeleton className="mt-2 h-5 w-2/3" /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
