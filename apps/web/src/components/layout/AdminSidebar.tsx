import { ArrowDownUp, ListChecks, Monitor, ShieldCheck, Tag, Users } from "lucide-react";
import { NavLink } from "react-router-dom";

const adminItems = [
  { to: "/admin/catalogs", label: "Kataloge", icon: ListChecks },
  { to: "/admin/tags", label: "Tags", icon: Tag },
  { to: "/admin/sync", label: "Synchronisation", icon: ArrowDownUp },
  { to: "/admin/users", label: "Benutzer", icon: Users },
  { to: "/admin/roles", label: "Rollen", icon: ShieldCheck },
  { to: "/admin/ui", label: "User Interface", icon: Monitor },
];

function adminLinkClass(isActive: boolean): string {
  return `admin-sidebar-link group relative flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-lg px-2 py-3 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-white/25 ${
    isActive ? "admin-sidebar-link-active bg-white/10" : "hover:bg-white/10"
  }`;
}

/** Inner navigation for admin sections. */
export function AdminSidebar() {
  return (
    <aside className="w-28 shrink-0 bg-gradient-to-b from-steel-800 to-steel-900 px-3 py-5">
      <p className="mb-4 text-center text-xs font-bold uppercase tracking-wide text-white">
        Admin
      </p>
      <nav aria-label="Admin-Bereich" className="grid gap-3">
        {adminItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => adminLinkClass(isActive)}
            >
              <span className="admin-sidebar-icon flex h-11 w-11 items-center justify-center rounded-lg border">
                <Icon size={21} />
              </span>
              <span className="text-center leading-tight">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
