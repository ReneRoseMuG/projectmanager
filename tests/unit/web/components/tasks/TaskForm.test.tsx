// @vitest-environment jsdom

/**
 * Test Scope: TaskForm
 *
 * Create-Modus:
 *  1. Alle Relation-Tabs sichtbar (Aufgaben, Tickets, Kommentare, ...).
 *  2. PendingRelationList in Relation-Tabs sichtbar (kein Board, kein API-Aufruf).
 *  3. PendingCommentList im Kommentare-Tab sichtbar.
 *  4. PendingFileList im Dateien-Tab sichtbar (sofern Tab vorhanden).
 *  5. Verknüpfen → kein API-Aufruf vor Submit.
 *  6. Neu erstellen → Draft erscheint in Pending-Liste.
 *  7. Pending-Item entfernen → aus Liste verschwunden.
 *  8. Submit → onSubmit aufgerufen → onPostCreate mit allen Pending-Daten aufgerufen.
 *  9. Schließen + neu öffnen → alle Pending-Listen leer (State-Reset).
 *
 * Edit-Modus:
 * 10. OwnerTaskBoard / OwnerTicketBoard in Relation-Tabs sichtbar.
 * 11. CommentThread im Kommentare-Tab sichtbar.
 * 12. AttachmentList im Dateien-Tab sichtbar (sofern Tab vorhanden).
 */
import { fireEvent, screen, waitFor, within } from "@testing-library/dom";
import { describe, expect, it, vi } from "vitest";
import { addPendingComment, changeInput, clickTab, getFileInput, renderWithProviders, task, ticket } from "../../../../fixtures/web/components/test/ownerFormTestUtils";
import { TaskForm } from "../../../../../apps/web/src/components/tasks/TaskForm";

