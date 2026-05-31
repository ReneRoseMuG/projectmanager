import type { ReactNode } from "react";

interface SidebarPanelProps {
  icon?: ReactNode;
  label: string;
  action?: ReactNode;
  children: ReactNode;
}

/** Panel card used inside FormSidebar — header row with icon, label and optional action. */
export function SidebarPanel({ icon, label, action, children }: SidebarPanelProps) {
  return (
    <div className="rounded-lg border border-line bg-white shadow-sm">
      <div className="flex h-9 items-center gap-2 border-b border-line px-2.5">
        {icon ? <span className="shrink-0 text-steel-500">{icon}</span> : null}
        <span className="flex-1 text-xs font-bold uppercase tracking-wide text-steel-700">
          {label}
        </span>
        {action ? <span className="shrink-0">{action}</span> : null}
      </div>
      <div className="p-2.5">{children}</div>
    </div>
  );
}
