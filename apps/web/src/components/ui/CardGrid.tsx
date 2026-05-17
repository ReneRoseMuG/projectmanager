import type { ReactNode } from "react";

interface CardGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}

const columnClasses: Record<NonNullable<CardGridProps["columns"]>, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 xl:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
};

/** Responsive card grid used for statusless board layouts. */
export function CardGrid({ children, columns = 3 }: CardGridProps) {
  return <div className={`grid min-w-0 gap-4 ${columnClasses[columns]}`}>{children}</div>;
}
