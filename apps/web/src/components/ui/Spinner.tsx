interface SpinnerProps {
  size?: "sm" | "md";
}

const sizeClasses: Record<NonNullable<SpinnerProps["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5"
};

/** Inline loading spinner that inherits the surrounding text color. */
export function Spinner({ size = "md" }: SpinnerProps) {
  return (
    <svg className={`animate-spin text-current ${sizeClasses[size]}`} viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
}
