import { useLocation } from "react-router-dom";
import { isStandaloneSearch } from "../utils/standalone";

export function useStandaloneView(): boolean {
  const location = useLocation();
  return isStandaloneSearch(location.search);
}
