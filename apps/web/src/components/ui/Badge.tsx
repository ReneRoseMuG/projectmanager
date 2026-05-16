import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  color?: string | null;
  muted?: boolean;
}

export function Badge({ children, color, muted = false }: BadgeProps) {
  const style = color
    ? {
        borderColor: color,
        color,
        backgroundColor: `${color}14`
      }
    : undefined;

  return (
    <span
      className={`inline-flex min-h-6 items-center rounded px-2 text-xs font-medium ${muted ? "border border-line bg-shell text-slate-600" : "border"}`}
      style={style}
    >
      {children}
    </span>
  );
}
