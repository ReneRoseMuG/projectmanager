import { KeyRound } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { FormField } from "../components/ui/FormField";
import { Input } from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";
import { errorMessageAsync } from "../hooks/errors";

export function SetupPasswordPage() {
  const navigate = useNavigate();
  const { setInitialPassword, setPasswordPending } = useAuth({ enabled: false });
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) {
      setError("Passwörter stimmen nicht überein");
      return;
    }
    try {
      await setInitialPassword({ password });
      navigate("/", { replace: true });
    } catch (caught) {
      setError(await errorMessageAsync(caught));
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-shell px-4 text-ink">
      <section className="w-full max-w-sm rounded-lg border border-line bg-white p-6 shadow-card">
        <div className="mb-6">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-steel-700 text-white">
            <KeyRound size={20} />
          </span>
          <h1 className="text-xl font-bold text-ink">Passwort vergeben</h1>
          <p className="mt-1 text-sm text-steel-500">Initiales Admin-Passwort</p>
        </div>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <FormField label="Neues Passwort" htmlFor="setup-password">
            <Input id="setup-password" value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" iconLeft={<KeyRound size={16} />} />
          </FormField>
          <FormField label="Bestätigung">
            <Input id="setup-password-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} type="password" autoComplete="new-password" iconLeft={<KeyRound size={16} />} />
          </FormField>
          {error ? <p className="rounded-md border border-crimson/30 bg-crimson/5 px-3 py-2 text-sm text-crimson">{error}</p> : null}
          <Button type="submit" variant="primary" loading={setPasswordPending}>
            Speichern
          </Button>
        </form>
      </section>
    </main>
  );
}
