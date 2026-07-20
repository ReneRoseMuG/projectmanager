export interface DocumentLibraryUrlState {
  folderScope: number | "unsorted" | "all";
  tagFilters: number[];
  typeFilter: string;
  search: string;
}

export function parseDocumentLibraryUrl(params: URLSearchParams): DocumentLibraryUrlState {
  const folderParam = params.get("folder");
  const parsedFolderId = folderParam ? Number(folderParam) : Number.NaN;
  const folderScope: DocumentLibraryUrlState["folderScope"] = folderParam === "unsorted"
    ? "unsorted"
    : Number.isInteger(parsedFolderId) && parsedFolderId > 0
      ? parsedFolderId
      : "all";
  const rawTags = params.get("tags");
  const tagFilters = rawTags
    ? [...new Set(rawTags.split(",").map(Number).filter((id) => Number.isInteger(id) && id > 0))]
    : [];
  return {
    folderScope,
    tagFilters,
    typeFilter: params.get("type") ?? "",
    search: params.get("q") ?? ""
  };
}

export function updateDocumentLibraryUrl(
  current: URLSearchParams,
  key: "folder" | "tags" | "type" | "q",
  value: string | null
): URLSearchParams {
  const next = new URLSearchParams(current);
  if (value === null || value === "") {
    next.delete(key);
  } else {
    next.set(key, value);
  }
  return next;
}
