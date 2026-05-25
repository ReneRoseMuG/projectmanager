import type { AdminUser } from "@taskmanager/shared-types";
import { Users as UsersIcon } from "lucide-react";
import { useState } from "react";
import { UserEditorModal } from "../../components/admin/UserEditorModal";
import { UserListBoardView } from "../../components/admin/UserListBoardView";
import { PageHero } from "../../components/ui/PageHero";
import { useAdminUsers } from "../../hooks/useAdminUsers";

type UserEditorState =
  | { mode: "create"; userId: null }
  | { mode: "edit"; userId: number }
  | null;

export function UsersPage() {
  const { users, loading, error, deleteUser, mutationError } = useAdminUsers();
  const [editor, setEditor] = useState<UserEditorState>(null);

  function openCreate() {
    setEditor({ mode: "create", userId: null });
  }

  function openEdit(user: AdminUser) {
    setEditor({ mode: "edit", userId: user.id });
  }

  function closeEditor() {
    setEditor(null);
  }

  return (
    <section className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <PageHero
        variant="detail"
        title="Benutzer"
        icon={<UsersIcon size={22} />}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto bg-white p-5">
        {error || mutationError ? (
          <p className="rounded-md border border-crimson/30 bg-crimson/5 px-3 py-2 text-sm text-crimson">
            {error ?? mutationError}
          </p>
        ) : null}
        <UserListBoardView
          users={users}
          loading={loading}
          onCreate={openCreate}
          onEdit={openEdit}
          onDelete={(user) => void deleteUser(user.id)}
        />
      </div>
      <UserEditorModal
        open={editor !== null}
        userId={editor?.userId ?? null}
        onClose={closeEditor}
      />
    </section>
  );
}
