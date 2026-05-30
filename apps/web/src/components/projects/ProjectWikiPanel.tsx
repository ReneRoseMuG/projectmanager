import type { WikiPage } from "@taskmanager/shared-types";
import { FileText, Link2, X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useWiki, type WikiTreeNode } from "../../hooks/useWiki";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Section } from "../ui/Section";
import { Select } from "../ui/Select";

interface ProjectWikiPanelProps {
  wikiPageId: number | null;
  saving?: boolean;
  onChange: (wikiPageId: number | null) => Promise<unknown>;
}

interface WikiPageOption {
  page: WikiPage;
  label: string;
}

function flattenWikiTree(
  nodes: WikiTreeNode[],
  level = 0,
): WikiPageOption[] {
  return nodes.flatMap((node) => [
    {
      page: node,
      label: `${"  ".repeat(level)}${level > 0 ? "- " : ""}${node.title}`,
    },
    ...flattenWikiTree(node.children, level + 1),
  ]);
}

export function ProjectWikiPanel({
  wikiPageId,
  saving = false,
  onChange,
}: ProjectWikiPanelProps) {
  const wiki = useWiki(wikiPageId ?? undefined);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<number | "">("");
  const pageOptions = useMemo(() => flattenWikiTree(wiki.tree), [wiki.tree]);
  const linkedPage =
    wiki.page ??
    pageOptions.find((option) => option.page.id === wikiPageId)?.page ??
    null;
  const firstPageId = pageOptions[0]?.page.id ?? "";
  const canOpenDialog = pageOptions.length > 0 && !wiki.loading && !saving;

  useEffect(() => {
    if (linkDialogOpen) {
      setSelectedPageId(wikiPageId ?? firstPageId);
    }
  }, [firstPageId, linkDialogOpen, wikiPageId]);

  const openDialog = () => {
    setSelectedPageId(wikiPageId ?? firstPageId);
    setLinkDialogOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation();
    event.preventDefault();
    if (selectedPageId === "") {
      return;
    }
    if (selectedPageId === wikiPageId) {
      setLinkDialogOpen(false);
      return;
    }
    try {
      await onChange(selectedPageId);
      setLinkDialogOpen(false);
    } catch {
      // Toast feedback is handled by the caller.
    }
  };

  const removeRelation = async () => {
    try {
      await onChange(null);
    } catch {
      // Toast feedback is handled by the caller.
    }
  };

  return (
    <>
      <Section
        title="Projekt Wiki"
        actions={
          <Button
            aria-label="Wiki-Seite verknüpfen"
            title="Wiki-Seite verknüpfen"
            variant="secondary"
            icon={<Link2 size={17} />}
            className="h-9 w-9 bg-transparent px-0"
            disabled={!canOpenDialog}
            onClick={openDialog}
          />
        }
      >
        {wikiPageId && linkedPage ? (
          <div className="flex items-center gap-2 rounded-lg border border-line bg-white p-2 shadow-sm">
            <Link
              to={`/wiki/${linkedPage.id}`}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1.5 text-sm text-ink transition hover:bg-shell focus:outline-none focus:ring-2 focus:ring-steel-700/10"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-steel-100 text-steel-700">
                <FileText size={17} />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {linkedPage.title}
                </span>
                <span className="block text-xs text-steel-500">
                  Wiki-Seite
                </span>
              </span>
            </Link>
            <Button
              aria-label={`Wiki-Seite ${linkedPage.title} entfernen`}
              title="Wiki-Seite entfernen"
              variant="ghost"
              icon={<X size={16} />}
              loading={saving}
              disabled={saving}
              onClick={() => void removeRelation()}
            />
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-line bg-shell px-3 py-3 text-sm text-steel-500">
            {wiki.loading
              ? "Wiki-Seiten werden geladen"
              : pageOptions.length === 0
                ? "Keine Wiki-Seiten vorhanden"
                : "Keine Wiki-Seite verknüpft"}
          </div>
        )}

        {wikiPageId && !linkedPage && wiki.error ? (
          <p className="mt-2 text-sm text-crimson">{wiki.error}</p>
        ) : null}
      </Section>

      <Modal
        open={linkDialogOpen}
        title="Wiki-Seite verknüpfen"
        size="md"
        onClose={() => setLinkDialogOpen(false)}
      >
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <Select
            label="Wiki-Seite"
            value={selectedPageId}
            onChange={(event) =>
              setSelectedPageId(
                event.target.value ? Number(event.target.value) : "",
              )
            }
          >
            {pageOptions.map((option) => (
              <option key={option.page.id} value={option.page.id}>
                {option.label}
              </option>
            ))}
          </Select>
          <footer className="flex justify-end gap-2">
            <Button onClick={() => setLinkDialogOpen(false)}>Abbrechen</Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              disabled={selectedPageId === ""}
            >
              Verknüpfen
            </Button>
          </footer>
        </form>
      </Modal>
    </>
  );
}
