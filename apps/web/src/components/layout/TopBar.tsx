import { CalendarDays, FolderKanban } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useHealthCheck } from "../../hooks/useHealthCheck";

export function TopBar() {
  const health = useHealthCheck();

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
      <div className="hidden items-center gap-3 text-sm text-slate-500 md:flex">
        <span>Single-User Workspace</span>
        <span className="inline-flex items-center gap-2" title={health.latencyMs ? `${health.latencyMs} ms` : undefined}>
          <span className={`h-2.5 w-2.5 rounded-full ${health.online ? "bg-moss" : "bg-coral"}`} />
          <span>localhost:3001</span>
        </span>
      </div>
    </header>
  );
}
