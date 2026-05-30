import type { AdminUserInput, AdminUserUpdate } from "@taskmanager/shared-types";
import { Save } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { errorMessageAsync } from "../../hooks/errors";
import { useAdminRoles } from "../../hooks/useAdminRoles";
import { useAdminUserDetail, useAdminUsers } from "../../hooks/useAdminUsers";
import { Button } from "../ui/Button";
import { DetailModal } from "../ui/DetailModal";
import { FormField } from "../ui/FormField";
import { Input } from "../ui/Input";

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

interface UserEditorModalProps {
  open: boolean;
  userId: number | null;
  onClose: () => void;
}

const emptyForm: UserFormState = {
  firstName: "",
  lastName: "",
  address: "",
  phone: "",
  email: "",
  roleId: "",
  password: "",
  isActive: true,
};

export function UserEditorModal({ open, userId, onClose }: UserEditorModalProps) {
  const isNew = userId === null;
  const { user, loading, error: detailError } = useAdminUserDetail(userId);
  const { createUser, updateUser, pending } = useAdminUsers();
  const { roles } = useAdminRoles();
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"master">("master");

  useEffect(() => {
    if (!open) {
      return;
    }
    setError(null);
    setActiveTab("master");
    if (isNew) {
      setForm(emptyForm);
    }
  }, [isNew, open, userId]);

  useEffect(() => {
    if (!open || !user) {
      return;
    }
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      address: user.address ?? "",
      phone: user.phone ?? "",
      email: user.email,
      roleId: String(user.role.id),
      password: "",
      isActive: user.isActive,
    });
  }, [open, user]);

  useEffect(() => {
    const firstRole = roles[0];
    if (open && isNew && firstRole && !form.roleId) {
      setForm((current) => ({ ...current, roleId: String(firstRole.id) }));
    }
  }, [form.roleId, isNew, open, roles]);

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
          isActive: form.isActive,
        };
        await createUser(input);
        onClose();
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
        ...(form.password ? { password: form.password } : {}),
      };
      await updateUser(user.id, input);
      onClose();
    } catch (caught) {
      setError(await errorMessageAsync(caught));
    }
  }

  return (
    <DetailModal
      open={open}
      onClose={onClose}
      title={isNew ? "Neuer Benutzer" : "Benutzer bearbeiten"}
      subtitle="Stammdaten"
      tabs={[{ value: "master", label: "Stammdaten" }]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      variant="modal"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            type="submit"
            form="admin-user-form"
            variant="primary"
            icon={<Save size={16} />}
            loading={pending}
            disabled={loading || !form.roleId}
          >
            Speichern
          </Button>
        </>
      }
    >
      <form id="admin-user-form" className="grid gap-4" onSubmit={handleSubmit}>
        {loading ? <p className="text-sm text-steel-500">Lädt...</p> : null}
        {detailError ? (
          <p className="rounded-md border border-crimson/30 bg-crimson/5 px-3 py-2 text-sm text-crimson">
            {detailError}
          </p>
        ) : null}
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
            <Input
              value={form.password}
              onChange={(event) => setField("password", event.target.value)}
              type="password"
              autoComplete="new-password"
              placeholder={isNew ? "" : "Leer lassen für keine Änderung"}
            />
          </FormField>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input type="checkbox" checked={form.isActive} onChange={(event) => setField("isActive", event.target.checked)} />
          Aktiv
        </label>
        {error ? (
          <p className="rounded-md border border-crimson/30 bg-crimson/5 px-3 py-2 text-sm text-crimson">
            {error}
          </p>
        ) : null}
      </form>
    </DetailModal>
  );
}
