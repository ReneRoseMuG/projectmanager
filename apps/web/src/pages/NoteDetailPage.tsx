import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { objectReference } from "../lib/references";
import { NoteEditor } from "../components/notes/NoteEditor";
import { DetailPageSkeleton } from "../components/ui/Skeleton";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useNoteDetail } from "../hooks/useNoteDetail";
import { withStandaloneView } from "../utils/standalone";

function noteStandalonePath(noteId: number, returnTo: string): string {
  const params = new URLSearchParams({ returnTo });
  return withStandaloneView(`/notes/${noteId}?${params.toString()}`);
}

export function NoteDetailPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const noteId = params.id === undefined ? null : Number(params.id);
  const validNoteId = noteId !== null && Number.isFinite(noteId) ? noteId : null;
  const detail = useNoteDetail(validNoteId);
  const returnTo = searchParams.get("returnTo") ?? (searchParams.get("standalone") === "1" ? withStandaloneView("/") : "/");

  useDocumentTitle(detail.note ? `[Notiz] ${detail.note.title}` : "[Notiz]");

  const closePage = () => navigate(returnTo);
  const openInTab =
    validNoteId !== null
      ? () => {
          window.open(noteStandalonePath(validNoteId, returnTo), "_blank");
          navigate(returnTo);
        }
      : undefined;

  if (validNoteId === null) {
    return (
      <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-steel-600">
        Notiz nicht gefunden
      </div>
    );
  }

  if (detail.loading) {
    return <DetailPageSkeleton />;
  }

  if (!detail.note) {
    return (
      <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-steel-600">
        Notiz nicht gefunden
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
      <NoteEditor
        open
        note={detail.note}
        variant="page"
        onSave={detail.updateNote}
        onClose={closePage}
        onOpenInTab={openInTab}
        objectReference={objectReference("note", detail.note.id)}
      />
    </div>
  );
}
