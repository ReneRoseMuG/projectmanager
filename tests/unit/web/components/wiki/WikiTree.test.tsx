// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte WikiTree-Komponente mit React Router MemoryRouter.
 *
 * Mock-Entscheidung:
 * - Keine API-Mocks; nur lokale Testdaten für den Wiki-Baum.
 *
 * Isolation:
 * - jsdom ohne echte Navigation außerhalb des MemoryRouter.
 *
 * Abgedeckte Regeln:
 * - WikiTree rendert im Dark-Sidebar-Stil.
 * - Aktive und inaktive Nodes erhalten die neuen Sidebar-Klassen.
 * - Root- und Unterseiten-Erstellung bleiben verdrahtet.
 * - Expand/Collapse funktioniert weiterhin.
 *
 * Fehlerfälle:
 * - Der frühere doppelte Wiki-Header darf nicht mehr sichtbar sein.
 * - Eingeklappte Kinder dürfen nicht weiter angezeigt werden.
 *
 * Ziel:
 * Die visuelle Umstellung des WikiTree ohne Regression der Tree-Interaktion absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WikiTree } from "../../../../../apps/web/src/components/wiki/WikiTree";
import type { WikiTreeNode } from "../../../../../apps/web/src/hooks/useWiki";

const childPage: WikiTreeNode = {
  id: 2,
  parentId: 1,
  title: "Unterseite",
  content: "",
  sortOrder: 0,
  childCount: 0,
  attachmentCount: 0,
  taskCount: 0,
  ticketCount: 0,
  relatedPages: [],
  version: 1,
  createdAt: "2026-05-29T08:00:00.000Z",
  updatedAt: "2026-05-29T08:00:00.000Z",
  children: [],
};

const rootPage: WikiTreeNode = {
  ...childPage,
  id: 1,
  parentId: null,
  title: "Rootseite",
  childCount: 1,
  children: [childPage],
};

function renderTree(onCreate = vi.fn()) {
  return render(
    <MemoryRouter initialEntries={["/wiki/2"]}>
      <Routes>
        <Route path="/wiki/:id" element={<WikiTree tree={[rootPage]} onCreate={onCreate} />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
});

describe("WikiTree", () => {
  it("rendert als Dark Sidebar ohne doppelten Wiki-Header", () => {
    renderTree();

    const aside = screen.getByText("Seiten").closest("aside");
    expect(aside).toHaveClass("bg-gradient-to-b", "from-steel-800", "to-steel-900");
    expect(screen.queryByRole("heading", { name: "Wiki" })).not.toBeInTheDocument();
  });

  it("markiert aktive und inaktive Nodes im Sidebar-Stil", () => {
    renderTree();

    expect(screen.getByRole("link", { name: "Unterseite" })).toHaveClass("bg-white/10", "text-white");
    expect(screen.getByRole("link", { name: "Rootseite" })).toHaveClass("text-white/75", "hover:bg-white/10");
  });

  it("behält Root- und Unterseiten-Erstellung bei", () => {
    const onCreate = vi.fn();
    renderTree(onCreate);

    fireEvent.click(screen.getByRole("button", { name: "Neue Root-Seite" }));
    expect(onCreate).toHaveBeenCalledWith(null);

    fireEvent.click(screen.getAllByRole("button", { name: "Unterseite anlegen" })[0]);
    expect(onCreate).toHaveBeenCalledWith(rootPage);
  });

  it("klappt Kindseiten weiterhin ein und aus", () => {
    renderTree();

    fireEvent.click(screen.getAllByRole("button", { name: "Einklappen" })[0]);

    expect(screen.queryByRole("link", { name: "Unterseite" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ausklappen" })).toBeInTheDocument();
  });
});
