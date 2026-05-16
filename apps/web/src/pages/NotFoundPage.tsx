import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="mx-auto grid max-w-xl gap-4 rounded-lg border border-line bg-white p-8 text-center">
      <h1 className="text-xl font-semibold text-ink">Nicht gefunden</h1>
      <Link className="inline-flex h-10 items-center justify-center rounded-md bg-ink px-3 text-sm font-medium text-white hover:bg-teal" to="/projects">
        Projekte öffnen
      </Link>
    </div>
  );
}
