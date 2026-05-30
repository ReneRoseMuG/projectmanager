// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte React-Komponente mit kontrollierten Wiki-Seiten- und Projekt-Props.
 *
 * Mock-Entscheidung:
 * - Keine Mocks; der Test prüft die sichtbare Selector-Interaktion.
 *
 * Isolation:
 * - jsdom ohne DB-, API- oder Dateisystemzugriff.
 *
 * Abgedeckte Regeln:
 * - Verwandte Wiki-Seiten werden erst nach einer Sucheingabe vorgeschlagen.
 * - Die Suche filtert passende Seiten und berücksichtigt bereits ausgewählte Seiten.
 * - Der Projektfilter grenzt sichtbare Suchtreffer ein.
 *
 * Fehlerfälle:
 * - Leerer Suchtext darf keine vollständige Seitenliste anzeigen.
 * - Bereits ausgewählte Seiten dürfen nicht erneut als Vorschlag erscheinen.
 *
 * Ziel:
 * Die Vorschlagslogik für verwandte Wiki-Seiten gegen ungewollte Voll-Listen absichern.
 */
import "@testing-library/jest-dom/vitest";
import type { Project, WikiPage, WikiPageRelationSummary } from "@taskmanager/shared-types";
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RelatedPagesSelector } from "../../../../../apps/web/src/components/wiki/RelatedPagesSelector";

function makePage(id: number, title: string, parentId: number | null = null): WikiPage {
  return {
    id,
    parentId,
    title,
    content: "",
    sortOrder: 0,
    childCount: 0,
    attachmentCount: 0,
    taskCount: 0,
    ticketCount: 0,
    relatedPages: [],
    version: 1,
    createdAt: "2026-05-28T08:00:00.000Z",
    updatedAt: "2026-05-28T08:00:00.000Z"
  };
}

function makeProject(id: number, name: string, wikiPageId: number | null): Project {
  return {
    id,
    name,
    description: null,
    status: "active",
    color: null,
    startDate: null,
    dueDate: null,
    wikiPageId,
    version: 1,
    createdAt: "2026-05-28T08:00:00.000Z",
    updatedAt: "2026-05-28T08:00:00.000Z",
    milestoneCount: 0,
    openTaskCount: 0,
    doneTaskCount: 0,
    totalTaskCount: 0,
    ticketCount: 0,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0,
    tags: []
  };
}

function renderSelector(options: {
  pages: WikiPage[];
  projects?: Project[];
  selectedPages?: WikiPageRelationSummary[];
  currentPageId?: number;
}) {
  const onChange = vi.fn();
  render(
    <RelatedPagesSelector
      pages={options.pages}
      projects={options.projects ?? []}
      currentPageId={options.currentPageId}
      selectedPages={options.selectedPages ?? []}
      onChange={onChange}
    />
  );
  return onChange;
}

afterEach(() => {
  cleanup();
});

describe("RelatedPagesSelector", () => {
  it("zeigt ohne Suchtext keine Seitenvorschläge", () => {
    renderSelector({
      pages: [makePage(1, "Alpha Onboarding"), makePage(2, "Beta Release")]
    });

    expect(screen.getByText("Gib einen Suchbegriff ein, um verwandte Seiten vorzuschlagen.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Alpha Onboarding als verwandte Seite hinzufügen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Beta Release als verwandte Seite hinzufügen" })).not.toBeInTheDocument();
  });

  it("filtert Vorschläge erst nach Sucheingabe und blendet bereits gewählte Seiten aus", () => {
    renderSelector({
      pages: [makePage(1, "Alpha Onboarding"), makePage(2, "Beta Release"), makePage(3, "Alpha Linked")],
      selectedPages: [{ id: 3, title: "Alpha Linked", parentId: null }]
    });

    fireEvent.change(screen.getByPlaceholderText("Verwandte Seite suchen"), { target: { value: "Alpha" } });

    expect(screen.getByRole("button", { name: "Alpha Onboarding als verwandte Seite hinzufügen" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Beta Release als verwandte Seite hinzufügen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Alpha Linked als verwandte Seite hinzufügen" })).not.toBeInTheDocument();
    expect(screen.getByText("Alpha Linked")).toBeInTheDocument();
  });

  it("grenzt Suchtreffer über den Projektfilter ein", () => {
    renderSelector({
      pages: [makePage(1, "Projekt Root"), makePage(2, "Alpha Roadmap", 1), makePage(3, "Alpha Outside")],
      projects: [makeProject(10, "Projekt A", 1)]
    });

    fireEvent.change(screen.getByPlaceholderText("Verwandte Seite suchen"), { target: { value: "Alpha" } });

    expect(screen.getByRole("button", { name: "Alpha Roadmap als verwandte Seite hinzufügen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alpha Outside als verwandte Seite hinzufügen" })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "10" } });

    expect(screen.getByRole("button", { name: "Alpha Roadmap als verwandte Seite hinzufügen" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Alpha Outside als verwandte Seite hinzufügen" })).not.toBeInTheDocument();
  });
});
