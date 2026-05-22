import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./Spinner";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "inverted";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-steel-700 text-white hover:bg-steel-600",
  secondary: "border border-line bg-white text-ink hover:border-fern",
  ghost: "text-ink hover:bg-steel-100",
  danger: "bg-crimson text-white hover:bg-crimson/90",
  inverted: "bg-white text-steel-700 hover:bg-steel-50",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8",
  md: "h-10",
};

const iconOnlySizeClasses: Record<ButtonSize, string> = {
  sm: "w-8",
  md: "w-10",
};

function hasUtilityClass(className: string, prefix: string) {
  return className.split(/\s+/).some((item) => item.startsWith(prefix));
}

/** Shared button atom with variants, icon support, sizes and loading state. */
export function Button({
  variant = "secondary",
  size = "md",
  icon,
  loading = false,
  className = "",
  children,
  type = "button",
  disabled,
  ...props
}: ButtonProps) {
  const iconOnly = Boolean(icon || loading) && !children;
  const heightClass = hasUtilityClass(className, "h-") ? "" : sizeClasses[size];
  const widthClass =
    iconOnly && !hasUtilityClass(className, "w-")
      ? iconOnlySizeClasses[size]
      : "";

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${heightClass} ${
        iconOnly ? `${widthClass} px-0` : ""
      } ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? <Spinner size={size} /> : icon}
      {children}
    </button>
  );
}
