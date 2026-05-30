// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - CommentThread arbeitet über den Entity-Comment-Hook mit der API-Schicht zusammen.
 * - Laden, Erstellen, Aktualisieren und Löschen aktualisieren die Liste.
 * - Kommentar-Updates laufen über das Bearbeitungsmodal.
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
import { useEntityComments } from "../../../../../apps/web/src/hooks/useEntityComments";
import { createEntityComment, deleteEntityComment, getEntityComments, updateComment } from "../../../../../apps/web/src/api/comments";
import { CommentThread } from "../../../../../apps/web/src/components/ui/CommentThread";

vi.mock("../../../../../apps/web/src/hooks/usePermissions", () => ({
  useHasPermission: () => true
}));

vi.mock("../../../../../apps/web/src/components/ui/rich-text-inline-field", () => ({
  RichTextInlineField({ value, onChange, placeholder, readOnly, valueFormat, testIdPrefix }: { value: string | null | undefined; onChange: (value: string) => void; placeholder?: string; readOnly?: boolean; valueFormat?: "html" | "markdown"; testIdPrefix?: string }) {
    if (readOnly) {
      return (
        <div data-testid={testIdPrefix ? `${testIdPrefix}-view` : undefined}>
          {valueFormat === "markdown" ? <div>{value}</div> : <div dangerouslySetInnerHTML={{ __html: value ?? "" }} />}
        </div>
      );
    }

    return (
      <div data-testid={testIdPrefix ? `${testIdPrefix}-view` : undefined}>
        {valueFormat === "markdown" ? <div>{value}</div> : <div dangerouslySetInnerHTML={{ __html: value ?? "" }} />}
        <textarea aria-label={placeholder ?? "Kommentar bearbeiten"} value={value ?? ""} onChange={(event) => onChange(event.currentTarget.value)} />
      </div>
    );
  }
}));

vi.mock("../../../../../apps/web/src/api/comments", () => ({
  getEntityComments: vi.fn(),
  createEntityComment: vi.fn(),
  updateComment: vi.fn(),
  deleteEntityComment: vi.fn()
}));

const apiMocks = vi.mocked({ getEntityComments, createEntityComment, updateComment, deleteEntityComment });

const initialComment: Comment = {
  id: 1,
  owners: [{ type: "project", id: 7 }],
  body: "<p>Bestehender Kommentar</p>",
  createdAt: "2026-05-17T08:00:00.000Z",
  updatedAt: "2026-05-17T08:00:00.000Z",
  version: 1
};

const createdComment: Comment = {
  id: 2,
  owners: [{ type: "project", id: 7 }],
  body: "<p>Neu</p>",
  createdAt: "2026-05-17T09:00:00.000Z",
  updatedAt: "2026-05-17T09:00:00.000Z",
  version: 1
};

const updatedComment: Comment = {
  ...initialComment,
  body: "<p>Aktualisiert</p>",
  updatedAt: "2026-05-17T10:00:00.000Z",
  version: 2
};

function Harness() {
  const comments = useEntityComments("project", 7);

  if (comments.loading) {
    return <p>Lädt</p>;
  }

  return (
    <div>
      {comments.error ? <p role="alert">{comments.error}</p> : null}
      <CommentThread comments={comments.comments} entityLabel="Projekt" onCreate={comments.createComment} onUpdate={comments.updateComment} onDelete={comments.removeComment} />
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
    fireEvent.click(screen.getByRole("button", { name: "Kommentar anlegen" }));
    fireEvent.change(screen.getByLabelText("Kommentar schreiben"), { target: { value: "<p>Neu</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Anlegen" }));

    await waitFor(() => expect(screen.getByText("Neu")).toBeInTheDocument());
    expect(apiMocks.createEntityComment).toHaveBeenCalledWith("project", 7, { body: "<p>Neu</p>" });
  });

  it("aktualisiert Kommentar und invalidiert die Liste", async () => {
    apiMocks.getEntityComments.mockResolvedValueOnce([initialComment]).mockResolvedValueOnce([updatedComment]);
    apiMocks.updateComment.mockResolvedValue(updatedComment);

    renderHarness();

    await waitFor(() => expect(screen.getByText("Bestehender Kommentar")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));
    fireEvent.change(screen.getByLabelText("Kommentar bearbeiten"), { target: { value: "<p>Aktualisiert</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(screen.getByText("Aktualisiert")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Speichern" })).not.toBeInTheDocument();
    expect(apiMocks.updateComment).toHaveBeenCalledWith(1, { body: "<p>Aktualisiert</p>", expectedVersion: 1 });
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
