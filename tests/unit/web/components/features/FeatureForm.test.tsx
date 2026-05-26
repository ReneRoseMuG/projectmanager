// @vitest-environment jsdom

/**
 * Test Scope: FeatureForm
 *
 * Create-Modus:
 *  1. Alle Relation-Tabs sichtbar (Aufgaben, Tickets, Kommentare, ...).
 *  2. PendingRelationList in Relation-Tabs sichtbar (kein Board, kein API-Aufruf).
 *  3. PendingCommentList im Kommentare-Tab sichtbar.
 *  4. PendingFileList im Dateien-Tab sichtbar (sofern Tab vorhanden).
 *  5. Verknüpfen → kein API-Aufruf vor Submit.
 *  6. Neu erstellen → Draft erscheint in Pending-Liste.
 *  7. Pending-Item entfernen → aus Liste verschwunden.
 *  8. Parent-Projekt im Details-Tab wird lokal vorgemerkt.
 *  9. Submit → onSubmit aufgerufen → onPostCreate mit allen Pending-Daten aufgerufen.
 * 10. Schließen + neu öffnen → alle Pending-Listen leer (State-Reset).
 *
 * Edit-Modus:
 * 11. OwnerTaskBoard / OwnerTicketBoard in Relation-Tabs sichtbar.
 * 12. CommentThread im Kommentare-Tab sichtbar.
 * 13. AttachmentList im Dateien-Tab sichtbar (sofern Tab vorhanden).
 * 14. Parent-Projekt im Details-Tab liest und schreibt die bestehende Projekt-Feature-Relation.
 */
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { describe, expect, it, vi } from "vitest";
import { addPendingComment, changeInput, clickTab, feature, formTestMocks, getFileInput, project, renderWithProviders, task, ticket } from "../../../../fixtures/web/components/test/ownerFormTestUtils";
import { FeatureForm } from "../../../../../apps/web/src/components/features/FeatureForm";

