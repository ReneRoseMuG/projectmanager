// @vitest-environment jsdom

/**
 * Test Scope: TicketForm
 *
 * Abgedeckte Regeln:
 * - TicketForm rendert die Detail-Tabs analog zu anderen Detailformularen.
 * - Create-Modus sammelt Sub-Tickets, Relationen, Kommentare, Notizen und Dateien lokal.
 * - Edit-Modus zeigt geladene Detaildaten in den jeweiligen Tabs.
 *
 * Fehlerfälle:
 * - Pending-Daten dürfen vor dem Submit nicht verloren gehen.
 * - Detaildaten dürfen nicht im reinen Basisformular versteckt bleiben.
 *
 * Ziel:
 * Die tabfähige Ticket-Detailform gegen Regressionen in Create- und Edit-Flows absichern.
 */
import { fireEvent, screen, waitFor, within } from "@testing-library/dom";
import { describe, expect, it, vi } from "vitest";
import { addPendingComment, changeInput, clickTab, getFileInput, renderWithProviders, ticket } from "../../../../fixtures/web/components/test/ownerFormTestUtils";
import { TicketForm } from "../../../../../apps/web/src/components/tickets/TicketForm";

function changeLastInput(value: string) {
  const inputs = document.body.querySelectorAll("input");
  const input = inputs[inputs.length - 1];
  expect(input).toBeDefined();
  fireEvent.change(input as HTMLInputElement, { target: { value } });
}

