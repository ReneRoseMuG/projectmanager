import { CalendarDays, FolderKanban } from "lucide-react";
import { NavLink } from "react-router-dom";

export function TopBar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-line bg-white px-4 md:px-6">
      <div className="flex items-center gap-3 md:hidden">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink text-sm text-white">TM</span>
      </div>
      <nav className="flex gap-1 md:hidden">
        <NavLink className={({ isActive }) => `flex h-10 w-10 items-center justify-center rounded-md ${isActive ? "bg-ink text-white" : "hover:bg-shell"}`} to="/projects" title="Projekte">
          <FolderKanban size={18} />
        </NavLink>
        <NavLink className={({ isActive }) => `flex h-10 w-10 items-center justify-center rounded-md ${isActive ? "bg-ink text-white" : "hover:bg-shell"}`} to="/calendar" title="Kalender">
          <CalendarDays size={18} />
        </NavLink>
      </nav>
      <div className="hidden text-sm text-slate-500 md:block">Single-User Workspace</div>
    </header>
  );
}
