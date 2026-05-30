import { useEffect } from "react";

const appTitle = "Projekt Manager";

export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) {
      return;
    }

    const previousTitle = document.title;
    document.title = `${title} | ${appTitle}`;

    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}
