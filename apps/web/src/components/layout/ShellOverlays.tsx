import { useEffect, useState } from "react";
import { AiAgentPanel } from "../ai/AiAgentPanel";
import { GlobalSearch } from "../search/GlobalSearch";

const openAiAgentEvent = "open-ai-agent";
const openGlobalSearchEvent = "open-global-search";

interface OpenGlobalSearchDetail {
  query?: string;
}

export function openAiAgent(): void {
  window.dispatchEvent(new Event(openAiAgentEvent));
}

export function openGlobalSearch(query = ""): void {
  window.dispatchEvent(
    new CustomEvent<OpenGlobalSearchDetail>(openGlobalSearchEvent, {
      detail: { query },
    }),
  );
}

export function ShellOverlays() {
  const [agentOpen, setAgentOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [initialSearchQuery, setInitialSearchQuery] = useState("");

  useEffect(() => {
    const openAgent = () => setAgentOpen(true);
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

    window.addEventListener(openAiAgentEvent, openAgent);
    window.addEventListener(openGlobalSearchEvent, openSearch);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener(openAiAgentEvent, openAgent);
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
      <AiAgentPanel open={agentOpen} onClose={() => setAgentOpen(false)} />
    </>
  );
}
