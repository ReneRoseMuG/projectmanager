// @vitest-environment jsdom

/**
 * Test Scope: UseCaseForm
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
import { addPendingComment, changeInput, clickTab, feature, renderWithProviders, task, ticket, useCase } from "../../../../fixtures/web/components/test/ownerFormTestUtils";
import { UseCaseForm } from "../../../../../apps/web/src/components/usecases/UseCaseForm";

describe("UseCaseForm", () => {
  it("bindet RichTextInlineField an Kurzbeschreibung und Inhalt", async () => {
    const onSubmit = vi.fn().mockResolvedValue(useCase);
    renderWithProviders(<UseCaseForm open useCase={useCase} currentFeatureId={feature.id} features={[feature]} onSubmit={onSubmit} onClose={vi.fn()} />);

    expect(screen.getByTestId("use-case-description-view")).toHaveValue(useCase.description);
    expect(screen.getByTestId("use-case-content-view")).toHaveValue(useCase.content);
    fireEvent.change(screen.getByTestId("use-case-description-view"), { target: { value: "<p>Neue Use-Case-Beschreibung</p>" } });
    fireEvent.change(screen.getByTestId("use-case-content-view"), { target: { value: "<p>Neuer Use-Case-Inhalt</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ description: "<p>Neue Use-Case-Beschreibung</p>", content: "<p>Neuer Use-Case-Inhalt</p>" })));
  });

  it("zeigt im Create-Modus die Relation-Tabs und keinen Dateien-Tab", () => {
    renderWithProviders(<UseCaseForm open currentFeatureId={feature.id} features={[feature]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Details" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Details 0" })).not.toBeInTheDocument();
    expect(screen.queryByText("Stammdaten")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Aufgaben/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Tickets/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Kommentare/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dateien" })).not.toBeInTheDocument();
  });

  it("zeigt im Aufgaben-Tab PendingRelationList statt OwnerTaskBoard", () => {
    renderWithProviders(<UseCaseForm open currentFeatureId={feature.id} features={[feature]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Aufgaben");

    expect(screen.getByText("Keine Aufgaben vorgemerkt")).toBeInTheDocument();
    expect(screen.queryByTestId("owner-task-board")).not.toBeInTheDocument();
  });

  it("zeigt im Tickets-Tab PendingRelationList statt OwnerTicketBoard", () => {
    renderWithProviders(<UseCaseForm open currentFeatureId={feature.id} features={[feature]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Tickets");

    expect(screen.getByText("Keine Tickets vorgemerkt")).toBeInTheDocument();
    expect(screen.queryByTestId("owner-ticket-board")).not.toBeInTheDocument();
  });

  it("zeigt im Kommentare-Tab PendingCommentList statt CommentThread", () => {
    renderWithProviders(<UseCaseForm open currentFeatureId={feature.id} features={[feature]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Kommentare");

    expect(screen.getByText("Keine Kommentare vorgemerkt")).toBeInTheDocument();
    expect(screen.queryByTestId("comment-thread")).not.toBeInTheDocument();
  });

  it("verknüpft eine bestehende Aufgabe lokal ohne Submit", async () => {
    const onSubmit = vi.fn();
    const onPostCreate = vi.fn();
    renderWithProviders(<UseCaseForm open currentFeatureId={feature.id} features={[feature]} onSubmit={onSubmit} onPostCreate={onPostCreate} onClose={vi.fn()} />);

    clickTab("Aufgaben");
    fireEvent.click(screen.getByRole("button", { name: "Verknüpfen" }));
    fireEvent.click(screen.getByRole("button", { name: "Aufgabe wählen" }));

    await waitFor(() => expect(screen.getByText(task.title)).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onPostCreate).not.toHaveBeenCalled();
  });

  it("erstellt einen Aufgaben-Draft lokal", () => {
    renderWithProviders(<UseCaseForm open currentFeatureId={feature.id} features={[feature]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Aufgaben");
    fireEvent.click(screen.getByRole("button", { name: "Neu erstellen" }));
    changeInput(0, "Aufgabe Pending");
    fireEvent.click(screen.getByRole("button", { name: "Vormerken" }));

    expect(screen.getByText("Aufgabe Pending")).toBeInTheDocument();
  });

  it("entfernt einen Aufgaben-Draft wieder aus der Pending-Liste", () => {
    renderWithProviders(<UseCaseForm open currentFeatureId={feature.id} features={[feature]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Aufgaben");
    fireEvent.click(screen.getByRole("button", { name: "Neu erstellen" }));
    changeInput(0, "Entfernbarer Draft");
    fireEvent.click(screen.getByRole("button", { name: "Vormerken" }));
    fireEvent.click(screen.getByRole("button", { name: "Entfernbarer Draft entfernen" }));

    expect(screen.queryByText("Entfernbarer Draft")).not.toBeInTheDocument();
  });

  it("übergibt Pending-Daten nach Create an onPostCreate", async () => {
    const createdUseCase = { ...useCase, id: 101, title: "Neuer Use Case" };
    const onSubmit = vi.fn().mockResolvedValue(createdUseCase);
    const onPostCreate = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    renderWithProviders(<UseCaseForm open currentFeatureId={feature.id} features={[feature]} onSubmit={onSubmit} onPostCreate={onPostCreate} onClose={onClose} />);

    changeInput(0, "Neuer Use Case");
    clickTab("Aufgaben");
    fireEvent.click(screen.getByRole("button", { name: "Verknüpfen" }));
    fireEvent.click(screen.getByRole("button", { name: "Aufgabe wählen" }));
    clickTab("Tickets");
    fireEvent.click(screen.getByRole("button", { name: "Verknüpfen" }));
    fireEvent.click(screen.getByRole("button", { name: "Ticket wählen" }));
    clickTab("Kommentare");
    addPendingComment("  Kommentar im Create  ");
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: "Neuer Use Case", featureId: feature.id })));
    expect(onPostCreate).toHaveBeenCalledWith(
      createdUseCase.id,
      expect.objectContaining({
        tasks: [{ kind: "existing", task }],
        tickets: [{ kind: "existing", ticket }],
        comments: [{ text: "Kommentar im Create" }]
      })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("setzt pendingComments nach Schließen und erneutem Öffnen zurück", () => {
    const { rerender } = renderWithProviders(<UseCaseForm open currentFeatureId={feature.id} features={[feature]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Kommentare");
    addPendingComment("Reset-Kommentar");
    expect(screen.getByText("Reset-Kommentar")).toBeInTheDocument();

    rerender(<UseCaseForm open={false} currentFeatureId={feature.id} features={[feature]} onSubmit={vi.fn()} onClose={vi.fn()} />);
    rerender(<UseCaseForm open currentFeatureId={feature.id} features={[feature]} onSubmit={vi.fn()} onClose={vi.fn()} />);
    clickTab("Kommentare");

    expect(screen.queryByText("Reset-Kommentar")).not.toBeInTheDocument();
    expect(screen.getByText("Keine Kommentare vorgemerkt")).toBeInTheDocument();
  });

  it("zeigt im Edit-Modus OwnerTaskBoard im Aufgaben-Tab", () => {
    renderWithProviders(<UseCaseForm open useCase={useCase} features={[feature]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Aufgaben");

    expect(screen.getByTestId("owner-task-board")).toHaveTextContent(`useCase:${useCase.id}`);
  });

  it("behält den aktiven Tab bei einem Use-Case-Refetch", () => {
    const { rerender } = renderWithProviders(<UseCaseForm open useCase={useCase} features={[feature]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Aufgaben");
    expect(screen.getByTestId("owner-task-board")).toHaveTextContent(`useCase:${useCase.id}`);

    rerender(<UseCaseForm open useCase={{ ...useCase, title: "Use Case Refetch" }} features={[feature]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByTestId("owner-task-board")).toHaveTextContent(`useCase:${useCase.id}`);
  });

  it("zeigt im Edit-Modus OwnerTicketBoard im Tickets-Tab", () => {
    renderWithProviders(<UseCaseForm open useCase={useCase} features={[feature]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Tickets");

    expect(screen.getByTestId("owner-ticket-board")).toHaveTextContent(`useCase:${useCase.id}`);
  });

  it("zeigt im Edit-Modus CommentThread im Kommentare-Tab", () => {
    renderWithProviders(<UseCaseForm open useCase={useCase} features={[feature]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Kommentare");

    expect(screen.getByTestId("comment-thread")).toHaveTextContent("Use Case:1");
  });

  it("zeigt im Edit-Modus den 'In neuem Tab öffnen'-Button, wenn onOpenInTab übergeben wird", () => {
    renderWithProviders(<UseCaseForm open useCase={useCase} features={[feature]} onSubmit={vi.fn()} onClose={vi.fn()} onOpenInTab={vi.fn()} />);

    expect(screen.getByRole("button", { name: "In neuem Tab öffnen" })).toBeInTheDocument();
  });

  it("zeigt im Edit-Modus keinen 'In neuem Tab öffnen'-Button, wenn onOpenInTab fehlt", () => {
    renderWithProviders(<UseCaseForm open useCase={useCase} features={[feature]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "In neuem Tab öffnen" })).not.toBeInTheDocument();
  });
});
