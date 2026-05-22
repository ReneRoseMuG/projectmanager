import { MoreVertical } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "./Button";

export interface ActionMenuItem {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  ariaLabel?: string;
}

/** Compact menu for secondary row and card actions. */
export function ActionMenu({ items, ariaLabel = "Aktionen" }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div ref={ref} className="relative">
      <Button
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title={ariaLabel}
        icon={<MoreVertical size={18} />}
        variant="ghost"
        className="-mr-1 h-8 w-8 border border-line bg-white px-0 text-ink shadow-sm hover:border-steel-300 hover:bg-steel-50"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      />
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-lg border border-line bg-white py-1 shadow-panel"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm font-medium transition hover:bg-steel-50 ${
                item.danger ? "text-crimson hover:bg-crimson/5" : "text-ink"
              }`}
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                item.onClick();
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
