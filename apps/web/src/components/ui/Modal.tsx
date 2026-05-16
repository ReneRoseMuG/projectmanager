import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";

interface ModalProps {
  open: boolean;
  title: string;
  size?: "md" | "lg" | "xl" | "full";
  children: ReactNode;
  onClose: () => void;
}

const sizes = {
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
  full: "max-w-[calc(100vw-2rem)] min-h-[calc(100vh-2rem)]"
};

export function Modal({ open, title, size = "md", children, onClose }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4">
      <div className={`flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-lg bg-white shadow-panel ${sizes[size]}`}>
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <Button aria-label="Schließen" title="Schließen" icon={<X size={18} />} variant="ghost" onClick={onClose} />
        </header>
        <div className="overflow-auto p-5">{children}</div>
      </div>
    </div>
  );
}
