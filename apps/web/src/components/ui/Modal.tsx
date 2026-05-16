import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";

interface ModalProps {
  open: boolean;
  title: string;
  size?: "md" | "lg" | "xl" | "full";
  showHeader?: boolean;
  bodyClassName?: string;
  children: ReactNode;
  onClose: () => void;
}

const sizes = {
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-[min(1100px,calc(100vw-32px))]",
  full: "max-w-[calc(100vw-2rem)] min-h-[calc(100vh-2rem)]"
};

export function Modal({ open, title, size = "md", showHeader = true, bodyClassName = "p-5", children, onClose }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-steel-900/55 p-4 backdrop-blur-[2px]">
      <div className={`flex max-h-[calc(100vh-64px)] w-full flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_24px_70px_rgba(22,36,52,0.28)] ${sizes[size]}`}>
        {showHeader ? (
          <header className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            <Button aria-label="Schließen" title="Schließen" icon={<X size={18} />} variant="ghost" onClick={onClose} />
          </header>
        ) : null}
        <div className={`overflow-auto ${bodyClassName}`}>{children}</div>
      </div>
    </div>
  );
}
