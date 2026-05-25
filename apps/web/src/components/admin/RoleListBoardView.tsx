import type { Role } from "@taskmanager/shared-types";
import { Edit3, ShieldCheck, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ActionMenu } from "../ui/ActionMenu";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { ItemRow } from "../ui/ItemRow";
import { ListBoardView, type ListBoardMode } from "../ui/ListBoardView";
import { RoleCard } from "./RoleCard";

interface RoleListBoardViewProps {
  roles: Role[];
  loading?: boolean;
  onCreate: () => void;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
}

function matchesSearch(role: Role, searchValue: string) {
  const normalized = searchValue.trim().toLocaleLowerCase("de-DE");
  if (!normalized) {
    return true;
  }

  return [
    role.label,
    role.key,
    role.isSystem ? "system" : "benutzerdefiniert",
  ].some((value) => value.toLocaleLowerCase("de-DE").includes(normalized));
}

export function RoleListBoardView({
  roles,
  loading = false,
  onCreate,
  onEdit,
  onDelete,
}: RoleListBoardViewProps) {
  const [mode, setMode] = useState<ListBoardMode>("board");
  const [searchValue, setSearchValue] = useState("");
  const visibleRoles = useMemo(
    () => roles.filter((role) => matchesSearch(role, searchValue)),
    [roles, searchValue],
  );

  return (
    <ListBoardView
      items={visibleRoles}
      mode={mode}
      onModeChange={setMode}
      onAdd={onCreate}
      addLabel="Neue Rolle"
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      loading={loading}
      emptyState={
        <EmptyState
          icon={<ShieldCheck size={22} />}
          title="Keine Rollen"
          body="Es sind noch keine Rollen angelegt."
          variant="tinted"
        />
      }
      renderCard={(role) => (
        <RoleCard role={role} onEdit={onEdit} onDelete={onDelete} />
      )}
      renderRow={(role) => (
        <ItemRow
          title={role.label}
          description={role.key}
          onOpen={() => onEdit(role)}
          pills={
            <Badge tone={role.isSystem ? "steel" : "teal"}>
              {role.isSystem ? "System" : "Benutzerdefiniert"}
            </Badge>
          }
          meta={
            <span className="text-xs font-semibold text-steel-400">
              {role.permissions.length} Rechte
            </span>
          }
          actions={
            <ActionMenu
              items={[
                {
                  label: "Bearbeiten",
                  icon: <Edit3 size={16} />,
                  onClick: () => onEdit(role),
                },
                {
                  label: "Löschen",
                  icon: <Trash2 size={16} />,
                  onClick: () => onDelete(role),
                  danger: true,
                  disabled: role.isSystem,
                },
              ]}
            />
          }
        />
      )}
    />
  );
}
