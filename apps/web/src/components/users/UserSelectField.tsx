import type { UserOption } from "@taskmanager/shared-types";
import { useMemo } from "react";
import { useUsers } from "../../hooks/useUsers";
import { FormField } from "../ui/FormField";

interface UserSelectFieldProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  selectedUser?: UserOption | null;
  required?: boolean;
  allowEmpty?: boolean;
  disabled?: boolean;
}

function userLabel(user: UserOption): string {
  return user.fullName || user.email;
}

export function UserSelectField({ label, value, onChange, selectedUser, required = false, allowEmpty = true, disabled = false }: UserSelectFieldProps) {
  const userList = useUsers();
  const options = useMemo(() => {
    const byId = new Map<number, UserOption>();
    for (const user of userList.users) {
      byId.set(user.id, user);
    }
    if (selectedUser && !byId.has(selectedUser.id)) {
      byId.set(selectedUser.id, selectedUser);
    }
    return [...byId.values()].sort((left, right) => userLabel(left).localeCompare(userLabel(right), "de"));
  }, [selectedUser, userList.users]);

  return (
    <FormField label={label} required={required}>
      <select
        className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
        value={value === null ? "" : String(value)}
        disabled={disabled || userList.loading}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
      >
        {allowEmpty ? <option value="">Nicht zugewiesen</option> : null}
        {options.map((user) => (
          <option key={user.id} value={user.id}>
            {userLabel(user)}
          </option>
        ))}
      </select>
    </FormField>
  );
}
