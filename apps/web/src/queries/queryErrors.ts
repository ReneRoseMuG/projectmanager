import { errorMessage } from "../hooks/errors";

export function toQueryError(error: unknown): string | null {
  return error ? errorMessage(error) : null;
}
