import { HelpCircle, LogOut, Settings, Tag, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useToast } from "../ui/ToastProvider";

export function AvatarMenu() {
  const { showToast } = useToast();
  const [theme, setTheme] = useState("system");
  const [density, setDensity] = useState("comfortable");

  const updateTheme = (value: string) => {
    setTheme(value);
    document.documentElement.classList.toggle("dark", value === "dark");
  };

  const updateDensity = (value: string) => {
    setDensity(value);
    document.documentElement.dataset.density = value;
  };

  return (
    <div className="absolute right-0 top-12 z-40 w-80 overflow-hidden rounded-[18px] border border-line bg-white shadow-panel">
      <header className="bg-gradient-to-br from-steel-700 to-steel-900 p-4 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-sm font-bold">RM</span>
          <div>
            <p className="font-bold">René Müller</p>
            <p className="text-xs text-white/70">single-user@local</p>
          </div>
        </div>
      </header>
      <div className="grid gap-1 p-2 text-sm">
        <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-shell" type="button">
          <UserRound size={16} /> Profil & Konto
        </button>
        <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-shell" type="button">
          <Settings size={16} /> Einstellungen
        </button>
        <Link className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-shell" to="/settings/tags">
          <Tag size={16} /> Tags verwalten
        </Link>
        <div className="my-1 border-t border-line" />
        <label className="grid gap-1 px-3 py-2 text-xs font-semibold uppercase text-slate-500">
          Darstellung
          <select className="h-9 rounded-md border border-line bg-white px-2 text-sm normal-case text-ink" value={theme} onChange={(event) => updateTheme(event.target.value)}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark Mode in Vorbereitung</option>
          </select>
        </label>
        <label className="grid gap-1 px-3 py-2 text-xs font-semibold uppercase text-slate-500">
          Dichte
          <select className="h-9 rounded-md border border-line bg-white px-2 text-sm normal-case text-ink" value={density} onChange={(event) => updateDensity(event.target.value)}>
            <option value="comfortable">Komfortabel</option>
            <option value="compact">Kompakt</option>
          </select>
        </label>
        <div className="my-1 border-t border-line" />
        <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-shell" type="button">
          <HelpCircle size={16} /> Dokumentation
        </button>
        <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-crimson hover:bg-crimson/10" type="button" onClick={() => showToast({ tone: "info", title: "Abmelden ist ein Folgeauftrag" })}>
          <LogOut size={16} /> Abmelden
        </button>
      </div>
    </div>
  );
}
