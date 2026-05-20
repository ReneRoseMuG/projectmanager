import type { PermissionInput, RoleInput, RoleUpdate } from "@taskmanager/shared-types";
import { Save } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAdminRoleDetail, useAdminRoles } from "../../hooks/useAdminRoles";
import { errorMessageAsync } from "../../hooks/errors";

function permissionKey(permission: PermissionInput): string {
  return `${permission.resource}:${permission.action}`;
}

export function RoleDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const id = params.id && params.id !== "new" ? Number(params.id) : null;
  const isNew = id === null;
  const { role, loading } = useAdminRoleDetail(id);
  const { permissionCatalog, createRole, updateRole, pending } = useAdminRoles();
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (role) {
      setKey(role.key);
      setLabel(role.label);
      setSelected(new Set(role.permissions.map((permission) => permissionKey(permission))));
    }
  }, [role]);

  function togglePermission(permission: PermissionInput, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      const keyValue = permissionKey(permission);
      if (checked) {
        next.add(keyValue);
      } else {
        next.delete(keyValue);
      }
      return next;
    });
  }

  function selectedPermissions(): PermissionInput[] {
    return [...selected].map((entry) => {
      const [resource, action] = entry.split(":");
      return { resource: resource as PermissionInput["resource"], action: action as PermissionInput["action"] };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      if (isNew) {
        const input: RoleInput = { key, label, permissions: selectedPermissions() };
        const created = await createRole(input);
        navigate(`/admin/roles/${created.id}`, { replace: true });
        return;
      }
      if (!role) {
        return;
      }
      const input: RoleUpdate = {
        key,
        label,
        permissions: selectedPermissions(),
        expectedVersion: role.version
      };
      await updateRole(role.id, input);
      navigate("/admin/roles");
    } catch (caught) {
      setError(await errorMessageAsync(caught));
    }
  }

  return (
    <section className="mx-auto grid max-w-5xl gap-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">{isNew ? "Rolle anlegen" : "Rolle bearbeiten"}</h1>
        <p className="text-sm text-muted">Administration</p>
      </div>
      {loading ? <p className="text-sm text-muted">Lädt...</p> : null}
      <form className="grid gap-5 rounded-lg border border-line bg-white p-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium">
            Schlüssel
            <Input value={key} onChange={(event) => setKey(event.target.value)} disabled={Boolean(role?.isSystem)} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Bezeichnung
            <Input value={label} onChange={(event) => setLabel(event.target.value)} />
          </label>
        </div>
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-steel-50 text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">Ressource</th>
                {permissionCatalog?.actions.map((action) => (
                  <th key={action} className="px-3 py-2">
                    {action}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {permissionCatalog?.resources.map((resource) => (
                <tr key={resource}>
                  <td className="px-3 py-2 font-medium">{resource}</td>
                  {permissionCatalog.actions.map((action) => {
                    const permission = { resource, action };
                    return (
                      <td key={action} className="px-3 py-2">
                        <input type="checkbox" checked={selected.has(permissionKey(permission))} onChange={(event) => togglePermission(permission, event.target.checked)} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error ? <p className="rounded-md border border-crimson/30 bg-crimson/5 px-3 py-2 text-sm text-crimson">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Link to="/admin/roles" className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-3 text-sm font-medium text-ink hover:border-fern">
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
