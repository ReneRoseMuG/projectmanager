// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TicketDetailPage setzt onOpenInTab nur im Edit-Modus.
 * - Klick öffnet die saubere Ticket-URL und navigiert zum returnTo-Wert.
 *
 * Fehlerfälle:
 * - Create-Modus darf keinen In-neuem-Tab-Button anzeigen.
 *
 * Ziel:
 * Die Page-Verdrahtung des Browser-Tab-Buttons für Tickets absichern.
 */
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TicketDetailPage } from "../../../../apps/web/src/pages/TicketDetailPage";

const router = vi.hoisted(() => ({
  navigate: vi.fn(),
  params: { id: "10" } as Record<string, string>,
  search: "returnTo=%2Ftickets",
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => router.navigate,
    useParams: () => router.params,
    useSearchParams: () => [new URLSearchParams(router.search), vi.fn()],
  };
});

vi.mock("../../../../apps/web/src/components/tickets/TicketForm", () => ({
  TicketForm({ onOpenInTab }: { onOpenInTab?: () => void }) {
    return onOpenInTab ? (
      <button type="button" onClick={onOpenInTab}>
        In neuem Tab öffnen
      </button>
    ) : (
      <div data-testid="ticket-form" />
    );
  },
}));

vi.mock("../../../../apps/web/src/components/ui/ToastProvider", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("../../../../apps/web/src/hooks/useTickets", () => ({
  useTickets: () => ({
    createTicket: vi.fn(),
    reload: vi.fn(),
  }),
}));

vi.mock("../../../../apps/web/src/hooks/useTicketDetail", () => ({
  useTicketDetail: () => ({
    ticket: router.params.id
      ? {
          id: 10,
          parentId: null,
          type: "bug",
          title: "Ticket Alpha",
          description: null,
          status: "open",
          priority: "medium",
          resolution: null,
          reporterUserId: null,
          reporterUser: null,
          responsibleUserId: null,
          responsibleUser: null,
          environment: null,
          affectedVersion: null,
          dueDate: null,
          resolvedAt: null,
          position: 1024,
          version: 1,
          createdAt: "2026-05-20T08:00:00.000Z",
          updatedAt: "2026-05-20T08:00:00.000Z",
          tags: [],
          subTicketCount: 0,
          attachmentCount: 0,
          noteCount: 0,
          commentCount: 0,
        }
      : null,
    loading: false,
    updateTicket: vi.fn(),
    reload: vi.fn(),
  }),
}));

beforeEach(() => {
  router.params = { id: "10" };
  router.search = "returnTo=%2Ftickets";
  router.navigate.mockReset();
  vi.spyOn(window, "open").mockImplementation(() => null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("TicketDetailPage openInTab", () => {
  it("nutzt die volle verfügbare Detailseitenbreite", () => {
    const { container } = render(<TicketDetailPage />);

    expect(container.firstElementChild).toHaveClass(
      "flex",
      "h-full",
      "w-full",
      "min-w-0",
      "flex-1",
      "flex-col",
    );
    expect(container.firstElementChild).not.toHaveClass("mx-auto", "max-w-7xl");
  });

  it("zeigt im Edit-Modus den 'In neuem Tab öffnen'-Button", () => {
    render(<TicketDetailPage />);

    expect(
      screen.getByRole("button", { name: "In neuem Tab öffnen" }),
    ).toBeInTheDocument();
  });

  it("öffnet die Ticket-URL und navigiert zurück", () => {
    render(<TicketDetailPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "In neuem Tab öffnen" }),
    );

    expect(window.open).toHaveBeenCalledWith("/tickets/10?standalone=1", "_blank");
    expect(router.navigate).toHaveBeenCalledWith("/tickets");
  });

  it("zeigt im Create-Modus keinen 'In neuem Tab öffnen'-Button", () => {
    router.params = {};

    render(<TicketDetailPage />);

    expect(
      screen.queryByRole("button", { name: "In neuem Tab öffnen" }),
    ).not.toBeInTheDocument();
  });
});
