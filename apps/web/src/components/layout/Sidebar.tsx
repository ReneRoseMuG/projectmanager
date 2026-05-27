import type { AuthResource, CurrentUser } from "@taskmanager/shared-types";
import {
  Activity,
  BookOpen,
  Bug,
  CalendarCheck,
  CalendarDays,
  ExternalLink,
  Flag,
  FolderKanban,
  History,
  Home,
  Library,
  ListTodo,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { NavLink } from "react-router-dom";
import webPackage from "../../../package.json";
import { useHealthCheck } from "../../hooks/useHealthCheck";
import { hasPermission } from "../../hooks/usePermissions";
import { withStandaloneView } from "../../utils/standalone";
import { openGlobalSearch } from "./ShellOverlays";

interface NavigationItem {
  to: string;
  label: string;
  icon: LucideIcon;
  resource?: AuthResource;
  resources?: AuthResource[];
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

const homeItems: NavigationItem[] = [
  {
    to: "/",
    label: "Startseite",
    icon: Home,
    resource: "dashboards",
  },
];

const documentationItems: NavigationItem[] = [
  { to: "/features", label: "Features", icon: BookOpen, resource: "features" },
  { to: "/wiki", label: "Wiki", icon: Library, resource: "wiki" },
];

const informationItems: NavigationItem[] = [
  {
    to: "/calendar",
    label: "Kalender",
    icon: CalendarDays,
    resources: ["events", "dashboards"],
  },
  {
    to: "/day-plan",
    label: "Tagesplan",
    icon: CalendarCheck,
    resource: "dayPlans",
  },
  { to: "/journal", label: "Journal", icon: History, resource: "journal" },
];

function MarkGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2.5" y="3" width="3.5" height="14" rx="1.2" fill="currentColor" opacity="0.92" />
      <rect x="8.25" y="3" width="3.5" height="10" rx="1.2" fill="currentColor" opacity="0.65" />
      <rect x="14" y="3" width="3.5" height="6" rx="1.2" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

function SidebarHeader({
  collapsed,
  toggleLabel,
  onToggle,
}: {
  collapsed: boolean;
  toggleLabel: string;
  onToggle: () => void;
}) {
  if (collapsed) {
    return (
      <div className="grid gap-3 px-3 py-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-md border border-white/[0.18] bg-white/[0.08] text-white shadow-steel-icon"
          title="Projekt Manager"
        >
          <MarkGlyph />
        </span>
        <button
          type="button"
          className="flex h-8 w-10 items-center justify-center rounded-md text-white/55 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20"
          aria-label={toggleLabel}
          title={toggleLabel}
          onClick={onToggle}
        >
          <PanelLeftOpen size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 px-3.5 pb-3.5 pt-[18px]"
      data-testid="sidebar-header"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.18] bg-white/[0.08] text-white shadow-steel-icon">
        <MarkGlyph />
      </span>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold leading-tight text-white">
          Projekt Manager
        </span>
        <span className="mt-0.5 block truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
          Lokal · v{webPackage.version}
        </span>
      </div>
      <button
        type="button"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/55 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20"
        aria-label={toggleLabel}
        title={toggleLabel}
        onClick={onToggle}
      >
        <PanelLeftClose size={16} />
      </button>
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
  if (user === undefined) {
    return true;
  }
  if (item.resources) {
    return item.resources.every((resource) => hasPermission(user, resource, "read"));
  }
  return (
    item.resource === undefined ||
    hasPermission(user, item.resource, "read")
  );
}

function openStandalone(event: MouseEvent<HTMLButtonElement>, path: string) {
  event.preventDefault();
  event.stopPropagation();
  window.open(withStandaloneView(path), "_blank");
}

function NavigationRow({
  item,
  allowStandalone,
}: {
  item: NavigationItem;
  allowStandalone: boolean;
}) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      title={item.label}
      className={({ isActive }) =>
        `sidebar-edge-nav-row group ${isActive ? "sidebar-edge-nav-row-active" : ""}`
      }
    >
      <Icon size={16} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {allowStandalone ? (
        <button
          type="button"
          className="sidebar-edge-external"
          aria-label={`${item.label} in neuem Tab öffnen`}
          title={`${item.label} in neuem Tab öffnen`}
          onClick={(event) => openStandalone(event, item.to)}
        >
          <ExternalLink size={13} />
        </button>
      ) : null}
    </NavLink>
  );
}

function CollapsedNavigationRow({
  item,
  allowStandalone,
}: {
  item: NavigationItem;
  allowStandalone: boolean;
}) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      title={item.label}
      className={({ isActive }) =>
        `relative flex h-10 w-10 items-center justify-center rounded-md transition focus:outline-none focus:ring-2 focus:ring-white/20 ${isActive ? "bg-white/10 text-white" : "text-white/75 hover:bg-white/5 hover:text-white"}`
      }
    >
      <Icon size={17} />
      {allowStandalone ? (
        <button
          type="button"
          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-md bg-steel-600 text-white/80 transition hover:bg-steel-500 hover:text-white"
          aria-label={`${item.label} in neuem Tab öffnen`}
          title={`${item.label} in neuem Tab öffnen`}
          onClick={(event) => openStandalone(event, item.to)}
        >
          <ExternalLink size={9} />
        </button>
      ) : null}
    </NavLink>
  );
}

function SidebarSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      className="px-3 py-2"
      data-testid="sidebar-global-search"
      onClick={() => openGlobalSearch(value)}
    >
      <label className="sidebar-edge-search">
        <Search size={14} className="shrink-0 text-white/50" />
        <input
          className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/45"
          value={value}
          placeholder="Alles durchsuchen"
          maxLength={15}
          onChange={(event) => {
            onChange(event.target.value);
            openGlobalSearch(event.target.value);
          }}
        />
        <span className="rounded border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-white/55">
          Ctrl K
        </span>
      </label>
    </div>
  );
}

function NavigationSection({
  section,
  currentUser,
  children,
}: {
  section: NavigationSectionConfig;
  currentUser?: CurrentUser | null;
  children?: ReactNode;
}) {
  const visibleItems = section.items.filter((item) =>
    canReadItem(currentUser, item),
  );

  if (visibleItems.length === 0 && !children) {
    return null;
  }

  return (
    <section className="grid gap-1" data-sidebar-section={section.label}>
      <p className="px-3.5 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
        {section.label}
      </p>
      {children}
      <div className="grid gap-px px-2 py-1">
        {visibleItems.map((item) => (
          <NavigationRow
            key={item.to}
            item={item}
            allowStandalone={section.allowStandalone}
          />
        ))}
      </div>
    </section>
  );
}

