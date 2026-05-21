import type { CurrentUser } from "@taskmanager/shared-types";
import { BookOpen, Bug, CalendarDays, DatabaseBackup, ExternalLink, FolderKanban, History, Library, ListChecks, LogOut, Tags, UsersRound, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { NavLink } from "react-router-dom";
import { hasPermission } from "../../hooks/usePermissions";

const items = [
  { to: "/projects", label: "Projekte", icon: FolderKanban },
  { to: "/tickets", label: "Tickets", icon: Bug },
  { to: "/features", label: "Features", icon: BookOpen },
  { to: "/wiki", label: "Wiki", icon: Library },
  { to: "/calendar", label: "Kalender", icon: CalendarDays },
  { to: "/journal", label: "Journal", icon: History, resource: "journal" as const }
];

const settingsItems = [
  { to: "/settings/preferences", label: "Präferenzen", icon: SlidersHorizontal },
  { to: "/settings/catalogs", label: "Kataloge", icon: ListChecks },
  { to: "/settings/tags", label: "Tags", icon: Tags },
  { to: "/settings/backup", label: "Sicherung", icon: DatabaseBackup }
];

const adminItems = [
  { to: "/admin/users", label: "Benutzer", icon: UsersRound },
  { to: "/admin/roles", label: "Rollen", icon: ShieldCheck }
];

function NavSection({ children }: { children: string }) {
  return <div className="mb-2 mt-5 px-1.5 text-[10px] font-semibold uppercase tracking-widest text-steel-400">{children}</div>;
}

function canAdministerUsers(user: CurrentUser | null | undefined): boolean {
  return Boolean(user?.permissions.some((permission) => (permission.resource === "*" || permission.resource === "users") && (permission.action === "*" || permission.action === "admin")));
}

function canReadItem(user: CurrentUser | null | undefined, item: (typeof items)[number]): boolean {
  return item.resource === undefined || hasPermission(user, item.resource, "read");
}

interface SidebarProps {
  currentUser?: CurrentUser | null;
  onLogout?: () => void;
}

export function Sidebar({ currentUser, onLogout }: SidebarProps = {}) {
  const showAdmin = canAdministerUsers(currentUser);

  return (
    <aside className="hidden w-64 shrink-0 overflow-y-auto bg-gradient-to-b from-steel-700 to-steel-800 p-4 text-white md:block">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-steel-300 to-white text-steel-700 shadow-lg">PM</span>
        <div>
          <strong className="block text-sm font-bold text-white">Projekt Manager</strong>
          <span className="text-[11px] uppercase tracking-widest text-steel-300">Lokal</span>
        </div>
      </div>
      <NavSection>Navigation</NavSection>
      <nav className="grid gap-1">
        {items.filter((item) => canReadItem(currentUser, item)).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${isActive ? "bg-white font-semibold text-steel-700 shadow-md" : "text-white/75 hover:bg-white/5 hover:text-white"}`
              }
            >
              <Icon size={17} />
              {item.label}
              <button
                type="button"
                className="ml-auto flex h-6 w-6 items-center justify-center rounded opacity-0 transition hover:bg-white/20 group-hover:opacity-100"
                aria-label={`${item.label} in neuem Tab öffnen`}
                title={`${item.label} in neuem Tab öffnen`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  window.open(item.to, "_blank");
                }}
              >
                <ExternalLink size={13} />
              </button>
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
      {showAdmin ? (
        <>
          <NavSection>Administration</NavSection>
          <nav className="grid gap-1">
            {adminItems.map((item) => {
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
        </>
      ) : null}
      {currentUser ? (
        <div className="mt-6 border-t border-white/10 pt-4">
          <div className="mb-3 px-3 text-xs text-white/70">
            <span className="block font-semibold text-white">{currentUser.fullName}</span>
            <span>{currentUser.role.label}</span>
          </div>
          <button type="button" onClick={onLogout} className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-white/75 transition hover:bg-white/5 hover:text-white">
            <LogOut size={17} />
            Abmelden
          </button>
        </div>
      ) : null}
    </aside>
  );
}
