import type { Note } from "@taskmanager/shared-types";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { NotesListFilter } from "../api/notes";
import { NoteList } from "../components/notes/NoteList";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { LoadMoreIndicator } from "../components/ui/LoadMoreIndicator";
import { PageHero } from "../components/ui/PageHero";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessageAsync } from "../hooks/errors";
import { useAllNotes } from "../hooks/useAllNotes";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useHasPermission } from "../hooks/usePermissions";
import { useStandaloneView } from "../hooks/useStandaloneView";
import { withStandaloneView } from "../utils/standalone";

export function NotesPage() {
  const [search, setSearch] = useState("");
  const filter = useMemo<NotesListFilter>(() => {
    const next: NotesListFilter = {};
    if (search.trim()) {
      next.q = search.trim();
    }
    return next;
  }, [search]);

  // Progressives Nachladen: Der queryKey enthält den Filter, ein Filterwechsel startet die
  // Liste automatisch neu — kein manueller Reset nötig.
  const notes = useAllNotes(filter);
  const navigate = useNavigate();
  const location = useLocation();
  const standalone = useStandaloneView();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const canDeleteNotes = useHasPermission("notes", "delete");
  const currentReturnTo = `${location.pathname}${location.search}`;
  const targetForMode = (to: string) => (standalone ? withStandaloneView(to) : to);

  useDocumentTitle("Notizen");

  const openNote = (note: Note) => {
    const params = new URLSearchParams({ returnTo: currentReturnTo });
    navigate(targetForMode(`/notes/${note.id}?${params.toString()}`));
  };

  const deleteNote = async (note: Note) => {
    const approved = await confirm({
      title: "Notiz löschen?",
      body: note.title,
      severity: "danger",
      confirmLabel: "Löschen",
    });
    if (!approved) {
      return;
    }

    try {
      await notes.removeNote(note.id);
      showToast({ tone: "success", title: "Notiz gelöscht" });
    } catch (noteError) {
      showToast({
        tone: "error",
        title: "Notiz konnte nicht gelöscht werden",
        message: await errorMessageAsync(noteError),
      });
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <PageHero
        variant="list"
        title="Notizen"
        subtitle={`${notes.total} Einträge`}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-4 pt-4 md:px-5 md:pt-5">
        {notes.error ? (
          <div className="rounded-md border border-crimson bg-crimson/10 p-3 text-sm text-crimson">
            {notes.error}
          </div>
        ) : null}

        <NoteList
          notes={notes.notes}
          loading={notes.loading}
          onCreate={async () => undefined}
          onEdit={openNote}
          onDelete={deleteNote}
          canCreate={false}
          canDelete={canDeleteNotes}
          search={search}
          onSearchChange={setSearch}
          emptyTitle="Keine Notizen"
          emptyBody="Notizen erscheinen hier, sobald sie an Projekten, Aufgaben, Tickets, Wiki-Seiten oder der persönlichen Planung angelegt wurden."
          footer={<LoadMoreIndicator loadedCount={notes.loadedCount} total={notes.total} loadingMore={notes.loadingMore} />}
        />
      </div>
    </div>
  );
}