describe("FeatureForm", () => {
  it("bindet RichTextInlineField an Kurzbeschreibung und Inhalt", async () => {
    const onSubmit = vi.fn().mockResolvedValue(feature);
    renderWithProviders(<FeatureForm open feature={feature} onSubmit={onSubmit} onClose={vi.fn()} />);

    expect(screen.getByTestId("feature-form-description-view")).toHaveValue(feature.description);
    expect(screen.getByTestId("feature-form-content-view")).toHaveValue(feature.content);
    fireEvent.change(screen.getByTestId("feature-form-description-view"), { target: { value: "<p>Neue Kurzbeschreibung</p>" } });
    fireEvent.change(screen.getByTestId("feature-form-content-view"), { target: { value: "<p>Neuer Inhalt</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ description: "<p>Neue Kurzbeschreibung</p>", content: "<p>Neuer Inhalt</p>" })));
  });

  it("stellt Bild-Upload für Kurzbeschreibung und Inhalt nur im Edit-Modus bereit", () => {
    renderWithProviders(<FeatureForm open feature={feature} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByTestId("feature-form-description-view")).toHaveAttribute("data-image-upload", "enabled");
    expect(screen.getByTestId("feature-form-content-view")).toHaveAttribute("data-image-upload", "enabled");
  });

  it("deaktiviert Bild-Upload für Kurzbeschreibung und Inhalt im Create-Modus", () => {
    renderWithProviders(<FeatureForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByTestId("feature-form-description-view")).toHaveAttribute("data-image-upload", "disabled");
    expect(screen.getByTestId("feature-form-content-view")).toHaveAttribute("data-image-upload", "disabled");
  });

  it("zeigt im Create-Modus alle erwarteten Verwaltungs-Tabs", () => {
    renderWithProviders(<FeatureForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Details" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Details 0" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Use Cases/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Aufgaben/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Tickets/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Kommentare/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Dateien/ })).toBeInTheDocument();
  });

  it("zeigt im Use-Case-Tab PendingRelationList und keine bestehende Use-Case-Verknüpfung", () => {
    renderWithProviders(<FeatureForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Use Cases");

    expect(screen.getByText("Keine Use Cases vorgemerkt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Neu erstellen" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Verknüpfen" })).not.toBeInTheDocument();
  });

  it("zeigt im Aufgaben-Tab PendingRelationList statt OwnerTaskBoard", () => {
    renderWithProviders(<FeatureForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Aufgaben");

    expect(screen.getByText("Keine Aufgaben vorgemerkt")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Verknüpfen" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("owner-task-board")).not.toBeInTheDocument();
  });

  it("zeigt im Tickets-Tab PendingRelationList statt OwnerTicketBoard", () => {
    renderWithProviders(<FeatureForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Tickets");

    expect(screen.getByText("Keine Tickets vorgemerkt")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Verknüpfen" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("owner-ticket-board")).not.toBeInTheDocument();
  });

  it("zeigt im Details-Tab die Parent-Projekt-Auswahl", () => {
    renderWithProviders(<FeatureForm open initialProjectId={project.id} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Projekt Alpha/ })).toBeInTheDocument();
    expect(screen.getByText("1 offene Aufgaben")).toBeInTheDocument();
  });

  it("zeigt im Kommentare-Tab PendingCommentList", () => {
    renderWithProviders(<FeatureForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Kommentare");

    expect(screen.getByText("Keine Kommentare vorgemerkt")).toBeInTheDocument();
  });

  it("zeigt im Dateien-Tab PendingFileList", () => {
    renderWithProviders(<FeatureForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Dateien");

    expect(screen.getByText("Keine Dateien vorgemerkt")).toBeInTheDocument();
  });

  it("verknüpft eine Aufgabe lokal ohne Submit", async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<FeatureForm open initialProjectId={project.id} onSubmit={onSubmit} onClose={vi.fn()} />);

    clickTab("Aufgaben");
    fireEvent.click(screen.getByRole("button", { name: "Verknüpfen" }));
    fireEvent.click(screen.getByRole("button", { name: "Aufgabe wählen" }));

    await waitFor(() => expect(screen.getByText(task.title)).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("erstellt und entfernt einen Use-Case-Draft lokal", () => {
    renderWithProviders(<FeatureForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Use Cases");
    fireEvent.click(screen.getByRole("button", { name: "Neu erstellen" }));
    changeInput(0, "Use Case Pending");
    fireEvent.click(screen.getByRole("button", { name: "Vormerken" }));
    expect(screen.getByText("Use Case Pending")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Use Case Pending entfernen" }));
    expect(screen.queryByText("Use Case Pending")).not.toBeInTheDocument();
  });

  it("übergibt nach Entfernen kein Parent-Projekt im Create-Modus", async () => {
    formTestMocks.hasPermission.mockImplementation((resource, action) => resource === "projects" && action === "write");
    const createdFeature = { ...feature, id: 112, title: "Feature ohne Parent" };
    const onSubmit = vi.fn().mockResolvedValue(createdFeature);
    const onPostCreate = vi.fn().mockResolvedValue(undefined);

    renderWithProviders(<FeatureForm open initialProjectId={project.id} onSubmit={onSubmit} onPostCreate={onPostCreate} onClose={vi.fn()} />);

    changeInput(0, "Feature ohne Parent");
    fireEvent.click(screen.getByRole("button", { name: "Projekt Alpha entfernen" }));
    fireEvent.click(screen.getByRole("button", { name: "Feature anlegen" }));

    await waitFor(() => expect(onPostCreate).toHaveBeenCalledWith(createdFeature.id, expect.objectContaining({ projectIds: [] })));
  });

  it("übergibt alle Pending-Daten nach Create an onPostCreate", async () => {
    formTestMocks.hasPermission.mockImplementation((resource, action) => resource === "projects" && action === "write");
    const createdFeature = { ...feature, id: 111, title: "Neues Feature" };
    const onSubmit = vi.fn().mockResolvedValue(createdFeature);
    const onPostCreate = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const file = new File(["feature"], "feature.txt", { type: "text/plain" });
    const { container } = renderWithProviders(<FeatureForm open initialProjectId={project.id} onSubmit={onSubmit} onPostCreate={onPostCreate} onClose={onClose} />);

    changeInput(0, "Neues Feature");
    clickTab("Use Cases");
    fireEvent.click(screen.getByRole("button", { name: "Neu erstellen" }));
    changeInput(0, "Use Case Pending");
    fireEvent.click(screen.getByRole("button", { name: "Vormerken" }));
    clickTab("Aufgaben");
    fireEvent.click(screen.getByRole("button", { name: "Verknüpfen" }));
    fireEvent.click(screen.getByRole("button", { name: "Aufgabe wählen" }));
    clickTab("Tickets");
    fireEvent.click(screen.getByRole("button", { name: "Verknüpfen" }));
    fireEvent.click(screen.getByRole("button", { name: "Ticket wählen" }));
    clickTab("Kommentare");
    addPendingComment("Feature-Kommentar");
    clickTab("Dateien");
    fireEvent.change(getFileInput(container), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Feature anlegen" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: "Neues Feature" })));
    expect(onPostCreate).toHaveBeenCalledWith(
      createdFeature.id,
      expect.objectContaining({
        useCases: [{ kind: "new", draft: { title: "Use Case Pending", status: "draft" } }],
        tasks: [{ kind: "existing", task }],
        tickets: [{ kind: "existing", ticket }],
        projectIds: [project.id],
        comments: [{ text: "Feature-Kommentar" }],
        files: [{ file, previewUrl: undefined }]
      })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("setzt Pending-Listen nach Schließen und erneutem Öffnen zurück", () => {
    const { rerender } = renderWithProviders(<FeatureForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Use Cases");
    fireEvent.click(screen.getByRole("button", { name: "Neu erstellen" }));
    changeInput(0, "Reset Use Case");
    fireEvent.click(screen.getByRole("button", { name: "Vormerken" }));
    expect(screen.getByText("Reset Use Case")).toBeInTheDocument();

    rerender(<FeatureForm open={false} onSubmit={vi.fn()} onClose={vi.fn()} />);
    rerender(<FeatureForm open onSubmit={vi.fn()} onClose={vi.fn()} />);
    clickTab("Use Cases");

    expect(screen.queryByText("Reset Use Case")).not.toBeInTheDocument();
    expect(screen.getByText("Keine Use Cases vorgemerkt")).toBeInTheDocument();
  });

  it("zeigt im Edit-Modus UseCaseListBoardView und OwnerTaskBoard", () => {
    renderWithProviders(<FeatureForm open feature={feature} onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Use Cases");
    expect(screen.getByTestId("usecase-list")).toHaveTextContent("1");
    clickTab("Aufgaben");
    expect(screen.getByTestId("owner-task-board")).toHaveTextContent(`feature:${feature.id}`);
  });

  it("behält den aktiven Tab bei einem Feature-Refetch", () => {
    const { rerender } = renderWithProviders(<FeatureForm open feature={feature} onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Aufgaben");
    expect(screen.getByTestId("owner-task-board")).toHaveTextContent(`feature:${feature.id}`);

    rerender(<FeatureForm open feature={{ ...feature, title: "Feature Refetch" }} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByTestId("owner-task-board")).toHaveTextContent(`feature:${feature.id}`);
  });

  it("zeigt im Edit-Modus OwnerTicketBoard, Parent-Projekt, CommentThread und AttachmentList", () => {
    renderWithProviders(<FeatureForm open feature={feature} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Projekt Alpha/ })).toBeInTheDocument();
    clickTab("Tickets");
    expect(screen.getByTestId("owner-ticket-board")).toHaveTextContent(`feature:${feature.id}`);
    clickTab("Kommentare");
    expect(screen.getByTestId("comment-thread")).toHaveTextContent("Feature:1");
    clickTab("Dateien");
    expect(screen.getByTestId("attachment-uploader")).toBeInTheDocument();
    expect(screen.getByTestId("attachment-list")).toHaveTextContent("1");
  });

  it("setzt im Edit-Modus genau ein Parent-Projekt", async () => {
    formTestMocks.hasPermission.mockImplementation((resource, action) => resource === "projects" && action === "write");
    renderWithProviders(<FeatureForm open feature={feature} onSubmit={vi.fn()} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Projekt Alpha" }));
    fireEvent.click(screen.getByRole("option", { name: /Projekt Alpha/ }));

    await waitFor(() => expect(formTestMocks.setProjectsForFeature).toHaveBeenCalledWith([project.id]));
  });

  it("entfernt im Edit-Modus das Parent-Projekt", async () => {
    formTestMocks.hasPermission.mockImplementation((resource, action) => resource === "projects" && action === "write");
    renderWithProviders(<FeatureForm open feature={feature} onSubmit={vi.fn()} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Projekt Alpha entfernen" }));

    await waitFor(() => expect(formTestMocks.setProjectsForFeature).toHaveBeenCalledWith([]));
  });

  it("deaktiviert die Parent-Projekt-Auswahl ohne projects:write", () => {
    renderWithProviders(<FeatureForm open feature={feature} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Projekt Alpha/ })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Projekt Alpha entfernen" })).not.toBeInTheDocument();
  });

  it("zeigt im Edit-Modus den 'In neuem Tab öffnen'-Button, wenn onOpenInTab übergeben wird", () => {
    renderWithProviders(<FeatureForm open feature={feature} onSubmit={vi.fn()} onClose={vi.fn()} onOpenInTab={vi.fn()} />);

    expect(screen.getByRole("button", { name: "In neuem Tab öffnen" })).toBeInTheDocument();
  });

  it("zeigt im Edit-Modus keinen 'In neuem Tab öffnen'-Button, wenn onOpenInTab fehlt", () => {
    renderWithProviders(<FeatureForm open feature={feature} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "In neuem Tab öffnen" })).not.toBeInTheDocument();
  });
});
