import { Lock, Mail } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";
import { errorMessageAsync } from "../hooks/errors";

interface LocationState {
  from?: { pathname?: string };
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginPending } = useAuth({ enabled: false });
  const [email, setEmail] = useState("admin@local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const from =
    (location.state as LocationState | null)?.from?.pathname ?? "/projects";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const user = await login({ email, password });
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
            <Lock size={20} />
          </span>
          <h1 className="text-xl font-bold text-ink">Projekt Manager</h1>
          <p className="mt-1 text-sm text-slate-500">Anmeldung</p>
        </div>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1.5 text-sm font-medium">
            E-Mail
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              autoFocus
              iconLeft={<Mail size={16} />}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Passwort
            <Input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              iconLeft={<Lock size={16} />}
            />
          </label>
          {error ? (
            <p className="rounded-md border border-crimson/30 bg-crimson/5 px-3 py-2 text-sm text-crimson">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="primary" loading={loginPending}>
            Anmelden
          </Button>
        </form>
      </section>
    </main>
  );
}
