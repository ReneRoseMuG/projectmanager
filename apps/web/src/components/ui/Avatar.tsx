interface AvatarProps {
  name: string | null;
  size?: "sm" | "md" | "lg";
}

const sizeClasses: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-8 w-8 text-[11px]",
  lg: "h-10 w-10 text-xs"
};

function getInitials(name: string | null) {
  if (!name?.trim()) {
    return "?";
  }

  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Circular user avatar based on display-name initials. */
export function Avatar({ name, size = "md" }: AvatarProps) {
  return <span className={`flex items-center justify-center rounded-full bg-gradient-to-br from-violet to-magenta font-bold text-white ${sizeClasses[size]}`}>{getInitials(name)}</span>;
}
