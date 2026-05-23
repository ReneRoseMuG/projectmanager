import { useEffect, useState } from "react";
import { GlobalSearch } from "../search/GlobalSearch";

const openGlobalSearchEvent = "open-global-search";

interface OpenGlobalSearchDetail {
  query?: string;
}

export function openGlobalSearch(query = ""): void {
  window.dispatchEvent(
    new CustomEvent<OpenGlobalSearchDetail>(openGlobalSearchEvent, {
      detail: { query },
    }),
  );
}

export function ShellOverlays() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [initialSearchQuery, setInitialSearchQuery] = useState("");

  useEffect(() => {
    const openSearch = (event: Event) => {
      const detail =
        event instanceof CustomEvent
          ? (event.detail as OpenGlobalSearchDetail | undefined)
          : undefined;
      setInitialSearchQuery(detail?.query ?? "");
      setSearchOpen(true);
    };
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setInitialSearchQuery("");
        setSearchOpen(true);
      }
    };

    window.addEventListener(openGlobalSearchEvent, openSearch);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener(openGlobalSearchEvent, openSearch);
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <>
      <GlobalSearch
        open={searchOpen}
        initialQuery={initialSearchQuery}
        onClose={() => setSearchOpen(false)}
      />
    </>
  );
}
