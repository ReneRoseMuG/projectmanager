import type { AuthResource, CurrentUser } from "@taskmanager/shared-types";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Bug,
  CalendarDays,
  ExternalLink,
  Flag,
  FolderKanban,
  History,
  Library,
  ListTodo,
  LogOut,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { hasPermission } from "../../hooks/usePermissions";
import { invalidateWikiImportData } from "../../queries/invalidation";
import { withStandaloneView } from "../../utils/standalone";

interface NavigationItem {
  to: string;
  label: string;
  icon: LucideIcon;
  resource?: AuthResource;
}

const projectManagementItems: NavigationItem[] = [
  { to: "/projects", label: "Projekte", icon: FolderKanban, resource: "projects" },
  { to: "/milestones", label: "Meilensteine", icon: Flag, resource: "milestones" },
  { to: "/tasks", label: "Aufgaben", icon: ListTodo, resource: "tasks" },
  { to: "/tickets", label: "Tickets", icon: Bug, resource: "tickets" },
];

const documentationItems: NavigationItem[] = [
  { to: "/features", label: "Features", icon: BookOpen, resource: "features" },
  { to: "/wiki", label: "Wiki", icon: Library, resource: "wiki" },
];

const informationItems: NavigationItem[] = [
  { to: "/calendar", label: "Kalender", icon: CalendarDays, resource: "events" },
  { to: "/journal", label: "Journal", icon: History, resource: "journal" },
];

function NavSection({ children }: { children: string }) {
  return <div className="mb-2 mt-5 px-1.5 text-[10px] font-semibold uppercase tracking-widest text-steel-400">{children}</div>;
}

function hasAdminAccess(user: CurrentUser | null | undefined): boolean {
  return Boolean(
    user?.permissions.some(
      (permission) =>
        (permission.resource === "*" || permission.resource === "users" || permission.resource === "roles") &&
        (permission.action === "*" || permission.action === "admin"),
    ),
  );
}

function canReadItem(user: CurrentUser | null | undefined, item: NavigationItem): boolean {
  return user === undefined || item.resource === undefined || hasPermission(user, item.resource, "read");
}

function navLinkClass(isActive: boolean): string {
  return `group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${isActive ? "bg-white font-semibold text-steel-700 shadow-md" : "text-white/75 hover:bg-white/5 hover:text-white"}`;
}

function NavigationLinks({
  currentUser,
  items,
  allowStandalone,
}: {
  currentUser?: CurrentUser | null;
  items: NavigationItem[];
  allowStandalone: boolean;
}) {
  return (
    <nav className="grid gap-1">
      {items.filter((item) => canReadItem(currentUser, item)).map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => navLinkClass(isActive)}
          >
            <Icon size={17} />
            {item.label}
            {allowStandalone ? (
              <button
                type="button"
                className="ml-auto flex h-6 w-6 items-center justify-center rounded opacity-0 transition hover:bg-white/20 group-hover:opacity-100"
                aria-label={`${item.label} in neuem Tab öffnen`}
                title={`${item.label} in neuem Tab öffnen`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  window.open(withStandaloneView(item.to), "_blank");
                }}
              >
                <ExternalLink size={13} />
              </button>
            ) : null}
          </NavLink>
        );
      })}
    </nav>
  );
}

interface SidebarProps {
  currentUser?: CurrentUser | null;
  onLogout?: () => void;
}

export function Sidebar({ currentUser, onLogout }: SidebarProps = {}) {
  const queryClient = useQueryClient();
  const showAdmin = hasAdminAccess(currentUser);
  const settingsItems: NavigationItem[] = showAdmin
    ? [{ to: "/admin", label: "Administration", icon: ShieldCheck }]
    : [
        {
          to: "/settings/preferences",
          label: "Meine Einstellungen",
          icon: SlidersHorizontal,
          resource: "settings",
        },
      ];

  return (
    <aside className="hidden w-64 shrink-0 overflow-y-auto bg-gradient-to-b from-steel-700 to-steel-800 p-4 text-white md:block">
      <button
        type="button"
        className="mb-8 flex w-full items-center gap-3 rounded-lg p-1 text-left transition hover:bg-white/5"
        title="Aktualisieren"
        onClick={() => void invalidateWikiImportData(queryClient)}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-steel-300 to-white text-steel-700 shadow-lg">PM</span>
        <span className="flex min-h-10 items-center text-sm font-bold text-white">Projekt Manager</span>
        <RefreshCw size={14} className="ml-auto text-white/55" />
      </button>
      <NavSection>Projekt Management</NavSection>
      <NavigationLinks currentUser={currentUser} items={projectManagementItems} allowStandalone />
      <NavSection>Projekt Dokumentation</NavSection>
      <NavigationLinks currentUser={currentUser} items={documentationItems} allowStandalone />
      <NavSection>Information</NavSection>
      <NavigationLinks currentUser={currentUser} items={informationItems} allowStandalone />
      <NavSection>Einstellungen</NavSection>
      <NavigationLinks currentUser={currentUser} items={settingsItems} allowStandalone={false} />
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
