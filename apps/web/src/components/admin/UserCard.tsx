import type { AdminUser } from "@taskmanager/shared-types";
import { Badge } from "../ui/Badge";
import { ItemCard } from "../ui/ItemCard";

interface UserCardProps {
  user: AdminUser;
  onEdit: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}

export function UserCard({ user, onEdit, onDelete }: UserCardProps) {
  return (
    <ItemCard
      onOpen={() => onEdit(user)}
      onEdit={() => onEdit(user)}
      onDelete={() => onDelete(user)}
      header={<h3 className="truncate font-semibold text-ink">{user.fullName}</h3>}
      body={
        <div className="grid gap-3">
          <p className="truncate text-sm text-steel-500">{user.email}</p>
          <div className="flex flex-wrap gap-2">
            <Badge tone="steel">{user.role.label}</Badge>
            <Badge tone={user.isActive ? "fern" : "crimson"}>
              {user.isActive ? "Aktiv" : "Inaktiv"}
            </Badge>
          </div>
        </div>
      }
    />
  );
}
