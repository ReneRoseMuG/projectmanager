import type {
  WikiPage as WikiPageType,
  WikiPageInput,
  DraftComment,
} from "@taskmanager/shared-types";
import { FileText, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createEntityComment } from "../api/comments";
import { Button } from "../components/ui/Button";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHero } from "../components/ui/PageHero";
import { TaskListSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";
import { WikiPageForm } from "../components/wiki/WikiPageForm";
import { WikiTree } from "../components/wiki/WikiTree";
import { errorMessage } from "../hooks/errors";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useStandaloneView } from "../hooks/useStandaloneView";
import { useProjects } from "../hooks/useProjects";
import { useWiki, type WikiTreeNode } from "../hooks/useWiki";
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
  const [inlineDirty, setInlineDirty] = useState(false);
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
    } catch (wikiError) {
      showToast({
        tone: "error",
        title: "Wiki-Seite konnte nicht gespeichert werden",
        message: errorMessage(wikiError),
      });
      throw wikiError;
    }
  };

  const autoSaveInlineForm = async (input: WikiPageInput, relatedPageIds: number[]) => {
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

    await wiki.updateWikiPage(p.id, { ...input, expectedVersion: p.version });
    if (relationsChanged) {
      await wiki.syncWikiPageRelations(p.id, currentRelatedPageIds, relatedPageIds);
    }
  };

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

  const requestInlineNavigation = async () => {
    if (!inlineDirty) {
      return true;
    }

    return confirm({
      title: "Änderungen verwerfen?",
      body: "Die Wiki-Seite enthält ungespeicherte Änderungen.",
      severity: "warn",
      confirmLabel: "Verwerfen",
    });
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <PageHero
        variant="list"
        title="Wiki"
        subtitle={wiki.loading ? "" : `${countPages(wiki.tree)} Seiten`}
        actions={
          <Button
            variant="primary"
            icon={<Plus size={17} />}
            onClick={() => openCreate(null)}
          >
            Neue Seite
          </Button>
        }
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {wiki.loading ? (
          <>
            <div className="w-[280px] shrink-0 bg-gradient-to-b from-steel-800 to-steel-900" />
            <div className="flex-1 p-5">
              <TaskListSkeleton />
            </div>
          </>
        ) : (
          <>
            <WikiTree tree={wiki.tree} onCreate={openCreate} onNavigate={requestInlineNavigation} />
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
                  open={true}
                  page={wiki.page}
                  parent={inlineParent}
                  tree={wiki.tree}
                  projects={projects}
                  onSubmit={submitInlineForm}
                  onAutoSave={wiki.page ? autoSaveInlineForm : undefined}
                  onDelete={deletePage}
                  onDirtyChange={setInlineDirty}
                  onClose={() => navigate(standalone ? withStandaloneView("/wiki") : "/wiki")}
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
        onClose={() => {
          setFormOpen(false);
          setFormParent(null);
        }}
      />
    </div>
  );
}
