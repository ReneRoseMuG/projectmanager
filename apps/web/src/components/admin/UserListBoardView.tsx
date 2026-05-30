import type { AdminUser } from "@taskmanager/shared-types";
import { Edit3, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { ActionMenu } from "../ui/ActionMenu";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { ItemRow } from "../ui/ItemRow";
import { ListBoardView, type ListBoardMode } from "../ui/ListBoardView";
import { UserCard } from "./UserCard";

interface UserListBoardViewProps {
  users: AdminUser[];
  loading?: boolean;
  onCreate: () => void;
  onEdit: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}

function matchesSearch(user: AdminUser, searchValue: string) {
  const normalized = searchValue.trim().toLocaleLowerCase("de-DE");
  if (!normalized) {
    return true;
  }

  return [
    user.fullName,
    user.email,
    user.role.label,
    user.isActive ? "aktiv" : "inaktiv",
  ].some((value) => value.toLocaleLowerCase("de-DE").includes(normalized));
}

export function UserListBoardView({
  users,
  loading = false,
  onCreate,
  onEdit,
  onDelete,
}: UserListBoardViewProps) {
  const [mode, setMode] = useState<ListBoardMode>("board");
  const [searchValue, setSearchValue] = useState("");
  const visibleUsers = useMemo(
    () => users.filter((user) => matchesSearch(user, searchValue)),
    [searchValue, users],
  );

  return (
    <ListBoardView
      items={visibleUsers}
      mode={mode}
      onModeChange={setMode}
      onAdd={onCreate}
      addLabel="Neuer Benutzer"
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      loading={loading}
      emptyState={
        <EmptyState
          icon={<Users size={22} />}
          title="Keine Benutzer"
          body="Es sind noch keine Benutzer angelegt."
          variant="tinted"
        />
      }
      renderCard={(user) => (
        <UserCard user={user} onEdit={onEdit} onDelete={onDelete} />
      )}
      renderRow={(user) => (
        <ItemRow
          title={user.fullName}
          description={user.email}
          onOpen={() => onEdit(user)}
          pills={
            <>
              <Badge tone="steel">{user.role.label}</Badge>
              <Badge tone={user.isActive ? "fern" : "crimson"}>
                {user.isActive ? "Aktiv" : "Inaktiv"}
              </Badge>
            </>
          }
          actions={
            <ActionMenu
              items={[
                {
                  label: "Bearbeiten",
                  icon: <Edit3 size={16} />,
                  onClick: () => onEdit(user),
                },
                {
                  label: "Löschen",
                  icon: <Trash2 size={16} />,
                  onClick: () => onDelete(user),
                  danger: true,
                },
              ]}
            />
          }
        />
      )}
    />
  );
}
