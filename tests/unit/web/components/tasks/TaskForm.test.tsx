// @vitest-environment jsdom

/**
 * Test Scope: TaskForm
 *
 * Create-Modus:
 *  1. Alle Relation-Tabs sichtbar (Aufgaben, Tickets, Kommentare, ...).
 *  2. PendingRelationList für Subtasks und List-/Board-Ansicht für Tickets im Create-Modus sichtbar.
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
  it("verwendet kanonische Aufgaben- und Ticket-Icons in Header und Pending-States", () => {
    renderWithProviders(<TaskForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    const headerIcon = document.querySelector(".lucide-list-todo");
    expect(headerIcon).toBeInTheDocument();
    expect(headerIcon).toHaveAttribute("width", "20");
    expect(headerIcon).toHaveAttribute("height", "20");

    clickTab("Subtasks");
    expect(screen.getByText("Keine Subtasks vorgemerkt")).toBeInTheDocument();
    expect(document.querySelector(".lucide-list-todo")).toBeInTheDocument();

    clickTab("Tickets");
    expect(screen.getByText("Keine Tickets")).toBeInTheDocument();
    expect(document.querySelector(".lucide-bug")).toBeInTheDocument();
    expect(document.querySelector(".lucide-clipboard-list")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Neues Ticket" }));
    const ticketDraftIcon = document.querySelector(".lucide-bug[width='20']");
    expect(ticketDraftIcon).toBeInTheDocument();
  });

  it("verdrahtet Body, Parent-Kontext und Sidebar-Felder mit Submit-Payload", async () => {
    const onAutoSave = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<TaskForm open task={task} onSubmit={vi.fn()} onAutoSave={onAutoSave} onClose={vi.fn()} />);

    const sidebar = screen.getByTestId("form-sidebar");
    const sidebarSelects = within(sidebar).getAllByRole("combobox");
    const parentContext = screen.getByTestId("parent-context-field");
    expect(parentContext).toHaveTextContent("PROJ-30");
    expect(parentContext).toHaveTextContent("Projekt Alpha");
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

    await waitFor(() =>
      expect(onAutoSave).toHaveBeenCalledWith(
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
    const onAutoSave = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<TaskForm open task={task} onSubmit={vi.fn()} onAutoSave={onAutoSave} onClose={vi.fn()} />);

    expect(screen.getByTestId("task-description-view")).toHaveValue(task.description);
    fireEvent.change(screen.getByTestId("task-description-view"), { target: { value: "<p>Aufgabe aktualisiert</p>" } });

    await waitFor(() => expect(onAutoSave).toHaveBeenCalledWith(expect.objectContaining({ description: "<p>Aufgabe aktualisiert</p>" })));
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

  it("zeigt im Tickets-Tab die lokale List-/Board-Ansicht statt OwnerTicketBoard", () => {
    renderWithProviders(<TaskForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Tickets");

    expect(screen.getByText("Keine Tickets")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Neues Ticket" })).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "Anlegen" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Anlegen" }));
    clickTab("Tickets");
    fireEvent.click(screen.getByRole("button", { name: "Verknüpfen" }));
    fireEvent.click(screen.getByRole("button", { name: "Ticket wählen" }));
    clickTab("Kommentare");
    addPendingComment("Task-Kommentar");
    clickTab("Notizen");
    fireEvent.click(screen.getByRole("button", { name: "Neue Notiz" }));
    // Der Subtask-Draft-Dialog bleibt im Create-Modus offen, daher matcht /Titel/ mehrfach.
    // Das Titel-Feld gezielt im Notiz-Dialog ansprechen (Modal-Overlay zum Header "Neue Notiz").
    const noteDialog = screen.getByRole("heading", { name: "Neue Notiz" }).closest("div.fixed") as HTMLElement;
    expect(noteDialog).not.toBeNull();
    fireEvent.change(noteDialog.querySelector("input[required]") as HTMLInputElement, { target: { value: "Task-Notiz" } });
    fireEvent.click(within(noteDialog).getByRole("button", { name: "Hinzufügen" }));
    clickTab("Dateien");
    fireEvent.change(getFileInput(container), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Aufgabe anlegen" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Neue Aufgabe",
          status: "in_progress",
          pendingSubtasks: [{ title: "Subtask im Create", description: null, status: "active", priority: "medium" }],
          pendingTickets: [{ kind: "existing", ticket }],
          pendingComments: [{ text: "Task-Kommentar" }],
          pendingNotes: [{ title: "Task-Notiz", contentJson: { html: "" } }],
          pendingFiles: [{ file, previewUrl: undefined, librarySelection: "document-library" }]
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
    fireEvent.click(screen.getByRole("button", { name: "Anlegen" }));
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

  it("Details-Tab nutzt Flex-Fill-Layout unabhängig von der Variante", () => {
    renderWithProviders(<TaskForm open task={task} onSubmit={vi.fn()} onClose={vi.fn()} />);

    // Fill-Kette: der scrollende Content-Wrapper (overflow-auto) hält per flex-1 die Höhe,
    // das innere min-h-full-flex-col-Div reicht sie an die fill-Section weiter.
    const fillContainer = screen.getByDisplayValue(task.title).closest("section")?.parentElement;
    expect(fillContainer).toHaveClass("flex", "flex-col", "min-h-full");
    const contentWrapper = fillContainer?.parentElement;
    expect(contentWrapper).toHaveClass("flex-1", "overflow-auto");

    // FormField Beschreibung hat flex-Layout (fill=true), nicht grid
    const descriptionField = screen.getByTestId("task-description-view").parentElement;
    expect(descriptionField).toHaveClass("flex");
    expect(descriptionField).not.toHaveClass("grid");
  });
});
