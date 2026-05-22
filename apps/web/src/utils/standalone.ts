export const standaloneSearchParam = "standalone";

export function withStandaloneView(to: string): string {
  const hashIndex = to.indexOf("#");
  const withoutHash = hashIndex >= 0 ? to.slice(0, hashIndex) : to;
  const hash = hashIndex >= 0 ? to.slice(hashIndex) : "";
  const queryIndex = withoutHash.indexOf("?");
  const pathname = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const search = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : "";
  const params = new URLSearchParams(search);
  params.set(standaloneSearchParam, "1");
  const query = params.toString();

  return `${pathname}${query ? `?${query}` : ""}${hash}`;
}

export function isStandaloneSearch(search: string): boolean {
  return new URLSearchParams(search).get(standaloneSearchParam) === "1";
}
