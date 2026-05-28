import { LogIn, UserRound } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import { errorMessageAsync } from "../hooks/errors";

interface LocationState {
  from?: { pathname?: string };
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginAsRene, loginAsRenePending } = useAuth({ enabled: false });
  const [error, setError] = useState<string | null>(null);

  const from =
    (location.state as LocationState | null)?.from?.pathname ?? "/";

  async function handleLogin() {
    setError(null);
    try {
      const user = await loginAsRene();
      navigate(user.requiresPasswordSetup ? "/setup-password" : from, {
        replace: true,
      });
    } catch (caught) {
      setError(await errorMessageAsync(caught));
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-shell px-4 text-ink">
      <section className="w-full max-w-sm rounded-lg border border-line bg-white p-6 shadow-card">
        <div className="mb-6">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-steel-700 text-white">
            <UserRound size={20} />
          </span>
          <h1 className="text-xl font-bold text-ink">Projekt Manager</h1>
          <p className="mt-1 text-sm text-steel-500">Rene Rose</p>
        </div>
        <div className="grid gap-4">
          {error ? (
            <p className="rounded-md border border-crimson/30 bg-crimson/5 px-3 py-2 text-sm text-crimson">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            variant="primary"
            icon={<LogIn size={16} />}
            loading={loginAsRenePending}
            autoFocus
            onClick={handleLogin}
          >
            Als Rene anmelden
          </Button>
        </div>
      </section>
    </main>
  );
}
