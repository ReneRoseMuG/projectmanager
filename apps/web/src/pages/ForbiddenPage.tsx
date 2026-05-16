import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";

export function ForbiddenPage() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
      <section className="grid gap-5">
        <span className="inline-flex w-fit rounded-full border border-line bg-white px-3 py-1 font-mono text-xs font-bold text-tangerine">403 · Route {location.pathname}</span>
        <div>
          <h1 className="text-4xl font-bold tracking-normal text-ink">Kein Zugriff auf dieses Projekt.</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Diese Stub-Seite bereitet spätere Mehrbenutzer-Rechte vor. Im aktuellen Single-User-Modus wird sie nur direkt über die Route angezeigt.</p>
        </div>
        <Button variant="primary" onClick={() => navigate("/projects")}>
          Zur Projektübersicht
        </Button>
      </section>
      <aside className="rounded-[18px] border border-line bg-gradient-to-br from-tangerine/15 to-white p-8 text-center shadow-panel">
        <div className="font-mono text-[96px] font-black leading-none text-tangerine">403</div>
        <p className="mt-3 text-sm font-semibold text-slate-500">Zugriff vorbereitet</p>
      </aside>
    </div>
  );
}
