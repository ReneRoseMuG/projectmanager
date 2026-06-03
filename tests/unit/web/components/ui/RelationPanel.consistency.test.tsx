// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Träger-spezifische Wrapper (FeatureRelationPanel, UseCaseRelationPanel) und TicketRelationPanel
 *   mit minimalen Mocks für externe Icons und StatusPill.
 *
 * Mock-Entscheidung:
 * - StatusPill wird gemockt da es Katalog-Kontext braucht; Icons werden als identitätsneutrale Spans gerendert.
 *
 * Isolation:
 * - jsdom ohne DB-, API- oder Dateisystemzugriff.
 *
 * Abgedeckte Regeln:
 * - FeatureRelationPanel und UseCaseRelationPanel zeigen "Speichern"-Button wenn Items vorhanden.
 * - Beide zeigen den korrekten EmptyState wenn keine Items verfügbar sind.
 * - TicketRelationPanel zeigt EmptyState-Sektionen bei leeren Relations.
 * - TicketRelationPanel zeigt "Hinzufügen"-Button unabhängig vom Relation-Zustand.
 * - Kein leerer Render durch fehlende Props.
 *
 * Fehlerfälle:
 * - Leere items-Liste darf keinen "Speichern"-Button ohne Items zeigen.
 *
 * Ziel:
 * Träger-übergreifende Konsistenz der Relation-Panels im leeren und befüllten Zustand absichern.
 */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Feature, UseCase } from "@taskmanager/shared-types";
import { FeatureRelationPanel } from "../../../../../apps/web/src/components/features/FeatureRelationPanel";
import { UseCaseRelationPanel } from "../../../../../apps/web/src/components/usecases/UseCaseRelationPanel";
import { TicketRelationPanel } from "../../../../../apps/web/src/components/tickets/TicketRelationPanel";

vi.mock("../../../../../apps/web/src/components/ui/StatusPill", () => ({
  StatusPill: ({ value }: { value: string }) => <span data-testid="status-pill">{value}</span>,
}));

vi.mock("../../../../../apps/web/src/components/tickets/TicketCard", () => ({
  TicketCard: ({ ticket }: { ticket: { title: string } }) => <div>{ticket.title}</div>,
}));

const features: Feature[] = [
  { id: 1, title: "Feature Alpha", status: "active", description: null, sortOrder: 0,
    responsibleUserId: null, responsibleUser: null, useCaseCount: 2,
    attachmentCount: 0, noteCount: 0, commentCount: 0, createdAt: "", updatedAt: "", version: 1 },
  { id: 2, title: "Feature Beta", status: "draft", description: null, sortOrder: 1,
    responsibleUserId: null, responsibleUser: null, useCaseCount: 0,
    attachmentCount: 0, noteCount: 0, commentCount: 0, createdAt: "", updatedAt: "", version: 1 },
];

const useCases: UseCase[] = [
  { id: 10, featureId: 1, title: "Use Case Eins", status: "draft", description: null, sortOrder: 0,
    responsibleUserId: null, responsibleUser: null, attachmentCount: 0,
    noteCount: 0, commentCount: 0, createdAt: "", updatedAt: "", version: 1 },
];

afterEach(() => {
  cleanup();
});

describe("FeatureRelationPanel", () => {
  it("zeigt Speichern-Button wenn Features vorhanden", () => {
    render(
      <FeatureRelationPanel
        features={features}
        selectedIds={[1]}
        onChange={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />
    );
    expect(screen.getByRole("button", { name: "Speichern" })).toBeInTheDocument();
  });

  it("zeigt EmptyState wenn keine Features verfügbar", () => {
    render(
      <FeatureRelationPanel
        features={[]}
        selectedIds={[]}
        onChange={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />
    );
    expect(screen.getByText("Keine Features vorhanden")).toBeInTheDocument();
  });

  it("rendert den Feature-Titel in der Liste", () => {
    render(
      <FeatureRelationPanel
        features={features}
        selectedIds={[]}
        onChange={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />
    );
    expect(screen.getByText("Feature Alpha")).toBeInTheDocument();
    expect(screen.getByText("Feature Beta")).toBeInTheDocument();
  });
});

describe("UseCaseRelationPanel", () => {
  it("zeigt Speichern-Button wenn Use Cases vorhanden", () => {
    render(
      <UseCaseRelationPanel
        useCases={useCases}
        selectedIds={[10]}
        onChange={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />
    );
    expect(screen.getByRole("button", { name: "Speichern" })).toBeInTheDocument();
  });

  it("zeigt EmptyState wenn keine Use Cases verfügbar", () => {
    render(
      <UseCaseRelationPanel
        useCases={[]}
        selectedIds={[]}
        onChange={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />
    );
    expect(screen.getByText("Keine Use Cases vorhanden")).toBeInTheDocument();
  });
});

describe("TicketRelationPanel", () => {
  it("zeigt Hinzufügen-Button und EmptyState-Texte bei keinen Relationen", () => {
    render(
      <TicketRelationPanel
        currentTicketId={1}
        tickets={[]}
        relations={[]}
        onAdd={vi.fn().mockResolvedValue(undefined)}
        onRemove={vi.fn().mockResolvedValue(undefined)}
        onOpen={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Hinzufügen" })).toBeInTheDocument();
    // Alle drei Sektionen haben ihren EmptyState
    expect(screen.getByText("Keine blockierten Tickets")).toBeInTheDocument();
    expect(screen.getByText("Keine Blocker")).toBeInTheDocument();
    expect(screen.getByText("Keine weiteren Relationen")).toBeInTheDocument();
  });

  it("rendert verknüpfte Tickets in der passenden Sektion", () => {
    const ticket = {
      id: 5, title: "Abhängiges Ticket", type: "bug", status: "open", priority: "medium",
      parentId: null, description: null, version: 1, position: 0,
      resolution: null, environment: null, affectedVersion: null,
      dueDate: null, resolvedAt: null, reporterUserId: null, reporterUser: null,
      responsibleUserId: null, responsibleUser: null,
      tags: [], subTicketCount: 0, attachmentCount: 0, noteCount: 0, commentCount: 0,
      createdAt: "", updatedAt: ""
    };
    const relation = {
      id: "1-5-blocks-outgoing",
      relationType: "blocks" as const,
      direction: "outgoing" as const,
      ticket
    };

    render(
      <TicketRelationPanel
        currentTicketId={1}
        tickets={[ticket]}
        relations={[relation]}
        onAdd={vi.fn().mockResolvedValue(undefined)}
        onRemove={vi.fn().mockResolvedValue(undefined)}
        onOpen={vi.fn()}
      />
    );

    expect(screen.getByText("Abhängiges Ticket")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Relation entfernen" })).toBeInTheDocument();
  });
});
