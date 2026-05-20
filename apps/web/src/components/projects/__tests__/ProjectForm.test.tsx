// @vitest-environment jsdom

/**
 * Test Scope: ProjectForm
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
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { describe, expect, it, vi } from "vitest";
import { addPendingComment, changeInput, clickTab, feature, getFileInput, project, renderWithProviders, task, ticket } from "../../test/ownerFormTestUtils";
import { ProjectForm } from "../ProjectForm";

describe("ProjectForm", () => {
  it("bindet das RichTextInlineField an die Projektbeschreibung", async () => {
    const onSubmit = vi.fn().mockResolvedValue(project);
    renderWithProviders(<ProjectForm open project={project} onSubmit={onSubmit} onClose={vi.fn()} />);

    expect(screen.getByTestId("project-description-view")).toHaveValue(project.description);
    fireEvent.change(screen.getByTestId("project-description-view"), { target: { value: "<p>Projekt aktualisiert</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ description: "<p>Projekt aktualisiert</p>" }), []));
  });

  it("zeigt im Create-Modus alle erwarteten Verwaltungs-Tabs ohne Import", () => {
    renderWithProviders(<ProjectForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: /^Meilensteine/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Features/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Aufgaben/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Tickets/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Kommentare/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Notizen/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Dateien/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Backlog/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Import/ })).not.toBeInTheDocument();
  });

  it("zeigt im Features-Tab PendingRelationList statt ProjectFeaturePanel", () => {
    renderWithProviders(<ProjectForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Features");

    expect(screen.getByText("Keine Features vorgemerkt")).toBeInTheDocument();
    expect(screen.queryByTestId("project-feature-panel")).not.toBeInTheDocument();
  });

  it("zeigt im Aufgaben-Tab PendingRelationList statt OwnerTaskBoard", () => {
    renderWithProviders(<ProjectForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Aufgaben");

    expect(screen.getByText("Keine Aufgaben vorgemerkt")).toBeInTheDocument();
    expect(screen.queryByTestId("owner-task-board")).not.toBeInTheDocument();
  });

  it("zeigt im Tickets-Tab PendingRelationList statt OwnerTicketBoard", () => {
    renderWithProviders(<ProjectForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Tickets");

    expect(screen.getByText("Keine Tickets vorgemerkt")).toBeInTheDocument();
    expect(screen.queryByTestId("owner-ticket-board")).not.toBeInTheDocument();
  });

  it("zeigt PendingCommentList, PendingNoteList und PendingFileList in den Create-Tabs", () => {
    renderWithProviders(<ProjectForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Kommentare");
    expect(screen.getByText("Keine Kommentare vorgemerkt")).toBeInTheDocument();
    clickTab("Notizen");
    expect(screen.getByText("Keine Notizen vorgemerkt")).toBeInTheDocument();
    clickTab("Dateien");
    expect(screen.getByText("Keine Dateien vorgemerkt")).toBeInTheDocument();
  });

  it("zeigt im Backlog-Tab den Create-Hinweis statt Board-Formular", () => {
    renderWithProviders(<ProjectForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Backlog");

    expect(screen.getByText("Backlog ist nach dem Speichern verfügbar.")).toBeInTheDocument();
    expect(screen.queryByTestId("backlog-list")).not.toBeInTheDocument();
  });

  it("verknüpft ein bestehendes Feature lokal ohne Submit", () => {
    const onSubmit = vi.fn();
    renderWithProviders(<ProjectForm open onSubmit={onSubmit} onClose={vi.fn()} />);

    clickTab("Features");
    fireEvent.click(screen.getByRole("button", { name: "Verknüpfen" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Verknüpfen" }).at(-1) as HTMLElement);

    expect(screen.getByText(feature.title)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("erstellt und entfernt einen Aufgaben-Draft lokal", () => {
    renderWithProviders(<ProjectForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Aufgaben");
    fireEvent.click(screen.getByRole("button", { name: "Neu erstellen" }));
    changeInput(0, "Projekt-Aufgabe Pending");
    fireEvent.click(screen.getByRole("button", { name: "Vormerken" }));
    expect(screen.getByText("Projekt-Aufgabe Pending")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Projekt-Aufgabe Pending entfernen" }));
    expect(screen.queryByText("Projekt-Aufgabe Pending")).not.toBeInTheDocument();
  });

  it("übergibt alle Pending-Daten nach Create an onPostCreate", async () => {
    const createdProject = { ...project, id: 222, name: "Neues Projekt" };
    const onSubmit = vi.fn().mockResolvedValue(createdProject);
    const onPostCreate = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const file = new File(["project"], "project.txt", { type: "text/plain" });
    const { container } = renderWithProviders(<ProjectForm open onSubmit={onSubmit} onPostCreate={onPostCreate} onClose={onClose} />);

    changeInput(0, "Neues Projekt");
    clickTab("Features");
    fireEvent.click(screen.getByRole("button", { name: "Verknüpfen" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Verknüpfen" }).at(-1) as HTMLElement);
    clickTab("Aufgaben");
    fireEvent.click(screen.getByRole("button", { name: "Verknüpfen" }));
    fireEvent.click(screen.getByRole("button", { name: "Aufgabe wählen" }));
    clickTab("Tickets");
    fireEvent.click(screen.getByRole("button", { name: "Verknüpfen" }));
    fireEvent.click(screen.getByRole("button", { name: "Ticket wählen" }));
    clickTab("Kommentare");
    addPendingComment("Projekt-Kommentar");
    clickTab("Notizen");
    fireEvent.click(screen.getByRole("button", { name: "Neue Notiz" }));
    fireEvent.change(screen.getAllByRole("textbox").at(-1) as HTMLElement, { target: { value: "Projekt-Notiz" } });
    fireEvent.click(screen.getByRole("button", { name: "Hinzufügen" }));
    clickTab("Dateien");
    fireEvent.change(getFileInput(container), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Projekt anlegen" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "Neues Projekt" }), []));
    expect(onPostCreate).toHaveBeenCalledWith(
      createdProject.id,
      expect.objectContaining({
        featureIds: [feature.id],
        tasks: [{ kind: "existing", task }],
        tickets: [{ kind: "existing", ticket }],
        comments: [{ text: "Projekt-Kommentar" }],
        notes: [{ title: "Projekt-Notiz", contentJson: {} }],
        files: [{ file, previewUrl: undefined }]
      })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("setzt Pending-Listen nach Schließen und erneutem Öffnen zurück", () => {
    const { rerender } = renderWithProviders(<ProjectForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Aufgaben");
    fireEvent.click(screen.getByRole("button", { name: "Neu erstellen" }));
    changeInput(0, "Reset Projekt-Aufgabe");
    fireEvent.click(screen.getByRole("button", { name: "Vormerken" }));
    expect(screen.getByText("Reset Projekt-Aufgabe")).toBeInTheDocument();

    rerender(<ProjectForm open={false} onSubmit={vi.fn()} onClose={vi.fn()} />);
    rerender(<ProjectForm open onSubmit={vi.fn()} onClose={vi.fn()} />);
    clickTab("Aufgaben");

    expect(screen.queryByText("Reset Projekt-Aufgabe")).not.toBeInTheDocument();
    expect(screen.getByText("Keine Aufgaben vorgemerkt")).toBeInTheDocument();
  });

  it("zeigt im Edit-Modus OwnerTaskBoard und OwnerTicketBoard", () => {
    renderWithProviders(<ProjectForm open project={project} onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Aufgaben");
    expect(screen.getByTestId("owner-task-board")).toHaveTextContent(`project:${project.id}`);
    clickTab("Tickets");
    expect(screen.getByTestId("owner-ticket-board")).toHaveTextContent(`project:${project.id}`);
  });

  it("behält im Meilenstein-Tab die Listenansicht nach Tabwechsel", () => {
    renderWithProviders(<ProjectForm open project={project} onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Meilensteine");
    fireEvent.click(screen.getByRole("button", { name: "Liste" }));
    expect(screen.getByRole("button", { name: "Liste" })).toHaveClass("bg-steel-700");

    clickTab("Features");
    clickTab("Meilensteine");

    expect(screen.getByRole("button", { name: "Liste" })).toHaveClass("bg-steel-700");
  });

  it("zeigt im Edit-Modus CommentThread, NoteList, AttachmentList, Backlog und Import", () => {
    renderWithProviders(<ProjectForm open project={project} onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Kommentare");
    expect(screen.getByTestId("comment-thread")).toHaveTextContent("Projekt:1");
    clickTab("Notizen");
    expect(screen.getByTestId("note-list")).toHaveTextContent("1");
    clickTab("Dateien");
    expect(screen.getByTestId("attachment-uploader")).toBeInTheDocument();
    expect(screen.getByTestId("attachment-list")).toHaveTextContent("1");
    clickTab("Backlog");
    expect(screen.getByTestId("backlog-list")).toHaveTextContent("0");
    clickTab("Import");
    expect(screen.getByTestId("wiki-import-panel")).toBeInTheDocument();
  });

  it("zeigt im Edit-Modus den 'In neuem Tab öffnen'-Button, wenn onOpenInTab übergeben wird", () => {
    renderWithProviders(<ProjectForm open project={project} onSubmit={vi.fn()} onClose={vi.fn()} onOpenInTab={vi.fn()} />);

    expect(screen.getByRole("button", { name: "In neuem Tab öffnen" })).toBeInTheDocument();
  });

  it("zeigt im Edit-Modus keinen 'In neuem Tab öffnen'-Button, wenn onOpenInTab fehlt", () => {
    renderWithProviders(<ProjectForm open project={project} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "In neuem Tab öffnen" })).not.toBeInTheDocument();
  });
});
