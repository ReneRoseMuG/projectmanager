import { Edit3, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageHeader } from "../../components/ui/PageHeader";
import { useAdminRoles } from "../../hooks/useAdminRoles";

export function RolesPage() {
  const { roles, loading, error, deleteRole, pending, mutationError } = useAdminRoles();

  return (
    <section className="mx-auto grid max-w-6xl gap-5">
      <PageHeader
        title="Rollen"
        subtitle="Administration"
        actions={
        <Link to="/admin/roles/new" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-steel-700 px-3 text-sm font-medium text-white transition hover:bg-steel-600">
          <Plus size={16} />
          Neu
        </Link>
        }
      />
      {error || mutationError ? <p className="rounded-md border border-crimson/30 bg-crimson/5 px-3 py-2 text-sm text-crimson">{error ?? mutationError}</p> : null}
      <div className="overflow-hidden rounded-lg border border-line bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-steel-50 text-xs font-semibold uppercase text-steel-500">
            <tr>
              <th className="px-4 py-3">Rolle</th>
              <th className="px-4 py-3">Schlüssel</th>
              <th className="px-4 py-3">Typ</th>
              <th className="px-4 py-3">Rechte</th>
              <th className="px-4 py-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? (
              <tr className="border-b border-line text-sm">
                <td className="px-4 py-5 text-steel-500" colSpan={5}>
                  Lädt...
                </td>
              </tr>
            ) : roles.length === 0 ? (
              <tr className="border-b border-line text-sm">
                <td className="px-4 py-5" colSpan={5}>
                  <EmptyState icon={<ShieldCheck size={22} />} title="Keine Rollen" body="Es sind noch keine Rollen angelegt." variant="tinted" />
                </td>
              </tr>
            ) : (
              roles.map((role) => (
                <tr key={role.id} className="border-b border-line text-sm last:border-0">
                  <td className="px-4 py-3 font-medium">{role.label}</td>
                  <td className="px-4 py-3 font-mono text-xs">{role.key}</td>
                  <td className="px-4 py-3">{role.isSystem ? "System" : "Benutzerdefiniert"}</td>
                  <td className="px-4 py-3">{role.permissions.length}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link to={`/admin/roles/${role.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line text-ink hover:border-fern" title="Bearbeiten">
                        <Edit3 size={15} />
                      </Link>
                      <button
                        type="button"
                        disabled={pending || role.isSystem}
                        onClick={() => void deleteRole(role.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line text-crimson hover:border-crimson disabled:opacity-50"
                        title="Löschen"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
