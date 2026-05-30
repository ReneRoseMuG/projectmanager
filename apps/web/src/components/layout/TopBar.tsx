import { CalendarDays, FolderKanban } from "lucide-react";
import { NavLink } from "react-router-dom";

export function TopBar() {
  return (
    <header className="relative flex h-16 items-center justify-between bg-white px-4 md:hidden">
      <span className="pointer-events-none absolute inset-x-0 top-[calc(50%+1.25rem)] border-t border-line" />
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-steel-900 text-sm text-white">
          PM
        </span>
      </div>
      <nav className="flex gap-1">
        <NavLink
          className={({ isActive }) =>
            `flex h-10 w-10 items-center justify-center rounded-md ${isActive ? "bg-steel-900 text-white" : "hover:bg-shell"}`
          }
          to="/projects"
          title="Projekte"
        >
          <FolderKanban size={18} />
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            `flex h-10 w-10 items-center justify-center rounded-md ${isActive ? "bg-steel-900 text-white" : "hover:bg-shell"}`
          }
          to="/calendar"
          title="Kalender"
        >
          <CalendarDays size={18} />
        </NavLink>
      </nav>
    </header>
  );
}
