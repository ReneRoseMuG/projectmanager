import { Bot, CalendarDays, FolderKanban } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useHealthCheck } from "../../hooks/useHealthCheck";
import { AiAgentPanel } from "../ai/AiAgentPanel";
import { GlobalSearch } from "../search/GlobalSearch";
import { Button } from "../ui/Button";
import { SearchInput } from "../ui/SearchInput";
import { ApiHealthPopover } from "./ApiHealthPopover";

function ApiBadge({
  online,
  latencyMs,
  onClick,
}: {
  online: boolean;
  latencyMs: number | null;
  onClick: () => void;
}) {
  const slow = online && latencyMs !== null && latencyMs > 250;
  return (
    <button
      type="button"
      className={`inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs font-semibold uppercase tracking-wide text-white ${online ? (slow ? "bg-tangerine" : "bg-fern") : "bg-crimson"}`}
      title={latencyMs ? `${latencyMs} ms` : undefined}
      onClick={onClick}
    >
      <span className="h-2 w-2 rounded-full bg-white/80" />
      API {online ? (slow ? "langsam" : "erreichbar") : "offline"}
    </button>
  );
}

export function TopBar() {
  const health = useHealthCheck();
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [apiOpen, setApiOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);

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
    <header className="relative flex h-16 items-center justify-between bg-white px-4 md:px-6">
      <span className="pointer-events-none absolute inset-x-0 top-[calc(50%+1.25rem)] border-t border-line" />
      <div className="flex items-center gap-3 md:hidden">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-steel-900 text-sm text-white">
          PM
        </span>
      </div>
      <div
        className="hidden min-w-0 flex-1 md:block"
        onClick={() => setSearchOpen(true)}
      >
        <SearchInput
          value={globalSearch}
          onChange={(value) => {
            setGlobalSearch(value);
            setSearchOpen(true);
          }}
          placeholder="Global suchen"
          hint="Ctrl K"
        />
      </div>
      <nav className="flex gap-1 md:hidden">
        <button
          className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-shell"
          type="button"
          title="KI-Agent"
          onClick={() => setAgentOpen(true)}
        >
          <Bot size={18} />
        </button>
        <NavLink
          className={({ isActive }) =>
            `flex h-10 w-10 items-center justify-center rounded-md ${isActive ? "bg-steel-900 text-white" : "hover:bg-shell"}`
          }
          to="/projects"
          title="Projekte"
        >
          <FolderKanban size={18} />
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            `flex h-10 w-10 items-center justify-center rounded-md ${isActive ? "bg-steel-900 text-white" : "hover:bg-shell"}`
          }
          to="/calendar"
          title="Kalender"
        >
          <CalendarDays size={18} />
        </NavLink>
      </nav>
      <div className="hidden items-center gap-3 md:flex">
        <Button
          variant="ghost"
          icon={<Bot size={18} />}
          onClick={() => setAgentOpen(true)}
        >
          KI-Agent
        </Button>
        <ApiBadge
          online={health.online}
          latencyMs={health.latencyMs}
          onClick={() => setApiOpen((current) => !current)}
        />
      </div>
      {apiOpen ? (
        <ApiHealthPopover
          online={health.online}
          latencyMs={health.latencyMs}
          onRefetch={health.refetch}
        />
      ) : null}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <AiAgentPanel open={agentOpen} onClose={() => setAgentOpen(false)} />
    </header>
  );
}
