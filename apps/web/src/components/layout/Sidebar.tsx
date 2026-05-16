import { BookOpen, CalendarDays, FolderKanban, Library } from "lucide-react";
import { NavLink } from "react-router-dom";

const items = [
  { to: "/projects", label: "Projekte", icon: FolderKanban },
  { to: "/features", label: "Features", icon: BookOpen },
  { to: "/wiki", label: "Wiki", icon: Library },
  { to: "/calendar", label: "Kalender", icon: CalendarDays }
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-line bg-white p-4 md:block">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-white">TM</span>
        <div>
          <strong className="block text-sm text-ink">Taskmanager</strong>
          <span className="text-xs text-slate-500">Lokal</span>
        </div>
      </div>
      <nav className="grid gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium ${isActive ? "bg-ink text-white" : "text-slate-700 hover:bg-shell"}`
              }
            >
              <Icon size={17} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
