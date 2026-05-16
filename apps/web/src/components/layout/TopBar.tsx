import { CalendarDays, FolderKanban } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useHealthCheck } from "../../hooks/useHealthCheck";
import { GlobalSearch } from "../search/GlobalSearch";
import { SearchInput } from "../ui/SearchInput";
import { ApiHealthPopover } from "./ApiHealthPopover";
import { AvatarMenu } from "./AvatarMenu";

interface AvatarProps {
  initials: string;
}

function ApiBadge({ online, latencyMs, onClick }: { online: boolean; latencyMs: number | null; onClick: () => void }) {
  const slow = online && latencyMs !== null && latencyMs > 250;
  return (
    <button
      type="button"
      className={`inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs font-semibold uppercase tracking-wide text-white ${online ? (slow ? "bg-tangerine" : "bg-fern") : "bg-crimson"}`}
      title={latencyMs ? `${latencyMs} ms` : undefined}
      onClick={onClick}
    >
      <span className="h-2 w-2 rounded-full bg-white/80" />
      API {online ? (slow ? "slow" : "online") : "offline"}
    </button>
  );
}

function Avatar({ initials, onClick }: AvatarProps & { onClick: () => void }) {
  return (
    <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet to-magenta text-xs font-bold text-white" onClick={onClick} aria-label="Avatar-Menü">
      {initials}
    </button>
  );
}

export function TopBar() {
  const health = useHealthCheck();
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [apiOpen, setApiOpen] = useState(false);

  useEffect(() => {
    const open = () => setSearchOpen(true);
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("open-global-search", open);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("open-global-search", open);
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <header className="relative flex h-16 items-center justify-between border-b border-line bg-white px-4 md:px-6">
      <div className="flex items-center gap-3 md:hidden">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-steel-900 text-sm text-white">TM</span>
      </div>
      <div className="hidden min-w-0 flex-1 md:block" onClick={() => setSearchOpen(true)}>
        <SearchInput value={globalSearch} onChange={(value) => {
          setGlobalSearch(value);
          setSearchOpen(true);
        }} placeholder="Global suchen" hint="Ctrl K" />
      </div>
      <nav className="flex gap-1 md:hidden">
        <NavLink className={({ isActive }) => `flex h-10 w-10 items-center justify-center rounded-md ${isActive ? "bg-steel-900 text-white" : "hover:bg-shell"}`} to="/projects" title="Projekte">
          <FolderKanban size={18} />
        </NavLink>
        <NavLink className={({ isActive }) => `flex h-10 w-10 items-center justify-center rounded-md ${isActive ? "bg-steel-900 text-white" : "hover:bg-shell"}`} to="/calendar" title="Kalender">
          <CalendarDays size={18} />
        </NavLink>
      </nav>
      <div className="hidden items-center gap-3 md:flex">
        <ApiBadge online={health.online} latencyMs={health.latencyMs} onClick={() => setApiOpen((current) => !current)} />
        <Avatar initials="RM" onClick={() => setAvatarOpen((current) => !current)} />
      </div>
      {apiOpen ? <ApiHealthPopover online={health.online} latencyMs={health.latencyMs} onRefetch={health.refetch} /> : null}
      {avatarOpen ? <AvatarMenu /> : null}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
