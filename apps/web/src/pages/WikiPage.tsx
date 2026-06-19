import type {
  WikiPage as WikiPageType,
  WikiPageInput,
  DraftComment,
} from "@taskmanager/shared-types";
import { Download, FileText, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createEntityComment } from "../api/comments";
import { exportWiki } from "../api/wiki";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { DetailHeaderActions } from "../components/ui/DetailHeaderActions";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHero } from "../components/ui/PageHero";
import { SaveStatus } from "../components/ui/SaveStatus";
import { TaskListSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";
import { WikiPageForm } from "../components/wiki/WikiPageForm";
import { WikiTree } from "../components/wiki/WikiTree";
import { errorMessage } from "../hooks/errors";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useHasPermission } from "../hooks/usePermissions";
import { useStandaloneView } from "../hooks/useStandaloneView";
import { useProjects } from "../hooks/useProjects";
import { useWiki, type WikiTreeNode } from "../hooks/useWiki";
import type { AutoSaveStatus } from "../hooks/useAutoSave";
import { objectReference } from "../lib/references";
import { withStandaloneView } from "../utils/standalone";

function countPages(nodes: WikiTreeNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countPages(node.children), 0);
}

function flattenTree(nodes: WikiTreeNode[]): WikiPageType[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

export function WikiPage() {
  const params = useParams();
  const pageId = Number(params.id);
  const activePageId = Number.isFinite(pageId) ? pageId : undefined;
  const wiki = useWiki(activePageId);
  const { projects } = useProjects();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [formOpen, setFormOpen] = useState(false);
  const [formParent, setFormParent] = useState<WikiPageType | null>(null);
  const [editing, setEditing] = useState(false);
  const [inlineSaveStatus, setInlineSaveStatus] = useState<AutoSaveStatus>("idle");
  const [inlineSaveError, setInlineSaveError] = useState<string | null>(null);
  const handleInlineSaveStatus = useCallback(
    (status: AutoSaveStatus, error?: string | null) => {
      setInlineSaveStatus(status);
      setInlineSaveError(error ?? null);
    },
    [],
  );

  useEffect(() => {
    setEditing(false);
    setInlineSaveStatus("idle");
    setInlineSaveError(null);
  }, [activePageId]);
  const [exporting, setExporting] = useState(false);
  const canWrite = useHasPermission("wiki", "write");
  const standalone = useStandaloneView();
  const flatPages = useMemo(() => flattenTree(wiki.tree), [wiki.tree]);
  const inlineParent = wiki.page?.parentId
    ? flatPages.find((page) => page.id === wiki.page?.parentId) ?? null
    : null;
  useDocumentTitle(wiki.page ? `Wiki: ${wiki.page.title}` : "Wiki");

  const openCreate = (parent: WikiTreeNode | null) => {
    setFormParent(parent);
    setFormOpen(true);
  };

  const submitForm = async (input: WikiPageInput) => {
    try {
      const created = await wiki.createWikiPage(input);
      showToast({ tone: "success", title: "Wiki-Seite erstellt" });
      return created;
    } catch (wikiError) {
      showToast({
        tone: "error",
        title: "Wiki-Seite konnte nicht gespeichert werden",
        message: errorMessage(wikiError),
      });
      throw wikiError;
    }
  };

  const submitInlineForm = async (input: WikiPageInput, relatedPageIds: number[]) => {
    if (!wiki.page) {
      return;
    }

    try {
      await wiki.updateWikiPage(wiki.page.id, {
        ...input,
        expectedVersion: wiki.page.version,
      });
      await wiki.syncWikiPageRelations(
        wiki.page.id,
        wiki.page.relatedPages.map((relatedPage) => relatedPage.id),
        relatedPageIds,
      );
      showToast({ tone: "success", title: "Wiki-Seite gespeichert" });
      setEditing(false);
    } catch (wikiError) {
      showToast({
        tone: "error",
        title: "Wiki-Seite konnte nicht gespeichert werden",
        message: errorMessage(wikiError),
      });
      throw wikiError;
    }
  };

  const autoSaveInlineForm = async (input: WikiPageInput, relatedPageIds: number[], baseVersion: number): Promise<{ version: number } | void> => {
    if (!wiki.page) return;
    const p = wiki.page;
    const currentRelatedPageIds = p.relatedPages.map((rp) => rp.id).sort((a, b) => a - b);
    const nextRelatedPageIds = [...relatedPageIds].sort((a, b) => a - b);
    const fieldsChanged =
      input.title !== p.title ||
      (input.content ?? "") !== (p.content ?? "") ||
      (input.parentId ?? null) !== (p.parentId ?? null);
    const relationsChanged =
      nextRelatedPageIds.length !== currentRelatedPageIds.length ||
      nextRelatedPageIds.some((id, i) => id !== currentRelatedPageIds[i]);

    if (!fieldsChanged && !relationsChanged) return;

    // Use baseVersion (the version the editor content is based on) so that external writes
    // produce a 409 instead of being silently overwritten (TKT-129).
    const updated = await wiki.updateWikiPage(p.id, { ...input, expectedVersion: baseVersion });
    if (relationsChanged) {
      await wiki.syncWikiPageRelations(p.id, currentRelatedPageIds, relatedPageIds);
    }
    return { version: updated.version };
  };

  const handleReloadRequest = useCallback(async () => {
    await wiki.reload();
  }, [wiki]);

  const postCreatePage = async (
    pageId: number,
    pending: { comments: DraftComment[]; relatedPageIds: number[] },
  ) => {
    try {
      await wiki.syncWikiPageRelations(pageId, [], pending.relatedPageIds);
      for (const comment of pending.comments) {
        await createEntityComment("wikiPage", pageId, { body: comment.text });
      }
      navigate(standalone ? withStandaloneView(`/wiki/${pageId}`) : `/wiki/${pageId}`);
    } catch (wikiError) {
      showToast({
        tone: "error",
        title:
          "Wiki-Seite wurde erstellt, aber nicht alle Zuordnungen konnten gespeichert werden",
        message: errorMessage(wikiError),
      });
      throw wikiError;
    }
  };

  const deletePage = async (page: WikiPageType) => {
    const approved = await confirm({
      title: "Wiki-Seite löschen?",
      body: `Die Seite "${page.title}" wird entfernt.`,
      severity: "danger",
      confirmLabel: "Löschen",
    });
    if (!approved) {
      return;
    }
    try {
      await wiki.removeWikiPage(page.id);
      showToast({ tone: "success", title: "Wiki-Seite gelöscht" });
      navigate(standalone ? withStandaloneView("/wiki") : "/wiki");
    } catch (wikiError) {
      showToast({
        tone: "error",
        title: "Wiki-Seite konnte nicht gelöscht werden",
        message: errorMessage(wikiError),
      });
    }
  };

  const moveWikiPage = async (page: WikiTreeNode, nextParentId: number | null) => {
    try {
      await wiki.updateWikiPage(page.id, {
        parentId: nextParentId,
        expectedVersion: page.version,
      });
    } catch (wikiError) {
      showToast({
        tone: "error",
        title: "Wiki-Seite konnte nicht verschoben werden",
        message: errorMessage(wikiError),
      });
    }
  };

  const reorderWikiPage = async (page: WikiTreeNode, nextParentId: number | null, newOrder: WikiTreeNode[]) => {
    try {
      const parentChanged = page.parentId !== nextParentId;
      await Promise.all(
        newOrder.map((sibling, index) =>
          wiki.updateWikiPage(sibling.id, {
            sortOrder: index * 1000,
            ...(sibling.id === page.id && parentChanged ? { parentId: nextParentId } : {}),
            expectedVersion: sibling.version,
          })
        )
      );
    } catch (wikiError) {
      showToast({
        tone: "error",
        title: "Reihenfolge konnte nicht geändert werden",
        message: errorMessage(wikiError),
      });
    }
  };

  const runExport = async () => {
    const exportPath = (() => {
      try { return window.localStorage.getItem("ui.wiki-export-path") ?? "~/Documents/Projekt Manager/Wiki"; }
      catch { return "~/Documents/Projekt Manager/Wiki"; }
    })();
    setExporting(true);
    try {
      const result = await exportWiki(exportPath);
      showToast({ tone: "success", title: `Export abgeschlossen`, message: `${result.filesWritten} Seiten nach ${result.exportPath}` });
    } catch (exportError) {
      showToast({ tone: "error", title: "Export fehlgeschlagen", message: errorMessage(exportError) });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      {wiki.page && !standalone ? (
        <PageHero
          variant="detail"
          breadcrumb={["Wiki", inlineParent?.title ?? "Root"]}
          title={wiki.page.title}
          icon={<FileText size={20} />}
          actions={
            <DetailHeaderActions
              tone="onSteel"
              saveStatus={<SaveStatus status={inlineSaveStatus} errorMessage={inlineSaveError} />}
              objectReference={objectReference("wikiPage", wiki.page.id)}
              onOpenInTab={() => window.open(withStandaloneView(`/wiki/${wiki.page!.id}`), "_blank")}
              onDelete={canWrite ? () => void deletePage(wiki.page!) : undefined}
              deleteLabel="Seite löschen"
            />
          }
        />
      ) : (
        <PageHero
          variant="list"
          title="Wiki"
          subtitle={wiki.loading ? "" : `${countPages(wiki.tree)} Seiten`}
          actions={canWrite && !wiki.loading && countPages(wiki.tree) > 0 ? (
            <button
              type="button"
              disabled={exporting}
              onClick={() => void runExport()}
              className="flex h-9 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-steel-700 transition hover:bg-shell disabled:cursor-not-allowed disabled:opacity-50"
              title="Wiki als HTML exportieren"
            >
              <Download size={15} />
              {exporting ? "Exportiert…" : "Exportieren"}
            </button>
          ) : undefined}
        />
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {wiki.loading ? (
          <>
            <div className="w-[256px] shrink-0 bg-gradient-to-b from-steel-800 to-steel-900" />
            <div className="flex-1 p-5">
              <TaskListSkeleton />
            </div>
          </>
        ) : (
          <>
            <WikiTree tree={wiki.tree} onCreate={openCreate} canMove={canWrite} onMove={moveWikiPage} onReorder={reorderWikiPage} />
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              {wiki.error ? (
                <div className="px-5 pt-5">
                  <div className="mb-4 rounded-lg border border-line bg-white p-4 text-sm text-crimson">
                    {wiki.error}
                  </div>
                </div>
              ) : null}
              <div className={wiki.page ? "flex min-h-0 flex-1 flex-col" : "p-5"}>
              {wiki.page ? (
                <WikiPageForm
                  inline
                  inlineChrome={standalone ? "standalone" : "embedded"}
                  open={true}
                  page={wiki.page}
                  parent={inlineParent}
                  tree={wiki.tree}
                  projects={projects}
                  onSubmit={submitInlineForm}
                  onAutoSave={wiki.page ? autoSaveInlineForm : undefined}
                  onReloadRequested={wiki.page ? handleReloadRequest : undefined}
                  onAutoSaveStatusChange={handleInlineSaveStatus}
                  onDelete={canWrite ? deletePage : undefined}
                  editable={editing}
                  onEdit={() => setEditing(true)}
                  onNavigateToWikiPage={(id) => navigate(standalone ? withStandaloneView(`/wiki/${id}`) : `/wiki/${id}`)}
                  onClose={editing
                    ? () => setEditing(false)
                    : () => navigate(standalone ? withStandaloneView("/wiki") : "/wiki")}
                />
              ) : (
                <EmptyState
                  icon={<FileText size={22} />}
                  title="Keine Wiki-Seite ausgewählt"
                  body="Wähle links eine Seite aus oder lege eine neue Wiki-Seite an."
                  tone="teal"
                  variant="tinted"
                  actions={[
                    {
                      label: "Neue Seite",
                      onClick: () => openCreate(null),
                      primary: true,
                      icon: <Plus size={16} />,
                    },
                  ]}
                />
              )}
              </div>
            </div>
          </>
        )}
      </div>

      <WikiPageForm
        open={formOpen}
        page={null}
        parent={formParent}
        tree={wiki.tree}
        projects={projects}
        onSubmit={submitForm}
        onPostCreate={postCreatePage}
        onNavigateToWikiPage={(id) => {
          setFormOpen(false);
          setFormParent(null);
          navigate(standalone ? withStandaloneView(`/wiki/${id}`) : `/wiki/${id}`);
        }}
        onClose={() => {
          setFormOpen(false);
          setFormParent(null);
        }}
      />
    </div>
  );
}
