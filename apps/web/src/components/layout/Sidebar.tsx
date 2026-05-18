import { BookOpen, Bug, CalendarDays, DatabaseBackup, DatabaseZap, FolderKanban, Library, Tags } from "lucide-react";
import { NavLink } from "react-router-dom";

const items = [
  { to: "/projects", label: "Projekte", icon: FolderKanban },
  { to: "/tickets", label: "Tickets", icon: Bug },
  { to: "/features", label: "Features", icon: BookOpen },
  { to: "/wiki", label: "Wiki", icon: Library },
  { to: "/calendar", label: "Kalender", icon: CalendarDays }
];

const settingsItems = [
  { to: "/settings/tags", label: "Tags", icon: Tags },
  { to: "/settings/backup", label: "Sicherung", icon: DatabaseBackup },
  { to: "/settings/test-data", label: "Testdaten", icon: DatabaseZap }
];

function NavSection({ children }: { children: string }) {
  return <div className="mb-2 mt-5 px-1.5 text-[10px] font-semibold uppercase tracking-widest text-steel-400">{children}</div>;
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 bg-gradient-to-b from-steel-700 to-steel-800 p-4 text-white md:block">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-steel-300 to-white text-steel-700 shadow-lg">PM</span>
        <div>
          <strong className="block text-sm font-bold text-white">Projekt Manager</strong>
          <span className="text-[11px] uppercase tracking-widest text-steel-300">Lokal</span>
        </div>
      </div>
      <NavSection>Navigation</NavSection>
      <nav className="grid gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${isActive ? "bg-white font-semibold text-steel-700 shadow-md" : "text-white/75 hover:bg-white/5 hover:text-white"}`
              }
            >
              <Icon size={17} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <NavSection>Einstellungen</NavSection>
      <nav className="grid gap-1">
        {settingsItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${isActive ? "bg-white font-semibold text-steel-700 shadow-md" : "text-white/75 hover:bg-white/5 hover:text-white"}`
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
