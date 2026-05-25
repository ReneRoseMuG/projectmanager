import type { Role } from "@taskmanager/shared-types";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { RoleEditorModal } from "../../components/admin/RoleEditorModal";
import { RoleListBoardView } from "../../components/admin/RoleListBoardView";
import { PageHero } from "../../components/ui/PageHero";
import { useAdminRoles } from "../../hooks/useAdminRoles";

type RoleEditorState =
  | { mode: "create"; roleId: null }
  | { mode: "edit"; roleId: number }
  | null;

export function RolesPage() {
  const { roles, loading, error, deleteRole, mutationError } = useAdminRoles();
  const [editor, setEditor] = useState<RoleEditorState>(null);

  function openCreate() {
    setEditor({ mode: "create", roleId: null });
  }

  function openEdit(role: Role) {
    setEditor({ mode: "edit", roleId: role.id });
  }

  function closeEditor() {
    setEditor(null);
  }

  function handleDelete(role: Role) {
    if (role.isSystem) {
      return;
    }
    void deleteRole(role.id);
  }

  return (
    <section className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <PageHero
        variant="detail"
        title="Rollen"
        icon={<ShieldCheck size={22} />}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto bg-white p-5">
        {error || mutationError ? (
          <p className="rounded-md border border-crimson/30 bg-crimson/5 px-3 py-2 text-sm text-crimson">
            {error ?? mutationError}
          </p>
        ) : null}
        <RoleListBoardView
          roles={roles}
          loading={loading}
          onCreate={openCreate}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      </div>
      <RoleEditorModal
        open={editor !== null}
        roleId={editor?.roleId ?? null}
        onClose={closeEditor}
      />
    </section>
  );
}
