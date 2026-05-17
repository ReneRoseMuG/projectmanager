interface ProgressBarProps {
  value: number;
  color?: string;
  size?: "xs" | "sm";
  label?: string;
}

const sizeClasses: Record<NonNullable<ProgressBarProps["size"]>, string> = {
  xs: "h-1.5",
  sm: "h-2"
};

function clampProgress(value: number) {
  return Math.min(100, Math.max(0, value));
}

/** Token-friendly progress indicator with optional caption. */
export function ProgressBar({ value, color = "var(--color-fern)", size = "xs", label }: ProgressBarProps) {
  const progress = clampProgress(value);

  return (
    <div className="grid gap-2">
      <div className={`${sizeClasses[size]} overflow-hidden rounded-full bg-steel-100`}>
        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: color }} />
      </div>
      {label ? (
        <p className="text-xs font-medium" style={{ color }}>
          {label}
        </p>
      ) : null}
    </div>
  );
}
