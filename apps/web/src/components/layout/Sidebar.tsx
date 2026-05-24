import type { AuthResource, CurrentUser } from "@taskmanager/shared-types";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BookOpen,
  Bug,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Flag,
  FolderKanban,
  History,
  Library,
  LayoutDashboard,
  ListTodo,
  LogOut,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { Fragment, useState } from "react";
import { NavLink } from "react-router-dom";
import { useHealthCheck } from "../../hooks/useHealthCheck";
import { hasPermission } from "../../hooks/usePermissions";
import { invalidateWikiImportData } from "../../queries/invalidation";
import { withStandaloneView } from "../../utils/standalone";
import { SearchInput } from "../ui/SearchInput";
import { openGlobalSearch } from "./ShellOverlays";

interface NavigationItem {
  to: string;
  label: string;
  icon: LucideIcon;
  resource?: AuthResource;
}

interface NavigationSectionConfig {
  label: string;
  items: NavigationItem[];
  allowStandalone: boolean;
}

const projectManagementItems: NavigationItem[] = [
  {
    to: "/projects",
    label: "Projekte",
    icon: FolderKanban,
    resource: "projects",
  },
  {
    to: "/milestones",
    label: "Meilensteine",
    icon: Flag,
    resource: "milestones",
  },
  { to: "/tasks", label: "Aufgaben", icon: ListTodo, resource: "tasks" },
  { to: "/tickets", label: "Tickets", icon: Bug, resource: "tickets" },
];

const documentationItems: NavigationItem[] = [
  { to: "/features", label: "Features", icon: BookOpen, resource: "features" },
  { to: "/wiki", label: "Wiki", icon: Library, resource: "wiki" },
];

const informationItems: NavigationItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    resource: "dashboards",
  },
  {
    to: "/calendar",
    label: "Kalender",
    icon: CalendarDays,
    resource: "events",
  },
  { to: "/journal", label: "Journal", icon: History, resource: "journal" },
];

function ServerStatus({
  online,
  latencyMs,
  open,
  onToggle,
  onRefetch,
}: {
  online: boolean;
  latencyMs: number | null;
  open: boolean;
  onToggle: () => void;
  onRefetch: () => Promise<void>;
}) {
  const slow = online && latencyMs !== null && latencyMs > 250;
  const statusText = online
    ? `${slow ? "langsam" : "erreichbar"}${latencyMs !== null ? ` - ${latencyMs} ms` : ""}`
    : "offline";
  const dotClass = online ? (slow ? "bg-tangerine" : "bg-fern") : "bg-crimson";

  return (
    <div className="mt-2">
      <button
        type="button"
        className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-white/75 transition hover:bg-white/5 hover:text-white"
        title={latencyMs ? `${latencyMs} ms` : undefined}
        onClick={onToggle}
      >
        <Activity size={17} />
        <span className="min-w-0 flex-1">
          <span className="block truncate">Server Status</span>
          <span className="block truncate text-[11px] font-normal text-white/55">
            {statusText}
          </span>
        </span>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} />
      </button>
      {open ? (
        <div className="mt-2 rounded-lg border border-white/10 bg-steel-900 p-3 text-xs text-white/70 shadow-panel">
          <p className="font-semibold text-white">Server {statusText}</p>
          <p className="mt-1">Endpoint http://localhost:3001</p>
          <button
            type="button"
            className="mt-3 flex h-8 items-center gap-2 rounded-md bg-white/10 px-2.5 text-xs font-semibold text-white transition hover:bg-white/15"
            onClick={() => void onRefetch()}
          >
            <RotateCcw size={14} />
            Erneut prüfen
          </button>
        </div>
      ) : null}
    </div>
  );
}

function hasAdminAccess(user: CurrentUser | null | undefined): boolean {
  return Boolean(
    user?.permissions.some(
      (permission) =>
        (permission.resource === "*" ||
          permission.resource === "users" ||
          permission.resource === "roles") &&
        (permission.action === "*" || permission.action === "admin"),
    ),
  );
}

function canReadItem(
  user: CurrentUser | null | undefined,
  item: NavigationItem,
): boolean {
  return (
    user === undefined ||
    item.resource === undefined ||
    hasPermission(user, item.resource, "read")
  );
}

