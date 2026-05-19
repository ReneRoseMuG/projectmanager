// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - CommentThread rendert Empty-, Listen-, Create- und Delete-Zustände.
 * - Leere Kommentartexte werden nicht gesendet.
 *
 * Fehlerfälle:
 * - Delete muss die konkrete Kommentar-ID verwenden.
 * - EmptyState muss den Entity-Kontext anzeigen.
 *
 * Ziel:
 * Den generischen Kommentar-Organism gegen Regressionsfehler bei Rendering und Callback-Payloads absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommentThread } from "../CommentThread";

vi.mock("../RichTextEditor", () => ({
  RichTextEditor({ content, onChange, placeholder, readOnly }: { content: string; onChange: (value: string) => void; placeholder?: string; readOnly?: boolean }) {
    if (readOnly) {
      return <div data-testid="readonly-comment" dangerouslySetInnerHTML={{ __html: content }} />;
    }

    return <textarea aria-label={placeholder ?? "Editor"} value={content} onChange={(event) => onChange(event.currentTarget.value)} />;
  }
}));

const comments = [
  {
    id: 1,
    taskId: 10,
    entityType: "task" as const,
    entityId: 10,
    owners: [{ type: "task" as const, id: 10 }],
    body: "<p>Erster Kommentar</p>",
    createdAt: "2026-05-17T08:00:00.000Z",
    updatedAt: "2026-05-17T08:00:00.000Z",
    version: 1
  },
  {
    id: 2,
    taskId: 10,
    entityType: "task" as const,
    entityId: 10,
    owners: [{ type: "task" as const, id: 10 }],
    body: "<p>Zweiter Kommentar</p>",
    createdAt: "2026-05-17T09:00:00.000Z",
    updatedAt: "2026-05-17T09:00:00.000Z",
    version: 1
  }
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CommentThread", () => {
  it("zeigt EmptyState wenn comments=[]", () => {
    render(<CommentThread comments={[]} onCreate={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("Noch keine Kommentare")).toBeInTheDocument();
  });

  it("rendert alle übergebenen Kommentare", () => {
    render(<CommentThread comments={comments} onCreate={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("Erster Kommentar")).toBeInTheDocument();
    expect(screen.getByText("Zweiter Kommentar")).toBeInTheDocument();
  });

  it("onCreate wird mit body aufgerufen beim Absenden", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<CommentThread comments={[]} onCreate={onCreate} onDelete={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Kommentar schreiben"), { target: { value: "<p>Neu</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Kommentar" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith({ body: "<p>Neu</p>" }));
  });

  it("onCreate mit leerem body wird nicht aufgerufen", () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<CommentThread comments={[]} onCreate={onCreate} onDelete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Kommentar" }));

    expect(onCreate).not.toHaveBeenCalled();
  });

  it("onDelete wird mit korrekter id aufgerufen", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<CommentThread comments={comments} onCreate={vi.fn()} onDelete={onDelete} />);

    const deleteButton = screen.getAllByRole("button", { name: "Löschen" })[1];
    expect(deleteButton).toBeDefined();
    fireEvent.click(deleteButton as HTMLElement);

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(2));
  });

  it("entityLabel erscheint im EmptyState-Text", () => {
    render(<CommentThread comments={[]} onCreate={vi.fn()} onDelete={vi.fn()} entityLabel="Projekt" />);

    expect(screen.getByText("Kommentare und Rückfragen zu diesem Projekt erscheinen hier.")).toBeInTheDocument();
  });
});
