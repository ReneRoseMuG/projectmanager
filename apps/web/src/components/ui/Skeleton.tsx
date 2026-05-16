import type { CSSProperties } from "react";

interface SkeletonProps {
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

export function Skeleton({ className = "", width, height, radius = "md" }: SkeletonProps) {
  return <span className={`skeleton-shimmer block bg-steel-100 ${radiusClass[radius]} ${className}`} style={{ width, height }} aria-hidden="true" />;
}

export function ProjectGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="grid min-h-52 gap-4 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
          <Skeleton className="h-1.5 w-full" radius="sm" />
          <div className="grid gap-4 p-5 pt-2">
            <div className="flex items-start gap-3">
              <Skeleton className="h-11 w-11" />
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-10 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" radius="round" />
              <Skeleton className="h-6 w-20" radius="round" />
            </div>
            <Skeleton className="mt-auto h-10 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
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

export function KanbanSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {Array.from({ length: 3 }, (_, columnIndex) => (
        <div key={columnIndex} className="grid content-start gap-3 rounded-lg border border-line bg-white p-4">
          <Skeleton className="h-5 w-28" />
          {Array.from({ length: 3 }, (_, cardIndex) => (
            <div key={cardIndex} className="grid gap-2 rounded-md border border-line bg-shell p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-6 w-20" radius="round" />
            </div>
          ))}
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
