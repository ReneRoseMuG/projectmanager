import { useQuery } from "@tanstack/react-query";
import { getUsers } from "../api/users";
import { queryKeys } from "../queries/queryKeys";
import { toQueryError } from "../queries/queryErrors";

export function useUsers(enabled = true) {
  const usersQuery = useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: getUsers,
    enabled
  });

  return {
    users: usersQuery.data ?? [],
    loading: usersQuery.isLoading,
    error: toQueryError(usersQuery.error)
  };
}
