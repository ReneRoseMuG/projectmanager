import { Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";

export function NotFoundPage() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
      <section className="grid gap-5">
        <span className="inline-flex w-fit rounded-full border border-line bg-white px-3 py-1 font-mono text-xs font-bold text-steel-700">404 · Route {location.pathname} nicht gefunden</span>
        <div>
          <h1 className="text-4xl font-bold tracking-normal text-ink">Diese Seite gibt&apos;s nicht mehr.</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Möglicherweise wurde sie umbenannt, gelöscht oder der Link ist krumm geraten. Die Projektübersicht und die globale Suche bringen dich wieder in die richtige Richtung.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => navigate("/projects")}>
            Zur Projektübersicht
          </Button>
          <Button icon={<Search size={16} />} onClick={() => window.dispatchEvent(new CustomEvent("open-global-search"))}>
            Globale Suche
          </Button>
        </div>
      </section>
      <aside className="rounded-[18px] border border-line bg-gradient-to-br from-steel-100 to-white p-8 text-center shadow-panel">
        <div className="font-mono text-[96px] font-black leading-none text-steel-700">404</div>
        <p className="mt-3 text-sm font-semibold text-slate-500">Route nicht gefunden</p>
      </aside>
    </div>
  );
}
