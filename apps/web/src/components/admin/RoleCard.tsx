import type { Role } from "@taskmanager/shared-types";
import { Badge } from "../ui/Badge";
import { ItemCard } from "../ui/ItemCard";

interface RoleCardProps {
  role: Role;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
}

export function RoleCard({ role, onEdit, onDelete }: RoleCardProps) {
  return (
    <ItemCard
      onOpen={() => onEdit(role)}
      onEdit={() => onEdit(role)}
      onDelete={() => onDelete(role)}
      deleteDisabled={role.isSystem}
      header={<h3 className="truncate font-semibold text-ink">{role.label}</h3>}
      body={
        <div className="grid gap-3">
          <p className="truncate font-mono text-xs text-steel-500">{role.key}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={role.isSystem ? "steel" : "teal"}>
              {role.isSystem ? "System" : "Benutzerdefiniert"}
            </Badge>
            <span className="text-xs font-semibold text-steel-400">
              {role.permissions.length} Rechte
            </span>
          </div>
        </div>
      }
    />
  );
}
