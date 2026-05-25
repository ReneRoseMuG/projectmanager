import type { PermissionInput, RoleInput, RoleUpdate } from "@taskmanager/shared-types";
import { Save } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { errorMessageAsync } from "../../hooks/errors";
import { useAdminRoleDetail, useAdminRoles } from "../../hooks/useAdminRoles";
import { Button } from "../ui/Button";
import { DetailModal } from "../ui/DetailModal";
import { FormField } from "../ui/FormField";
import { Input } from "../ui/Input";

interface RoleEditorModalProps {
  open: boolean;
  roleId: number | null;
  onClose: () => void;
}

function permissionKey(permission: PermissionInput): string {
  return `${permission.resource}:${permission.action}`;
}

export function RoleEditorModal({ open, roleId, onClose }: RoleEditorModalProps) {
  const isNew = roleId === null;
  const { role, loading, error: detailError } = useAdminRoleDetail(roleId);
  const { permissionCatalog, createRole, updateRole, pending } = useAdminRoles();
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"master">("master");
  const readOnly = Boolean(role?.isSystem);

  useEffect(() => {
    if (!open) {
      return;
    }
    setError(null);
    setActiveTab("master");
    if (isNew) {
      setKey("");
      setLabel("");
      setSelected(new Set());
    }
  }, [isNew, open, roleId]);

  useEffect(() => {
    if (!open || !role) {
      return;
    }
    setKey(role.key);
    setLabel(role.label);
    setSelected(new Set(role.permissions.map((permission) => permissionKey(permission))));
  }, [open, role]);

  function togglePermission(permission: PermissionInput, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      const nextKey = permissionKey(permission);
      if (checked) {
        next.add(nextKey);
      } else {
        next.delete(nextKey);
      }
      return next;
    });
  }

  function selectedPermissions(): PermissionInput[] {
    return [...selected].map((entry) => {
      const [resource, action] = entry.split(":");
      return {
        resource: resource as PermissionInput["resource"],
        action: action as PermissionInput["action"],
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) {
      return;
    }
    setError(null);
    try {
      if (isNew) {
        const input: RoleInput = { key, label, permissions: selectedPermissions() };
        await createRole(input);
        onClose();
        return;
      }
      if (!role) {
        return;
      }
      const input: RoleUpdate = {
        key,
        label,
        permissions: selectedPermissions(),
        expectedVersion: role.version,
      };
      await updateRole(role.id, input);
      onClose();
    } catch (caught) {
      setError(await errorMessageAsync(caught));
    }
  }

  return (
    <DetailModal
      open={open}
      onClose={onClose}
      title={isNew ? "Neue Rolle" : "Rolle bearbeiten"}
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
            form="admin-role-form"
            variant="primary"
            icon={<Save size={16} />}
            loading={pending}
            disabled={loading || readOnly}
          >
            Speichern
          </Button>
        </>
      }
    >
      <form id="admin-role-form" className="grid gap-5" onSubmit={handleSubmit}>
        {loading ? <p className="text-sm text-steel-500">Lädt...</p> : null}
        {readOnly ? (
          <p className="rounded-md border border-steel-200 bg-steel-100 px-3 py-2 text-sm font-medium text-steel-700">
            System-Rolle kann nicht bearbeitet werden.
          </p>
        ) : null}
        {detailError ? (
          <p className="rounded-md border border-crimson/30 bg-crimson/5 px-3 py-2 text-sm text-crimson">
            {detailError}
          </p>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Schlüssel">
            <Input value={key} onChange={(event) => setKey(event.target.value)} disabled={readOnly} />
          </FormField>
          <FormField label="Bezeichnung">
            <Input value={label} onChange={(event) => setLabel(event.target.value)} disabled={readOnly} />
          </FormField>
        </div>
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-steel-50 text-left text-xs font-semibold uppercase text-steel-500">
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
                        <input
                          type="checkbox"
                          checked={selected.has(permissionKey(permission))}
                          disabled={readOnly}
                          onChange={(event) => togglePermission(permission, event.target.checked)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error ? (
          <p className="rounded-md border border-crimson/30 bg-crimson/5 px-3 py-2 text-sm text-crimson">
            {error}
          </p>
        ) : null}
      </form>
    </DetailModal>
  );
}
