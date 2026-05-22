import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

const adminItems = [
  { to: "/admin/catalogs", label: "Kataloge" },
  { to: "/admin/tags", label: "Tags" },
  { to: "/admin/backup", label: "Sicherung" },
  { to: "/admin/users", label: "Benutzer" },
  { to: "/admin/roles", label: "Rollen" },
];

function adminLinkClass(isActive: boolean): string {
  return `inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition ${
    isActive
      ? "bg-steel-700 text-white"
      : "border border-line bg-white text-ink hover:border-fern"
  }`;
}

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-5">
      <nav className="flex flex-wrap gap-2">
        {adminItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => adminLinkClass(isActive)}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      {children}
    </div>
  );
}
