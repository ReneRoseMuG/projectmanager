import type { WikiPage as WikiPageType, WikiPageInput, WikiPageUpdate } from "@taskmanager/shared-types";
import { FileText, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { EmptyState } from "../components/ui/EmptyState";
import { TaskListSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";
import { WikiBreadcrumb } from "../components/wiki/WikiBreadcrumb";
import { WikiPageDetail } from "../components/wiki/WikiPageDetail";
import { WikiPageForm } from "../components/wiki/WikiPageForm";
import { WikiTree } from "../components/wiki/WikiTree";
import { errorMessage } from "../hooks/errors";
import { useWiki, type WikiTreeNode } from "../hooks/useWiki";

export function WikiPage() {
  const params = useParams();
  const pageId = Number(params.id);
  const activePageId = Number.isFinite(pageId) ? pageId : undefined;
  const wiki = useWiki(activePageId);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [formOpen, setFormOpen] = useState(false);
  const [formParent, setFormParent] = useState<WikiPageType | null>(null);
  const [editingPage, setEditingPage] = useState<WikiPageType | null>(null);

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

  const savePage = async (id: number, input: WikiPageUpdate) => {
    try {
      const expectedVersion = wiki.page?.id === id ? wiki.page.version : input.expectedVersion;
      await wiki.updateWikiPage(id, { ...input, expectedVersion });
      showToast({ tone: "success", title: "Wiki-Seite gespeichert" });
    } catch (wikiError) {
      showToast({ tone: "error", title: "Wiki-Seite konnte nicht gespeichert werden", message: errorMessage(wikiError) });
      throw wikiError;
    }
  };

  const submitForm = async (input: WikiPageInput) => {
    try {
      if (editingPage) {
        await wiki.updateWikiPage(editingPage.id, { ...input, expectedVersion: editingPage.version });
        showToast({ tone: "success", title: "Wiki-Seite gespeichert" });
      } else {
        const created = await wiki.createWikiPage(input);
        showToast({ tone: "success", title: "Wiki-Seite erstellt" });
        navigate(`/wiki/${created.id}`);
      }
    } catch (wikiError) {
      showToast({ tone: "error", title: "Wiki-Seite konnte nicht gespeichert werden", message: errorMessage(wikiError) });
      throw wikiError;
    }
  };

  const deletePage = async (page: WikiPageType) => {
    const approved = await confirm({
      title: "Wiki-Seite löschen?",
      body: `Die Seite "${page.title}" wird entfernt.`,
      severity: "danger",
      confirmLabel: "Löschen"
    });
    if (!approved) {
      return;
    }
    try {
      await wiki.removeWikiPage(page.id);
      showToast({ tone: "success", title: "Wiki-Seite gelöscht" });
      navigate("/wiki");
    } catch (wikiError) {
      showToast({ tone: "error", title: "Wiki-Seite konnte nicht gelöscht werden", message: errorMessage(wikiError) });
    }
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Wiki</h1>
          <p className="text-sm text-slate-600">Projektwissen und Dokumentation</p>
        </div>
        <Button variant="primary" icon={<Plus size={17} />} onClick={() => openCreate(null)}>
          Neue Seite
        </Button>
      </header>

      {wiki.loading ? (
        <TaskListSkeleton />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
          <WikiTree tree={wiki.tree} onCreate={openCreate} />
          <div className="grid content-start gap-4">
            {wiki.error ? <div className="rounded-lg border border-line bg-white p-4 text-sm text-crimson">{wiki.error}</div> : null}
            <WikiBreadcrumb items={wiki.breadcrumb} />
            {wiki.page ? (
              <WikiPageDetail page={wiki.page} onSave={savePage} onDelete={deletePage} onEditMetadata={openEditMetadata} />
            ) : (
              <EmptyState icon={<FileText size={22} />} title="Keine Wiki-Seite ausgewählt" body="Wähle links eine Seite aus oder lege eine neue Wiki-Seite an." tone="teal" variant="tinted" actions={[{ label: "Neue Seite", onClick: () => openCreate(null), primary: true, icon: <Plus size={16} /> }]} />
            )}
          </div>
        </div>
      )}

      <WikiPageForm
        open={formOpen}
        page={editingPage}
        parent={formParent}
        tree={wiki.tree}
        onSubmit={submitForm}
        onClose={() => {
          setFormOpen(false);
          setFormParent(null);
          setEditingPage(null);
        }}
      />
    </div>
  );
}
