import type {
  WikiPage as WikiPageType,
  WikiPageInput,
  WikiPageUpdate,
  DraftComment,
} from "@taskmanager/shared-types";
import { FileText, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createEntityComment } from "../api/comments";
import { Button } from "../components/ui/Button";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHero } from "../components/ui/PageHero";
import { TaskListSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";
import { WikiBreadcrumb } from "../components/wiki/WikiBreadcrumb";
import { WikiPageDetail } from "../components/wiki/WikiPageDetail";
import { WikiPageForm } from "../components/wiki/WikiPageForm";
import { WikiTree } from "../components/wiki/WikiTree";
import { errorMessage } from "../hooks/errors";
import { useStandaloneView } from "../hooks/useStandaloneView";
import { useProjects } from "../hooks/useProjects";
import { useWiki, type WikiTreeNode } from "../hooks/useWiki";
import { withStandaloneView } from "../utils/standalone";

function countPages(nodes: WikiTreeNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countPages(node.children), 0);
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
  const [editingPage, setEditingPage] = useState<WikiPageType | null>(null);
  const standalone = useStandaloneView();

  const openCreate = (parent: WikiTreeNode | null) => {
    setEditingPage(null);
    setFormParent(parent);
    setFormOpen(true);
  };

  const openEditMetadata = () => {
    setEditingPage(wiki.page);
    setFormParent(null);
    setFormOpen(true);
  };

  const openInTab = editingPage
    ? () => {
        window.open(withStandaloneView(`/wiki/${editingPage.id}`), "_blank");
        navigate(standalone ? withStandaloneView("/wiki") : "/wiki");
        setFormOpen(false);
        setFormParent(null);
        setEditingPage(null);
      }
    : undefined;

  const savePage = async (id: number, input: WikiPageUpdate) => {
    try {
      const expectedVersion =
        wiki.page?.id === id ? wiki.page.version : input.expectedVersion;
      await wiki.updateWikiPage(id, { ...input, expectedVersion });
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

  const submitForm = async (input: WikiPageInput, relatedPageIds: number[]) => {
    try {
      if (editingPage) {
        await wiki.updateWikiPage(editingPage.id, {
          ...input,
          expectedVersion: editingPage.version,
        });
        await wiki.syncWikiPageRelations(
          editingPage.id,
          editingPage.relatedPages.map((relatedPage) => relatedPage.id),
          relatedPageIds,
        );
        showToast({ tone: "success", title: "Wiki-Seite gespeichert" });
      } else {
        const created = await wiki.createWikiPage(input);
        showToast({ tone: "success", title: "Wiki-Seite erstellt" });
        return created;
      }
    } catch (wikiError) {
      showToast({
        tone: "error",
        title: "Wiki-Seite konnte nicht gespeichert werden",
        message: errorMessage(wikiError),
      });
      throw wikiError;
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

      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-6 overflow-auto px-4 pt-4 md:px-5 md:pt-5">
        {wiki.loading ? (
          <TaskListSkeleton />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
            <WikiTree tree={wiki.tree} onCreate={openCreate} />
            <div className="grid content-start gap-4">
              {wiki.error ? (
                <div className="rounded-lg border border-line bg-white p-4 text-sm text-crimson">
                  {wiki.error}
                </div>
              ) : null}
              <WikiBreadcrumb items={wiki.breadcrumb} />
              {wiki.page ? (
                <WikiPageDetail
                  page={wiki.page}
                  onSave={savePage}
                  onDelete={deletePage}
                  onEditMetadata={openEditMetadata}
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
        )}
      </div>

      <WikiPageForm
        open={formOpen}
        page={editingPage}
        parent={formParent}
        tree={wiki.tree}
        projects={projects}
        onSubmit={submitForm}
        onPostCreate={postCreatePage}
        onOpenInTab={openInTab}
        onClose={() => {
          setFormOpen(false);
          setFormParent(null);
          setEditingPage(null);
        }}
      />
    </div>
  );
}
