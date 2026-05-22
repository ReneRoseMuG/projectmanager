import type { AdminUserInput, AdminUserUpdate } from "@taskmanager/shared-types";
import { Save } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { FormField } from "../../components/ui/FormField";
import { Input } from "../../components/ui/Input";
import { useAdminRoles } from "../../hooks/useAdminRoles";
import { useAdminUserDetail, useAdminUsers } from "../../hooks/useAdminUsers";
import { errorMessageAsync } from "../../hooks/errors";

interface UserFormState {
  firstName: string;
  lastName: string;
  address: string;
  phone: string;
  email: string;
  roleId: string;
  password: string;
  isActive: boolean;
}

const emptyForm: UserFormState = {
  firstName: "",
  lastName: "",
  address: "",
  phone: "",
  email: "",
  roleId: "",
  password: "",
  isActive: true
};

export function UserDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const id = params.id && params.id !== "new" ? Number(params.id) : null;
  const isNew = id === null;
  const { user, loading } = useAdminUserDetail(id);
  const { createUser, updateUser, pending } = useAdminUsers();
  const { roles } = useAdminRoles();
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName,
        lastName: user.lastName,
        address: user.address ?? "",
        phone: user.phone ?? "",
        email: user.email,
        roleId: String(user.role.id),
        password: "",
        isActive: user.isActive
      });
    }
  }, [user]);

  useEffect(() => {
    const firstRole = roles[0];
    if (isNew && firstRole && !form.roleId) {
      setForm((current) => ({ ...current, roleId: String(firstRole.id) }));
    }
  }, [form.roleId, isNew, roles]);

  function setField<K extends keyof UserFormState>(field: K, value: UserFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      if (isNew) {
        const input: AdminUserInput = {
          firstName: form.firstName,
          lastName: form.lastName,
          address: form.address || null,
          phone: form.phone || null,
          email: form.email,
          roleId: Number(form.roleId),
          password: form.password,
          isActive: form.isActive
        };
        const created = await createUser(input);
        navigate(`/admin/users/${created.id}`, { replace: true });
        return;
      }
      if (!user) {
        return;
      }
      const input: AdminUserUpdate = {
        firstName: form.firstName,
        lastName: form.lastName,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email,
        roleId: Number(form.roleId),
        isActive: form.isActive,
        expectedVersion: user.version,
        ...(form.password ? { password: form.password } : {})
      };
      await updateUser(user.id, input);
      navigate("/admin/users");
    } catch (caught) {
      setError(await errorMessageAsync(caught));
    }
  }

  return (
    <section className="mx-auto grid max-w-3xl gap-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{isNew ? "Benutzer anlegen" : "Benutzer bearbeiten"}</h1>
        <p className="text-sm text-steel-500">Administration</p>
      </div>
      {loading ? <p className="text-sm text-steel-500">Lädt...</p> : null}
      <form className="grid gap-4 rounded-lg border border-line bg-white p-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Vorname">
            <Input value={form.firstName} onChange={(event) => setField("firstName", event.target.value)} />
          </FormField>
          <FormField label="Nachname">
            <Input value={form.lastName} onChange={(event) => setField("lastName", event.target.value)} />
          </FormField>
          <FormField label="E-Mail">
            <Input value={form.email} onChange={(event) => setField("email", event.target.value)} />
          </FormField>
          <FormField label="Rolle">
            <select className="h-11 rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10" value={form.roleId} onChange={(event) => setField("roleId", event.target.value)}>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Adresse">
            <Input value={form.address} onChange={(event) => setField("address", event.target.value)} />
          </FormField>
          <FormField label="Telefon">
            <Input value={form.phone} onChange={(event) => setField("phone", event.target.value)} />
          </FormField>
          <FormField label="Passwort" className="md:col-span-2">
            <Input value={form.password} onChange={(event) => setField("password", event.target.value)} type="password" autoComplete="new-password" placeholder={isNew ? "" : "Leer lassen für keine Änderung"} />
          </FormField>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={form.isActive} onChange={(event) => setField("isActive", event.target.checked)} />
          Aktiv
        </label>
        {error ? <p className="rounded-md border border-crimson/30 bg-crimson/5 px-3 py-2 text-sm text-crimson">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Link to="/admin/users" className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-3 text-sm font-medium text-ink hover:border-fern">
            Zurück
          </Link>
          <Button type="submit" variant="primary" icon={<Save size={16} />} loading={pending}>
            Speichern
          </Button>
        </div>
      </form>
    </section>
  );
}
