// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - CommentThread arbeitet über den Entity-Comment-Hook mit der API-Schicht zusammen.
 * - Laden, Erstellen und Löschen aktualisieren die Liste.
 *
 * Fehlerfälle:
 * - API-Fehler beim Laden werden sichtbar gemacht.
 *
 * Ziel:
 * Den Kommentar-Rollout für polymorphe Domain-Objekte gegen Integrationsfehler zwischen Hook, API und UI absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import type { Comment } from "@taskmanager/shared-types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEntityComments } from "../../../hooks/useEntityComments";
import { createEntityComment, deleteEntityComment, getEntityComments } from "../../../api/comments";
import { CommentThread } from "../CommentThread";

vi.mock("../RichTextEditor", () => ({
  RichTextEditor({ content, onChange, placeholder, readOnly }: { content: string; onChange: (value: string) => void; placeholder?: string; readOnly?: boolean }) {
    if (readOnly) {
      return <div data-testid="readonly-comment" dangerouslySetInnerHTML={{ __html: content }} />;
    }

    return <textarea aria-label={placeholder ?? "Editor"} value={content} onChange={(event) => onChange(event.currentTarget.value)} />;
  }
}));

vi.mock("../../../api/comments", () => ({
  getEntityComments: vi.fn(),
  createEntityComment: vi.fn(),
  deleteEntityComment: vi.fn()
}));

const apiMocks = vi.mocked({ getEntityComments, createEntityComment, deleteEntityComment });

const initialComment: Comment = {
  id: 1,
  taskId: null,
  entityType: "project",
  entityId: 7,
  owners: [{ type: "project", id: 7 }],
  body: "<p>Bestehender Kommentar</p>",
  createdAt: "2026-05-17T08:00:00.000Z",
  updatedAt: "2026-05-17T08:00:00.000Z",
  version: 1
};

const createdComment: Comment = {
  id: 2,
  taskId: null,
  entityType: "project",
  entityId: 7,
  owners: [{ type: "project", id: 7 }],
  body: "<p>Neu</p>",
  createdAt: "2026-05-17T09:00:00.000Z",
  updatedAt: "2026-05-17T09:00:00.000Z",
  version: 1
};

function Harness() {
  const comments = useEntityComments("project", 7);

  if (comments.loading) {
    return <p>Lädt</p>;
  }

  return (
    <div>
      {comments.error ? <p role="alert">{comments.error}</p> : null}
      <CommentThread comments={comments.comments} entityLabel="Projekt" onCreate={comments.createComment} onDelete={comments.removeComment} />
    </div>
  );
}

function renderHarness() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Harness />
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CommentThread API Integration", () => {
  it("lädt Kommentare beim Öffnen", async () => {
    apiMocks.getEntityComments.mockResolvedValue([initialComment]);

    renderHarness();

    await waitFor(() => expect(screen.getByText("Bestehender Kommentar")).toBeInTheDocument());
    expect(apiMocks.getEntityComments).toHaveBeenCalledWith("project", 7);
  });

  it("erstellt Kommentar und aktualisiert die Liste", async () => {
    apiMocks.getEntityComments.mockResolvedValueOnce([]).mockResolvedValueOnce([createdComment]);
    apiMocks.createEntityComment.mockResolvedValue(createdComment);

    renderHarness();

    await waitFor(() => expect(screen.getByText("Noch keine Kommentare")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Kommentar schreiben"), { target: { value: "<p>Neu</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Kommentar" }));

    await waitFor(() => expect(screen.getByText("Neu")).toBeInTheDocument());
    expect(apiMocks.createEntityComment).toHaveBeenCalledWith("project", 7, { body: "<p>Neu</p>" });
  });

  it("löscht Kommentar und aktualisiert die Liste", async () => {
    apiMocks.getEntityComments.mockResolvedValueOnce([initialComment]).mockResolvedValueOnce([]);
    apiMocks.deleteEntityComment.mockResolvedValue(undefined);

    renderHarness();

    await waitFor(() => expect(screen.getByText("Bestehender Kommentar")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Löschen" }));

    await waitFor(() => expect(screen.getByText("Noch keine Kommentare")).toBeInTheDocument());
    expect(apiMocks.deleteEntityComment).toHaveBeenCalledWith("project", 7, 1);
  });

  it("zeigt API-Fehler beim Laden", async () => {
    apiMocks.getEntityComments.mockRejectedValue(new Error("API nicht erreichbar"));

    renderHarness();

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("API nicht erreichbar"));
  });
});