describe("TicketForm", () => {
  it("verdrahtet Body, Parent-Kontext und Sidebar-Felder mit Submit-Payload", async () => {
    const onAutoSave = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<TicketForm open ticket={ticket} onSubmit={vi.fn()} onAutoSave={onAutoSave} onClose={vi.fn()} variant="page" />);

    const sidebar = screen.getByTestId("form-sidebar");
    const sidebarSelects = within(sidebar).getAllByRole("combobox");
    expect(screen.getByTestId("parent-context-field")).toHaveTextContent("PROJ-30");
    expect(screen.getByDisplayValue(ticket.title)).toBeInTheDocument();
    expect(screen.getByTestId("ticket-description-view")).toHaveValue(ticket.description);
    expect(sidebarSelects[0]).toHaveValue("open");
    expect(sidebarSelects[1]).toHaveValue("bug");
    expect(sidebarSelects[2]).toHaveValue("medium");
    expect(within(sidebar).getByRole("combobox", { name: "Zuständig" })).toHaveValue("1");
    expect(within(sidebar).getByRole("combobox", { name: "Meldende Person" })).toHaveValue("1");

    fireEvent.change(screen.getByDisplayValue(ticket.title), { target: { value: "Ticket Beta" } });
    const dueDate = sidebar.querySelector('input[type="date"]');
    expect(dueDate).not.toBeNull();
    fireEvent.change(dueDate as HTMLInputElement, { target: { value: "2026-06-21" } });
    fireEvent.change(within(sidebar).getByRole("combobox", { name: "Zuständig" }), { target: { value: "" } });
    fireEvent.change(within(sidebar).getByLabelText("Umgebung"), { target: { value: "Chrome" } });
    fireEvent.change(within(sidebar).getByLabelText("Betroffene Version"), { target: { value: "1.2.3" } });
    fireEvent.click(within(sidebar).getByRole("button", { name: "Tags 0" }));

    await waitFor(() =>
      expect(onAutoSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Ticket Beta",
          type: "bug",
          status: "open",
          priority: "medium",
          dueDate: "2026-06-21",
          responsibleUserId: null,
          reporterUserId: 1,
          environment: "Chrome",
          affectedVersion: "1.2.3",
          tagIds: [90]
        })
      )
    );
  });

  it("bindet RichTextInlineField an die Beschreibung", async () => {
    const onAutoSave = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<TicketForm open ticket={ticket} onSubmit={vi.fn()} onAutoSave={onAutoSave} onClose={vi.fn()} variant="page" />);

    expect(screen.getByTestId("ticket-description-view")).toHaveValue(ticket.description);
    fireEvent.change(screen.getByTestId("ticket-description-view"), { target: { value: "<p>Ticket aktualisiert</p>" } });

    await waitFor(() => expect(onAutoSave).toHaveBeenCalledWith(expect.objectContaining({ description: "<p>Ticket aktualisiert</p>" })));
  });

  it("zeigt im Create-Modus alle erwarteten Detail-Tabs ohne Journal", () => {
    renderWithProviders(<TicketForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Details" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Sub-Tickets/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Relationen/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Kommentare/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Notizen/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Dateien/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Journal/ })).not.toBeInTheDocument();
  });

  it("zeigt im Create-Modus Pending-Listen in Verwaltungs-Tabs", () => {
    renderWithProviders(<TicketForm open onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Sub-Tickets");
    expect(screen.getByText("Keine Sub-Tickets vorgemerkt")).toBeInTheDocument();
    clickTab("Relationen");
    expect(screen.getByText("Keine Relationen vorgemerkt")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Relation hinzufügen" })).not.toBeInTheDocument();
    clickTab("Kommentare");
    expect(screen.getByText("Keine Kommentare vorgemerkt")).toBeInTheDocument();
    clickTab("Notizen");
    expect(screen.getByText("Keine Notizen vorgemerkt")).toBeInTheDocument();
    clickTab("Dateien");
    expect(screen.getByText("Keine Dateien vorgemerkt")).toBeInTheDocument();
  });

  it("übergibt alle Pending-Daten im Create-Submit", async () => {
    const onSubmit = vi.fn().mockResolvedValue(ticket);
    const file = new File(["ticket"], "ticket.txt", { type: "text/plain" });
    const { container } = renderWithProviders(<TicketForm open owner={{ type: "project", id: 1 }} initialStatus="open" onSubmit={onSubmit} onClose={vi.fn()} />);

    changeInput(0, "Neues Ticket");
    clickTab("Sub-Tickets");
    fireEvent.click(screen.getByRole("button", { name: "Neu erstellen" }));
    changeLastInput("Sub-Ticket Pending");
    fireEvent.click(screen.getByRole("button", { name: "Vormerken" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Sub-Ticket vormerken" })).not.toBeInTheDocument());

    clickTab("Relationen");
    fireEvent.click(screen.getByRole("button", { name: "Relation hinzufügen" }));
    await waitFor(() => expect(screen.getByText(`TICKET-${ticket.id} · ${ticket.title}`)).toBeInTheDocument());
    const selects = document.body.querySelectorAll("select");
    fireEvent.change(selects[0] as HTMLSelectElement, { target: { value: String(ticket.id) } });
    fireEvent.click(screen.getByRole("button", { name: /Hinzuf/ }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Relation vormerken" })).not.toBeInTheDocument());

    clickTab("Kommentare");
    addPendingComment("Ticket-Kommentar");
    clickTab("Notizen");
    fireEvent.click(screen.getByRole("button", { name: "Neue Notiz" }));
    changeLastInput("Ticket-Notiz");
    fireEvent.click(screen.getByRole("button", { name: /Hinzuf/ }));
    clickTab("Dateien");
    fireEvent.change(getFileInput(container), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Ticket anlegen" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Neues Ticket",
          pendingSubTickets: [{ title: "Sub-Ticket Pending", type: "bug", status: "open", priority: "medium" }],
          pendingRelations: [{ ticket, relationType: "related" }],
          pendingComments: [{ text: "Ticket-Kommentar" }],
          pendingNotes: [{ title: "Ticket-Notiz", contentJson: {} }],
          pendingFiles: [{ file, previewUrl: undefined }]
        })
      )
    );
  });

  it("zeigt im Edit-Modus geladene Detaildaten in den Tabs", () => {
    renderWithProviders(<TicketForm open ticket={ticket} onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Sub-Tickets");
    expect(screen.getAllByText("Sub-Ticket Alpha").length).toBeGreaterThan(0);
    clickTab("Relationen");
    expect(screen.getAllByText("Ticket Bravo").length).toBeGreaterThan(0);
    clickTab("Kommentare");
    expect(screen.getByTestId("comment-thread")).toHaveTextContent("Ticket:1");
    clickTab("Notizen");
    expect(screen.getByTestId("note-list")).toHaveTextContent("1");
    clickTab("Dateien");
    expect(screen.getByTestId("attachment-uploader")).toBeInTheDocument();
    expect(screen.getByTestId("attachment-list")).toHaveTextContent("1");
  });

  it("behält den aktiven Tab bei einem Ticket-Refetch", () => {
    const { rerender } = renderWithProviders(<TicketForm open ticket={ticket} onSubmit={vi.fn()} onClose={vi.fn()} />);

    clickTab("Relationen");
    expect(screen.getAllByText("Ticket Bravo").length).toBeGreaterThan(0);

    rerender(<TicketForm open ticket={{ ...ticket, title: "Ticket Refetch" }} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getAllByText("Ticket Bravo").length).toBeGreaterThan(0);
  });

  it("zeigt im Edit-Modus den 'In neuem Tab öffnen'-Button, wenn onOpenInTab übergeben wird", () => {
    renderWithProviders(<TicketForm open ticket={ticket} onSubmit={vi.fn()} onClose={vi.fn()} onOpenInTab={vi.fn()} variant="page" />);

    expect(screen.getByRole("button", { name: "In neuem Tab öffnen" })).toBeInTheDocument();
  });

  it("zeigt im Edit-Modus keinen 'In neuem Tab öffnen'-Button, wenn onOpenInTab fehlt", () => {
    renderWithProviders(<TicketForm open ticket={ticket} onSubmit={vi.fn()} onClose={vi.fn()} variant="page" />);

    expect(screen.queryByRole("button", { name: "In neuem Tab öffnen" })).not.toBeInTheDocument();
  });
});
