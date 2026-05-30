import { Copy, Settings2 } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "./Button";

export interface ActionMenuItem {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  ariaLabel?: string;
  objectReference?: string;
}

/** Compact menu for secondary row and card actions. */
export function ActionMenu({ items, ariaLabel = "Aktionen", objectReference }: ActionMenuProps) {
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

  if (items.length === 0 && !objectReference) {
    return null;
  }

  const copyReference = async () => {
    if (!objectReference || !navigator.clipboard?.writeText) {
      return;
    }

    await navigator.clipboard.writeText(objectReference);
  };

  const menuItems: ActionMenuItem[] = [
    ...(objectReference
      ? [
          {
            label: "ID kopieren",
            icon: <Copy size={16} />,
            onClick: () => void copyReference(),
          },
        ]
      : []),
    ...items,
  ];

  return (
    <div ref={ref} className="relative z-50">
      <Button
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title={ariaLabel}
        icon={<Settings2 size={22} strokeWidth={2.4} />}
        variant="ghost"
        className="-mr-1 h-9 w-[36px] border border-line bg-white px-0 text-ink shadow-sm hover:border-steel-300 hover:bg-steel-50"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      />
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-48 rounded-lg border border-line bg-white py-1 shadow-panel"
        >
          {menuItems.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={`flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-left text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                item.danger ? "text-crimson hover:bg-crimson/5" : "text-ink hover:bg-steel-50"
              }`}
              onClick={(event) => {
                event.stopPropagation();
                if (item.disabled) {
                  return;
                }
                setOpen(false);
                item.onClick();
              }}
            >
              <span className="flex shrink-0 items-center">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
