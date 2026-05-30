import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Button } from "./Button";

interface CopyReferenceButtonProps {
  reference: string;
  variant?: "surface" | "hero";
  className?: string;
}

const baseClass =
  "h-8 w-8 shrink-0 px-0 focus:outline-none focus:ring-2 focus:ring-steel-700/10";
const surfaceClass =
  "border border-line bg-white text-steel-700 shadow-sm hover:border-steel-300 hover:bg-steel-50";
const heroClass =
  "h-9 w-9 rounded-full text-white hover:bg-white/12 hover:text-white focus:ring-white/20";

/** Copies a stable object reference such as TASK-10 without showing a toast. */
export function CopyReferenceButton({
  reference,
  variant = "surface",
  className = "",
}: CopyReferenceButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const copyReference = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!navigator.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Button
      aria-label={`ID ${reference} kopieren`}
      title={copied ? `${reference} kopiert` : `${reference} kopieren`}
      variant="ghost"
      icon={copied ? <Check size={16} strokeWidth={2.8} /> : <Copy size={16} />}
      className={`${baseClass} ${variant === "hero" ? heroClass : surfaceClass} ${className}`}
      onClick={copyReference}
    />
  );
}