function CollapsedNavigationMenu({
  currentUser,
  sections,
}: {
  currentUser?: CurrentUser | null;
  sections: NavigationSectionConfig[];
}) {
  return (
    <nav
      aria-label="Navigationsbereiche"
      className="grid justify-items-center gap-2 px-3"
    >
      {sections.flatMap((section) =>
        section.items
          .filter((item) => canReadItem(currentUser, item))
          .map((item) => (
            <CollapsedNavigationRow
              key={`${section.label}-${item.to}`}
              item={item}
              allowStandalone={section.allowStandalone}
            />
          )),
      )}
    </nav>
  );
}

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
    ? `${slow ? "langsam" : "erreichbar"}${latencyMs !== null ? ` · ${latencyMs} ms` : ""}`
    : "offline";
  const dotClass = online
    ? slow
      ? "bg-tangerine shadow-[0_0_8px_var(--color-tangerine)]"
      : "bg-fern shadow-[0_0_8px_var(--color-fern)]"
    : "bg-crimson shadow-[0_0_8px_var(--color-crimson)]";

  return (
    <div className="grid gap-1 px-2 pb-1" data-testid="sidebar-server-status">
      <button
        type="button"
        className="sidebar-edge-nav-row"
        title={latencyMs ? `${latencyMs} ms` : undefined}
        onClick={onToggle}
      >
        <Activity size={16} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate">Server Status</span>
          <span className="block truncate text-[11px] font-normal text-white/45">
            {statusText}
          </span>
        </span>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
      </button>
      {open ? (
        <div className="mx-1 rounded-lg border border-white/10 bg-steel-900/80 p-3 text-xs text-white/70 shadow-panel">
          <p className="font-semibold text-white">Server {statusText}</p>
          <p className="mt-1">Endpoint http://localhost:3001</p>
          <button
            type="button"
            className="mt-3 flex h-8 items-center gap-2 rounded-md bg-white/10 px-2.5 text-xs font-semibold text-white transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/20"
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

function CollapsedServerStatus({
  online,
  latencyMs,
}: {
  online: boolean;
  latencyMs: number | null;
}) {
  return (
    <button
      type="button"
      className="relative flex h-10 w-10 items-center justify-center rounded-md text-white/75 transition hover:bg-white/5 hover:text-white"
      title={`Server ${online ? "erreichbar" : "offline"}`}
    >
      <Activity size={17} />
      <span
        className={`absolute right-2 top-2 h-1.5 w-1.5 rounded-full ${online ? "bg-fern" : "bg-crimson"}`}
        title={latencyMs ? `${latencyMs} ms` : undefined}
      />
    </button>
  );
}

function userInitials(user: CurrentUser): string {
  const first = user.firstName?.trim().charAt(0) ?? "";
  const last = user.lastName?.trim().charAt(0) ?? "";
  const initials = `${first}${last}`.trim();

  if (initials) {
    return initials.toUpperCase();
  }

  return user.fullName
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function SidebarUser({
  currentUser,
  collapsed,
  onLogout,
}: {
  currentUser: CurrentUser;
  collapsed: boolean;
  onLogout?: () => void;
}) {
  if (collapsed) {
    return (
      <div className="border-t border-white/10 px-3 py-4">
        <button
          type="button"
          onClick={onLogout}
          className="flex h-10 w-10 items-center justify-center rounded-md text-white/75 transition hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20"
          title="Abmelden"
        >
          <LogOut size={17} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="border-t border-white/10 bg-gradient-to-b from-transparent to-steel-900/40 px-3.5 py-4"
      data-testid="sidebar-user"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-steel-400 to-steel-600 text-[11px] font-bold tracking-[0.05em] text-white shadow-[0_1px_0_rgba(255,255,255,0.20)_inset]">
          {userInitials(currentUser)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-white">
            {currentUser.fullName}
          </span>
          <span className="block truncate text-[11px] text-white/50">
            {currentUser.role.label}
          </span>
        </span>
        <button
          type="button"
          onClick={onLogout}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/55 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20"
          aria-label="Abmelden"
          title="Abmelden"
        >
          <LogOut size={15} />
        </button>
      </div>
    </div>
  );
}

interface SidebarProps {
  currentUser?: CurrentUser | null;
  onLogout?: () => void;
}

export function Sidebar({ currentUser, onLogout }: SidebarProps = {}) {
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
      label: "Start",
      items: homeItems,
      allowStandalone: true,
    },
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
  ];
  const settingsSection: NavigationSectionConfig = {
    label: "Einstellungen",
    items: settingsItems,
    allowStandalone: false,
  };
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
      className={`sidebar-edge-shell hidden h-full shrink-0 overflow-hidden text-white transition-[width] duration-200 md:flex md:flex-col ${collapsed ? "w-16" : "w-[272px]"}`}
    >
      <SidebarHeader
        collapsed={collapsed}
        toggleLabel={collapseToggleLabel}
        onToggle={toggleCollapsed}
      />

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
        {collapsed ? (
          <div className="min-h-0 flex-1 overflow-y-auto pb-3">
            <CollapsedNavigationMenu
              currentUser={currentUser}
              sections={[...navigationSections, settingsSection]}
            />
            {showAdmin ? (
              <div className="mt-2 grid justify-items-center px-3">
                <CollapsedServerStatus
                  online={health.online}
                  latencyMs={health.latencyMs}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <nav
            aria-label="Navigationsbereiche"
            className="min-h-0 flex-1 overflow-y-auto pb-3"
          >
            {navigationSections.map((section) => (
              <NavigationSection
                key={section.label}
                section={section}
                currentUser={currentUser}
              />
            ))}
            <NavigationSection
              section={settingsSection}
              currentUser={currentUser}
            >
              <SidebarSearch value={sidebarSearch} onChange={setSidebarSearch} />
            </NavigationSection>
            {showAdmin ? (
              <ServerStatus
                online={health.online}
                latencyMs={health.latencyMs}
                open={apiOpen}
                onToggle={() => setApiOpen((current) => !current)}
                onRefetch={health.refetch}
              />
            ) : null}
          </nav>
        )}

        {currentUser ? (
          <SidebarUser
            currentUser={currentUser}
            collapsed={collapsed}
            onLogout={onLogout}
          />
        ) : null}
      </div>
    </aside>
  );
}
