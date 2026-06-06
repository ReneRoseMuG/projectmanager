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
 * 13. Meilenstein-Karten im Projekt-Tab bieten Aufgabe/Ticket-Erstellung nur mit Schreibrechten an.
 * 14. Projekt-Wiki kann im Details-Tab gesetzt, geöffnet und entfernt werden.
 *
 * Fehlerfälle:
 * - Ohne `tasks:write` und `tickets:write` dürfen die Create-Aktionen im Meilenstein-Menü nicht sichtbar sein.
 */
import { fireEvent, screen, waitFor, within } from "@testing-library/dom";
import { describe, expect, it, vi } from "vitest";
import { addPendingComment, changeInput, clickTab, feature, formTestMocks, getFileInput, project, renderWithProviders, wikiPage } from "../../../../fixtures/web/components/test/ownerFormTestUtils";
import { ProjectForm } from "../../../../../apps/web/src/components/projects/ProjectForm";

function changeTitleInForm(heading: string, value: string) {
  const form = screen.getByRole("heading", { name: heading }).closest("form");
  expect(form).not.toBeNull();
  const input = form?.querySelector("input[required]");
  expect(input).toBeDefined();
  fireEvent.change(input as HTMLInputElement, { target: { value } });
}

describe("ProjectForm", () => {
  it("rendert Details als Body plus Stammdaten-Sidebar", () => {
    renderWithProviders(<ProjectForm open project={project} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByTestId("form-sidebar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stammdaten schließen" })).toBeInTheDocument();

    const detailsBody = screen.getByDisplayValue(project.name).closest("section")?.parentElement;
    expect(detailsBody).toHaveClass("w-full");
    expect(detailsBody).not.toHaveClass("max-w-5xl");

    clickTab("Aufgaben");

    const boardBody = screen.getByTestId("owner-task-board").closest("section")?.parentElement;
    expect(boardBody).not.toHaveClass("max-w-5xl");
    expect(screen.queryByTestId("form-sidebar")).not.toBeInTheDocument();
  });

  it("verdrahtet Sidebar-Felder mit Initialdaten und Submit-Payload", async () => {
    const onAutoSave = vi.fn().mockResolvedValue(undefined);
    const datedProject = { ...project, startDate: "2026-05-01", dueDate: "2026-05-31" };
    renderWithProviders(<ProjectForm open project={datedProject} onSubmit={vi.fn()} onAutoSave={onAutoSave} onClose={vi.fn()} />);

    const sidebar = screen.getByTestId("form-sidebar");
    const sidebarSelects = within(sidebar).getAllByRole("combobox");
    expect(screen.getByDisplayValue(project.name)).toBeInTheDocument();
    expect(screen.getByTestId("project-description-view")).toHaveValue(project.description);
    expect(sidebarSelects[0]).toHaveValue("active");
    expect(within(sidebar).getByRole("combobox", { name: "Verantwortlich" })).toHaveValue("1");
    expect(within(sidebar).getByDisplayValue("2026-05-01")).toBeInTheDocument();
    expect(within(sidebar).getByDisplayValue("2026-05-31")).toBeInTheDocument();
    expect(within(sidebar).getByRole("button", { name: "Tags 0" })).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue(project.name), { target: { value: "Projekt Beta" } });
    fireEvent.change(sidebarSelects[0], { target: { value: "done" } });
    fireEvent.change(within(sidebar).getByRole("combobox", { name: "Verantwortlich" }), { target: { value: "" } });
    const dateInputs = within(sidebar).getAllByDisplayValue(/2026-05-/) as HTMLInputElement[];
    fireEvent.change(dateInputs[0], { target: { value: "2026-06-01" } });
    fireEvent.change(dateInputs[1], { target: { value: "2026-06-30" } });
    fireEvent.click(within(sidebar).getByRole("button", { name: "Tags 0" }));

    await waitFor(() =>
      expect(onAutoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Projekt Beta",
          status: "done",
          startDate: "2026-06-01",
          dueDate: "2026-06-30",
          responsibleUserId: null
        }),
        [90]
      )
    );
  });

  it("bindet das RichTextInlineField an die Projektbeschreibung", async () => {
    const onAutoSave = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<ProjectForm open project={project} onSubmit={vi.fn()} onAutoSave={onAutoSave} onClose={vi.fn()} />);

    expect(screen.getByTestId("project-description-view")).toHaveValue(project.description);
    fireEvent.change(screen.getByTestId("project-description-view"), { target: { value: "<p>Projekt aktualisiert</p>" } });

    await waitFor(() => expect(onAutoSave).toHaveBeenCalledWith(expect.objectContaining({ description: "<p>Projekt aktualisiert</p>" }), []));
  });

  it("stellt Bild-Upload für die Projektbeschreibung im Edit-Modus bereit", () => {
    renderWithProviders(<ProjectForm open project={project} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByTestId("project-description-view")).toHaveAttribute("data-image-upload", "enabled");
  });

  it("stellt Bild-Upload für die Projektbeschreibung im Create-Modus bereit", () => {
    renderWithProviders(<ProjectForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByTestId("project-description-view")).toHaveAttribute("data-image-upload", "enabled");
  });

  it("verknüpft eine Wiki-Seite im Details-Tab", async () => {
    formTestMocks.setProjectWikiPage.mockResolvedValue({
      ...project,
      wikiPageId: wikiPage.id,
      version: project.version + 1
    });
    renderWithProviders(<ProjectForm open project={project} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText("Keine Wiki-Seite verknüpft")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Wiki-Seite verknüpfen" }));
    expect(screen.getByRole("heading", { name: "Wiki-Seite verknüpfen" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Verknüpfen" }));

    await waitFor(() =>
      expect(formTestMocks.setProjectWikiPage).toHaveBeenCalledWith(
        wikiPage.id,
      ),
    );
  });

  it("zeigt die verknüpfte Wiki-Seite als Link und entfernt die Relation", async () => {
    const projectWithWiki = { ...project, wikiPageId: wikiPage.id };
    formTestMocks.setProjectWikiPage.mockResolvedValue({
      ...projectWithWiki,
      wikiPageId: null,
      version: project.version + 1
    });
    renderWithProviders(<ProjectForm open project={projectWithWiki} onSubmit={vi.fn()} onClose={vi.fn()} />);

    const wikiLink = screen.getByRole("link", { name: /Wiki Startseite/ });
    expect(wikiLink).toHaveAttribute("href", `/wiki/${wikiPage.id}`);

    fireEvent.click(
      screen.getByRole("button", {
        name: `Wiki-Seite ${wikiPage.title} entfernen`
      })
    );

    await waitFor(() =>
      expect(formTestMocks.setProjectWikiPage).toHaveBeenCalledWith(null),
    );
  });

  it("zeigt im Create-Modus alle erwarteten Verwaltungs-Tabs ohne Import", () => {
    renderWithProviders(<ProjectForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Details" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Details 0" })).not.toBeInTheDocument();
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
    expect(document.querySelector(".lucide-book-open")).toBeInTheDocument();
    expect(screen.queryByTestId("project-feature-panel")).not.toBeInTheDocument();
  });

  it("zeigt im Aufgaben-Tab PendingRelationList statt OwnerTaskBoard", () => {
    renderWithProviders(<ProjectForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Aufgaben");

    expect(screen.getByText("Keine Aufgaben vorgemerkt")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Verknüpfen" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("owner-task-board")).not.toBeInTheDocument();
  });

  it("zeigt im Tickets-Tab PendingRelationList statt OwnerTicketBoard", () => {
    renderWithProviders(<ProjectForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Tickets");

    expect(screen.getByText("Keine Tickets vorgemerkt")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Verknüpfen" })).not.toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "Neu erstellen" }));
    changeInput(0, "Projekt-Aufgabe Pending");
    fireEvent.click(screen.getByRole("button", { name: "Vormerken" }));
    clickTab("Tickets");
    fireEvent.click(screen.getByRole("button", { name: "Neu erstellen" }));
    changeInput(0, "Projekt-Ticket Pending");
    fireEvent.click(screen.getByRole("button", { name: "Vormerken" }));
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
        tasks: [{ kind: "new", draft: { title: "Projekt-Aufgabe Pending", status: "active", priority: "medium" } }],
        tickets: [{ kind: "new", draft: { title: "Projekt-Ticket Pending", type: "bug", status: "open", priority: "medium" } }],
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

  it("behält den aktiven Tab bei einem Projekt-Refetch", () => {
    const { rerender } = renderWithProviders(<ProjectForm open project={project} onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Aufgaben");
    expect(screen.getByTestId("owner-task-board")).toHaveTextContent(`project:${project.id}`);

    rerender(<ProjectForm open project={{ ...project, name: "Projekt Refetch" }} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByTestId("owner-task-board")).toHaveTextContent(`project:${project.id}`);
  });

  it("blendet Meilenstein-Create-Aktionen ohne Schreibrechte aus", () => {
    renderWithProviders(<ProjectForm open project={project} onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Meilensteine");
    fireEvent.click(screen.getByRole("button", { name: "Aktionen" }));

    expect(screen.queryByRole("menuitem", { name: "Neue Aufgabe" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Neues Ticket" })).not.toBeInTheDocument();
  });

  it("erstellt Aufgabe und Ticket aus dem Meilenstein-Menü mit Schreibrechten", async () => {
    formTestMocks.hasPermission.mockImplementation(
      (resource: string, action: string) =>
        (resource === "tasks" || resource === "tickets") && action === "write",
    );
    renderWithProviders(<ProjectForm open project={project} onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Meilensteine");
    fireEvent.click(screen.getByRole("button", { name: "Aktionen" }));
    expect(screen.getByRole("menuitem", { name: "Neue Aufgabe" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Neues Ticket" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitem", { name: "Neue Aufgabe" }));
    expect(screen.getByRole("heading", { name: "Aufgabe anlegen" })).toBeInTheDocument();
    changeTitleInForm("Aufgabe anlegen", "Aufgabe aus Projekt-Meilenstein");
    fireEvent.click(screen.getByRole("button", { name: "Aufgabe anlegen" }));

    await waitFor(() =>
      expect(formTestMocks.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Aufgabe aus Projekt-Meilenstein" }),
      ),
    );
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Aufgabe anlegen" })).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Aktionen" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Neues Ticket" }));
    expect(screen.getByRole("heading", { name: "Ticket" })).toBeInTheDocument();
    changeTitleInForm("Ticket", "Ticket aus Projekt-Meilenstein");
    fireEvent.click(screen.getByRole("button", { name: "Ticket anlegen" }));

    await waitFor(() =>
      expect(formTestMocks.createTicket).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Ticket aus Projekt-Meilenstein" }),
      ),
    );
  });

  it("behält im Meilenstein-Tab die Listenansicht nach Tabwechsel", () => {
    renderWithProviders(<ProjectForm open project={project} onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Meilensteine");
    fireEvent.click(screen.getByRole("button", { name: "Liste" }));
    expect(screen.getByRole("button", { name: "Liste" })).toHaveClass("border-steel-900", "bg-steel-900", "text-white");

    clickTab("Features");
    clickTab("Meilensteine");

    expect(screen.getByRole("button", { name: "Liste" })).toHaveClass("border-steel-900", "bg-steel-900", "text-white");
  });

  it("zeigt im Edit-Modus CommentThread, NoteList, AttachmentList und Backlog ohne Import", () => {
    renderWithProviders(<ProjectForm open project={project} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.queryByRole("button", { name: /^Import/ })).not.toBeInTheDocument();
    clickTab("Kommentare");
    expect(screen.getByTestId("comment-thread")).toHaveTextContent("Projekt:1");
    clickTab("Notizen");
    expect(screen.getByTestId("note-list")).toHaveTextContent("1");
    clickTab("Dateien");
    expect(screen.getByTestId("attachment-uploader")).toBeInTheDocument();
    expect(screen.getByTestId("attachment-list")).toHaveTextContent("1");
    clickTab("Backlog");
    expect(screen.getByTestId("backlog-list")).toHaveTextContent("0");
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