function navLinkClass(isActive: boolean): string {
  return `flex h-10 items-center gap-3 rounded-lg border px-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-white/20 ${isActive ? "border-white/25 bg-white/10 font-semibold text-white shadow-none" : "border-white/10 bg-white/[0.04] text-white/75 hover:border-white/20 hover:bg-white/10 hover:text-white"}`;
}

function navLinkClassCollapsed(isActive: boolean): string {
  return `relative flex h-10 w-10 items-center justify-center rounded-lg border transition ${isActive ? "border-white/25 bg-white/10 text-white shadow-none" : "border-transparent text-white/75 hover:bg-white/5 hover:text-white"}`;
}

const standaloneButtonClass =
  "flex h-10 w-10 items-center justify-center self-center rounded-md border border-white/10 bg-white/[0.04] text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20";

function NavigationLinks({
  currentUser,
  items,
  allowStandalone,
  collapsed = false,
}: {
  currentUser?: CurrentUser | null;
  items: NavigationItem[];
  allowStandalone: boolean;
  collapsed?: boolean;
}) {
  return (
    <nav className={`grid gap-1 ${collapsed ? "justify-items-center" : ""}`}>
      {items
        .filter((item) => canReadItem(currentUser, item))
        .map((item) => {
          const Icon = item.icon;
          if (collapsed) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                className={({ isActive }) => navLinkClassCollapsed(isActive)}
              >
                <Icon size={17} />
                {allowStandalone ? (
                  <button
                    type="button"
                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-md bg-steel-600 text-white/80 transition hover:bg-steel-500 hover:text-white"
                    aria-label={`${item.label} in neuem Tab öffnen`}
                    title={`${item.label} in neuem Tab öffnen`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      window.open(withStandaloneView(item.to), "_blank");
                    }}
                  >
                    <ExternalLink size={9} />
                  </button>
                ) : null}
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className={({ isActive }) => navLinkClass(isActive)}
            >
              <Icon size={17} />
              <span className="flex-1 truncate">{item.label}</span>
              {allowStandalone ? (
                <button
                  type="button"
                  className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded opacity-0 transition hover:bg-white/20 group-hover:opacity-100"
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

function NavigationMenu({
  currentUser,
  sections,
  collapsed,
}: {
  currentUser?: CurrentUser | null;
  sections: NavigationSectionConfig[];
  collapsed?: boolean;
}) {
  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canReadItem(currentUser, item)),
    }))
    .filter((section) => section.items.length > 0);

  if (collapsed) {
    return (
      <>
        {visibleSections.map((section) => (
          <NavigationLinks
            key={section.label}
            currentUser={currentUser}
            items={section.items}
            allowStandalone={section.allowStandalone}
            collapsed
          />
        ))}
      </>
    );
  }

  return (
    <nav
      aria-label="Navigationsbereiche"
      className="grid w-fit grid-cols-[max-content_auto] gap-x-1 gap-y-1"
    >
      {visibleSections.map((section) => (
        <Fragment key={section.label}>
          <div className="col-span-2 mb-1 mt-5 max-w-0 overflow-visible whitespace-nowrap px-1.5 text-[10px] font-semibold uppercase tracking-widest text-steel-400">
            {section.label}
          </div>
          {section.items.map((item) => {
            const Icon = item.icon;
            return (
              <Fragment key={item.to}>
                <NavLink
                  to={item.to}
                  title={item.label}
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <Icon size={17} />
                  <span className="whitespace-nowrap">{item.label}</span>
                </NavLink>
                {section.allowStandalone ? (
                  <button
                    type="button"
                    className={standaloneButtonClass}
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
                ) : (
                  <span className="h-10 w-10 self-center" aria-hidden="true" />
                )}
              </Fragment>
            );
          })}
        </Fragment>
      ))}
    </nav>
  );
}

interface SidebarProps {
  currentUser?: CurrentUser | null;
  onLogout?: () => void;
}

export function Sidebar({ currentUser, onLogout }: SidebarProps = {}) {
  const queryClient = useQueryClient();
  const health = useHealthCheck();
  const [apiOpen, setApiOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem("ui.sidebar.collapsed") === "true",
  );
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
  const navigationSections: NavigationSectionConfig[] = [
    {
      label: "Projekt Management",
      items: projectManagementItems,
      allowStandalone: true,
    },
    {
      label: "Projekt Dokumentation",
      items: documentationItems,
      allowStandalone: true,
    },
    { label: "Information", items: informationItems, allowStandalone: true },
    { label: "Einstellungen", items: settingsItems, allowStandalone: false },
  ];
  const collapseToggleLabel = collapsed
    ? "Navigation aufklappen"
    : "Navigation einklappen";

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem("ui.sidebar.collapsed", String(next));
      return next;
    });
  }

  return (
    <aside
      aria-label="Hauptnavigation"
      className={`hidden shrink-0 overflow-y-auto bg-gradient-to-b from-steel-700 to-steel-800 text-white transition-[width] duration-200 md:block ${collapsed ? "w-16 p-3" : "w-fit py-4 pl-4 pr-4"}`}
    >
      <div className={collapsed ? "" : "w-fit"}>
        {collapsed ? (
          <div className="mb-3 flex justify-center">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-steel-300 to-white text-sm font-bold text-steel-700 shadow-steel-icon"
              title="Projekt Manager"
            >
              PM
            </span>
          </div>
        ) : (
          <button
            type="button"
            className="mb-3 flex w-0 min-w-full items-center gap-3 overflow-hidden rounded-lg p-1 text-left transition hover:bg-white/5"
            title="Aktualisieren"
            onClick={() => void invalidateWikiImportData(queryClient)}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-steel-300 to-white text-steel-700 shadow-steel-icon">
              PM
            </span>
            <span className="flex min-h-10 items-center text-sm font-bold text-white">
              Projekt Manager
            </span>
            <RefreshCw size={14} className="ml-auto text-white/55" />
          </button>
        )}
        <button
          type="button"
          className={`mb-3 flex h-8 items-center justify-center rounded-lg text-white/55 transition hover:bg-white/5 hover:text-white ${collapsed ? "w-full" : "w-0 min-w-full overflow-hidden"}`}
          aria-label={collapseToggleLabel}
          title={collapseToggleLabel}
          onClick={toggleCollapsed}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        {!collapsed ? (
          <div
            className="mb-2 w-0 min-w-full overflow-hidden"
            onClick={() => openGlobalSearch(sidebarSearch)}
          >
            <SearchInput
              value={sidebarSearch}
              onChange={(value) => {
                setSidebarSearch(value);
                openGlobalSearch(value);
              }}
              placeholder="Global suchen"
              hint="Ctrl K"
            />
          </div>
        ) : null}
        <NavigationMenu
          currentUser={currentUser}
          sections={navigationSections}
          collapsed={collapsed}
        />
        {showAdmin ? (
          collapsed ? (
            <div className="mt-2">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white/75 transition hover:bg-white/5 hover:text-white"
                title={`Server ${health.online ? "erreichbar" : "offline"}`}
              >
                <Activity size={17} />
              </button>
            </div>
          ) : (
            <div className="w-0 min-w-full overflow-hidden">
              <ServerStatus
                online={health.online}
                latencyMs={health.latencyMs}
                open={apiOpen}
                onToggle={() => setApiOpen((current) => !current)}
                onRefetch={health.refetch}
              />
            </div>
          )
        ) : null}
        {currentUser ? (
          <div
            className={`mt-6 border-t border-white/10 pt-4 ${collapsed ? "" : "w-0 min-w-full overflow-hidden"}`}
          >
            {!collapsed ? (
              <div className="mb-3 px-3 text-xs text-white/70">
                <span className="block font-semibold text-white">
                  {currentUser.fullName}
                </span>
                <span>{currentUser.role.label}</span>
              </div>
            ) : null}
            <button
              type="button"
              onClick={onLogout}
              className={`flex h-10 items-center gap-3 rounded-lg text-sm font-medium text-white/75 transition hover:bg-white/5 hover:text-white ${collapsed ? "w-10 justify-center" : "w-full px-3"}`}
              title="Abmelden"
            >
              <LogOut size={17} />
              {!collapsed ? "Abmelden" : null}
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