describe("TaskForm", () => {
  it("verdrahtet Body, Parent-Kontext und Sidebar-Felder mit Submit-Payload", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<TaskForm open task={task} onSubmit={onSubmit} onClose={vi.fn()} />);

    const sidebar = screen.getByTestId("form-sidebar");
    const sidebarSelects = within(sidebar).getAllByRole("combobox");
    expect(screen.getByTestId("parent-context-field")).toHaveTextContent("PROJ-30");
    expect(screen.getByDisplayValue(task.title)).toBeInTheDocument();
    expect(screen.getByTestId("task-description-view")).toHaveValue(task.description);
    expect(sidebarSelects[0]).toHaveValue("todo");
    expect(sidebarSelects[1]).toHaveValue("medium");
    expect(within(sidebar).getByRole("combobox", { name: "Verantwortlich" })).toHaveValue("1");
    expect(within(sidebar).getByRole("button", { name: "Tags 0" })).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue(task.title), { target: { value: "Aufgabe Beta" } });
    fireEvent.change(sidebarSelects[0], { target: { value: "in_progress" } });
    const dueDate = sidebar.querySelector('input[type="date"]');
    expect(dueDate).not.toBeNull();
    fireEvent.change(dueDate as HTMLInputElement, { target: { value: "2026-06-20" } });
    fireEvent.change(within(sidebar).getByRole("combobox", { name: "Verantwortlich" }), { target: { value: "" } });
    fireEvent.click(within(sidebar).getByRole("button", { name: "Tags 0" }));
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Aufgabe Beta",
          status: "in_progress",
          priority: "medium",
          dueDate: "2026-06-20",
          responsibleUserId: null,
          tagIds: [90]
        })
      )
    );
  });

  it("bindet das RichTextInlineField an die Aufgabenbeschreibung", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<TaskForm open task={task} onSubmit={onSubmit} onClose={vi.fn()} />);

    expect(screen.getByTestId("task-description-view")).toHaveValue(task.description);
    fireEvent.change(screen.getByTestId("task-description-view"), { target: { value: "<p>Aufgabe aktualisiert</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ description: "<p>Aufgabe aktualisiert</p>" })));
  });

  it("stellt Bild-Upload für die Beschreibung im Edit-Modus bereit", () => {
    renderWithProviders(<TaskForm open task={task} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByTestId("task-description-view")).toHaveAttribute("data-image-upload", "enabled");
  });

  it("stellt Bild-Upload für die Beschreibung im Create-Modus bereit", () => {
    renderWithProviders(<TaskForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByTestId("task-description-view")).toHaveAttribute("data-image-upload", "enabled");
  });

  it("zeigt im Create-Modus alle erwarteten Verwaltungs-Tabs", () => {
    renderWithProviders(<TaskForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Details" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Details 0" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Subtasks/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Tickets/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Kommentare/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Notizen/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Dateien/ })).toBeInTheDocument();
  });

  it("zeigt im Subtask-Tab PendingRelationList nur mit Neu-erstellen-Aktion", () => {
    renderWithProviders(<TaskForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Subtasks");

    expect(screen.getByText("Keine Subtasks vorgemerkt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Neu erstellen" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Verknüpfen" })).not.toBeInTheDocument();
  });

  it("zeigt im Tickets-Tab PendingRelationList statt OwnerTicketBoard", () => {
    renderWithProviders(<TaskForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Tickets");

    expect(screen.getByText("Keine Tickets vorgemerkt")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Verknüpfen" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("owner-ticket-board")).not.toBeInTheDocument();
  });

  it("zeigt im Kommentare-Tab PendingCommentList", () => {
    renderWithProviders(<TaskForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Kommentare");

    expect(screen.getByText("Keine Kommentare vorgemerkt")).toBeInTheDocument();
  });

  it("zeigt im Notizen-Tab PendingNoteList", () => {
    renderWithProviders(<TaskForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Notizen");

    expect(screen.getByText("Keine Notizen vorgemerkt")).toBeInTheDocument();
  });

  it("zeigt im Dateien-Tab PendingFileList", () => {
    renderWithProviders(<TaskForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Dateien");

    expect(screen.getByText("Keine Dateien vorgemerkt")).toBeInTheDocument();
  });

  it("verknüpft ein bestehendes Ticket lokal ohne Submit", async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<TaskForm open owner={{ type: "project", id: 1 }} onSubmit={onSubmit} onClose={vi.fn()} />);

    clickTab("Tickets");
    fireEvent.click(screen.getByRole("button", { name: "Verknüpfen" }));
    fireEvent.click(screen.getByRole("button", { name: "Ticket wählen" }));

    await waitFor(() => expect(screen.getByText(ticket.title)).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("ersetzt einen nicht mehr vorhandenen Initialstatus durch den Katalog-Default", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<TaskForm open initialStatus="legacy_missing" onSubmit={onSubmit} onClose={vi.fn()} />);

    changeInput(0, "Neue Aufgabe mit Katalogstatus");
    fireEvent.click(screen.getByRole("button", { name: "Aufgabe anlegen" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ status: "active" })));
  });

  it("erstellt und entfernt einen Subtask-Draft lokal", () => {
    renderWithProviders(<TaskForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Subtasks");
    fireEvent.click(screen.getByRole("button", { name: "Neu erstellen" }));
    changeInput(0, "Subtask Pending");
    fireEvent.click(screen.getByRole("button", { name: "Vormerken" }));
    expect(screen.getByText("Subtask Pending")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Subtask Pending entfernen" }));
    expect(screen.queryByText("Subtask Pending")).not.toBeInTheDocument();
  });

  it("übergibt alle Pending-Daten im Create-Submit", async () => {
    const createdTask = { ...task, id: 404, title: "Neue Aufgabe" };
    const onSubmit = vi.fn().mockResolvedValue(createdTask);
    const onClose = vi.fn();
    const file = new File(["task"], "task.txt", { type: "text/plain" });
    const { container } = renderWithProviders(<TaskForm open owner={{ type: "project", id: 1 }} initialStatus="in_progress" onSubmit={onSubmit} onClose={onClose} />);

    changeInput(0, "Neue Aufgabe");
    clickTab("Subtasks");
    fireEvent.click(screen.getByRole("button", { name: "Neu erstellen" }));
    changeInput(0, "Subtask im Create");
    fireEvent.click(screen.getByRole("button", { name: "Vormerken" }));
    clickTab("Tickets");
    fireEvent.click(screen.getByRole("button", { name: "Verknüpfen" }));
    fireEvent.click(screen.getByRole("button", { name: "Ticket wählen" }));
    clickTab("Kommentare");
    addPendingComment("Task-Kommentar");
    clickTab("Notizen");
    fireEvent.click(screen.getByRole("button", { name: "Neue Notiz" }));
    fireEvent.change(screen.getAllByRole("textbox").at(-1) as HTMLElement, { target: { value: "Task-Notiz" } });
    fireEvent.click(screen.getByRole("button", { name: "Hinzufügen" }));
    clickTab("Dateien");
    fireEvent.change(getFileInput(container), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Aufgabe anlegen" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Neue Aufgabe",
          status: "in_progress",
          pendingSubtasks: [{ title: "Subtask im Create", status: "active", priority: "medium" }],
          pendingTickets: [{ kind: "existing", ticket }],
          pendingComments: [{ text: "Task-Kommentar" }],
          pendingNotes: [{ title: "Task-Notiz", contentJson: {} }],
          pendingFiles: [{ file, previewUrl: undefined }]
        })
      )
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("setzt Pending-Listen nach Schließen und erneutem Öffnen zurück", () => {
    const { rerender } = renderWithProviders(<TaskForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Subtasks");
    fireEvent.click(screen.getByRole("button", { name: "Neu erstellen" }));
    changeInput(0, "Reset-Subtask");
    fireEvent.click(screen.getByRole("button", { name: "Vormerken" }));
    expect(screen.getByText("Reset-Subtask")).toBeInTheDocument();

    rerender(<TaskForm open={false} onSubmit={vi.fn()} onClose={vi.fn()} />);
    rerender(<TaskForm open onSubmit={vi.fn()} onClose={vi.fn()} />);
    clickTab("Subtasks");

    expect(screen.queryByText("Reset-Subtask")).not.toBeInTheDocument();
    expect(screen.getByText("Keine Subtasks vorgemerkt")).toBeInTheDocument();
  });

  it("zeigt im Edit-Modus OwnerTicketBoard im Tickets-Tab", () => {
    renderWithProviders(<TaskForm open task={task} onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Tickets");

    expect(screen.getByTestId("owner-ticket-board")).toHaveTextContent(`task:${task.id}`);
  });

  it("behält den aktiven Tab bei einem Aufgaben-Refetch", () => {
    const { rerender } = renderWithProviders(<TaskForm open task={task} onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Tickets");
    expect(screen.getByTestId("owner-ticket-board")).toHaveTextContent(`task:${task.id}`);

    rerender(<TaskForm open task={{ ...task, title: "Aufgabe Refetch" }} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByTestId("owner-ticket-board")).toHaveTextContent(`task:${task.id}`);
  });

  it("zeigt im Edit-Modus CommentThread, NoteList und AttachmentList", () => {
    renderWithProviders(<TaskForm open task={task} onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Kommentare");
    expect(screen.getByTestId("comment-thread")).toHaveTextContent("Aufgabe:1");
    clickTab("Notizen");
    expect(screen.getByTestId("note-list")).toHaveTextContent("1");
    clickTab("Dateien");
    expect(screen.getByTestId("attachment-uploader")).toBeInTheDocument();
    expect(screen.getByTestId("attachment-list")).toHaveTextContent("1");
  });

  it("zeigt im Edit-Modus den 'In neuem Tab öffnen'-Button, wenn onOpenInTab übergeben wird", () => {
    renderWithProviders(<TaskForm open task={task} onSubmit={vi.fn()} onClose={vi.fn()} onOpenInTab={vi.fn()} />);

    expect(screen.getByRole("button", { name: "In neuem Tab öffnen" })).toBeInTheDocument();
  });

  it("zeigt im Edit-Modus keinen 'In neuem Tab öffnen'-Button, wenn onOpenInTab fehlt", () => {
    renderWithProviders(<TaskForm open task={task} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "In neuem Tab öffnen" })).not.toBeInTheDocument();
  });
});
