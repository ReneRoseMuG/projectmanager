import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white hover:bg-teal",
  secondary: "border border-line bg-white text-ink hover:border-teal",
  ghost: "text-ink hover:bg-line/50",
  danger: "bg-coral text-white hover:bg-coral/90"
};

export function Button({ variant = "secondary", icon, className = "", children, type = "button", ...props }: ButtonProps) {
  const iconOnly = Boolean(icon) && !children;
  return (
    <button
      type={type}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
        iconOnly ? "w-10 px-0" : ""
      } ${variants[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
