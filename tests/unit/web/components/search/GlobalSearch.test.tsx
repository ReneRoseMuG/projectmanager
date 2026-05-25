/**
 * Test Scope:
 * Globale Suche im Web-Frontend.
 *
 * Abgedeckte Regeln:
 * - Treffer zeigen keine künstlichen technischen Kennungen.
 * - Die leere Suche zeigt keine Schnellaktion für neue Projekte.
 * - Treffer werden über sichtbare Titel, Namen und Dateinamen gefiltert.
 *
 * Fehlerfälle:
 * - Beschreibungstext erzeugt keinen scheinbar zusammenhanglosen Treffer.
 * - Aufgaben-Treffer führen nicht zurück in die Projektliste.
 *
 * Ziel:
 * Die globale Suche bleibt fachlich nachvollziehbar und navigiert Treffer auf ihr Detailziel.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GlobalSearch } from "../../../../../apps/web/src/components/search/GlobalSearch";
import type { GlobalSearchData } from "../../../../../apps/web/src/hooks/useGlobalSearchData";

const navigateMock = vi.hoisted(() => vi.fn());
const useGlobalSearchDataMock = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock
}));

vi.mock("../../../../../apps/web/src/hooks/useGlobalSearchData", () => ({
  useGlobalSearchData: useGlobalSearchDataMock
}));

const emptyData: GlobalSearchData = {
  projects: [],
  milestones: [],
  features: [],
  wikiPages: [],
  tasks: [],
  tickets: [],
  notes: [],
  attachments: []
};

const data: GlobalSearchData = {
  ...emptyData,
  projects: [
    {
      id: 1,
      name: "Alpha Projekt",
      description: "Test steht nur in der Beschreibung",
      status: "active",
      color: null,
      startDate: null,
      dueDate: null,
      wikiPageId: null,
      version: 1,
      createdAt: "2026-05-22T00:00:00.000Z",
      updatedAt: "2026-05-22T00:00:00.000Z",
      openTaskCount: 0,
      doneTaskCount: 0,
      totalTaskCount: 0,
      tags: []
    }
  ],
  tasks: [
    {
      id: 2,
      parentId: null,
      title: "Testaufgabe",
      description: null,
      status: "open",
      priority: "medium",
      assignee: null,
      dueDate: null,
      version: 1,
      createdAt: "2026-05-22T00:00:00.000Z",
      updatedAt: "2026-05-22T00:00:00.000Z",
      tags: [],
      subtaskCount: 0
    }
  ]
};

function renderSearch(searchData: GlobalSearchData = data) {
  useGlobalSearchDataMock.mockReturnValue({
    data: searchData,
    loading: false,
    error: null
  });

  return render(<GlobalSearch open onClose={vi.fn()} />);
}

describe("GlobalSearch", () => {
  afterEach(() => {
    cleanup();
    navigateMock.mockReset();
    useGlobalSearchDataMock.mockReset();
  });

  it("zeigt im leeren Zustand keine Schnellaktion für neue Projekte", () => {
    renderSearch(emptyData);

    expect(screen.getByText("Suchbegriff eingeben")).toBeInTheDocument();
    expect(screen.queryByText("Schnellaktionen")).not.toBeInTheDocument();
    expect(screen.queryByText("Neues Projekt")).not.toBeInTheDocument();
  });

  it("filtert nur über sichtbare Felder und entfernt künstliche Kennungen", () => {
    renderSearch();

    fireEvent.change(screen.getByPlaceholderText("Global suchen"), { target: { value: "Test" } });

    expect(screen.queryByText("Alpha Projekt")).not.toBeInTheDocument();
    expect(screen.getByText("Testaufgabe")).toBeInTheDocument();
    expect(screen.getByText("Aufgaben · 1")).toBeInTheDocument();
    expect(screen.getByText("Projekte · 0")).toBeInTheDocument();
    expect(screen.queryByText("TASK-2")).not.toBeInTheDocument();
  });

  it("öffnet Aufgaben-Treffer auf der Aufgaben-Detailroute", () => {
    renderSearch();

    fireEvent.change(screen.getByPlaceholderText("Global suchen"), { target: { value: "Test" } });
    fireEvent.click(screen.getByRole("button", { name: /Testaufgabe/ }));

    expect(navigateMock).toHaveBeenCalledWith("/tasks/2");
  });
});
