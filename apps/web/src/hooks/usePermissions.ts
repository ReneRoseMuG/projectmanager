import type { AuthAction, AuthResource, CurrentUser } from "@taskmanager/shared-types";
import { useAuth } from "./useAuth";

export function hasPermission(user: CurrentUser | null | undefined, resource: AuthResource, action: AuthAction): boolean {
  return Boolean(
    user?.permissions.some(
      (permission) => (permission.resource === "*" || permission.resource === resource) && (permission.action === "*" || permission.action === action || permission.action === "admin")
    )
  );
}

export function useHasPermission(resource: AuthResource, action: AuthAction): boolean {
  const auth = useAuth();
  return hasPermission(auth.user, resource, action);
}
